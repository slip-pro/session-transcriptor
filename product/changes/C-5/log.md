# C-5 log

## Slice 1
- Section heading on client page is «Встречи · N» built as text «Встречи ·» + the existing count badge span (kept the badge look from C-3); accessible name is «Встречи · N». Cost if wrong: cosmetic only.
- `today` for `clientMeta` is computed in workspace render with `Intl.DateTimeFormat("sv-SE")` per review m2; page left open past midnight shows stale «сегодня» until next render. Cost: negligible.
- Clients header count N counts clients of the current archive/in-work segment, ignoring the search query (so it reads as the total, not the filter result). Cost: none visible if wrong; one-line change.
- Added a CSS line making `.cc-client-reminder` block inside the client head (its old grid put the h2 beside the field). Cost: none.
- Browser test script takes subcommands `list`, `client-page`, `reading` (design wrote «client page»); `reading` is an empty stub for slice 2.
- Verification note: first browser run right after preview restart timed out on login; rerun after ~80 s passed (restart/rate-limit, not a code failure).
