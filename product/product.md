# Product

Reconstructed during Vibeproof installation from CLAUDE.md, package.json and src/cli at `44dd477cf0eceb97e6e78fb4988c773147444984`.

A CLI for transcribing coaching-session audio, formatting the transcript and generating DOCX.
The inferred audience is coaches; that description was not separately confirmed during installation.
The CLI uses external transcription providers and Claude Code for formatting; no provider was
called and no recording, transcript or credentials were inspected during installation.

Local uncommitted roadmap/provider work and the separate `.local/web` checkout remain in progress
and were preserved. Installation neither adopts their proposed scope nor claims the web product is shipped.

## Owner clarification — 4 November 2026

Sergei explicitly removed monetary expense tracking from the first release scope: “Учёт расходов в деньгах - это вообще не понятно откуда взялось, убираем”. It is not an unfinished feature or a release gate. Keep technical job states and retries for recovery. The current scope decision is [D06](../DECISIONS.md).

Sergei will give the app to his wife to test the recording-to-document flow, DOCX format and usability. Those tests are pending, not passed. He will send UI/UX feedback next; this clarification does not request further interface changes.
