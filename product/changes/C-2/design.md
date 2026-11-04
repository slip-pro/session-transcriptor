# Design C-2
## Map
Actual browser app is the dirty nested repository .local/web; root owns CLI and project documents. Preserve all earlier edits and snapshot files before changes. workspace.tsx owns navigation/login/history/client; recording-upload.tsx idempotent upload/preferences; forms.tsx client/JSON/note creation; session-workspace.tsx result/editor/reader; digest.tsx/preparation.tsx structured notes; processing.tsx/audio.tsx status/playback; room.css styles. Inspect legacy app/page.tsx and keep its functionality accessible. API and CabinetStore remain unchanged. useSessionEditor owns drafts, flush, conflicts. No new writers/recipients.
## Options
A collapse existing sections: still requires understanding the schema. B document-first short task views: selected by user. C chat wizard: unnecessary turns and hidden history. Choose B with calm light workspace, dark text, one plum action, open lists rather than nested panels, 16px body and 44px targets. Existing style is the starting point, interaction is substantially reworked. Visual choice delegated by instruction to implement accepted principle.
## Program
Reuse endpoints/types. Upload metadata comes from controlled/default state even if editor is closed. Retry metadata remains immutable. First speaker defaults auto; role choice after recognition. Document names remain independent of client identity. Role preview uses meaningful bounded utterances and audio when available; unusual speaker counts retain neutral export and manual roles. Nonempty digest fields stay visible; empty structure is on demand. Preserve autosave, conflict protection, flush before export/navigation, and all source links.
## Slice: coherent redesign
Own cabinet UI/styles, legacy entry UI only as needed, tests and isolated preview helper. Covers all nine scenarios. Whole-product scope justifies >8 files; no unnecessary abstractions. Read Next bundled docs before edits. Use installed Node24+/Playwright without downloads. New isolated synthetic data directory because old demo contains real material. Start preview and capture before, then meaningful failing browser expectations for compact upload, JSON import, note/reload, roles/Word, client/history and narrow widths. Implement then run targeted regression tests/lint/typecheck, render desktop/mobile and inspect. Independent critic receives screenshots/brief only. Keep preview running for owner review.
## Risks
Closed optional fields must preserve values. Client changes must not rename document. Hidden controls remain reachable. Existing idempotence and permission checks unchanged. Never process real audio or alter existing preview data.
## Decisions
Document is main result; secondary functions appear by intention. Design for low software confidence. No new dependencies.

## Review
Fresh gpt-6-astra/high reviewer: no confirmed blockers or majors; contracts checked against source. Read-only role, not enforced sandbox.

