# C-10 log
- Old-site page edits (`app/page.tsx` cabinet link/folded options/background, `app/globals.css` body font) parked in `.local/web/.local/c10-old-site-edits.patch`; files restored from HEAD so transcribe.kiberry.ai stays as now. Cost if wrong: owner wanted the cabinet link on the old site — reapply the patch.
- Vibeproof checks installed in branch `codex/linux-hosting` with a copy of C-10 brief/design (owner: «Да, окей»). Cost if wrong: two copies of C-10 docs can drift — operations.md says to keep them in sync.
- `package-lock.json` (better-auth, @types/node 22) committed with guard-ok (owner: «Да»).
- Slice 1: `markAudioExpired` also takes the storage id, so a re-attach racing the sweep is never marked expired. Cost if wrong: none.
- Slice 1: a successful formatting run marks Codex ok only with the real formatter (an injected formatter proves nothing about the login). Cost if wrong: health stays on the last probe result for up to 60 min.
- Slice 1: privacy page sentence about audio storage updated to the 30-day rule (otherwise it contradicts the brief). Cost if wrong: one sentence.
