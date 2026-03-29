import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { DeepgramClient } from "@deepgram/sdk";

export const runtime = "nodejs";
export const maxDuration = 300; // до 5 минут на Vercel Pro

function toMmSs(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type Utterance = {
  start: number;
  speaker: number;
  transcript: string;
};

type Role = "coach" | "client";

function mergeConsecutiveBySpeaker(utterances: Utterance[]): Utterance[] {
  const merged: Utterance[] = [];

  for (const u of utterances) {
    const transcript = (u.transcript ?? "").trim();
    if (!transcript) continue;

    const last = merged[merged.length - 1];
    if (last && last.speaker === u.speaker) {
      last.transcript = `${last.transcript} ${transcript}`.trim();
      continue;
    }

    merged.push({
      start: u.start,
      speaker: u.speaker,
      transcript,
    });
  }

  return merged;
}

function guessRolesByConversation(utterances: Utterance[]): Record<number, Role> {
  const speakers = [...new Set(utterances.map((u) => u.speaker))];
  if (speakers.length === 0) return {};
  if (speakers.length === 1) return { [speakers[0]]: "coach" };

  const firstSpeaker = utterances[0]!.speaker;

  // Если спикеров больше двух — берём двух самых активных.
  const counts: Record<number, number> = {};
  for (const u of utterances) counts[u.speaker] = (counts[u.speaker] ?? 0) + 1;
  const top2 = [...speakers].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0)).slice(0, 2);
  if (top2.length === 1) return { [top2[0]]: "coach" };

  const [a, b] = top2;

  const coachStarts = [
    "как",
    "почему",
    "зачем",
    "что",
    "какой",
    "какая",
    "какое",
    "когда",
    "где",
    "куда",
    "сколько",
    "в чем",
    "в чём",
    "расскажите",
    "поделитесь",
    "давайте",
    "давай",
    "представьте",
    "опишите",
    "сформулируйте",
    "выберите",
    "с чего",
    "какую",
    "какого",
    "какие",
    "какой бы",
    "как бы",
  ];

  const coachVerbs = [
    "расскажите",
    "поделитесь",
    "помогите",
    "сформулируйте",
    "опишите",
    "давайте",
    "давай",
    "представьте",
    "выберите",
    "чем",
    "какую",
    "какой",
  ];

  function scoreCoachText(text: string) {
    const t = (text ?? "").toLowerCase().trim();
    if (!t) return 0;

    let score = 0;
    score += (t.match(/\?/g) ?? []).length * 5;

    // Начало реплики (часто коуч начинает с вопроса/уточнения)
    for (const s of coachStarts) {
      if (t.startsWith(s)) {
        score += 4;
        break;
      }
    }

    // Наличие типичных фраз коуча
    for (const v of coachVerbs) {
      if (t.includes(v)) score += 1;
    }

    return score;
  }

  const scoreA = utterances
    .filter((u) => u.speaker === a)
    .reduce((acc, u) => acc + scoreCoachText(u.transcript), 0);
  const scoreB = utterances
    .filter((u) => u.speaker === b)
    .reduce((acc, u) => acc + scoreCoachText(u.transcript), 0);

  let coachSpeaker: number;
  if (scoreA === scoreB) coachSpeaker = firstSpeaker;
  else coachSpeaker = scoreA > scoreB ? a : b;

  const clientSpeaker = coachSpeaker === a ? b : a;

  return {
    [coachSpeaker]: "coach",
    [clientSpeaker]: "client",
  };
}

const PAGE_WIDTH = 10845;
const COL_NUM = 703;
const COL_TIME = 1135;
const COL_SPEAKER = 1222;
const COL_CONTENT = 5985;
const COL_COMMENT = 1800;

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "000000",
};

const BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};

const CELL_MARGINS = {
  top: 80,
  bottom: 80,
  left: 100,
  right: 100,
};

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    margins: CELL_MARGINS,
    shading: {
      fill: "F2F2F2",
      type: ShadingType.CLEAR,
    },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            font: "Calibri",
            size: 22,
          }),
        ],
      }),
    ],
  });
}

function dataCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: "Calibri",
            size: 22,
          }),
        ],
      }),
    ],
  });
}

function buildHeaderRow(L: typeof docLabels[keyof typeof docLabels]): TableRow {
  return new TableRow({
    children: [
      headerCell("№", COL_NUM),
      headerCell("Time-code", COL_TIME),
      headerCell(L.colRole, COL_SPEAKER),
      headerCell(L.colContent, COL_CONTENT),
      headerCell(L.colComment, COL_COMMENT),
    ],
  });
}

const docLabels = {
  ru: {
    coach: "Коуч",
    client: "Клиент",
    dateLabel: "Дата сессии: ",
    colRole: "Роль",
    colContent: "",
    colComment: "Mentor's comments",
    speakerCoach: "Коуч",
    speakerClient: "Клиент",
    speakerUnknown: "Speaker",
  },
  en: {
    coach: "Coach",
    client: "Client",
    dateLabel: "Session date: ",
    colRole: "Role",
    colContent: "",
    colComment: "Mentor's comments",
    speakerCoach: "Coach",
    speakerClient: "Client",
    speakerUnknown: "Speaker",
  },
} as const;

type DocLang = keyof typeof docLabels;

export async function POST(req: Request) {
  const formData = await req.formData();
  const blobUrl = String(formData.get("blobUrl") ?? "").trim();
  const coachName = String(formData.get("coachName") ?? "").trim() || "—";
  const clientName = String(formData.get("clientName") ?? "").trim() || "—";
  const sessionDate = String(formData.get("sessionDate") ?? "").trim() || "—";
  const rawLang = String(formData.get("lang") ?? "ru");
  const lang: DocLang = rawLang === "en" ? "en" : "ru";
  const L = docLabels[lang];

  if (!blobUrl) {
    return NextResponse.json(
      { error: "Нет файла. Загрузи аудио и попробуй ещё раз." },
      { status: 400 },
    );
  }

  const apiKey = process.env["DEEPGRAM_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "На сервере не задан DEEPGRAM_API_KEY." },
      { status: 500 },
    );
  }

  const deepgram = new DeepgramClient({ apiKey });

  const DEEPGRAM_TIMEOUT_MS = 4 * 60 * 1000; // 4 минуты

  let dgResult: unknown;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transcription timed out. Try a shorter audio file.")), DEEPGRAM_TIMEOUT_MS),
    );
    dgResult = await Promise.race([
      deepgram.listen.v1.media.transcribeUrl({
        url: blobUrl,
        model: "nova-3",
        language: "multi",
        smart_format: true,
        punctuate: true,
        diarize: true,
        utterances: true,
        filler_words: true,
      }),
      timeoutPromise,
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown Deepgram error";
    await del(blobUrl).catch(() => {});
    return NextResponse.json({ error: `Deepgram error: ${msg}` }, { status: 502 });
  }

  // Удаляем файл из Blob сразу после расшифровки
  await del(blobUrl).catch(() => {});

  const utterances = (
    (dgResult as { results?: { utterances?: unknown } }).results?.utterances ?? []
  ) as Utterance[];
  if (!utterances.length) {
    return NextResponse.json(
      { error: "Речь не распознана. Попробуй другое аудио." },
      { status: 422 },
    );
  }

  const mergedUtterances = mergeConsecutiveBySpeaker(utterances);
  const rolesBySpeaker = guessRolesByConversation(mergedUtterances);

  const metaParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `${L.coach}: `, bold: true, font: "Calibri", size: 24 }),
        new TextRun({ text: coachName, font: "Calibri", size: 24 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `${L.client}: `, bold: true, font: "Calibri", size: 24 }),
        new TextRun({ text: clientName, font: "Calibri", size: 24 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: L.dateLabel,
          bold: true,
          font: "Calibri",
          size: 24,
        }),
        new TextRun({ text: sessionDate, font: "Calibri", size: 24 }),
      ],
    }),
  ];

  const rows: TableRow[] = [
    buildHeaderRow(L),
    ...mergedUtterances.map((u, idx) => {
      const role = rolesBySpeaker[u.speaker];
      const speakerLabel =
        role === "coach" ? L.speakerCoach : role === "client" ? L.speakerClient : `${L.speakerUnknown} ${u.speaker}`;
      return new TableRow({
        // важно: не задаём cantSplit вообще (Word иногда трактует это как запрет переноса)
        height: { value: 0, rule: HeightRule.AUTO },
        children: [
          dataCell(String(idx + 1), COL_NUM),
          dataCell(toMmSs(u.start), COL_TIME),
          dataCell(speakerLabel, COL_SPEAKER),
          dataCell(u.transcript, COL_CONTENT),
          dataCell("", COL_COMMENT),
        ],
      });
    }),
  ];

  const table = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [COL_NUM, COL_TIME, COL_SPEAKER, COL_CONTENT, COL_COMMENT],
    rows,
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 850,
              bottom: 1134,
              left: 1701,
            },
          },
        },
        children: [...metaParagraphs, table],
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(docxBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="transcript-icf.docx"',
    },
  });
}

