# C-2 transfer verification matrix —2026-11-05

This is the required evidence checklist, not a passing report. Fill observed outcomes only.

| Scenario | UI operation | Independent proof |
|---|---|---|
| Client name/request | Name profile edit | Reload + fresh authenticated context client API |
| Client reminder | Direct text edit/blur | Client.notes server field; quick reload recovery; error never Saved |
| Session note | Result direct text edit | Reload and new context GET session |
| History note | Row direct text, filter away immediately | Correct session id saved, other row unchanged; fresh GET |
| Transcript | Direct text correction | Reload current utterance; Word current text; original immutable |
| Speaker roles | Change speaker role | All same speaker turns and fresh API mapping |
| Structured notes | Discussed/next/reflection edit | Fresh session digest after reload |
| Agreements | Create/edit/status/undo | Fresh digest status/text after reload |
| Bookmark/citation | Exact cross-row excerpt + comment | Literal quote/offset, server source revision/staleness and comment |
| Metadata | Independent names/date/language | Fresh document fields; client unchanged; real Word XML |
| Duration | User minutes | Reload meetingMinutes; transcript duration unchanged; processing retention unit |
| Client association | Rebind/unlink | Fresh clientId and list/preparation update; document name unchanged |
| History | 20 isolated fixtures, fifth load, hidden search | Query/extent/scroll Back, no regular-app fixture injection |
| Audio | Technical WAV attach/play/speed/source seek/remove | API audio metadata/file and persistence; text/notes retained |
| Import | Synthetic JSON and last-job capability | No ASR; owned source preserved |
| Failure/conflict | Failed POST, retry, concurrent same-field edits | Honest pending/error; no silent overwrite; existing editor negative tests |
| Quick reload | Input->blur->immediate reload | Fresh context eventual server field; not only local draft display |
| Security | Owner/origin/auth regressions | Existing API tests with separate owner |
| Visual | Client/result/reader/notes/selection | Actual app desktop320/390 screenshots reviewed against accepted mockup |

No live provider, production data, paid retry, physical phone or publication is authorized by these fixtures. Save/recovery controls in the application are real; mockup simulation panel must not be copied.
