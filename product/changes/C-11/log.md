# C-11 build log (rulings)

## Slice 1
- tests/cabinet.test.ts "public registration stays closed" expected 403 on sign-up; C-11 opens sign-up, so it now expects 400 (no consent) and asserts no user row was created. Why: the old assertion contradicts the agreed change; the intent (nothing created without consent) is kept. Cost if wrong: one assertion to restore.
- Mail is detached in `lib/cabinet/auth.ts` (`background()` calls sendMail and swallows nothing silently: logs `MAIL_SEND_FAILED`, no address) instead of `advanced.backgroundTasks.handler`: better-auth awaits the callback itself, so returning a resolved promise gives the same no-wait behaviour with no extra option. Cost if wrong: swap for the handler.
- Unknown/missing MAIL_TRANSPORT throws only when a letter is sent (and outbox-in-production is refused at `getCabinetAuth` start), per design; existing cabinet tests run without MAIL_TRANSPORT. Consequence: a prod misconfig shows up as MAIL_SEND_FAILED in logs while sign-up still answers 200.
- consentAt is written by `databaseHooks.user.create.before` reading an AsyncLocalStorage set by the auth route (never touches existing users on duplicate sign-up).
- Reset-link expiry is tested by ageing the stored `verification.expiresAt`, so no test-only setting exists in product code.

## Security follow-up (after slice 2)
- Automated review of 960245f: `autoSignInAfterVerification:true` allows login CSRF (attacker mails a victim the verify link of the attacker account → victim signed into it) and pre-hijacking (attacker registers victim email, victim verifies, attacker keeps the password). Fix: `autoSignInAfterVerification:false` + revoke all sessions of the user in `afterEmailVerification`; `/transcriber` after `/verify-email` callback shows sign-in with «Почта подтверждена — войди». Test: verify link yields no session cookie; a session created before verification is invalid after it. Cost if skipped: account takeover paths.

## Slice 2
- `transcriber_jobs` got two extra columns, `retryable` and `attempts` (design listed none): needed to tell a final failure from a retryable one and to show the retry button without reading the job file. Cost if wrong: drop two columns (table is new).
- `app/page.tsx` is now a minimal server redirect to `/cabinet`; the old page lives unchanged in `app/svoi/page.tsx`. Slice 3 replaces `app/page.tsx` with the start page.
- `requireTranscriber` now also returns `cabinetAccess` (for `/api/transcriber/me`). Test helper `tests/helpers/c11.ts` unchanged; the new test waits 150 ms after sign-up because mail is sent in the background.
- Label «Скачать Word в формате ICF для менторинга» changed only on the cabinet result card (session-workspace.tsx) and in the exact-name expectations of cabinet browser scripts (c3-roles, c3-visual, c2-slice2, c2-metadata-red, c2-journey, c10-live). The history-row link «Скачать Word» (history-notes.tsx) is left: it is a list link, not the «Документ готов» card, and c3-home expects it. Cost if wrong: one string + one script.
- A row whose job directory is missing is marked `expired` only after 60 s (the row is written just before the directory); a crashed upload frees its slot once the worker's cleanup removes the job (35 min) and a sync runs.
- Upload name header: `X-Recording-Name` (optional, default «Запись»); list shows it. Job metadata header is `X-Job-Metadata` as on the old site.
- Extra styles for `/transcriber` are in `app/transcriber/transcriber.css` (room.css is slice 3's file).
- `expiresAt` in the list = createdAt + 24 h (the job directory lives at least that long).
