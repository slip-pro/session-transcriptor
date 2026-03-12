import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';
import { createClient } from '@deepgram/sdk';
import { transcribeAudio as pyannoteTranscribe } from '../transcription/pyannote.js';
import type {
  DeepgramUtterance,
  TranscriptionProvider,
} from '../types/index.js';

// --- Parse args ---

const args = process.argv.slice(2);
let provider: TranscriptionProvider = 'deepgram';
let audioPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' && args[i + 1]) {
    const val = args[i + 1];
    if (val !== 'deepgram' && val !== 'pyannote') {
      process.stderr.write(
        `Unknown provider: ${val}. Use "deepgram" or "pyannote".\n`,
      );
      process.exit(1);
    }
    provider = val;
    i++;
  } else if (!args[i]!.startsWith('--')) {
    audioPath = args[i];
  }
}

if (!audioPath) {
  process.stderr.write(
    'Usage: tsx src/cli/transcribe.ts <audio-file>'
    + ' [--provider deepgram|pyannote]\n',
  );
  process.exit(1);
}

const fullPath = resolve(audioPath);
const buffer = readFileSync(fullPath);

// --- Detect MIME type from extension ---

const ext = fullPath.split('.').pop()?.toLowerCase() ?? '';
const mimeMap: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  webm: 'audio/webm',
  mp4: 'audio/mp4',
};
const mimeType = mimeMap[ext] ?? 'audio/mpeg';

// --- Transcribe ---

let utterances: DeepgramUtterance[];

if (provider === 'pyannote') {
  const apiKey = process.env['PYANNOTE_API_KEY'];
  if (!apiKey) {
    process.stderr.write('Missing PYANNOTE_API_KEY in .env\n');
    process.exit(1);
  }

  process.stderr.write(
    `Transcribing ${fullPath} with PyannoteAI Precision-2...\n`,
  );

  const result = await pyannoteTranscribe(
    buffer,
    mimeType,
    apiKey,
    (msg) => process.stderr.write(`  ${msg}\n`),
  );
  utterances = result.utterances;
} else {
  const apiKey = process.env['DEEPGRAM_API_KEY'];
  if (!apiKey) {
    process.stderr.write('Missing DEEPGRAM_API_KEY in .env\n');
    process.exit(1);
  }

  const deepgram = createClient(apiKey);

  process.stderr.write(
    `Transcribing ${fullPath} with Deepgram Nova-3...\n`,
  );

  const { result, error } = await deepgram.listen.prerecorded
    .transcribeFile(buffer, {
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      punctuate: true,
      diarize: true,
      utterances: true,
      filler_words: true,
    });

  if (error) {
    process.stderr.write(`Deepgram error: ${error.message}\n`);
    process.exit(1);
  }

  utterances = (
    result?.results?.utterances ?? []
  ) as unknown as DeepgramUtterance[];
}

if (utterances.length === 0) {
  process.stderr.write('No speech detected.\n');
  process.exit(1);
}

// --- Detect language ---

const sample = utterances
  .slice(0, 10)
  .map((u) => u.transcript)
  .join(' ');
const cyrillicCount =
  (sample.match(/[\u0400-\u04FF]/g) ?? []).length;
const latinCount =
  (sample.match(/[a-zA-Z]/g) ?? []).length;
const language = cyrillicCount > latinCount ? 'ru' : 'en';

// --- Get unique speakers ---

const speakers = [...new Set(utterances.map((u) => u.speaker))];

// --- Build readable preview ---

const preview = utterances.slice(0, 5).map((u) => {
  const mins = Math.floor(u.start / 60);
  const secs = Math.floor(u.start % 60);
  const tc = `${String(mins).padStart(2, '0')}:`
    + `${String(secs).padStart(2, '0')}`;
  return `[${tc}] Speaker ${u.speaker}: ${u.transcript}`;
}).join('\n');

// --- Save raw utterances ---

const outPath = fullPath.replace(/\.[^.]+$/, '_utterances.json');
writeFileSync(
  outPath,
  JSON.stringify({ utterances, language, provider }, null, 2),
);

process.stderr.write(
  `\nDone! ${utterances.length} utterances saved to ${outPath}\n`,
);
process.stderr.write(`Provider: ${provider}\n`);
process.stderr.write(`Language: ${language}\n`);
process.stderr.write(`Speakers: ${speakers.join(', ')}\n\n`);
process.stderr.write(`Preview:\n${preview}\n`);
