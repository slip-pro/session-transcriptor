# C-7 build log

## Slice 1 — top and conversation bar (built by vibeproof-builder, green)
- Quiet save state fades whenever the editor is settled (not saving/offline/conflict/invalid, not dirty), not only on phase `saved` — the existing text already treats all those phases as «Сохранено». Cost if wrong: flash misses; tests cover it.
- › top asserts no slack under the dark card's last child (≤4 px) instead of the design's "height < header + 40" (unreliable). Cost if wrong: a tall-but-not-stretched card would pass.
- › layout opens the meeting from the client page, because `backClient` applies only with `clientId` (opening by bare `?session=` gives «На главную»).
- c2-slice2 first run timed out waiting for the Word download, passed on rerun; same flaky step as the queue item about c3-roles download (`save(exportFields)` race suspected). Not caused by C-7 code paths touched here (download unchanged).
- Selector-only test updates: c2-forward, c2-slice1 (`/^К истории клиента/`), c5-clients › reading (attach link in the bar instead of the plate).
- Evidence: .git/vibeproof-logs/c7-s1-*.log
