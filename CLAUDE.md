@AGENTS.md

# Session Transcriptor

CLI tool for coaching session transcription. Transcribe audio via Deepgram, PyannoteAI or a local GigaAM model, format with Claude Code skill, generate DOCX.

## Product direction
The product direction and roadmap were recorded on 2026-11-04. Build for the owner's wife first; wider distribution is optional. These documents describe planned behavior, not shipped features or active billing.

- [Vision](VISION.md)
- [Development roadmap](ROADMAP.md)
- [Owner decisions](DECISIONS.md)
- [First-user interview](docs/research/2026-11-04-wife-interview.md)
- [Coach cabinet research](docs/research/2026-11-04-coach-cabinet.md)
- [Proposed first coach cabinet release](docs/features/coach-cabinet-v1.md)

The next proposed release adds a private coach account, clients, and session history with transcripts and DOCX. AI analysis follows that foundation. This changes the plan; the repository still contains the CLI, not a shipped web cabinet.

The planned free tier includes 3 current-style transcriptions with DOCX. The paid tier includes unlimited transcription count and all new features as they ship. Pricing, billing period, and free-quota renewal rules are undecided.

## Stack
- **ASR**: Deepgram Nova-3 (default), PyannoteAI Precision-2 (best diarization), or GigaAM v3 (local, best Russian)
- **Post-processing**: Claude Code skill (formatting, pause detection, exchange numbering)
- **DOCX**: docx npm package
- **Runtime**: TypeScript + tsx; Python sidecar for GigaAM

## Architecture
```
/transcribe <audio-file>
  → CLI: transcription (Deepgram | PyannoteAI | GigaAM) → *_utterances.json
  → Claude Code: format transcript (uses Claude Code subscription or API quota)
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
npm run transcribe -- ./audio.mp3 --provider gigaam        # GigaAM local ASR + pyannote diarization
npm run transcribe -- ./audio.mp3 --provider gigaam --diarizer deepgram
npm run generate -- lines.json "Coach" "Client" "2025-01-01" en  # step 3: DOCX
```

## Providers
- **Deepgram** — fast, good for clear audio with distinct voices
- **PyannoteAI** — best diarization (Precision-2), recommended for same-gender speakers or when speaker attribution matters. Uses `minSpeakers=2, maxSpeakers=2` + Whisper large-v3-turbo for STT.
- **GigaAM** — local Russian ASR (MIT, Sber). Russian ASR runs locally without per-minute ASR charges. The complete pipeline is not local: audio is sent to the selected cloud diarizer, and transcript formatting uses Claude Code. Has **no diarization of its own** — speaker turns come from `--diarizer pyannote` (default, best) or `--diarizer deepgram`. Default checkpoint is `v3_rnnt`: raw lowercase text without punctuation, which the formatting skill cleans up anyway. `v3_e2e_rnnt` adds punctuation but has a noticeably higher WER.
  - `--mode window` (default) transcribes continuous speech with word timestamps and assigns speakers per word. `--mode turn` transcribes each diarization turn in isolation — kept for comparison, but measurably worse: feeding the model one-second fragments costs it function words ("не", "мне"), dropping agreement with Deepgram on sub-1.5s replies from 0.92 to 0.82.
  - Known limitation: the model is Cyrillic-only, so English terms come out transliterated (`PCC` → «писиси», `commitment` → «комитман»). Deepgram Nova-3 with `language: multi` handles those better.

## GigaAM setup
Requires a one-off Python environment (~4 GB, mostly CUDA torch):
```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install torch torchaudio \
  --index-url https://download.pytorch.org/whl/cu128
.venv/Scripts/python.exe -m pip install -r scripts/requirements.txt
```
The sidecar auto-detects `.venv`; override with `GIGAAM_PYTHON`. It falls back to CPU when no CUDA device is present. ffmpeg is taken from `imageio-ffmpeg` if not on PATH.

## Key Files
- `src/cli/transcribe.ts` — transcription CLI (multi-provider)
- `src/cli/generate-docx.ts` — DOCX generation CLI
- `src/transcription/deepgram.ts` — Deepgram API integration
- `src/transcription/pyannote.ts` — PyannoteAI API integration
- `src/transcription/gigaam.ts` — local GigaAM provider (spawns Python sidecar)
- `scripts/gigaam_asr.py` — GigaAM sidecar: chunking + batched inference
- `src/docx/generator.ts` — DOCX generation from template
- `src/types/index.ts` — all TypeScript types
- `.claude/commands/transcribe.md` — Claude Code skill

## Conventions
- No `console.log` — use `process.stderr.write`
- All types in `src/types/index.ts`
- Environment: `DEEPGRAM_API_KEY` and/or `PYANNOTE_API_KEY` in `.env`
