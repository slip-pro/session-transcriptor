# C-7 build log

## Slice 1 — top and conversation bar (built by vibeproof-builder, green)
- Quiet save state fades whenever the editor is settled (not saving/offline/conflict/invalid, not dirty), not only on phase `saved` — the existing text already treats all those phases as «Сохранено». Cost if wrong: flash misses; tests cover it.
- › top asserts no slack under the dark card's last child (≤4 px) instead of the design's "height < header + 40" (unreliable). Cost if wrong: a tall-but-not-stretched card would pass.
- › layout opens the meeting from the client page, because `backClient` applies only with `clientId` (opening by bare `?session=` gives «На главную»).
- c2-slice2 first run timed out waiting for the Word download, passed on rerun; same flaky step as the queue item about c3-roles download (`save(exportFields)` race suspected). Not caused by C-7 code paths touched here (download unchanged).
- Selector-only test updates: c2-forward, c2-slice1 (`/^К истории клиента/`), c5-clients › reading (attach link in the bar instead of the plate).
- Evidence: .git/vibeproof-logs/c7-s1-*.log

## Slice 2 — replies and notes (built by vibeproof-builder, green)
- Per-reply unknown speaker select renamed «Роль неопределённого голоса» (follows the «Роль голоса N» rename); c2-slice2 l.79 selector updated. Cost if wrong: one selector.
- Popover z-index 20 (selection bar is 3). Role select is a plain select in a span; old `.cc-reader-speaker` rules no longer apply; client chair carries the client's initial as in seats. `.cc-reading-row` is now block (head + text). Cost if wrong: visual only.
- c6-meeting run 1 had one `net::ERR_ABORTED` on page.goto (dev-server hiccup), run 2 all green — flaky navigation, no fix applied.
- Evidence: .git/vibeproof-logs/c7-s2-*.log
