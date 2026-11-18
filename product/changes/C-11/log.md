# C-11 build log (rulings)

## Slice 1
- tests/cabinet.test.ts "public registration stays closed" expected 403 on sign-up; C-11 opens sign-up, so it now expects 400 (no consent) and asserts no user row was created. Why: the old assertion contradicts the agreed change; the intent (nothing created without consent) is kept. Cost if wrong: one assertion to restore.
- Mail is detached in `lib/cabinet/auth.ts` (`background()` calls sendMail and swallows nothing silently: logs `MAIL_SEND_FAILED`, no address) instead of `advanced.backgroundTasks.handler`: better-auth awaits the callback itself, so returning a resolved promise gives the same no-wait behaviour with no extra option. Cost if wrong: swap for the handler.
- Unknown/missing MAIL_TRANSPORT throws only when a letter is sent (and outbox-in-production is refused at `getCabinetAuth` start), per design; existing cabinet tests run without MAIL_TRANSPORT. Consequence: a prod misconfig shows up as MAIL_SEND_FAILED in logs while sign-up still answers 200.
- consentAt is written by `databaseHooks.user.create.before` reading an AsyncLocalStorage set by the auth route (never touches existing users on duplicate sign-up).
- Reset-link expiry is tested by ageing the stored `verification.expiresAt`, so no test-only setting exists in product code.
