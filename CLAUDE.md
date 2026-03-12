# Session Transcriptor

CLI tool for coaching session transcription. Transcribe audio via Deepgram or PyannoteAI, format with Claude Code skill, generate DOCX.

## Stack
- **ASR**: Deepgram Nova-3 (default) or PyannoteAI Precision-2 (best diarization)
- **Post-processing**: Claude Code skill (formatting, pause detection, exchange numbering)
- **DOCX**: docx npm package
- **Runtime**: TypeScript + tsx

## Architecture
```
/transcribe <audio-file>
  → CLI: transcription (Deepgram or PyannoteAI) → *_utterances.json
  → Claude Code: format transcript (free, no API cost)
  → CLI: generate DOCX from formatted lines
  → Output: *.docx
```

## Usage
```bash
# Via Claude Code skill (recommended):
/transcribe ./path/to/audio.mp3

# Via CLI directly:
npm run transcribe -- ./audio.mp3                          # Deepgram (default)
npm run transcribe -- ./audio.mp3 --provider pyannote      # PyannoteAI (best diarization)
npm run generate -- lines.json "Coach" "Client" "2025-01-01" en  # step 3: DOCX
```

## Providers
- **Deepgram** — fast, good for clear audio with distinct voices
- **PyannoteAI** — best diarization (Precision-2), recommended for same-gender speakers or when speaker attribution matters. Uses `minSpeakers=2, maxSpeakers=2` + Whisper large-v3-turbo for STT.

## Key Files
- `src/cli/transcribe.ts` — transcription CLI (multi-provider)
- `src/cli/generate-docx.ts` — DOCX generation CLI
- `src/transcription/deepgram.ts` — Deepgram API integration
- `src/transcription/pyannote.ts` — PyannoteAI API integration
- `src/docx/generator.ts` — DOCX generation from template
- `src/types/index.ts` — all TypeScript types
- `.claude/commands/transcribe.md` — Claude Code skill

## Conventions
- No `console.log` — use `process.stderr.write`
- All types in `src/types/index.ts`
- Environment: `DEEPGRAM_API_KEY` and/or `PYANNOTE_API_KEY` in `.env`
