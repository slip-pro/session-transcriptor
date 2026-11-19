# C-15 report

I couldn't check: настоящий Google Календарь — всё на поддельном Google: создание Meet, письма гостям, «эту и все следующие» на настоящей серии, переход на летнее время внутри серии, серии с EXDATE, созданные вне кабинета (в очереди — живая проверка на тестовом календаре владельца).
What changed: при создании встречи можно задать повтор (каждую неделю или каждые 2 недели, N встреч или без конца) и ссылку на звонок (Google Meet или её постоянная ссылка Zoom); перенос, перетаскивание и отмена повторяющейся встречи спрашивают «Только эту» или «Эту и все следующие».
Try it: превью http://localhost:3111/cabinet?view=schedule (учётка коуча из `.local/web/.local/c11-preview/accounts.md`)
- «Повторять» каждую неделю или каждые 2 недели, «Сколько встреч» или «Без конца» — встречи серии на своих датах с креслом клиента, одно приглашение клиенту — checked by tests/c15-series.test.ts › create series, tests/c15-series.cjs › create
- Перенос «Эту и все следующие» (окном и перетаскиванием) — прошедшие и предыдущие на месте, следующие на новом времени, клиент и число встреч сохраняются, в том числе если встречи серии раньше переносились или отменялись; повтор после сбоя Google не теряет встречи — checked by c15-series.test.ts › move following, c15-series.cjs › move
- Отмена «Эту и все следующие» — следующих нет, предыдущие на месте; для начавшейся встречи этого варианта нет — checked by c15-series.test.ts › cancel following, c15-series.cjs › cancel, started
- «Ссылка на звонок»: Google Meet, «Моя ссылка Zoom» (ввод прямо в окне или в настройках календаря), без ссылки; ссылка видна в окне встречи — checked by c15-series.test.ts › call link, c15-series.cjs › call
- Встреча или серия, удалённая в самом Google, не переносится и не отменяется — «Этой встречи уже нет в Google Календаре» — checked by c15-series.test.ts › move following
- Другой коуч не может разрезать или отменить чужую серию и не видит её ссылку Zoom — checked by c15-series.test.ts › isolation, call link
- Окна без горизонтальной прокрутки на 1280/390/320 и с клавиатуры; C-13 и C-14 работают как раньше — checked by c15-series.cjs › layout, c14-edit.cjs (8/8), c13-schedule.cjs (6/6), серверные 26/26 — на итоговом коммите, на свежем поддельном Google. Первый итоговый прогон c13-schedule.cjs упал из-за остатков прошлых тестовых прогонов в поддельном Google (обрезанный текст в пересечении двух встреч); после перезапуска поддельного Google вся последовательность прошла, обрезка в узком блоке — в очереди
changelog: Повторяющиеся встречи и ссылка на звонок (Google Meet или своя ссылка Zoom) прямо из кабинета; перенос и отмена спрашивают — только эту встречу или эту и все следующие.

## Learning signals
- Review-caught defects: design review — 2 majors (meeting count before a split by actual start instead of original slot; agreed C-14 browser assertion would break silently); implementation review — 1 blocker (retry after a rolled-back split could trim the old series with no live new one, because the fake did not model Google keeping deleted ids), 3 minors (past original slot, fake fidelity, missing isolation test). Fixed with tests (product/changes/closed/C-15/design.md «Review», log.md; commits dc09316, 0a26d76 in `.local/web`).
- Avoidable rework: a final c13 browser run failed on leftover data from earlier test runs in the long-lived preview fake Google (an earlier buggy cleanup in c15-series.cjs). Resolved by restarting the fake; the sequence c15 → c14 → c13 then passed. Missing context: the operations note does not say to restart the fake before a final browser run.
- Follow-up review caught one more: an event or series deleted in Google could still be moved, re-creating a deleted series (fixed with a test, commit 3e59d54).
- Owner rescue: none observed for C-15 (accepted on first showing).
Learning urgency: normal
