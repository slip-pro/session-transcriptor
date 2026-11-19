# C-16 build log
- Slice 1: `googleProfile` reads the id_token payload by hand (base64url + JSON) instead of `jose.decodeJwt` — jose is only a transitive dependency of better-auth and not declared in package.json; cost if wrong: none (same claims, same checks).
- Slice 1: owner reset moved into `setOwnerPassword()` in `lib/cabinet/auth.ts` (script calls it) so the test can call the real code; cost if wrong: none.
- Slice 1: the takeover rule runs two plain DELETEs in the account hook, not a transaction (better-auth may already hold one on this connection); cost if wrong: a crash between them leaves the password gone but sessions open — the next Google login or mail reset still fixes it.
- Slice 1: the route also rejects non-own-site `newUserCallbackURL` and any provider other than google with 400 INVALID_REQUEST; cost if wrong: none.
