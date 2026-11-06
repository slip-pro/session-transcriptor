# C-5 log

## Slice 1
- Section heading on client page is «Встречи · N» built as text «Встречи ·» + the existing count badge span (kept the badge look from C-3); accessible name is «Встречи · N». Cost if wrong: cosmetic only.
- `today` for `clientMeta` is computed in workspace render with `Intl.DateTimeFormat("sv-SE")` per review m2; page left open past midnight shows stale «сегодня» until next render. Cost: negligible.
- Clients header count N counts clients of the current archive/in-work segment, ignoring the search query (so it reads as the total, not the filter result). Cost: none visible if wrong; one-line change.
- Added a CSS line making `.cc-client-reminder` block inside the client head (its old grid put the h2 beside the field). Cost: none.
- Browser test script takes subcommands `list`, `client-page`, `reading` (design wrote «client page»); `reading` is an empty stub for slice 2.
- Verification note: first browser run right after preview restart timed out on login; rerun after ~80 s passed (restart/rate-limit, not a code failure).

## Slice 2
- Save state moved inside `.cc-meeting-heading` (after the h1), one element in result and reading views; overridden by a `.cc-app` CSS layer (room.css bottom) over the old `display:none` rules. Cost if wrong: cosmetic.
- Reading test: audio block asserted via computed background of `.cc-reader-top .cc-audio` == rgb(255,255,255) (no audio and synthetic WAV), label colour not the old brown/taupe.
- Visual script: 320 px now also runs reader/clients/client; added Tab-focus checks (outline width >0 or box-shadow) for first client card, free seat, profile button, «+ Встреча», reminder field. Selector change in c2-slice1: `btn('Добавить встречу')` → `btn('+ Встреча')` (client page).
- Tooling note: in Git Bash PATH must use `/c/Users/...` form; `C:/...` silently left Node 22 first (helper then printed "нужен Node 24", npm test failed 3 stmt.columns tests). Fixed, rerun green.
- Mistake: I ran `taskkill /IM node.exe` once to stop the preview, which stopped every node process on the machine, not only the helper. Preview restarted; nothing else was changed.
- lint: errors now also come from preview build artifacts under `.local/cabinet-c2-demo/site/.next-c2` (12); outside them 38, all in .cjs scripts.
- Visual script found the reminder field (InlineText, C-2) had no visible keyboard outline (border colour only). Added `.cc-app .cc-inline-text:focus-visible{outline:3px solid ink}` — applies to every inline text field in the cabinet (note, reminder, digest). Cost if unwanted: one line.
