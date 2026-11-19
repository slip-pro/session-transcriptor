# C-16 design: Войти через Google

## Map
Code lives in `.local/web` (own git repo). Read in code unless marked.

- **Accounts:** `lib/cabinet/auth.ts` → `createCabinetAuth(db, {secret,url,public})` builds better-auth **1.7.16** (`node_modules/better-auth/dist/package.mjs`). Public mode: email+password, verification mail, `consentAt` + `cabinetAccess` additional user fields, `databaseHooks.user.create.before` copies consent from the `signUpConsent` AsyncLocalStorage. Cookies: prefix `coach-cabinet`, `defaultCookieAttributes.sameSite: "strict"`. `getCabinetAuth()` caches one instance and runs migrations (new `account` rows need no schema change — the `account` table already exists for credentials).
- **Route:** `app/api/cabinet/auth/[...all]/route.ts` — POSTs pass `requireOrigin`, body ≤4 KB; `/sign-up/email` requires `consent: true` (else 400 `CONSENT_REQUIRED`), strips it, runs the handler inside `signUpConsent.run({at})`. GETs pass straight to `auth.handler`.
- **Guards:** `requireCoach` (403 `CABINET_INVITE_ONLY` without `cabinetAccess`), `requireTranscriber` (any session). Free count per user id (D22) — linking keeps the same user id, so the count is kept automatically.
- **Invited coaches:** `scripts/cabinet-user.ts:53` sets `emailVerified=1, cabinetAccess=1` → a Google sign-in with the same address links normally; the takeover rule below never fires for them.
- **Calendar OAuth (C-13, D24):** `lib/cabinet/calendar.ts` `calendarSettings()` — `GOOGLE_CLIENT_ID/SECRET`; Google URLs replaceable **only when CABINET_URL is local** via `GOOGLE_OAUTH_BASE`/`GOOGLE_TOKEN_URL`. Copy this `pick()` rule exactly.
- **Fake Google:** `tests/helpers/fake-google.ts` (`/auth` → 302 with code, PKCE-checked `/token`, `/__flags`, `denyAuth` flag → `error=access_denied`, `nextAccount`), standalone `tests/helpers/fake-google-server.ts` for previews.
- **better-auth facts that shape the design** (read in `node_modules/better-auth/dist`):
  - Built-in `google` social provider hardcodes `accounts.google.com` / `oauth2.googleapis.com` (`@better-auth/core/dist/social-providers/google.mjs`) → cannot point at the fake. The `genericOAuth` plugin (`plugins/generic-oauth/index.mjs`) takes `authorizationUrl`, `tokenUrl`, `scopes`, `pkce`, `getUserInfo(tokens)`, `disableImplicitSignUp`; its providers join `ctx.socialProviders`, sign-in is `POST /sign-in/social {provider, callbackURL, errorCallbackURL, requestSignUp}` (no endpoints of its own in 1.7.16) → `{url}`.
  - Callback (`api/routes/callback.mjs`, shared by generic): unknown email + `disableImplicitSignUp && !requestSignUp` → redirect `errorCallbackURL?error=signup_disabled`. Provider `error` (cancel) → `errorURL?error=access_denied`. `getUserInfo` returning null → error redirect.
  - Linking (`oauth2/link-account.mjs` `handleOAuthUserInfo`): an existing user with the same email gets the Google account linked only if the provider is trusted or Google says verified, AND `accountLinking.requireLocalEmailVerified` (default **true**) — must be set `false` to link unverified local accounts (brief S-paid-14). After linking it sets `emailVerified: true` when Google's email matches. Account row is created **before** the session.
  - State: default `storeStateStrategy: "database"` plus a signed `state` cookie checked on callback (`state.mjs` parseGenericState). With our global `sameSite: strict` that cookie is **not sent** on Google's cross-site redirect → `state_mismatch`. Per-cookie override exists: `advanced.cookies.state.attributes` (`cookies/index.mjs` createCookie, applied last).
  - Server-trusted data across the redirect: `addOAuthServerContext({...})` (export from `better-auth/api` — builder confirms the import path) called during the sign-in request; read back on callback via `getOAuthState()?.serverContext`.
- **Session cookie after callback:** strict cookie set on the callback response; Chrome may not send it on the immediate redirect to `/transcriber` (redirect chain started cross-site). Both pages are client components that call `/me` with `fetch` after load (`app/transcriber/page.tsx`, `app/cabinet/ui/workspace.tsx:117`) — same-site subresource requests carry strict cookies, so the page sees the session. Inferred; the browser test proves it.
- **Tests:** `npm test` = `node --import tsx --test tests/*.test.ts`. Helpers `tests/helpers/c11.ts`: `setupC11`, `authRequest`, `signUpPublic`, `verify`, `login`, `userRow`, `inviteUser`. Browser scripts: `tests/c11-start.cjs` (start page, 390/320 px), `tests/c13-schedule.cjs` (fake Google preview). 

## Options
1. **Leave as is** — no Google; fails the agreed request.
2. **Built-in `socialProviders.google`** — least config, but endpoints hardcoded: no fake Google, so no automated test of consent, linking or takeover. Rejected: sign-in without a real test is the risk we must not take.
3. **`genericOAuth` provider `google` with Google's endpoints, replaceable locally** — same better-auth flows (state, PKCE, linking, sessions), endpoints come from the same `pick()` rule as the calendar, fake Google in tests. Small: one plugin entry, one `getUserInfo`, hooks. **Chosen.**
4. Own OAuth module like the calendar + manual session creation — full control, but re-implements session/linking security. Rejected.

## Decision
Option 3. Consent is a two-step sign-up: first Google round trip finds no account (`signup_disabled`) → consent screen → second round trip with `requestSignUp: true` and server-recorded consent. No pending identity is stored anywhere; Google usually returns the second time with one click. Account creation through Google without server-side consent is refused in the user-create hook (defence against a client posting `requestSignUp` alone).

## Program design
`lib/cabinet/auth.ts`
- `googleSettings(): { clientId, clientSecret, authUrl, tokenUrl, issuers: string[] } | null` — null without `GOOGLE_CLIENT_ID/SECRET`. URLs via the calendar's local-only `pick()` (reuse: export a shared `googleEndpoint(name, fallback)` from auth.ts and use it in `calendarSettings` — one rule, two users). Issuers: `accounts.google.com`, `https://accounts.google.com`, plus the fake base only when local.
- `googleProfile(tokens): Promise<{ id: sub, sub, email, emailVerified: true, name } | null>` — `id` is required: without it the generic provider's account id is empty and every sign-in fails with `OAUTH_ACCOUNT_SUBJECT_INVALID` (`oauth2/account-key.mjs`) — decode `tokens.idToken` (`decodeJwt` from `jose`, already a dependency of better-auth — builder checks it is importable, else parse base64url payload); require `iss ∈ issuers`, `aud === clientId`, `exp` in future, `email_verified === true`, non-empty `email`, `sub`. Otherwise null. The token comes straight from Google's token endpoint over TLS with our client secret, so no signature check (same as better-auth's own Google provider). Picture is not returned (not stored).
- In `createCabinetAuth` when `isPublic && googleSettings()`:
  - `plugins: [genericOAuth({ config: [{ providerId: "google", clientId, clientSecret, authorizationUrl, tokenUrl, scopes: ["openid","email","profile"], pkce: true, disableImplicitSignUp: true, getUserInfo: googleProfile, authorizationUrlParams: { prompt: "select_account" } }] })]`.
  - `account: { accountLinking: { enabled: true, trustedProviders: ["google"], requireLocalEmailVerified: false } }`.
  - `advanced.cookies.state.attributes = { sameSite: "lax" }` (only the 5-minute state cookie; session stays strict).
  - `hooks.before` (createAuthMiddleware): on `/sign-in/social`, if `signUpConsent.getStore()` → `addOAuthServerContext({ consentAt: iso })`.
  - `databaseHooks.user.create.before`: consent = `signUpConsent` store **or** `(await getOAuthState())?.serverContext?.consentAt`. If the create comes from an OAuth callback (oauth state present) and there is no consent → `return false` (no user row). Email sign-up behaviour unchanged.
  - `databaseHooks.account.create.before` and `account.update.before` for `providerId === "google"`: drop `idToken`, `accessToken`, `refreshToken` (nothing uses them; the id token carries the photo link — brief: фото не храним).
  - `onAPIError: { errorURL: "/transcriber?google=error" }` so a lost/replayed state lands on our message, not better-auth's error page.
  - `databaseHooks.account.create.before(account)`: if `account.providerId === "google"` and the user exists with `emailVerified = 0` (still false at this point — better-auth updates it after linking) → in one statement batch delete that user's `account` rows with `providerId='credential'` and all their `session` rows. Password sign-in then fails; "Забыли пароль?" creates a new credential (better-auth reset creates one when missing — builder confirms with the test).
- Route `app/api/cabinet/auth/[...all]/route.ts`: for `/sign-in/social` POST — `provider` must be `"google"`; if `requestSignUp === true` then `consent === true` required (else 400 `CONSENT_REQUIRED`); strip `consent`; run inside `signUpConsent.run({at})` when consent given. `callbackURL`/`errorCallbackURL` must be same-origin relative paths (better-auth validates against trusted origins too).
- Rate limit: add `"/sign-in/social": { window: 60, max: 10 }`.

Client (`app/transcriber/page.tsx`, `app/cabinet/ui/login.tsx`)
- `startGoogle({ signUp: boolean, from: "transcriber" | "cabinet" })` → POST `/sign-in/social { provider:"google", callbackURL: from==="cabinet" ? "/cabinet" : "/transcriber", errorCallbackURL: "/transcriber?google=error", requestSignUp?, consent? }` → `location.assign(url)`.
- `/transcriber?google=error&error=<code>`: `signup_disabled` → consent screen («Это первый вход через Google. Согласен на обработку данных — как они хранятся» checkbox + «Продолжить» + «Отмена»); `access_denied` → «Вход через Google отменён.»; anything else → «Не получилось войти через Google. Можно войти почтой.» Consent «Продолжить» without the box ticked → the same message as email sign-up.
- Cabinet load (`workspace.tsx:117`): on `/me` → `CABINET_INVITE_ONLY`, sign out and show the invite-only message in Login (same as the form path today).

A new person who starts at the cabinet login also goes through the consent screen and lands in the transcriber (they have no invite; the cabinet would only refuse them). Existing Google-linked accounts without invite who come back via the cabinet see «Кабинет пока открыт по приглашению» (S-paid-16).

`scripts/cabinet-user.ts --reset-password`: if the account has no `credential` row (removed by the takeover rule), create it with the hashed password instead of reporting success after updating nothing.

Call path, new person: transcriber «Войти через Google» → POST sign-in/social → Google → callback → no user, implicit sign-up disabled → `/transcriber?google=error&error=signup_disabled` → consent → POST with `requestSignUp, consent` → Google → callback → user.create.before sees serverContext consent → user (emailVerified from Google, consentAt) + account → session → `/transcriber` → `/me` shows 3 of 3.

## Slices
**Slice 1 — server: Google accounts.** Makes true S-paid-11..16 on the server.
- Fake Google: `/auth` remembers `scope`/`nonce`; `/token` adds `id_token` (unsigned JWT `alg: none`, `iss` = fake base, `aud` = client id, `exp`, `sub`, `email`, `email_verified`, `name`) when the scope contains `openid`; identity from `state.googleUser` (settable via `/__flags`-like `POST /__user`). Calendar behaviour unchanged (C-13..15 tests must still pass).
- Test `tests/c16-google.test.ts` (fake Google + `setupC11`; follow redirects by hand: POST sign-in → fetch fake `/auth` → GET route callback with `code,state` and the `state` cookie):
  - `new account`: first trip → redirect has `error=signup_disabled`, no user row; second trip with consent → user with `consentAt`, `emailVerified=1`, `cabinetAccess=0`, session cookie, transcriber `/me` free 3. Rejects: user created on first trip.
  - `consent required`: POST with `requestSignUp:true` without consent → 400 `CONSENT_REQUIRED`; and a callback whose state lacks server consent (simulate by calling auth.api directly with requestSignUp) → no user row.
  - `link existing`: verified password account with a finished record → Google sign-in → same user id, one user row, free count unchanged, password still works.
  - `unverified takeover`: unverified password account + an open session → Google sign-in → old password sign-in fails, old session cookie → 401, new Google session works, `emailVerified=1`; reset by mail then works.
  - `refused`: `email_verified:false` → error redirect, no user; `denyAuth` → `error=access_denied`; state cookie missing → no session.
  - `cabinet`: invited coach via Google → `requireCoach` passes (`/api/cabinet/me` 200); Google-only account → 403 `CABINET_INVITE_ONLY`.
  - State cookie is `SameSite=Lax`, session cookie stays `Strict` (assert Set-Cookie).
  - `no tokens`: after new account, link and repeat sign-in the google `account` row has null `idToken/accessToken/refreshToken`.
  - `owner reset`: `--reset-password` path on an account without credential row → password sign-in works (call the script's function or replicate via helper).
  - Redirect URI sent to fake `/auth` equals `${ORIGIN}/api/cabinet/auth/callback/google`.
- Files: `lib/cabinet/auth.ts`, `lib/cabinet/calendar.ts` (shared pick), route, `scripts/cabinet-user.ts`, `tests/helpers/fake-google.ts`, `tests/c16-google.test.ts`, maybe `tests/helpers/c11.ts`.
- Done: new test green, `npm test` green (C-11, C-13..15 included), `npx tsc --noEmit`, lint.

**Slice 2 — screens.** Makes true S-paid-17 and the visible parts of 11, 12, 15, 16.
- Buttons «Войти через Google» (Google «G» mark inline SVG, outline button style `cc-button cc-outline`) under the email form on transcriber sign-up and sign-in and on the cabinet login card, separated by «или». Consent screen and error messages as above. Cabinet invite-only on load.
- Test `tests/c16-google.cjs` (Playwright, pattern of `c11-start.cjs` + fake Google server like `c13-schedule.cjs`): new person end-to-end in the browser through the consent screen to «Осталось бесплатных записей: 3 из 3»; cancel → message; buttons present and keyboard-reachable; no horizontal scroll at 1280, 390, 320 px; screenshots for showing.
- Files: `app/transcriber/page.tsx`, `app/cabinet/ui/login.tsx`, `app/cabinet/ui/workspace.tsx`, CSS (`app/cabinet/room.css` / transcriber styles), `tests/c16-google.cjs`.
- Done: browser script passes against a preview with fake Google; screenshots captured.

## Visible work
Same card language as C-11 (white cards, `cc-button`, `cc-outline`); Google button is secondary (outline), email form stays primary — no new palette. Text in Russian, informal «ты» as elsewhere. Consent screen reuses `.cc-consent` checkbox and privacy link. Keyboard: buttons are real `<button>`s; focus goes to the consent checkbox on that screen. 320 px: buttons full width.

## Risks
- Someone takes over an account via Google: only Google-verified addresses link; unverified local accounts lose password and sessions on link (S-paid-14). Different email → never linked (no `allowDifferentEmails`).
- Account without consent: server-side create hook refuses; tested both ways.
- Cabinet without invite: unchanged `requireCoach`; tested.
- `state` cookie lax: only carries a random state value for 5 minutes; it is the standard OAuth setting. Session cookie unchanged.
- Real Google differs from the fake (id_token claims, `prompt`): live check on preview 3111 after the owner adds the redirect URI `…/api/cabinet/auth/callback/google` (exact path asserted by the test and written to the queue).
- Without `GOOGLE_CLIENT_ID` the button must not break the page: `/sign-in/social` returns an error → «Не получилось войти через Google». Builder may hide the button when `/api/transcriber/config`-like flag says unavailable — only if such endpoint exists; otherwise the message is enough.
- Rollback: remove the plugin config; linked Google `account` rows are inert without it.

## Decisions to keep
- D32: Вход через Google — через better-auth `genericOAuth` (адреса Google подменяемы только локально, как у календаря); согласие при первом входе — второй заход в Google с согласием, записанным сервером; аккаунт с неподтверждённой почтой при связывании с Google теряет пароль и сессии. Уточняет D24 («позже — через better-auth на том же клиенте») и D21 (регистрация теперь и через Google, почта подтверждена Google). Токены Google при входе не храним.

## Review
Fresh read-only reviewer (vibeproof-reviewer), 2026-11-19, design against better-auth 1.7.16 sources.
- Blocker: generic OAuth has no `/sign-in/oauth2` or `/oauth2/callback` in 1.7.16 — uses `/sign-in/social` and `/callback/:id`. Fixed throughout; brief's redirect address corrected to `/api/cabinet/auth/callback/google`; test asserts it.
- Major: `googleProfile` must return `id` (= sub) or every sign-in fails. Fixed.
- Major: better-auth stores id/access/refresh tokens (id token has the photo link). Fixed: account hooks drop them; test `no tokens`.
- Minor: missing-state errors went to better-auth's error page — `onAPIError.errorURL` added.
- Minor: new person from cabinet login — decided: consent then transcriber; written in.
- Minor: owner reset command after takeover rule — now recreates the credential row; test added.
- Minor: D32 also refines D21 — added.
Confirmed by reviewer: linking needs `requireLocalEmailVerified:false`; account hook runs before `emailVerified` update; create hook `false` leaves no user; server context survives the round trip; per-cookie sameSite override applied last; reset recreates a missing credential. Not covered: browser behaviour of the strict session cookie after the redirect — proved by slice 2's browser test.
