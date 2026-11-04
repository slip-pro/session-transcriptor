import { createClient } from '@deepgram/sdk';
import { config } from '../config/env.js';
import type {
  DeepgramResult,
  DeepgramUtterance,
  DiarizationSegment,
} from '../types/index.js';

const deepgram = createClient(config.deepgramApiKey);

/**
 * Speaker turns only — the transcript is thrown away. Used as a
 * diarization source when speech-to-text runs elsewhere (GigaAM).
 */
export async function diarizeAudio(
  audioBuffer: Buffer,
  apiKey: string,
): Promise<DiarizationSegment[]> {
  const client = createClient(apiKey);

  const { result, error } = await client.listen.prerecorded
    .transcribeFile(audioBuffer, {
      model: 'nova-3',
      language: 'multi',
      diarize: true,
      utterances: true,
    });

  if (error) {
    throw new Error(`Deepgram diarization failed: ${error.message}`);
  }

  const utterances = (
    result?.results?.utterances ?? []
  ) as unknown as DeepgramUtterance[];

  if (utterances.length === 0) {
    throw new Error('No speech detected in the audio.');
  }

  return utterances.map((u) => ({
    speaker: `SPEAKER_${String(u.speaker).padStart(2, '0')}`,
    start: u.start,
    end: u.end,
  }));
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<DeepgramResult> {
  const { result, error } = await deepgram.listen.prerecorded
    .transcribeFile(audioBuffer, {
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      punctuate: true,
      diarize: true,
      utterances: true,
      filler_words: true,
    });

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  const utterances = (
    result?.results?.utterances ?? []
  ) as unknown as DeepgramUtterance[];

  if (utterances.length === 0) {
    throw new Error(
      'No speech detected in the audio. '
      + 'Please check the file and try again.',
    );
  }

  return { utterances };
}

export function detectLanguage(
  utterances: DeepgramUtterance[],
): 'en' | 'ru' {
  const sample = utterances
    .slice(0, 10)
    .map((u) => u.transcript)
    .join(' ');

  const cyrillicCount = (sample.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latinCount = (sample.match(/[a-zA-Z]/g) ?? []).length;

  return cyrillicCount > latinCount ? 'ru' : 'en';
}
