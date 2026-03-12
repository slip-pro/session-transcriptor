import 'dotenv/config';
import type { AppConfig } from '../types/index.js';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

export const config: AppConfig = {
  deepgramApiKey: requireEnv('DEEPGRAM_API_KEY'),
  pyannoteApiKey: optionalEnv('PYANNOTE_API_KEY'),
};
