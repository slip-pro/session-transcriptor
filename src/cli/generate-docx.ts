import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateDocx } from '../docx/generator.js';
import type {
  TranscriptLine,
  ProcessingResult,
  Language,
} from '../types/index.js';

const args = process.argv.slice(2);
if (args.length < 4) {
  process.stderr.write(
    'Usage: tsx src/cli/generate-docx.ts '
    + '<lines.json> <coachName> <clientName> <date> [language]\n',
  );
  process.exit(1);
}

const [linesPath, coachName, clientName, sessionDate] = args as [
  string, string, string, string,
];
const language = (args[4] ?? 'en') as Language;

const fullPath = resolve(linesPath);
const lines: TranscriptLine[] = JSON.parse(
  readFileSync(fullPath, 'utf-8'),
);

const result: ProcessingResult = {
  metadata: {
    coachName,
    clientName,
    sessionDate,
    language,
    speakerMap: {},
  },
  lines,
};

const buffer = await generateDocx(result);
const outPath = fullPath.replace(/\.json$/, '.docx');
writeFileSync(outPath, buffer);
process.stderr.write(`DOCX saved to ${outPath}\n`);
