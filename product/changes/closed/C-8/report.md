# C-8 report

I couldn't check: the secret scan of the browser build (the `browser-output` setting is not configured; it is already in the queue). I didn't run `next build`, for the same reason as in C-6 (it is queued). Everything below was checked in the 3104 preview on synthetic data.
What changed: the home page shows «Добавь запись» with a single field for audio or text and a chair picture, and «Мои клиенты» (clients in work) replaces «Последние встречи». «Клиенты» lists everyone, with the archive below; a meeting is added only from a file.
Try it: http://localhost:3104/cabinet (учебный кабинет)
- Home: «Добавь запись», «Получишь Word в формате ICF», «Выбрать файл»; no «У меня готовый текст», «Встреча без записи» or 1-2-3; chair picture on the computer, hidden on the phone. Checked by tests/cabinet-c8-home.cjs › hero (1280/390/320).
- «Мои клиенты» on home shows only clients in work; an archived one is absent; «Все клиенты» opens «Клиенты». Checked by c8-home › my-clients.
- «Клиенты»: clients in work on top, «Архив · N» below, search covers both, no switch. Checked by c8-home › clients-page and c5-clients › list.
- «+ Встреча» on a client page and «Добавить встречу» open the file picker directly; a text file opens the form without a material choice and does not go to recognition. Checked by c8-home › add-meeting and text-form, and cabinet-ux.test.ts.
- Meeting states in history, roles, the meeting page and visual limits are unchanged. Checked by c3-home, c3-roles (the first run timed out on the first page load and the unchanged rerun passed), c3-visual, c6-meeting and c7-tidy.
- Unit tests: 87, 86 pass, 1 skipped (pre-existing real-fixture skip), 0 fail. TypeScript passes. Lint on the touched UI files passes; the new .cjs script carries the same require() lint error as all browser scripts (queued).
changelog: The home page now shows your clients in work and one field for a recording or text; «Клиенты» shows the archive below.

## Learning signals
- none observed: no rework or review-caught defects; the owner accepted on the first showing.
- c3-roles flaky first-navigation timeout recurred (already queued). Evidence: .git/vibeproof-logs/c8-run-c3-roles*.log.
Learning urgency: normal
