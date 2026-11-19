# C-13 build log

## Slice 1 (server)
- Ambiguity at a matching step (email, full name, first name) returns "no client" at once instead of moving on to the next step: a guess is worse than a question.
- Name matching has two steps, full name first, then first word (>=2 letters): "Анна Петрова" is not ambiguous between two Annas, "Анна" is.
- A manual choice pointing at a client that no longer exists falls back to automatic matching (cascade normally removes it first).
- DELETE /calendar returns `{ok:true, revoked}` (design said `{ok:true}`): the UI needs `revoked` for the "revoke it in your Google account" hint.
- Added `forgetCalendarMemory()` export, used only by the test to simulate a restart (access-token cache otherwise masks a changed secret until expiry).
- An access token rejected with 401 is refreshed once and retried; a refresh that gives `invalid_grant` then means "reconnect".
- Selection kept across reconnect (only new connections start with an empty selection = primary calendar).
- `compose.yaml` unchanged: it reads `secrets/access.env` whole, so `GOOGLE_*` only needed a line in `deploy/README.md`.
- Callback with an unconfigured Google answers `failed`; connect with it answers the `unavailable` redirect.
