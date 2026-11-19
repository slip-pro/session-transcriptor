# C-16 build log
- Slice 1: `googleProfile` reads the id_token payload by hand (base64url + JSON) instead of `jose.decodeJwt` — jose is only a transitive dependency of better-auth and not declared in package.json; cost if wrong: none (same claims, same checks).
- Slice 1: owner reset moved into `setOwnerPassword()` in `lib/cabinet/auth.ts` (script calls it) so the test can call the real code; cost if wrong: none.
- Slice 1: the takeover rule runs two plain DELETEs in the account hook, not a transaction (better-auth may already hold one on this connection); cost if wrong: a crash between them leaves the password gone but sessions open — the next Google login or mail reset still fixes it.
- Slice 1: the route also rejects non-own-site `newUserCallbackURL` and any provider other than google with 400 INVALID_REQUEST; cost if wrong: none.
- Slice 2: shared button/start function live in `app/cabinet/ui/google.tsx` (used by transcriber page and cabinet login); consent screen is a `google-consent` mode of the transcriber page; cost if wrong: none.
- Slice 2: cabinet load now signs the account out on `CABINET_INVITE_ONLY` (design asked for it; before it only showed the message); cost if wrong: an invite-less account loses its transcriber session when it opens /cabinet.
- Slice 2: the preview's fake Google (old process, no `/__user`) and web were restarted to pick up slice-1 code; the browser test went green on the first run after the code (red run before: no Google button).
