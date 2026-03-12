import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
} from 'docx';
import type { ProcessingResult, TranscriptLine } from '../types/index.js';

const PAGE_WIDTH = 10845;
const COL_NUM = 703;
const COL_TIME = 1135;
const COL_SPEAKER = 1222;
const COL_CONTENT = 5985;
const COL_COMMENT = 1800;

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '000000',
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
      fill: 'F2F2F2',
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
            font: 'Calibri',
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
            font: 'Calibri',
            size: 22,
          }),
        ],
      }),
    ],
  });
}

function buildHeaderRow(): TableRow {
  return new TableRow({
    children: [
      headerCell('\u2116', COL_NUM),
      headerCell('Time-code', COL_TIME),
      headerCell('Speaker', COL_SPEAKER),
      headerCell('', COL_CONTENT),
      headerCell('Mentor\u2019s comments', COL_COMMENT),
    ],
  });
}

function buildDataRow(line: TranscriptLine): TableRow {
  return new TableRow({
    children: [
      dataCell(
        line.lineNumber > 0 ? String(line.lineNumber) : '',
        COL_NUM,
      ),
      dataCell(line.timecode, COL_TIME),
      dataCell(line.speaker, COL_SPEAKER),
      dataCell(line.content, COL_CONTENT),
      dataCell('', COL_COMMENT),
    ],
  });
}

function buildMetadataSection(
  result: ProcessingResult,
): Paragraph[] {
  const { metadata } = result;
  const isRu = metadata.language === 'ru';

  return [
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: isRu ? '\u041a\u043e\u0443\u0447: ' : 'Coach: ',
          bold: true,
          font: 'Calibri',
          size: 24,
        }),
        new TextRun({
          text: metadata.coachName,
          font: 'Calibri',
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: isRu ? '\u041a\u043b\u0438\u0435\u043d\u0442: ' : 'Client: ',
          bold: true,
          font: 'Calibri',
          size: 24,
        }),
        new TextRun({
          text: metadata.clientName,
          font: 'Calibri',
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: isRu
            ? '\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 '
            : 'Permission ',
          bold: true,
          font: 'Calibri',
          size: 24,
        }),
        new TextRun({
          text: isRu
            ? '\u043d\u0430 \u0437\u0430\u043f\u0438\u0441\u044c \u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0435: \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u043e, \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u0433\u043e\u043b\u043e\u0441\u043e\u043c \u0432 \u0437\u0430\u043f\u0438\u0441\u0438.'
            : 'for recording and using: given, noted in the recording.',
          font: 'Calibri',
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: isRu
            ? '\u0414\u0430\u0442\u0430 \u0441\u0435\u0441\u0441\u0438\u0438: '
            : 'Date of the session: ',
          bold: true,
          font: 'Calibri',
          size: 24,
        }),
        new TextRun({
          text: metadata.sessionDate,
          font: 'Calibri',
          size: 24,
        }),
      ],
    }),
  ];
}

export async function generateDocx(
  result: ProcessingResult,
): Promise<Buffer> {
  const metaParagraphs = buildMetadataSection(result);

  const table = new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [
      COL_NUM,
      COL_TIME,
      COL_SPEAKER,
      COL_CONTENT,
      COL_COMMENT,
    ],
    rows: [
      buildHeaderRow(),
      ...result.lines.map(buildDataRow),
    ],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 24,
          },
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

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
