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

## C-10 notes (2026-11-11)
Web app code is the git worktree `.local/web` of this same repository, branch `codex/linux-hosting` (local only; push needs the owner's separate «да»). Vibeproof checks are installed there too (commit 32a3d6b, copy of this branch's version plus `product/changes/C-10` and `product/settings.md`); commits there run the same commit check. Keep its `product/changes/C-10` in sync with this branch when the brief or design changes.
Readiness in `.local/web` (Git Bash): `export PATH="/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"`, then `npm test` (baseline 86 pass, 1 skipped), `npm run typecheck` (0), `npm run lint` (baseline 53 errors, all in `.local/**` and `tests/*.cjs`; fixed by C-10 slice 1). ffmpeg from PATH (winget build, has libopus). Docker 29.8.2 available. Logs to `.git/vibeproof-logs/c10-*`.

## C-10 live run (2026-11-11)
Real recording through the cabinet with real Deepgram and Codex, on this computer. Everything lives in `.local/web/.local/c10-live/` (gitignored). Run from `.local/web` in Git Bash after `export PATH="/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"` (Node 24.22.1).
- `run.env` (mode 600, never printed or committed): `DATA_DIR=<…>/c10-live/data`, random `CABINET_AUTH_SECRET`, `CABINET_URL=http://localhost:3110`, `CODEX_BIN=C:/Users/user/.codex/plugins/.plugin-appserver/codex.exe`. `node .local/c10-live/setup.cjs` writes it plus `account.json` (synthetic `coach-c10@example.test`, generated password). `CODEX_BIN` matters: the `codex` 0.36.0 on PATH (npm) rejects `--disable` and fails on this computer's `~/.codex/config.toml` (`mcp_servers.holst` has no `command`); the app's 0.167.0 build works with it. Default Codex home is used; never copy or move `~/.codex/auth.json`.
- Account: `node --env-file=.local/c10-live/run.env --import tsx scripts/cabinet-user.ts < .local/c10-live/account.json`.
- Start: `L="$(cd "$(git rev-parse --git-path vibeproof-logs)" && pwd -W)"; node .local/c10-live/start.cjs web "$L"; node .local/c10-live/start.cjs worker "$L"` (prints the PIDs; loads `run.env` and the root `.env` into the child's environment only; `--env-file` on `next dev` itself fails: not allowed in NODE_OPTIONS). Web = `next dev --port 3110`, worker = `node --import tsx scripts/worker.ts`. Logs `c10-s3-web.log`, `c10-s3-worker.log` in the worktree's vibeproof-logs. A killed worker leaves a lease: wait 90 s before restarting it.
- Readiness: `curl -s localhost:3110/cabinet` returns the sign-in page (HTTP 200, «Войти в кабинет»); `curl -s localhost:3110/api/health` has `"worker":"ok"`. `status` must be `ok`; with a revoked Codex login it is `codex_login_failed` (HTTP 503) — seen live 2026-11-11.
- Paid checks (deliberate, not in loops): `node --import tsx scripts/c10-compare-asr.ts "<audio>" "<root .env>"` (first 180 s as WAV and Opus, prints sizes and word agreement only, ≈ $0.02, pass ≥ 0.95) and `node tests/cabinet-c10-live.cjs audio-to-word` (full recording, ≈ $0.20; refuses to upload while health shows `codex_login_failed`; saves `c10-live.docx` and `timings.json` there).
- Stop: `taskkill //PID <pid> //T //F` for the two start.cjs PIDs only; never `taskkill /IM node.exe`. Previews 3100/3104 are separate.

## C-11 notes (2026-11-18)
Local preview of the current site: a copy at `.local/web/.local/c11-preview/site` served by `next dev` on http://localhost:3111 (port 3110 may hold a leftover C-10 dev server from another directory); data in `.local/c11-preview/data`, `run.env` with a synthetic secret and `MAIL_TRANSPORT=outbox` (letters as JSON in `data/outbox/`, the link is the first URL in `text`). After source edits: `sh .local/c11-preview/sync.sh` from `.local/web`. Start: `node .local/c11-preview/start.cjs "<logs dir>"`; stop only its PIDs. Test accounts: `.local/c11-preview/accounts.md` (gitignored). Rate limits: sign-in 5/min, sign-up 3/min — wait ~70 s between browser scripts. Production needs `MAIL_TRANSPORT=smtp` and SMTP_* / MAIL_FROM (see `.local/web/deploy/README.md`), otherwise the site refuses to start. A second guard-ok for the same lockfile needs the previous used line removed in an earlier commit (the commit check counts only a line absent before).

## C-14 notes (2026-11-19)
- Same preview as C-13 (preview folder is `.local/web/.local/c11-preview`). After code changes run `sh .local/c11-preview/sync.sh`; the listening PID of 3111 changes on sync.
- Browser check: `node tests/c14-edit.cjs [create] [move] [cancel] [not-own] [failure] [layout] [drag]` — runs in an Asia/Yekaterinburg browser, reconnects the fake calendar itself, removes the meetings it made. One sign-in per run (limit 5/min).
- The fake Google has test-only `POST /__flags` (failWrite500, forbidWrite403, failAfterWrite500, …), `GET /__events`, `GET /__log`. Restarting the fake drops its events and tokens.

## C-13 notes (2026-11-19)
Preview of the schedule tab = the C-11 preview plus a fake Google as its own process. Run from `.local/web` with Node 24 on PATH (`/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`).
- `.local/c11-preview/run.env` carries `GOOGLE_CLIENT_ID/SECRET` (fake values) and `GOOGLE_OAUTH_BASE/TOKEN_URL/REVOKE_URL/API_BASE` -> `http://127.0.0.1:3121/...` (accepted only because `CABINET_URL` is localhost).
- Start: `sh .local/c11-preview/sync.sh`, then `node .local/c11-preview/start.cjs "<logs dir>"` — prints the fake Google PID (port 3121, `tests/helpers/fake-google-server.ts`, events relative to this week) and the web PID (3111). If the web PID is gone a few seconds later (seen once), start only the web part again; the log is `c11-s3-web.log` in the logs dir.
- Ready when: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3111/cabinet?view=schedule` gives 200 (the first request compiles, allow up to a minute) and `netstat -ano | grep -E ":(3111|3121) "` shows both ports LISTENING; the fake logs `fake-google ready` in `c13-fake-google.log`.
- Sign in as `coach@example.test` (`.local/c11-preview/accounts.md`), open «Расписание», «Подключить Google Календарь» — the fake "Google" redirects back at once; tick both calendars. The fake's events are in memory: restart it to move them to a new week.
- Browser check: `node tests/c13-schedule.cjs [connect] [week] [assign]` (logs and screenshots in `.git/vibeproof-logs/c13-*`); it needs the preview and the fake running, one sign-in per run (limit 5/min).
- Stop: `taskkill /PID <pid> /T /F` for the web and the fake PIDs only (the listening PID of 3111 from `netstat -ano` may be a child of the printed one); never `taskkill /IM node.exe`.
