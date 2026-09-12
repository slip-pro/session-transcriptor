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

function sanitizeDocText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSafeAsciiFilename(filename: string, fallbackExtension = "audio") {
  const trimmed = filename.trim();
  const extMatch = trimmed.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extMatch?.[1]?.toLowerCase() ?? fallbackExtension;
  const baseName = extMatch ? trimmed.slice(0, -extMatch[0].length) : trimmed;

  const normalizedBase = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const safeBase = normalizedBase || "audio";
  return `${safeBase}.${extension}`;
}

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

type FirstSpeakerRole = "auto" | Role;

// Слова, с которых обычно начинается реплика коуча (вопрос / приглашение).
const COACH_STARTS = [
  // ru
  "как",
  "почему",
  "зачем",
  "что",
  "какой",
  "какая",
  "какое",
  "какие",
  "какую",
  "какого",
  "когда",
  "где",
  "куда",
  "сколько",
  "в чем",
  "в чём",
  "с чего",
  "расскажите",
  "расскажи",
  "поделитесь",
  "поделись",
  "давайте",
  "давай",
  "представьте",
  "представь",
  "опишите",
  "опиши",
  "сформулируйте",
  "сформулируй",
  "выберите",
  "выбери",
  "а что",
  "а как",
  "а если",
  "правильно ли я",
  "если я правильно",
  // en
  "what",
  "how",
  "why",
  "when",
  "where",
  "which",
  "who",
  "tell me",
  "describe",
  "imagine",
  "let's",
  "lets",
  "so what",
  "and what",
  "and how",
  "what if",
  "if i understand",
  "am i right",
];

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Оценка «коучевости» одного спикера. Все сигналы нормированы на число реплик
 * / общий объём речи, чтобы более разговорчивый участник (обычно клиент)
 * не набирал баллы просто за объём.
 */
function coachScore(own: Utterance[], totalWords: number) {
  if (own.length === 0) return 0;

  let questionTurns = 0;
  let startTurns = 0;
  let words = 0;

  for (const u of own) {
    const t = u.transcript.toLowerCase().trim();
    words += countWords(t);
    if (t.includes("?")) questionTurns += 1;
    if (COACH_STARTS.some((s) => t.startsWith(s))) startTurns += 1;
  }

  const questionRate = questionTurns / own.length; // доля реплик с вопросом
  const startRate = startTurns / own.length; // доля реплик, начатых «по-коучевски»
  const talkShare = totalWords > 0 ? words / totalWords : 0.5; // доля слов
  const avgWords = words / own.length;

  // Коуч: чаще задаёт вопросы, говорит меньше и короче.
  return (
    questionRate * 5 +
    startRate * 3 +
    (1 - talkShare) * 3 +
    (avgWords < 25 ? 1 : 0)
  );
}

function guessRolesByConversation(
  utterances: Utterance[],
  firstSpeakerRole: FirstSpeakerRole = "auto",
): Record<number, Role> {
  const speakers = [...new Set(utterances.map((u) => u.speaker))];
  if (speakers.length === 0) return {};
  if (speakers.length === 1) return { [speakers[0]]: "coach" };

  const firstSpeaker = utterances[0]!.speaker;

  // Если спикеров больше двух — берём двух самых активных (по числу слов).
  const wordCounts: Record<number, number> = {};
  for (const u of utterances) {
    wordCounts[u.speaker] = (wordCounts[u.speaker] ?? 0) + countWords(u.transcript);
  }
  const top2 = [...speakers]
    .sort((a, b) => (wordCounts[b] ?? 0) - (wordCounts[a] ?? 0))
    .slice(0, 2);
  if (top2.length === 1) return { [top2[0]]: "coach" };

  const [a, b] = top2;

  let coachSpeaker: number;

  if (firstSpeakerRole !== "auto") {
    // Пользователь явно сказал, кто говорит первым — это надёжнее эвристики.
    const firstInTop2 = top2.includes(firstSpeaker) ? firstSpeaker : a;
    const other = firstInTop2 === a ? b : a;
    coachSpeaker = firstSpeakerRole === "coach" ? firstInTop2 : other;
  } else {
    const ownA = utterances.filter((u) => u.speaker === a);
    const ownB = utterances.filter((u) => u.speaker === b);
    const totalWords = (wordCounts[a] ?? 0) + (wordCounts[b] ?? 0);
    const scoreA = coachScore(ownA, totalWords);
    const scoreB = coachScore(ownB, totalWords);

    // Если разница незначительная — считаем коучем того, кто открыл сессию.
    if (Math.abs(scoreA - scoreB) < 0.5) {
      coachSpeaker = top2.includes(firstSpeaker) ? firstSpeaker : a;
    } else {
      coachSpeaker = scoreA > scoreB ? a : b;
    }
  }

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
  try {
    const formData = await req.formData();
    const blobUrl = String(formData.get("blobUrl") ?? "").trim();
    const audioFileEntry = formData.get("audioFile");
    const audioFile =
      typeof File !== "undefined" && audioFileEntry instanceof File
        ? audioFileEntry
        : null;
    const coachName =
      sanitizeDocText(String(formData.get("coachName") ?? "").trim()) || "—";
    const clientName =
      sanitizeDocText(String(formData.get("clientName") ?? "").trim()) || "—";
    const sessionDate =
      sanitizeDocText(String(formData.get("sessionDate") ?? "").trim()) || "—";
    const rawLang = String(formData.get("lang") ?? "ru");
    const lang: DocLang = rawLang === "en" ? "en" : "ru";
    const L = docLabels[lang];
    const rawFirstSpeaker = String(formData.get("firstSpeakerRole") ?? "auto");
    const firstSpeakerRole: FirstSpeakerRole =
      rawFirstSpeaker === "coach" || rawFirstSpeaker === "client"
        ? rawFirstSpeaker
        : "auto";
    const cleanupBlob = async () => {
      if (!blobUrl) return;
      await del(blobUrl).catch(() => {});
    };

    if (!blobUrl && !audioFile) {
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

    let uploadable:
      | ReadableStream
      | {
          data: File;
          filename: string;
          contentType: string;
          contentLength: number;
        };
    if (audioFile) {
      uploadable = {
        data: audioFile,
        filename: toSafeAsciiFilename(audioFile.name, "m4a"),
        contentType: audioFile.type || "application/octet-stream",
        contentLength: audioFile.size,
      };
    } else {
      try {
        const audioRes = await fetch(blobUrl);
        if (!audioRes.ok || !audioRes.body) {
          await cleanupBlob();
          return NextResponse.json(
            { error: "Не удалось получить аудиофайл из хранилища." },
            { status: 502 },
          );
        }
        uploadable = audioRes.body;
      } catch {
        await cleanupBlob();
        return NextResponse.json(
          { error: "Не удалось получить аудиофайл из хранилища." },
          { status: 502 },
        );
      }
    }

    const DEEPGRAM_TIMEOUT_MS = 4 * 60 * 1000;

    let dgResult: unknown;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Transcription timed out. Try a shorter audio file.")),
          DEEPGRAM_TIMEOUT_MS,
        ),
      );
      dgResult = await Promise.race([
        deepgram.listen.v1.media.transcribeFile(uploadable, {
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
      await cleanupBlob();
      return NextResponse.json({ error: `Deepgram error: ${msg}` }, { status: 502 });
    }

    const utterances = (
      (dgResult as { results?: { utterances?: unknown } }).results?.utterances ?? []
    ) as Utterance[];
    if (!utterances.length) {
      await cleanupBlob();
      return NextResponse.json(
        { error: "Речь не распознана. Попробуй другое аудио." },
        { status: 422 },
      );
    }

    const mergedUtterances = mergeConsecutiveBySpeaker(utterances).map((u) => ({
      ...u,
      transcript: sanitizeDocText(u.transcript ?? ""),
    }));
    const rolesBySpeaker = guessRolesByConversation(
      mergedUtterances,
      firstSpeakerRole,
    );

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
          role === "coach"
            ? L.speakerCoach
            : role === "client"
              ? L.speakerClient
              : `${L.speakerUnknown} ${u.speaker}`;
        return new TableRow({
          height: { value: 0, rule: HeightRule.AUTO },
          children: [
            dataCell(String(idx + 1), COL_NUM),
            dataCell(toMmSs(u.start), COL_TIME),
            dataCell(sanitizeDocText(speakerLabel), COL_SPEAKER),
            dataCell(u.transcript || " ", COL_CONTENT),
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
    await cleanupBlob();

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="transcript-icf.docx"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Internal processing error: ${error.message}`
            : "Internal processing error.",
      },
      { status: 500 },
    );
  }
}
