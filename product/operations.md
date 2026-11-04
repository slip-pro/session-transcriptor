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
