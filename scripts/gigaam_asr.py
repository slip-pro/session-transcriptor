"""GigaAM v3 ASR sidecar.

Reads a job description as JSON from stdin, transcribes the audio with a
local GigaAM model and writes speaker-attributed segments to --out.

stdout is never used for data (third-party libs print there); all logs go
to stderr.

Two modes:

  window (default)
      Transcribe continuous windows of speech with word-level
      timestamps, then assign each word to a speaker by overlap with the
      diarization turns. The model sees whole phrases, so short
      acknowledgements keep their context.

  turn
      Transcribe every diarization turn in isolation. Simpler, but the
      model receives one-second fragments with no context and drops
      function words noticeably more often.

Job format (stdin):
    {
      "audioPath": "D:/path/to/audio.m4a",
      "model": "v3_rnnt",
      "mode": "window" | "turn",
      "device": "cuda" | "cpu" | null,
      "batchSize": 8,
      "segments": [
        {"speaker": "SPEAKER_00", "start": 1.24, "end": 5.40}
      ]
    }

Result format (--out):
    {
      "model": "v3_rnnt",
      "mode": "window",
      "device": "cuda",
      "elapsedSec": 42.1,
      "segments": [
        {"speaker": "SPEAKER_00", "start": 1.24, "end": 5.40,
         "text": "..."}
      ]
    }
"""

import argparse
import contextlib
import json
import os
import shutil
import sys
import time
from typing import List, Optional, Sequence, Tuple

SAMPLE_RATE = 16000

# GigaAM refuses `transcribe` above 25 s; stay clearly below it.
MAX_CHUNK_S = 20.0
# Never look for a split point earlier than this inside a chunk.
MIN_CHUNK_S = 12.0
# Diarization turns closer than this are one continuous speech region.
MERGE_GAP_S = 0.40
# Padding kept around a speech region so onsets are not clipped.
REGION_PAD_S = 0.20
# Turns shorter than this are almost always diarization noise.
MIN_SEGMENT_S = 0.20
# Window used when searching for the quietest split point.
SPLIT_WIN_S = 0.10


def log(msg: str) -> None:
    sys.stderr.write(f"{msg}\n")
    sys.stderr.flush()


def ensure_ffmpeg() -> None:
    """GigaAM shells out to `ffmpeg`; make sure one is on PATH.

    Falls back to the binary bundled with imageio-ffmpeg, copied next to
    the interpreter so it is discoverable as plain `ffmpeg`.
    """
    if shutil.which("ffmpeg"):
        return

    try:
        import imageio_ffmpeg
    except ImportError as exc:
        raise RuntimeError(
            "ffmpeg not found on PATH and imageio-ffmpeg is not installed. "
            "Install ffmpeg or run: pip install imageio-ffmpeg"
        ) from exc

    src = imageio_ffmpeg.get_ffmpeg_exe()
    target_dir = os.path.dirname(sys.executable)
    ext = ".exe" if os.name == "nt" else ""
    target = os.path.join(target_dir, f"ffmpeg{ext}")

    if not os.path.exists(target):
        shutil.copy2(src, target)
        log(f"  bundled ffmpeg installed at {target}")

    os.environ["PATH"] = target_dir + os.pathsep + os.environ.get("PATH", "")


def find_split(wav, lo: int, hi: int) -> int:
    """Return the quietest sample offset within [lo, hi).

    Used to cut a long stretch where the speaker is most likely pausing
    rather than mid-word.
    """
    import torch

    win = int(SPLIT_WIN_S * SAMPLE_RATE)
    if hi - lo <= win:
        return hi

    region = wav[lo:hi]
    frames = region.unfold(0, win, win)
    energy = frames.abs().mean(dim=1)
    return lo + int(torch.argmin(energy).item()) * win


def chunk_range(wav, start: int, end: int) -> List[Tuple[int, int]]:
    """Split [start, end) into chunks GigaAM can swallow."""
    max_len = int(MAX_CHUNK_S * SAMPLE_RATE)
    min_len = int(MIN_CHUNK_S * SAMPLE_RATE)

    chunks: List[Tuple[int, int]] = []
    cursor = start
    while end - cursor > max_len:
        cut = find_split(wav, cursor + min_len, cursor + max_len)
        chunks.append((cursor, cut))
        cursor = cut
    chunks.append((cursor, end))
    return chunks


def speech_regions(
    segments: Sequence[dict],
    total: int,
) -> List[Tuple[int, int]]:
    """Merge diarization turns into continuous speech regions."""
    spans = sorted(
        (
            (
                max(0, int((float(s["start"]) - REGION_PAD_S) * SAMPLE_RATE)),
                min(total, int((float(s["end"]) + REGION_PAD_S) * SAMPLE_RATE)),
            )
            for s in segments
        ),
        key=lambda x: x[0],
    )

    merged: List[Tuple[int, int]] = []
    gap = int(MERGE_GAP_S * SAMPLE_RATE)
    for start, end in spans:
        if end <= start:
            continue
        if merged and start - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def build_windows(wav, segments: Sequence[dict]) -> List[Tuple[int, int]]:
    """Continuous speech windows covering everything the diarizer heard."""
    windows: List[Tuple[int, int]] = []
    for start, end in speech_regions(segments, wav.numel()):
        windows.extend(chunk_range(wav, start, end))
    return windows


def build_turns(wav, segments: Sequence[dict]) -> Tuple[list, list]:
    """One chunk list per diarization turn, plus the owning turn index."""
    total = wav.numel()
    bounds: List[Tuple[int, int]] = []
    owners: List[int] = []
    skipped = 0

    for idx, seg in enumerate(segments):
        start = max(0, int(float(seg["start"]) * SAMPLE_RATE))
        end = min(total, int(float(seg["end"]) * SAMPLE_RATE))
        if end - start < MIN_SEGMENT_S * SAMPLE_RATE:
            skipped += 1
            continue
        for chunk in chunk_range(wav, start, end):
            bounds.append(chunk)
            owners.append(idx)

    if skipped:
        log(f"  skipped {skipped} turns shorter than {MIN_SEGMENT_S}s")
    return bounds, owners


def run_batches(
    model,
    wav,
    bounds: Sequence[Tuple[int, int]],
    batch_size: int,
    want_words: bool,
) -> List[tuple]:
    """Batched inference over waveform slices, input order preserved."""
    import torch
    from gigaam.utils import AudioDataset
    from torch.utils.data import DataLoader

    # Group similar lengths together so padding does not dominate.
    order = sorted(range(len(bounds)), key=lambda i: bounds[i][0] - bounds[i][1])
    pieces = [wav[bounds[i][0]:bounds[i][1]] for i in order]

    def run(items: list, size: int) -> List[tuple]:
        ds = AudioDataset(items, tokenizer=None)
        dl = DataLoader(
            ds,
            batch_size=size,
            shuffle=False,
            collate_fn=AudioDataset.collate,
        )
        out: List[tuple] = []
        for wav_pad, wav_lens in dl:
            wav_pad = wav_pad.to(model._device).to(model._dtype)
            wav_lens = wav_lens.to(model._device)
            encoded, encoded_len = model.forward(wav_pad, wav_lens)
            out.extend(
                model._decode(encoded, encoded_len, wav_lens, want_words)
            )
        return out

    results: List[tuple] = []
    step = max(1, batch_size)
    for offset in range(0, len(pieces), step):
        batch = pieces[offset:offset + step]
        try:
            results.extend(run(batch, step))
        except torch.cuda.OutOfMemoryError:
            log("  CUDA OOM — falling back to batch size 1 for this group")
            torch.cuda.empty_cache()
            results.extend(run(batch, 1))
        log(f"  transcribed {len(results)}/{len(pieces)} chunks")

    restored: List[tuple] = [("", None)] * len(bounds)
    for pos, original in enumerate(order):
        restored[original] = results[pos]
    return restored


def turn_at(start: float, end: float, segments: Sequence[dict]) -> int:
    """Index of the turn overlapping [start, end) most, else the nearest.

    Words are attached to whole diarization turns rather than regrouped
    by pauses, so the output keeps the same granularity the other
    providers produce.
    """
    best_overlap = 0.0
    best = -1
    for idx, seg in enumerate(segments):
        overlap = min(end, seg["end"]) - max(start, seg["start"])
        if overlap > best_overlap:
            best_overlap = overlap
            best = idx

    if best >= 0:
        return best

    center = (start + end) / 2
    return min(
        range(len(segments)),
        key=lambda i: min(
            abs(center - segments[i]["start"]),
            abs(center - segments[i]["end"]),
        ),
    )


def words_to_segments(words: list, segments: Sequence[dict]) -> List[dict]:
    """Attach transcribed words back to their diarization turns."""
    if not segments:
        return []

    texts = ["" for _ in segments]
    for word, start, end in words:
        idx = turn_at(start, end, segments)
        texts[idx] = f"{texts[idx]} {word}".strip()

    return [
        {
            "speaker": seg["speaker"],
            "start": seg["start"],
            "end": seg["end"],
            "text": texts[idx],
        }
        for idx, seg in enumerate(segments)
        if texts[idx]
    ]


def transcribe_window_mode(
    model,
    wav,
    segments: Sequence[dict],
    batch_size: int,
) -> List[dict]:
    windows = build_windows(wav, segments)
    if not windows:
        raise RuntimeError("No usable audio in the diarization segments")

    log(f"Transcribing {len(windows)} windows (batch={batch_size})...")
    decoded = run_batches(model, wav, windows, batch_size, True)

    words: List[Tuple[str, float, float]] = []
    for (start, _end), (_text, chunk_words) in zip(windows, decoded):
        offset = start / SAMPLE_RATE
        for word in chunk_words or []:
            words.append((word.text, offset + word.start, offset + word.end))

    words.sort(key=lambda w: w[1])
    log(f"  {len(words)} words, assigning speakers...")
    return words_to_segments(words, segments)


def transcribe_turn_mode(
    model,
    wav,
    segments: Sequence[dict],
    batch_size: int,
) -> List[dict]:
    bounds, owners = build_turns(wav, segments)
    if not bounds:
        raise RuntimeError("No usable audio in the diarization segments")

    log(f"Transcribing {len(bounds)} turn chunks (batch={batch_size})...")
    decoded = run_batches(model, wav, bounds, batch_size, False)

    merged = ["" for _ in segments]
    for owner, (text, _words) in zip(owners, decoded):
        text = text.strip()
        if text:
            merged[owner] = f"{merged[owner]} {text}".strip()

    return [
        {
            "speaker": seg["speaker"],
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": merged[idx],
        }
        for idx, seg in enumerate(segments)
        if merged[idx]
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    job = json.load(sys.stdin)
    audio_path: str = job["audioPath"]
    model_name: str = job.get("model") or "v3_rnnt"
    mode: str = job.get("mode") or "window"
    device: Optional[str] = job.get("device")
    batch_size: int = int(job.get("batchSize") or 8)
    segments: List[dict] = [
        {
            "speaker": s["speaker"],
            "start": float(s["start"]),
            "end": float(s["end"]),
        }
        for s in job["segments"]
    ]

    if mode not in ("window", "turn"):
        raise ValueError(f"Unknown mode: {mode}")

    ensure_ffmpeg()

    # Third-party imports print progress bars and notices to stdout.
    with contextlib.redirect_stdout(sys.stderr):
        import torch
        import gigaam

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        if device == "cuda":
            log(f"Device: cuda ({torch.cuda.get_device_name(0)})")
        else:
            log("Device: cpu")

        log(f"Loading GigaAM {model_name} (first run downloads ~450 MB)...")
        model = gigaam.load_model(model_name, device=device)

        log(f"Decoding audio: {os.path.basename(audio_path)}")
        wav = gigaam.load_audio(audio_path)
        duration = wav.numel() / SAMPLE_RATE
        log(
            f"  {duration / 60:.1f} min, {len(segments)} turns, mode={mode}"
        )

        started = time.time()
        if mode == "window":
            result_segments = transcribe_window_mode(
                model, wav, segments, batch_size,
            )
        else:
            result_segments = transcribe_turn_mode(
                model, wav, segments, batch_size,
            )
        elapsed = time.time() - started

    result = {
        "model": model_name,
        "mode": mode,
        "device": device,
        "elapsedSec": round(elapsed, 1),
        "segments": result_segments,
    }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False)

    speed = duration / elapsed if elapsed > 0 else 0
    log(f"Done in {elapsed:.1f}s ({speed:.1f}x realtime)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # surfaced to the Node side verbatim
        log(f"FATAL: {type(exc).__name__}: {exc}")
        sys.exit(1)
