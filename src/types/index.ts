// --- Provider types ---

export type TranscriptionProvider = 'deepgram' | 'pyannote';

// --- PyannoteAI types ---

export interface PyannoteWord {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface PyannoteTurn {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface PyannoteDiarizationSegment {
  speaker: string;
  start: number;
  end: number;
}

export interface PyannoteJobOutput {
  diarization: PyannoteDiarizationSegment[];
  wordLevelTranscription?: PyannoteWord[];
  turnLevelTranscription?: PyannoteTurn[];
  error?: string;
  warning?: string;
}

export interface PyannoteJob {
  jobId: string;
  status: 'pending' | 'created' | 'succeeded'
    | 'canceled' | 'failed' | 'running';
  createdAt?: string;
  updatedAt?: string;
  output?: PyannoteJobOutput;
}

// --- Deepgram types ---

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  speaker_confidence: number;
  punctuated_word: string;
}

export interface DeepgramUtterance {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  speaker: number;
  id: string;
  words: DeepgramWord[];
}

export interface DeepgramResult {
  utterances: DeepgramUtterance[];
}

// --- Transcript types ---

export type Speaker = 'Coach' | 'Client';
export type Language = 'en' | 'ru';

export interface TranscriptLine {
  lineNumber: number;
  timecode: string;
  speaker: Speaker;
  content: string;
}

export interface SessionMetadata {
  coachName: string;
  clientName: string;
  sessionDate: string;
  language: Language;
  speakerMap: Record<number, Speaker>;
}

export interface ProcessingResult {
  metadata: SessionMetadata;
  lines: TranscriptLine[];
}

// --- Bot state ---

export type SessionStep =
  | 'idle'
  | 'awaiting_audio'
  | 'transcribing'
  | 'awaiting_speaker_map'
  | 'awaiting_coach_name'
  | 'awaiting_client_name'
  | 'awaiting_date'
  | 'processing'
  | 'generating';

export interface SessionState {
  step: SessionStep;
  audioBuffer?: Buffer;
  audioMimeType?: string;
  deepgramResult?: DeepgramResult;
  metadata: Partial<SessionMetadata>;
  statusMessageId?: number;
}

// --- Config ---

export interface AppConfig {
  deepgramApiKey: string;
  pyannoteApiKey?: string;
}
