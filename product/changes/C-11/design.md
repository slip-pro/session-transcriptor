# C-11 design: главная и аккаунты транскрибатора

Code lives in the worktree `.local/web` (branch `codex/linux-hosting`, same repo). Paths below are relative to `.local/web` unless they start with `product/`.

## Map

Read in code (2026-11-18), unless marked otherwise.

- **Auth.** `lib/cabinet/auth.ts` — one better-auth 1.7.16 instance (`createCabinetAuth(db, {secret,url,allowSignUp})`) on the cabinet SQLite DB (`lib/cabinet/store.ts`, `getCabinetStore().db`), basePath `/api/cabinet/auth`, cookie prefix `coach-cabinet`, email+password, `disableSignUp: !allowSignUp`, min password 12, rate limit in DB (sign-in 5/min). `getCabinetAuth()` caches and runs `getMigrations` on first use. `requireCoach(request)` is the **single gate** of all 15 cabinet API routes (`grep requireCoach app`).
- **Auth route.** `app/api/cabinet/auth/[...all]/route.ts` returns 403 `SIGN_UP_DISABLED` for any `/sign-up` path, checks Origin on POST (`requireOrigin`, `lib/cabinet/http.ts`), caps body at 4096 bytes.
- **Who creates users.** `scripts/cabinet-user.ts` (owner command, via `deploy/cabinet-user.sh`; `allowSignUp:true` + `auth.api.signUpEmail`; `--reset-password` writes `account.password` directly). Also `scripts/cabinet-demo.ts`, `scripts/cabinet-c2-demo.ts` and tests `tests/cabinet.test.ts`, `cabinet-recordings.test.ts`, `cabinet-materials.test.ts` (all `allowSignUp:true` + `signUpEmail`). No other writer of `"user"`.
- **Cabinet UI.** `app/cabinet/ui/workspace.tsx`: `Workspace` loads `/me` (l.112–120) and shows `Login` (l.203–212) when signed out; `signedIn()` (l.132) calls `/me`. `Login` markup = the start screen in the brief (`.cc-login`, `.cc-login-intro`, `.cc-login-card`, styles in `app/cabinet/room.css` l.10, 50–52, 214–215). Download button text «Скачать Word» lives in the cabinet result card (S-simple-5; find with `grep -rn "Скачать Word" app`).
- **Old transcriber.** `app/page.tsx` (360 lines, client, RU/EN) + `lib/use-transcript-job.ts` (job id + 64-hex token kept in `localStorage`, calls `/api/jobs`, `/api/jobs/[id]`, `/download`, `/retry` with `Authorization: Bearer`). Server: `lib/jobs.ts` (`reserveUpload`, `receiveUpload`, `readJob`, `retryJob`, `authorizedJob`, 24 h `RETENTION`, queue budget 10 GiB) and routes `app/api/jobs/**`. Word file: `<jobDir>/transcript-icf.docx`.
- **Worker.** `scripts/worker.ts`: one loop takes `queued` jobs, `processJob` (`lib/pipeline.ts`), then `syncAllProcessing()`; a 60 s interval runs `syncAllProcessing(); cleanupExpired()` etc. `cleanupExpired` deletes job dirs 24 h after the last update — so anything that must survive (the free count) must be copied into the DB, exactly as the cabinet does.
- **Pattern to copy for owned jobs.** `lib/cabinet/processing.ts`: a DB link row holds `jobId` + server-side `token`; `uploadRecording` reserves with that token, sets `job.cabinet = {ownerId, sessionId}`, streams with `receiveUpload`; `syncProcessing` reads the job, verifies the token, copies state into the DB; `syncAllProcessing` is called by the worker. This is the current standard (C-10), not legacy.
- **Gate in front.** `deploy/nginx.conf`: `/cabinet`, `/_next/static/`, `/cabinet-room.svg`, `/api/cabinet/**` are public (app auth); everything else — `/`, `/api/**` (incl. `/api/jobs`) — sits behind `auth_request /_access_check` (shared password «Для своих», `lib/access.ts`, `app/api/access/route.ts`); `/` shows `deploy/maintenance/index.html` on 401, whose form does `location.replace('/')` after login. Upload routes have `limit_req`/`limit_conn` zones `transcriber_submit`, `transcriber_global`, `transcriber_upload_*`.
- **Tests.** `npm test` = `node --import tsx --test tests/*.test.ts`; tests call route handlers directly with `new Request(...)`, set `DATA_DIR`/`CABINET_DATA_DIR`/`CABINET_URL`/`CABINET_AUTH_SECRET` to a temp dir under `.local/cabinet-tests`, and stub recognition via `processJob(job, owned, deps)` (`tests/cabinet-recordings.test.ts` l.20–60 is the example). Browser scripts are `tests/*.cjs` with bundled Playwright + installed Chrome; nginx/Docker checks in `tests/cabinet-c10-docker.sh` (`old-site` block l.316+). Node 24.22.1 recipe and preview rules: `product/operations.md` (C-3, C-5, C-10 notes). Baseline: 86 pass, 1 skipped; typecheck 0.
- **better-auth 1.7.16 facts** (read in `node_modules/@better-auth/core/dist/types/init-options.d.mts` and `better-auth/dist/api/routes/*.mjs`): `emailVerification.{sendVerificationEmail, sendOnSignUp, autoSignInAfterVerification, expiresIn}`; `emailAndPassword.{requireEmailVerification, sendResetPassword, resetPasswordTokenExpiresIn, revokeSessionsOnPasswordReset, autoSignIn}`; endpoints `/sign-up/email`, `/verify-email`, `/send-verification-email`, `/request-password-reset`, `/reset-password`. With `autoSignIn:false` sign-up of an existing email returns a generic synthetic success (`sign-up.mjs` l.155–200) — no enumeration. `user.additionalFields` with `input:false` cannot be set by sign-up or update-user.

Weak spots: no mail sending anywhere yet; `requireEmailVerification:true` would also lock out invited coaches whose `emailVerified` is false today — avoided below.

## Options

1. **Leave as is / smallest:** keep the shared password and add a counter per browser. Rejected: no accounts, free count resettable by clearing storage; brief needs sign-up.
2. **Separate auth instance for the transcriber** (own tables, cookie, basePath). Clean separation, but two user bases to merge when the cabinet opens (D20 says it will), double config, double rate-limit and reset plumbing.
3. **One auth, a `cabinetAccess` flag, transcriber jobs linked like cabinet jobs (chosen).** Reuses the existing instance, the link-row pattern and the worker sync. Undo: drop routes and the flag; data tables are additive.

## Decision

Option 3. Public sign-up opens on the existing instance; who enters the cabinet is decided by a server-side flag that only the owner command sets. The free count is a DB fact written when a job is first seen completed, so it survives job deletion.

## Program design

**Auth (`lib/cabinet/auth.ts`)**
- `createCabinetAuth(db, settings: { secret; url; allowSignUp?: boolean; public?: boolean })`. `allowSignUp:true` (owner script, tests, demos) stays the invite path; `public:true` is used only by `getCabinetAuth`.
  - `user.additionalFields.cabinetAccess: { type: "boolean", defaultValue: !settings.public, input: false }` and `consentAt: { type: "date", required: false, input: false }` — invite-path users get the cabinet; public sign-ups do not.
  - `public:true`: `disableSignUp:false`, `autoSignIn:false`, `minPasswordLength:10`, `emailVerification: { sendOnSignUp:true, autoSignInAfterVerification:true, expiresIn: 24h, sendVerificationEmail → mail }`, `sendResetPassword → mail`, `resetPasswordTokenExpiresIn: 1h`, `revokeSessionsOnPasswordReset:true` (already). **Not** `requireEmailVerification` (would lock invited coaches). `advanced.backgroundTasks.handler` runs mail sending without awaiting it (errors logged as `MAIL_SEND_FAILED`, no address in the log), so a new and a duplicate sign-up, and a reset for a known and an unknown address, take the same time.
  - Rate limits add `"/sign-up/email"` 3/min, `"/request-password-reset"` 3/min, `"/send-verification-email"` 3/min.
- Backfill as one statement in the `CabinetStore` constructor, before better-auth migrations ever run: if table `user` exists and lacks column `cabinetAccess`, `ALTER TABLE "user" ADD COLUMN cabinetAccess INTEGER NOT NULL DEFAULT 1` (all existing users are invited — sign-up never existed). New rows still get `false` because better-auth writes the default itself. `scripts/cabinet-user.ts` keeps refusing an email that already exists (it must never grant the cabinet to a password someone else set); for the user it creates it sets `emailVerified=1` and `cabinetAccess=1`.
- `requireCoach(request)`: after session, `if (!session.user.cabinetAccess) throw new CabinetError("CABINET_INVITE_ONLY", 403)`.
- `requireTranscriber(request) → { id, email, emailVerified }`: session required (401 `UNAUTHORIZED`); any account, invited or not.
- Auth route: remove the blanket `/sign-up` 403; keep Origin check and body cap. For `/sign-up/email` require `consent === true` in the parsed body (else 400 `CONSENT_REQUIRED`), strip `consent` before passing on, and after a successful sign-up of a new user set `consentAt` (a `databaseHooks.user.create.before` reading a request-scoped flag, or a direct `UPDATE` by email right after the call — builder's choice; test the stored value).

**Mail (`lib/mail.ts`, new)**
- `type Mail = { to: string; subject: string; text: string }`; `sendMail(mail): Promise<void>` picks by `MAIL_TRANSPORT` (the only switch; no injected mailer): `outbox` (writes `<DATA_DIR>/outbox/<time>-<uuid>.json`, mode 600; for tests and local preview) or the owner's provider (see «Open»). Missing/unknown transport → throws `MAIL_NOT_CONFIGURED`; `getCabinetAuth` in `NODE_ENV=production` refuses `outbox`.
- Russian texts: «Подтверди почту для транскрибатора» / «Новый пароль для транскрибатора»; body = one link + «Если это был не ты — просто удали письмо». Nothing about recordings. Links point to `${CABINET_URL}/api/cabinet/auth/verify-email?token=…&callbackURL=/transcriber` and to `/transcriber?mode=reset&token=…` (the only reset address).

**Transcriber jobs (`lib/transcriber.ts`, new; table in the cabinet DB)**
- `transcriber_jobs(id TEXT PK, userId TEXT, jobId TEXT UNIQUE, token TEXT, filename TEXT, createdAt TEXT, state TEXT, error TEXT, countedAt TEXT NULL)`, index on `userId`. Created in `CabinetStore` constructor next to the other `CREATE TABLE IF NOT EXISTS`.
- `FREE_LIMIT = 3`.
- `usage(userId) → { used: number; pending: number; left: number }`: `used` = rows with `countedAt`; `pending` = rows without `countedAt` whose state is not final and created < 24 h ago. Final = `completed`, job gone, or `failed` with `!retryable || attempts >= 5`. **Shown** `left = max(0, 3 - used)` — only a ready Word lowers it. **Upload allowed** only if `used + pending < 3`; when `used < 3` but the slots are taken by unfinished records → 409 `FREE_SLOTS_BUSY` «Дождись готовности текущих записей»; when `used >= 3` → 403 `FREE_LIMIT_REACHED`.
- «Отмена» in the brief = an interrupted upload (page closed or connection dropped mid-upload): `receiveUpload` marks it `failed/UPLOAD_FAILED`, not retryable → final, never counted, frees its slot. No cancel button is added (the old site has none; the brief didn't ask for one).
- `startUpload(userId, request)`: requires `emailVerified` (403 `EMAIL_NOT_VERIFIED`); in `BEGIN IMMEDIATE` checks the upload rule above and inserts the row (jobId = randomUUID, token = 32 random bytes hex); then `reserveUpload(jobId, token, metadata)` + `receiveUpload` exactly like `uploadRecording`; sets `job.transcriber = { ownerId: userId }` (add optional field to `Job` in `lib/jobs.ts`). Metadata/headers: same as old `POST /api/jobs` (`X-File-Size`, `X-Job-Metadata`).
- `syncTranscriber()`: for rows without `countedAt`: `readJob` + token check → copy `state/error`; if `completed` → `countedAt = now`. Job missing → state `expired`. Called by the worker right after `syncAllProcessing()` (both places) and on every list request.
- `listJobs(userId)` → rows of the last 24 h with `{ id, filename, state, error, retryable, createdAt, expiresAt }`; `download(userId, id)`, `retry(userId, id)` → look up the row by `userId` **and** id (else 404 `NOT_FOUND`), then the same file/`retryJob` logic as `app/api/jobs/[id]/**`.
- Routes (all `requireTranscriber`, Origin check on POST, `Cache-Control: private, no-store`): `GET/POST /api/transcriber/jobs`, `GET /api/transcriber/jobs/[id]/download`, `POST /api/transcriber/jobs/[id]/retry`, `GET /api/transcriber/me` → `{ email, emailVerified, cabinetAccess, used, pending, left, limit: 3 }`.

**Pages**
- Extract `Login` from `workspace.tsx` into `app/cabinet/ui/login.tsx`; add below the existing card a second card `.cc-login-card.cc-transcriber-card` (same card, quieter: h2 20px, muted text, outline button «Начать бесплатно» → `/transcriber?mode=sign-up`, link «Уже есть аккаунт» → `/transcriber?mode=sign-in`). Left block untouched; remove the «К транскрибатору» link. Right column becomes a flex column of the two cards. `Workspace` uses it unchanged (`signedIn` prop). `CABINET_INVITE_ONLY` is handled in two places: inside `Login.submit` (sign-in succeeded but `signedIn()` got 403 → call `/auth/sign-out`, show «Кабинет пока открыт по приглашению. Транскрибатор — в блоке ниже», not the wrong-password text) and in the bootstrap `/me` (l.112–120: same message, stay on the login screen).
- `app/page.tsx` → the start page: `cc-app` + `room.css` + `<Login signedIn={() => location.assign("/cabinet")} />`.
- Old transcriber moves to `app/svoi/page.tsx` (same file contents, no behaviour change).
- `app/transcriber/page.tsx` (client): signed out → modes `sign-up` (email, password, consent checkbox linking `/cabinet/privacy`; name sent = email local part), `sign-in` (with «Забыли пароль?»), `forgot`, `reset` (token from query), `check-mail`; all in the `cc-login` look. Signed in → header with email and «Выйти», line «Осталось бесплатных записей: N из 3», the same upload form as the old page, own list for 24 h with «Скачать Word в формате ICF для менторинга». Not verified → upload hidden, «Подтверди почту — ссылка в письме» + «Отправить письмо ещё раз». `used >= 3` → form replaced by «Бесплатные записи закончились. Подписка 350 ₽ в месяц появится совсем скоро»; slots busy → form disabled with «Дождись готовности текущих записей».
- `/svoi` = `app/page.tsx` moved **unchanged** (with `use-transcript-job.ts`): it is transitional until its users migrate, so no refactor risk. `/transcriber` gets its own upload form `app/transcriber/upload-form.tsx` copying the old page's fields (coach/client names, date, document language, audio language, who speaks first, file; limits «До 500 МБ и 3 часов. Два спикера.») and progress texts, RU only, in the cabinet look; a small account hook `app/transcriber/use-account-jobs.ts` (upload, poll list, download, retry).
- Privacy text `app/cabinet/privacy/page.tsx`: add a short «Транскрибатор» section — email and password hash, what is counted, recordings and Word 24 h, letters sent via the mail provider.

**Gate (`deploy/nginx.conf`)**: `location /` becomes public (no `auth_request`); new `location ^~ /svoi` with `auth_request` + `error_page 401 =200 /maintenance/index.html`; `/api/jobs*` and `/api/access` unchanged (still guarded); add `location = /api/transcriber/jobs` with the same limits as `/api/cabinet/recordings`, `location ~ ^/api/transcriber/jobs/[0-9a-f-]+/retry$` with `limit_req zone=transcriber_submit`, and `location ^~ /api/transcriber/` and `location ^~ /transcriber` public with the cabinet's headers. `/api/cabinet/auth/sign-up/email`, `/request-password-reset`: `limit_req zone=transcriber_login`. Maintenance form redirects to `/svoi`.

## Slices

**Slice 1 — accounts and cabinet guard (server).** Makes S-paid-2, 3, 4, 9 true at the API.
- Test `tests/c11-accounts.test.ts` (new) + shared helper `tests/helpers/c11.ts` (temp env like `cabinet-recordings.test.ts`, `MAIL_TRANSPORT=outbox`, `signUpPublic(email,pw)`, `readOutboxLink(email)`, `verify(link)`, `login(email,pw) → cookie`). Asserts: sign-up without `consent:true` → 400 `CONSENT_REQUIRED`, no user; with consent → `consentAt` stored; password < 10 rejected; sign-up sends exactly one letter whose link verifies; duplicate email → same 200 body shape, no second user, a letter of no kind revealing existence; wrong password 401; reset letter → new password works, old fails, second use of the link fails, expired link fails (fake clock or 1 s expiry in test settings); public account → every cabinet route 403 `CABINET_INVITE_ONLY` (check `/me`, `/sessions`, `/recordings`); sign-up or `update-user` with `cabinetAccess:true` in the body leaves it false; invited account (allowSignUp:true path) → `/me` 200; backfill: DB created with old schema + user → after `getCabinetAuth()` that user has access. Must fail today: sign-up returns 403 `SIGN_UP_DISABLED`.
- Files: `lib/cabinet/auth.ts`, `lib/cabinet/store.ts` (backfill), `app/api/cabinet/auth/[...all]/route.ts`, `lib/mail.ts`, `scripts/cabinet-user.ts`, tests. Also assert: duplicate sign-up and reset for an unknown address return without waiting for mail (stub transport that sleeps 2 s → response < 1 s).
- Done: new test green, `npm test` baseline still green, typecheck 0.

**Slice 2 — transcriber jobs and page.** Makes S-paid-5, 6, 7, 8 and changed S-simple-5 true.
- Test `tests/c11-transcriber.test.ts` (reuses the helper; stub `processJob` deps as in `cabinet-recordings.test.ts`). Asserts: unverified → upload 403; verified upload → job → worker stub → completed → download returns the docx bytes; shown `left` 3→2 only after completion (stays 3 while queued); final failure (stub throws non-retryable, or 5 attempts) and second download don't change `used` and free the slot; interrupted upload (body aborted mid-stream) → `UPLOAD_FAILED`, not counted, slot free; three unfinished uploads → fourth 409 `FREE_SLOTS_BUSY` while `left` still shows 3; after 3 completed: POST 403, download of an old Word 200; job dir deleted (`cleanupExpired` with old `updatedAt`) → `used` stays 3; account B: list excludes A's rows, download/retry of A's id → 404 with no A data in the body; no cookie → 401 on all four routes. Plus a browser step in `tests/c11-start.cjs` (slice 3) for the page. Change S-simple-5: update `tests/cabinet-c3-roles.cjs › reader` to expect the new label.
- Files: `lib/transcriber.ts`, `lib/jobs.ts` (Job field), `lib/cabinet/store.ts` (table), `scripts/worker.ts`, `app/api/transcriber/**`, `app/transcriber/{page.tsx,upload-form.tsx,use-account-jobs.ts}`, `app/page.tsx` → `app/svoi/page.tsx` (unchanged), cabinet download label, `app/cabinet/privacy/page.tsx`.
- Done: tests green, `/svoi` behaves as the old `/` (manual check on the preview with the shared-password cookie not needed — Next route only).

**Slice 3 — start page and gate.** Makes S-paid-1 and changed S-release-7 true; shows the UI of slices 1–2.
- Test `tests/c11-start.cjs` (browser, local preview with `MAIL_TRANSPORT=outbox`): `/` shows «Своя практика», «С возвращением», the transcriber card with «3 записи бесплатно» and «Начать бесплатно»; no «К транскрибатору»; at 1280, 390, 320 px no horizontal scroll; Tab reaches both cards; sign-up → check-mail → outbox link → `/transcriber` shows «Осталось бесплатных записей: 3 из 3»; sign in with a public account on the cabinet card → invite-only message. `tests/cabinet-c10-docker.sh old-site`: `/` without password → 200 start page (not maintenance); `/svoi` without password → maintenance page; `/svoi` with the password cookie → the old page (update the existing cookie check at l.351–352 from `/` to `/svoi`); `/api/jobs/<id>/retry` and `/api/transcriber/jobs/<id>/retry` carry the submit limit (nginx -T grep); `/api/jobs` still 401; `/api/transcriber/jobs` without cookie → app JSON 401; `nginx -t` passes.
- Files: `app/cabinet/ui/login.tsx`, `app/cabinet/ui/workspace.tsx`, `app/cabinet/room.css`, `app/page.tsx`, `deploy/nginx.conf`, `deploy/maintenance/index.html`, `tests/cabinet-c10-docker.sh`, `tests/c11-start.cjs`.
- Done: browser and Docker checks pass; screenshots before/after at 1280 and 390 in the logs dir.

## Visible work

Design source: `app/cabinet/room.css` tokens (`--cc-*`, coach-soft panel) and the existing `Login`. New card = same `.cc-login-card` (white, 1px line, radius 10) with smaller type and an outline button; `/transcriber` forms reuse `.cc-form`, `.cc-button`, `.cc-hint`, `.cc-error`. States: loading, wrong password, check-mail, link expired («Ссылка устарела — запроси новую»), not verified, limit reached, upload/processing/error from the old form. Phone: cards stack under the intro (existing `@media(max-width:760px)` puts `.cc-login` in one column). Keyboard order: cabinet form → transcriber card. Sketch: `product/changes/C-11/sketch.html` (not a build source).

## Risks

- Invited coaches lose the cabinet after deploy → backfill + test; rollback = previous image (C-10 procedure), the added column is harmless.
- Public sign-up abuse (mass accounts for free records) → per-IP sign-up limit + email verification; deliberate multi-mailbox abuse accepted until payment (3 records ≈ cents each).
- Letters not delivered → change is not deployable until the real transport is set and one real letter is received (manual check, not in loops).
- Free count wrong after worker restart → count is written from DB-held links; `recoverAndClean` doesn't touch `transcriber_jobs`.
- Old users' bookmarks to `/` now show the start page; `/svoi` link must be sent to them (owner, outside the build).

## Open (owner)

Mail transport: domain mailbox on kiberry.ai via SMTP (adds `nodemailer`, pinned) or Unisender Go HTTP API (no package). Slice 1 builds `outbox` and the adapter interface; the real adapter is added once the owner answers, before showing the change.

## Decisions to keep

- One account system; cabinet entry is a server-only `cabinetAccess` flag set by the owner command (replaces «no sign-up at all», D19 stays: cabinet by invitation).
- Free records are counted in the DB when Word is first ready; pending uploads reserve a slot.
- Old shared-password page lives at `/svoi` until its users are migrated.

## Review

Fresh read-only review by `vibeproof-reviewer` (2026-11-18), given brief, design, decisions, code and the checklist only. Verdict: sound and buildable; no blockers.
- M1 shown count fell at upload, failures held slots → fixed: shown `left = 3 − used`; pending only gates uploads with its own message; final failure defined.
- M2 «отмена» undefined → fixed: defined as an interrupted upload (no cancel button — not in the brief, old site has none); tested.
- M3 consent only in the UI → fixed: server requires `consent:true`, stores `consentAt`; tested.
- M4 timing reveals registered emails → fixed: mail sent in background; timing assertion added.
- Minor: invite-only message inside `Login.submit` — fixed; one reset address — fixed; backfill as a single `ALTER … DEFAULT 1` — fixed; script keeps refusing existing emails — stated; retry rate limit and `/svoi` cookie check in the Docker test — added; simpler settings (`public` boolean, one mail switch) and `/svoi` moved unchanged instead of a shared-form refactor — done.
- Rejected: an «у тебя уже есть аккаунт» letter on duplicate sign-up — not in the brief.

Note: the brief names `tests/c11-accounts.cjs` and `tests/c11-transcriber.cjs`; these scenarios are tested at route level in `tests/c11-accounts.test.ts` and `tests/c11-transcriber.test.ts` as above. The brief path correction goes in one revision together with the mail-transport answer.
