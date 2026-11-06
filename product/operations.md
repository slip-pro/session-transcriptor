# Operations

Live branch: master
Deployed on: not configured

This describes the committed CLI checkout. No deployment procedure was found there. A separate
`.local/web` working copy exists; its current hosting and unfinished work were not changed.

## Outside integrations

The CLI calls transcription providers and formats output through Claude Code, according to
CLAUDE.md and package.json. Other consumers or integrations remain unknown. Existing local
credentials were not read or exercised; no audio or transcript was sent anywhere.

## Checks

`npm run test` and `npm run typecheck` come from package.json. They were not run for this installation;
the Vibeproof installation selftest checks the harness only.
## C-2 isolated UI review (verified 2026-11-04)
Actual browser source is `.local/web`, a separate dirty checkout. Do not replace or stage earlier work wholesale. Starting UI snapshot: `.local/c2-before`.
Run from `.local/web` with installed Node 24.22.1:
`C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe --import tsx scripts/cabinet-c2-demo.ts`
The helper seeds only `.local/web/.local/cabinet-c2-demo`, copies app/lib/public into sibling `.local/cabinet-c2-preview` with its own build output, binds loopback3104 and starts no worker. Existing preview3100 and data stay untouched. Readiness: GET /cabinet, sign in synthetic coach@example.test / Local-demo-coach-2026, heading «Запись встречи → Word». Refresh copied app after source edits or restart this helper. Stop only the process started by this helper after owner review.
Chrome checks: Node tests/cabinet-c2-smoke.cjs and tests/cabinet-c2-journey.cjs from `.local/web`; existing installed Chrome and bundled Playwright, no installs. Output/screenshots in root `.git/vibeproof-logs/c2-*`.

## C-3 notes (2026-11-06)
Use Node 24.22.1 (`C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`) for `npm test`: Node 24.22.0 from fnm lacks `stmt.columns` and 3 auth tests fail. Login on the preview rate-limits (429) after several quick logins — wait ~70 s between browser scripts. C-3 browser checks: tests/cabinet-c3-{home,roles,listen,visual}.cjs.

## C-5 notes (2026-11-06)
In Git Bash put Node 24.22.1 on PATH in `/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` form; the `C:/...` form leaves Node 22 first. Restart the 3104 preview by stopping only the helper's process tree (`node --import tsx scripts/cabinet-c2-demo.ts` → `next dev … --port 3104`; `taskkill /PID <helper> /T /F`), never `taskkill /IM node.exe` (it stops every Node process, incl. the 3100 preview). After a restart the browser session is lost — sign in again. C-5 browser check: tests/cabinet-c5-clients.cjs [list|client-page|reading]. `npm run lint` also scans preview artifacts under `.local/cabinet-c2-demo/site/.next-c2`.


## C-7 notes (2026-11-06)
Open the preview as http://localhost:3104 (127.0.0.1 fails sign-in). Preview 3104 serves a copy at `.local/cabinet-c2-preview`; after source edits in `.local/web` run `cp -r app/. ../cabinet-c2-preview/app/` from `.local/web` (next dev hot-reloads, no restart, no re-login). `diff -rq app ../cabinet-c2-preview/app` empty = in sync. Readiness: `node tests/cabinet-c6-meeting.cjs page` prints `ok page`. Rollback copies for C-7: `.local/c7-before/`.
