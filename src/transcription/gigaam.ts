import { spawn } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import type {
  DeepgramResult,
  DeepgramUtterance,
  GigaAMMode,
  GigaAMModel,
  GigaAMResult,
  PyannoteDiarizationSegment,
} from '../types/index.js';

const SIDECAR = 'scripts/gigaam_asr.py';

/**
 * Locate the Python interpreter that has GigaAM installed. Prefers the
 * project-local venv, falls back to GIGAAM_PYTHON or plain `python`.
 */
function findPython(projectRoot: string): string {
  const override = process.env['GIGAAM_PYTHON'];
  if (override) return override;

  const candidates = [
    join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    join(projectRoot, '.venv', 'bin', 'python'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return 'python';
}

function runSidecar(
  python: string,
  scriptPath: string,
  job: unknown,
  outPath: string,
  log: (msg: string) => void,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, [scriptPath, '--out', outPath], {
      stdio: ['pipe', 'inherit', 'pipe'],
    });

    let stderrTail = '';

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-4000);
      for (const line of chunk.split('\n')) {
        if (line.trim()) log(line.trimEnd());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start Python sidecar: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(
        `GigaAM sidecar exited with code ${code}.\n${stderrTail}`,
      ));
    });

    child.stdin.write(JSON.stringify(job));
    child.stdin.end();
  });
}

/**
 * Convert sidecar output to DeepgramUtterance[] so the rest of the
 * pipeline (formatting skill, DOCX generator) stays unchanged.
 */
function toDeepgramFormat(result: GigaAMResult): DeepgramResult {
  const speakerIds = new Map<string, number>();

  function speakerId(label: string): number {
    if (!speakerIds.has(label)) {
      speakerIds.set(label, speakerIds.size);
    }
    return speakerIds.get(label)!;
  }

  const utterances: DeepgramUtterance[] = result.segments.map(
    (segment, idx) => ({
      start: segment.start,
      end: segment.end,
      confidence: 1,
      channel: 0,
      transcript: segment.text,
      speaker: speakerId(segment.speaker),
      id: `gigaam-${idx}`,
      // GigaAM runs per diarization turn, so word-level timings are
      // not produced here; the pipeline only needs turn boundaries.
      words: [],
    }),
  );

  return { utterances };
}

export async function transcribeSegments(
  audioPath: string,
  segments: PyannoteDiarizationSegment[],
  options: {
    model?: GigaAMModel;
    mode?: GigaAMMode;
    device?: 'cuda' | 'cpu';
    batchSize?: number;
    projectRoot?: string;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<DeepgramResult> {
  const log = options.onProgress ?? (() => {});
  const projectRoot = options.projectRoot ?? process.cwd();
  const python = findPython(projectRoot);
  const scriptPath = resolve(projectRoot, SIDECAR);

  if (!existsSync(scriptPath)) {
    throw new Error(`GigaAM sidecar not found at ${scriptPath}`);
  }

  const outPath = join(tmpdir(), `gigaam-${Date.now()}.json`);

  const job = {
    audioPath: resolve(audioPath),
    model: options.model ?? 'v3_rnnt',
    mode: options.mode ?? 'window',
    device: options.device ?? null,
    batchSize: options.batchSize ?? 8,
    segments: segments.map((s) => ({
      speaker: s.speaker,
      start: s.start,
      end: s.end,
    })),
  };

  try {
    await runSidecar(python, scriptPath, job, outPath, log);

    if (!existsSync(outPath)) {
      throw new Error('GigaAM sidecar produced no output file');
    }

    const parsed = JSON.parse(
      readFileSync(outPath, 'utf8'),
    ) as GigaAMResult;

    if (parsed.segments.length === 0) {
      throw new Error('GigaAM returned no transcribed segments');
    }

    return toDeepgramFormat(parsed);
  } finally {
    rmSync(outPath, { force: true });
  }
}
