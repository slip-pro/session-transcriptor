import { createClient } from '@deepgram/sdk';
import { config } from '../config/env.js';
import type { DeepgramResult, DeepgramUtterance } from '../types/index.js';

const deepgram = createClient(config.deepgramApiKey);

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
