# C-2: Понятный следующий шаг во всём продукте
Status: agreed
Agreed: 2026-11-05 — «Окей, переноси в приложение. Только сохрани весь функционал и проверь, что правки действительно сохраняются после перезагрузки.»
Revised: transfer the accepted mockup into the real app and prove reload/server persistence; add separate optional meeting minutes without changing transcript duration.
Size: feature — existing workflows redesigned; additive persisted meeting minutes, no new recipient.
Why: an inexperienced coach uploads a recording, obtains Word, returns to a meeting and leaves a note without instruction.
Today: competing forms and technical choices throughout the product.
After: document-first journey with one main action per state and optional contextual tools.
Must stay true: existing clients, notes, structured digest, citations, bookmarks, independent document names, audio, JSON imports, retries, authentication, drafts and conflicts. No real data changes, provider calls, dependency changes or publication.
Scenarios:
- S-simple-1: login and home explain the task, one file entry, recent results and discoverable history/clients.
- S-simple-2: compact audio confirmation with remembered defaults and editable summary; no upfront speaker question; retries preserve metadata/identity.
- S-simple-3: JSON shares the picker without ASR; note/client creation begins with necessary fields.
- S-simple-4: unresolved roles show useful speech/audio before download, neutral export remains, unusual speaker counts supported.
- S-simple-5: ready session centres on Word; optional text review, one free note and structured tools on demand; existing content stays accessible.
- S-simple-6: reader preserves editing, playback, bookmarks, citations, search and return.
- S-simple-7: client opens preparation/history; edit/archive/delete/assignment remain contextual.
- S-simple-8: processing/error/empty states provide a next step without false completion.
- S-simple-9: desktop, 390/320px, keyboard, durable edits and reload work.
Won't do: publication, AI analysis, migration, new authentication or external services.

## Accepted transfer — 2026-11-05
Owner: «Окей, переноси в приложение. Только сохрани весь функционал и проверь, что правки действительно сохраняются после перезагрузки.» Latest standalone client/history and full meeting mockup accepted. Earlier report acceptance did not cover this transfer. Transfer accepted UX to actual React/API app, retain all C1/C2 capabilities and verify server persistence after reload plus independent context read. No deployment/ASR/live data. Optional meeting minutes distinct from transcript fragment duration included.


