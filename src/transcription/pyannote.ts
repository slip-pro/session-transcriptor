import type {
  DeepgramUtterance,
  DeepgramWord,
  DeepgramResult,
  PyannoteJob,
} from '../types/index.js';

const API_BASE = 'https://api.pyannote.ai/v1';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 600; // 30 min max

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function uploadMedia(
  apiKey: string,
  audioBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const objectKey = `session-${Date.now()}`;
  const mediaUrl = `media://${objectKey}`;

  const createRes = await fetch(`${API_BASE}/media/input`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ url: mediaUrl }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(
      `PyannoteAI media create failed (${createRes.status}): ${body}`,
    );
  }

  const { url: presignedUrl } = (await createRes.json()) as {
    url: string;
  };

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: new Uint8Array(audioBuffer),
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(
      `PyannoteAI media upload failed (${uploadRes.status}): ${body}`,
    );
  }

  return mediaUrl;
}

async function submitDiarizeJob(
  apiKey: string,
  mediaUrl: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/diarize`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      url: mediaUrl,
      model: 'precision-2',
      minSpeakers: 2,
      maxSpeakers: 2,
      exclusive: true,
      transcription: true,
      transcriptionConfig: {
        model: 'faster-whisper-large-v3-turbo',
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `PyannoteAI diarize submit failed (${res.status}): ${body}`,
    );
  }

  const { jobId } = (await res.json()) as { jobId: string };
  return jobId;
}

async function pollJob(
  apiKey: string,
  jobId: string,
  onProgress: (status: string) => void,
): Promise<PyannoteJob> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: headers(apiKey),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `PyannoteAI poll failed (${res.status}): ${body}`,
      );
    }

    const job = (await res.json()) as PyannoteJob;

    if (job.status === 'succeeded') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(
        `PyannoteAI job failed: ${job.output?.error ?? 'unknown error'}`,
      );
    }

    if (job.status === 'canceled') {
      throw new Error('PyannoteAI job was canceled');
    }

    onProgress(job.status);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('PyannoteAI job timed out after 30 minutes');
}

/**
 * Convert PyannoteAI turn-level transcription to
 * DeepgramUtterance[] format for compatibility with
 * the existing pipeline.
 */
function toDeepgramFormat(job: PyannoteJob): DeepgramResult {
  const output = job.output;
  if (!output) {
    throw new Error('PyannoteAI job has no output');
  }

  const turns = output.turnLevelTranscription ?? [];
  const words = output.wordLevelTranscription ?? [];

  if (turns.length === 0 && output.diarization.length === 0) {
    throw new Error(
      'No speech detected in the audio. '
      + 'Please check the file and try again.',
    );
  }

  // Map speaker labels (SPEAKER_00, SPEAKER_01) to numbers
  const speakerLabels = new Map<string, number>();
  let nextSpeakerId = 0;

  function getSpeakerId(label: string): number {
    if (!speakerLabels.has(label)) {
      speakerLabels.set(label, nextSpeakerId++);
    }
    return speakerLabels.get(label)!;
  }

  const utterances: DeepgramUtterance[] = turns.map(
    (turn, idx) => {
      const speakerId = getSpeakerId(turn.speaker);

      // Find words belonging to this turn by time overlap
      const turnWords: DeepgramWord[] = words
        .filter((w) => w.start >= turn.start && w.end <= turn.end)
        .map((w) => ({
          word: w.text,
          start: w.start,
          end: w.end,
          confidence: 1,
          speaker: getSpeakerId(w.speaker),
          speaker_confidence: 1,
          punctuated_word: w.text,
        }));

      return {
        start: turn.start,
        end: turn.end,
        confidence: 1,
        channel: 0,
        transcript: turn.text,
        speaker: speakerId,
        id: `pyannote-${idx}`,
        words: turnWords,
      };
    },
  );

  return { utterances };
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  onProgress?: (msg: string) => void,
): Promise<DeepgramResult> {
  const log = onProgress ?? (() => {});

  log('Uploading audio to PyannoteAI...');
  const mediaUrl = await uploadMedia(apiKey, audioBuffer, mimeType);

  log('Submitting diarization job (Precision-2)...');
  const jobId = await submitDiarizeJob(apiKey, mediaUrl);
  log(`Job created: ${jobId}`);

  log('Processing (this may take a few minutes)...');
  const job = await pollJob(apiKey, jobId, (status) => {
    log(`Status: ${status}...`);
  });

  log('Converting results...');
  return toDeepgramFormat(job);
}
