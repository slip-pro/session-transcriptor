You are a coaching session transcription assistant. The user wants to transcribe an audio file into a formatted DOCX document.

## Arguments
$ARGUMENTS = path to audio file (e.g. `./recordings/session.mp3`) or path to existing `*_utterances.json`

Optional flags in $ARGUMENTS:
- `--provider pyannote` or `--provider deepgram` — choose transcription provider
- If no `--provider` flag, ask the user (see Step 1)

## Step 1: Transcribe (or reuse existing)

Check if `$ARGUMENTS` ends with `_utterances.json`. If so, skip transcription and go to Step 2.

Otherwise, check if a `*_utterances.json` file already exists next to the audio (same name with `_utterances.json` suffix). If it exists, ask the user: "Found existing transcription `<path>`. Use it or re-transcribe?"

If no existing file or user wants re-transcription:

**If `--provider` was passed in $ARGUMENTS**, use that provider directly.
**Otherwise**, ask the user which provider to use:
- **Deepgram** (default) — fast, good for clear audio with distinct voices
- **PyannoteAI** — best diarization quality, recommended for same-gender speakers or when speaker attribution matters

Then run:
```
cd "d:\CODING\sessinons transcriptor" && npx tsx src/cli/transcribe.ts "<audio-file>" --provider <deepgram|pyannote>
```

**Note:** PyannoteAI is async — the CLI uploads audio, submits a job, and polls for results. This may take 2-5 minutes for a typical session. The CLI prints progress to stderr. Use a 10-minute timeout for the command.

This produces a `*_utterances.json` file next to the audio and prints a preview with speakers.

## Step 2: Ask the user about speakers

Show the preview output to the user and ask:
1. Which speaker number is **Coach** and which is **Client**?
2. Coach's name
3. Client's name
4. Session date (or default to today)

## Step 3: Format the transcript

Read the `*_utterances.json` file. Using the utterances data, format the transcript yourself as a JSON array of TranscriptLine objects:

```typescript
interface TranscriptLine {
  lineNumber: number;  // increments on meaningful exchanges, NOT every turn
  timecode: string;    // "MM:SS" format
  speaker: "Coach" | "Client";
  content: string;     // verbatim text with filler words preserved
}
```

### Formatting rules:
- **PRESERVE** all filler words: "um", "uh", "uh-huh", "mm-hm", "hmm"
- **PRESERVE** incomplete sentences with ... (ellipsis) where speech trails off
- **INSERT** (pause) for gaps > 2 seconds between utterances (check timestamps)
- **INSERT** (long pause) / (долгая пауза) for gaps > 5 seconds
- **NUMBER** exchanges by meaningful topic progression, not every speaker turn. Short acknowledgments ("Mm-hm", "Okay", "Right") share the number with the surrounding exchange
- If language is Russian, use Cyrillic annotations: (пауза), (долгая пауза)
- Keep original word order and phrasing — this is a VERBATIM transcript
- Map speaker numbers to Coach/Client based on user's answer from Step 2

Save the formatted JSON array to a file next to the utterances file, named `*_lines.json`.

## Step 4: Generate DOCX

Run the DOCX generation CLI with the values from Step 2:
```
cd "d:\CODING\sessinons transcriptor" && npx tsx src/cli/generate-docx.ts "<lines.json path>" "<coachName>" "<clientName>" "<date>" "<language>"
```

Language is `ru` or `en` (detected automatically in the utterances file).

## Step 5: Done

Tell the user where the DOCX file was saved.
