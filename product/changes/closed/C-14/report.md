# C-14 report

I couldn't check: настоящий Google Календарь — всё проверено на поддельном Google (OAuth-клиента владельца ещё нет); что именно Google пишет гостям в письмах; проверку секретов в сборке (нужна защищённая настройка `browser-output`, пункт очереди); старые браузерные проверки c2/c3/c5/c8 после смены подписи кнопки (в них только заменены подписи, не запускались).
What changed: из кабинета можно создать встречу с клиентом, перенести её (окном или перетаскиванием мышью) и отменить — изменения уходят в её Google Календарь, клиенту по галочке приходит приглашение. Кнопка загрузки записи у клиента теперь «+ Запись» и не дублирует пустую карточку.
Try it: превью http://localhost:3111/cabinet?view=schedule (учётка коуча из `.local/web/.local/c11-preview/accounts.md`)
- «Новая встреча» в расписании и «Назначить встречу» у клиента — встреча появляется в сетке с креслом клиента и в Google на тот же час, в том числе из браузера в другом часовом поясе — checked by tests/c14-edit.test.ts › create, tests/c14-edit.cjs › create
- «Перенести» и «Отменить встречу» в окне встречи; у повторяющейся меняется только этот раз — checked by c14-edit.test.ts › move/cancel, c14-edit.cjs › move/cancel
- Галочка «Отправить приглашение на <почта>» включена по умолчанию; без почты её нет; гости получают уведомления о переносе и отмене, окна об этом предупреждают — checked by c14-edit.test.ts › invite, c14-edit.cjs › create, drag
- Чужие встречи без кнопок правки, «Изменить можно в Google Календаре»; сервер такую правку отклоняет; другой коуч не может тронуть её встречи — checked by c14-edit.test.ts › not own, isolation; c14-edit.cjs › not-own
- Сбой Google — сообщение в окне, поля на месте, повторное «Создать» не создаёт вторую встречу; нет права правки — «Переподключить» — checked by c14-edit.test.ts › failure, c14-edit.cjs › failure
- Перетаскивание мышью с шагом 15 минут; встреча с гостями сначала спрашивает; на телефоне перетаскивания нет — checked by c14-edit.test.ts › drag math, c14-edit.cjs › drag
- «+ Запись» у клиента только когда записи есть, «Добавить запись» во «Все встречи» — checked by c14-edit.cjs › record-button
- Окна без горизонтальной прокрутки на 1280/390/320 и с клавиатуры; расписание C-13 работает как раньше — checked by c14-edit.cjs › layout, c13-schedule.cjs (6/6), c13-schedule.test.ts (вместе с c14: 20/20)
changelog: Встречи можно создавать, переносить (в том числе мышью) и отменять прямо из кабинета — изменения уходят в Google Календарь, клиенту по желанию приходит приглашение.

## Learning signals
- Owner caught on showing two confusing controls the design missed: «+ Новый клиент» in the window opened from a client's page, and the older «+ Встреча» (upload a record) next to the new «Назначить встречу». Resolved by a fixed client in that window and a revision of S-chairs-23 (commits 8c7c78d, 59de9f7, 1c10ee3 in `.local/web`). Missing context: design did not review labels already on the screens it adds to.
- Review-caught defects: design review — 3 majors (unwarned guest mail on drag, time-zone tests that could not fail, isolation test that could not fail); implementation review — 4 minors (409 on edit treated as success, retry ignoring changed fields, off-grid moves stuck, drag snapping on a wobble); follow-up review — drag near midnight, retry tests not checking mail. All fixed with tests (product/changes/closed/C-14/design.md «Review», log.md).
- Avoidable rework: the brief copy in `.local/web` triggered VP-BRIEF-EDIT twice; a revision must be committed as draft then agreed in each repository that carries the brief.
- Operations recipe C-13/C-14 notes were used (preview start, sync, rate limit); outcome: worked; the preview folder is under `.local/web/.local/`, which the note now states.
Learning urgency: normal
