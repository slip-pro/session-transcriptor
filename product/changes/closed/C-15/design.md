# C-15 design: повторяющиеся встречи и ссылка на звонок

Код: `.local/web` (git worktree, ветка `codex/linux-hosting`). Пути — от `.local/web`. Перед первым коммитом кода скопировать `brief.md` и этот файл в `.local/web/product/changes/C-15/` (проверка коммитов того репозитория). Ревизия брифа — в обоих репозиториях коммитом `Status: draft` + `Revised:`, затем `agreed`.

## Map

- **Основа — C-14** (`product/changes/closed/C-14/design.md` с «Review», `log.md`):
  - `lib/cabinet/calendar.ts`: `write(owner, path, method, body)` (без повтора; 409 только для POST), `translate`, `connected`, `timing(input, moving)`, `listed`, `targetCalendar`, `eventPath`, `splitKey`, `editableEvent` (читает событие её токеном, `editableItem`), `hasGuests` (участник не `self` и не `resource`), `createMeeting` (id из окна; 409 → сверка и PATCH), `moveMeeting`, `cancelMeeting`, `dropEvents(owner)`.
  - `fetchEvents(owner, calendar: Listed, …)` строит `ScheduleEvent` с `editable`, `recurring` (= есть `recurringEventId`), `seriesKey = cal|(recurringEventId||id)`.
  - Маршрут `app/api/cabinet/calendar/meetings/route.ts`: POST/PATCH/DELETE → функции модуля.
  - Типы `lib/cabinet/types.ts`: `NewMeeting {id, clientId, start, minutes, title, invite, timeZone}`, `MoveMeeting {key, start, minutes, timeZone}`, `CalendarStatus {state, calendars}`.
  - Интерфейс `app/cabinet/ui/schedule.tsx`: `MeetingForm` (создание и перенос; id на открытие), `CancelMeeting`, окно встречи `MeetingWindow` (подпись «Изменится только эта встреча» у серии), перетаскивание в `GridBlock`/`ScheduleView` (окно «Перенести?» для встреч с гостями, `dropTarget`), `SettingsDialog` (шестерёнка: календари, «Отключить»), `ClientMeetings` у клиента.
- **Назначения клиентов:** `store.setCalendarAssignment(owner, seriesKey, clientId)`, `store.calendarAssignments(owner)` (`lib/cabinet/store.ts` ~168–193); `matchClient` — назначение → почта гостя → имя в названии.
- **Хранилище настроек календаря:** `cabinet_calendar_connections` удаляется при «Отключить» (`deleteCalendarConnection`) — ссылку Zoom там держать нельзя, она пропала бы.
- **Поддельный Google** `tests/helpers/fake-google.ts`: аккаунты (`state.nextAccount`), события хранятся **развёрнутыми экземплярами** (повторы фикстур — отдельные записи с `recurringEventId`, без «главного» события), POST/PATCH/DELETE/GET одного события, флаги `/__flags`, журнал с `json`. Повторов (RRULE) и `instances` нет, `conferenceData` нет. `fake-google-server.ts` — набор превью (серии `weekly-marina`, `weekly-unknown` как экземпляры).
- **Тесты:** `tests/c14-edit.test.ts` и `tests/c14-edit.cjs` — образцы обвязки (сервер: `setupC11`, `startFakeGoogle`, `connect`, `call`, перехват stderr; браузер: вход, `ensureConnected`, `makeMeeting`, `fakeEvents`, `fakeLog`, контекст `Asia/Yekaterinburg`, уборка созданного). Превью и запуск — `product/operations.md` «C-14 notes» / «C-13 notes».
- **Google Calendar API v3** (сверить по context7 / developers.google.com при сборке):
  - серия: `events.insert` с `recurrence: ["RRULE:FREQ=WEEKLY;INTERVAL=1|2[;COUNT=n]"]`; `start.timeZone` обязателен для повторов;
  - экземпляры: `GET /calendars/{cal}/events/{masterId}/instances?showDeleted=true&timeMax=…` (у экземпляра `recurringEventId`, `originalStartTime`);
  - «эта и следующие» — как делает сам Google: у главного события правило получает `UNTIL` = начало этого экземпляра минус 1 с (UTC, `YYYYMMDDTHHMMSSZ`), `COUNT` убирается; с этого экземпляра — новая серия;
  - Meet: `events.insert?conferenceDataVersion=1` с `conferenceData.createRequest {requestId, conferenceSolutionKey: {type: "hangoutsMeet"}}`; в ответе/событии — `hangoutLink`, `conferenceData.entryPoints[]` (`entryPointType: "video"`, `uri`). Перенос `conferenceData` в новую серию — тем же параметром `conferenceDataVersion=1` с объектом `conferenceData` прежнего события (ссылка сохраняется).

## Options

1. **Оставить как есть** — серии и ссылки в Google. Не выполняет согласованное.
2. **Кабинет сам раскладывает серию на отдельные встречи** (10 одиночных событий). Просто для «эта и следующие», но в Google это не серия: её нельзя править как серию в самом Google, приглашение клиенту — 10 писем, «без конца» невозможно.
3. **Настоящие повторы Google (RRULE) и разрез серии, как в Google**; Meet — через `conferenceData`, Zoom — постоянная ссылка в месте и описании. Одно письмо-приглашение на серию, в Google это обычная серия.

## Decision

Вариант 3: в Google получается то же, что сделала бы она сама, письма клиенту — как от Google. Вариант 2 рассылает лишние письма и ломает серию в самом Google.

## Program design

**Типы** (`lib/cabinet/types.ts`):
```
Repeat = { every: 1 | 2; count: number | null }          // count 2–52 или null = без конца
CallLink = "none" | "meet" | "zoom"
NewMeeting += repeat: Repeat | null; call: CallLink
MoveMeeting += scope: "one" | "following"                // по умолчанию "one"
CancelInput = { key: string; scope: "one" | "following" }
ScheduleEvent += callLink: string | null                 // только https; Meet или ссылка из места встречи
CalendarStatus += zoomLink: string | null                // её постоянная ссылка, отдаётся и при неподключённом календаре
```

**Данные** (`lib/cabinet/store.ts`, конструктор, `CREATE TABLE IF NOT EXISTS`):
```
cabinet_calendar_prefs(owner_id TEXT PRIMARY KEY, zoom_link TEXT, updated_at TEXT NOT NULL)
store.zoomLink(owner): string | null; store.setZoomLink(owner, link: string | null)
```
Отдельная таблица: «Отключить календарь» ссылку не стирает. Удаление коуча — как у остальных таблиц владельца (проверить, есть ли общий путь удаления; если нет — не добавлять).

**Модуль `lib/cabinet/calendar.ts`:**
- `validZoomLink(value): string | null` — `https:` URL ≤ 500 символов, без пробелов; иначе `CabinetError("ZOOM_LINK_INVALID")` 400. Хост не ограничиваем (у Zoom бывают адреса компаний).
- `status()` добавляет `zoomLink`; `select()` без изменений. Новый `setZoomLink(owner, value: string | null)` (пустая строка = убрать).
- `fetchEvents`: `callLink = https(hangoutLink) ?? https(conferenceData.entryPoints.find(video).uri) ?? https(location)` — только строки, начинающиеся с `https://`, ≤ 500 символов. Описание события в ответ по-прежнему не идёт.
- `createMeeting` (дополнительно к C-14):
  - `repeat`: `every ∈ {1,2}`, `count` целое 2–52 или `null`; тело получает `recurrence: ["RRULE:FREQ=WEEKLY;INTERVAL=<every>" + (count ? ";COUNT=<count>" : "")]`.
  - `call: "meet"` → `?conferenceDataVersion=1` и `conferenceData.createRequest {requestId: input.id, conferenceSolutionKey: {type: "hangoutsMeet"}}`; `"zoom"` → нужна сохранённая ссылка (`store.zoomLink`), иначе 400 `ZOOM_LINK_MISSING` до запроса в Google; тело: `location: link`, `description: "Ссылка на звонок: " + link`.
  - Путь 409 (повтор с тем же id) сверяет и `recurrence`; при расхождении PATCH с новым `recurrence` (ссылку на звонок не меняем: Meet уже создан).
  - Назначение клиента — на `seriesKey = cal|id` (как сейчас: у серии id главного события = id из окна).
- `moveMeeting({…, scope})`: `scope: "one"` — как C-14. `scope: "following"` для экземпляра серии (`recurringEventId` есть, иначе 400):
  1. `editableEvent` экземпляра; GET главного события (`recurringEventId`) и проверка `editableItem` для него;
  2. если `originalStartTime` экземпляра = начало серии (первый раз) → PATCH главного события: новые `start`/`end` (+ `timeZone`), правило с заменой `BYDAY` (см. ниже); всё;
  3. иначе: `k` = число экземпляров до него (`instances?showDeleted=true&timeMax=<originalStart>`, все страницы); новое правило = прежнее правило, где `COUNT=n` → `COUNT=n-k` (если ≤ 0 — 400), `UNTIL` и остальные части — как были, одиночный `BYDAY` → день недели нового начала (в `timeZone`), несколько `BYDAY` — без изменений; `EXDATE`/`RDATE` не переносим;
  4. POST новой серии: id = новый (сервер, base32hex 26 знаков), `summary`, `attendees`, `location`, `description`, `conferenceData` (с `conferenceDataVersion=1`), `start`/`end` = введённые, `recurrence` = новое правило; `sendUpdates` по `hasGuests`;
  5. PATCH главного события: `recurrence` с `UNTIL` = `originalStart − 1 с` (UTC), без `COUNT`; `sendUpdates` по `hasGuests`;
  6. назначение: если у старой серии есть ручное назначение (`calendarAssignments`) — то же для `cal|newId`; иначе ничего (новая серия узнается как прежняя — те же гость и название);
  7. `dropEvents`. Если шаг 5 не удался после успешного 4 — DELETE новой серии (`sendUpdates` по гостям) и ошибка `CALENDAR_SAVE_FAILED`; если и откат не удался — ошибка та же, в журнал код (расписание покажет обе серии, она поправит в Google — редкий случай).
- `cancelMeeting({key, scope})`: `"one"` — как C-14. `"following"`: если это первый раз серии → DELETE главного события; иначе PATCH главного события с `UNTIL` (как шаг 5). `sendUpdates` по гостям.
- Порядок «сначала новая серия, потом обрезка старой»: при сбое между шагами у неё не пропадают встречи — максимум дубль, который откатывается.
- Правило разбирается только для вида `RRULE:` из одной строки с частями `FREQ, INTERVAL, COUNT, UNTIL, BYDAY, WKST` (и любые другие — переносятся как есть); если правил несколько или нет `RRULE` → 400 `CALENDAR_SERIES_UNSUPPORTED` («Такую серию меняй в Google Календаре»).

**Маршруты:**
- `meetings/route.ts`: POST принимает `repeat`, `call`; PATCH — `scope`; DELETE — `{key, scope}`.
- `calendar/route.ts`: `PATCH {zoomLink: string | null}` (отдельно от `{calendars}`; одно из двух в теле, иначе 400) → `CalendarStatus`. `GET` отдаёт `zoomLink`.

**Ошибки** (`ui/api.ts`): `ZOOM_LINK_INVALID` «Ссылка должна начинаться с https://», `ZOOM_LINK_MISSING` «Сначала сохрани свою ссылку Zoom», `CALENDAR_SERIES_UNSUPPORTED` «Такую серию можно изменить только в Google Календаре».

**Интерфейс** (`app/cabinet/ui/schedule.tsx`):
- `MeetingForm`, режим «Новая встреча», под длительностью:
  - «Повторять»: `<select>` «Не повторять» / «Каждую неделю» / «Каждые 2 недели»; при повторе — «Сколько встреч»: число 2–52 (по умолчанию 10) и галочка/вариант «Без конца».
  - «Ссылка на звонок»: `<select>` «Без ссылки» / «Google Meet» / «Моя ссылка Zoom» (по умолчанию — последний выбранный, хранится в `localStorage` с try/catch; иначе «Без ссылки»). При «Моя ссылка Zoom» без сохранённой ссылки — поле «Ссылка Zoom» и «Сохранить ссылку» прямо в окне (PATCH `/calendar`), после сохранения создание доступно.
  - Подпись при повторе с приглашением: «Клиент получит одно приглашение на всю серию».
- `MeetingForm`, режим «Перенести», и подтверждение отмены у повторяющейся встречи: выбор (две радиокнопки) «Только эту» (по умолчанию) / «Эту и все следующие»; подпись «Изменится только эта встреча» из C-14 убрать.
- Перетаскивание повторяющейся встречи: после отпускания окно «Перенести повторяющуюся встречу?» с «Только эту» / «Эту и все следующие» / «Не переносить»; при гостях там же «Гости получат уведомление от Google» (одно окно вместо двух).
- Окно встречи: строка «Ссылка на звонок» со ссылкой (`target="_blank" rel="noopener noreferrer"`, текст — адрес, перенос длинного).
- Настройки календаря (шестерёнка): поле «Моя ссылка Zoom» + «Сохранить» (пусто = убрать).

## Slices

**1. Серии и ссылки (сервер) + поддельный Google с повторами.** S-schedule-20, 21, 22, 23 — сервер.
- Fake (`tests/helpers/fake-google.ts`): хранит главное событие с `recurrence` и разворачивает его при `singleEvents=true` (только `FREQ=WEEKLY`, `INTERVAL`, `COUNT`, `UNTIL`, один `BYDAY` или без него; время по `start.timeZone` — достаточно смещения из `dateTime`, перехода на летнее время в тестовых поясах нет — тесты в `Europe/Moscow`/`Asia/Yekaterinburg`); id экземпляра `<masterId>_<YYYYMMDDTHHMMSSZ>`, `recurringEventId`, `originalStartTime`; исключения (PATCH/DELETE экземпляра) хранятся по id экземпляра поверх развёртки; `GET …/{masterId}/instances` (с `showDeleted`, `timeMax`); PATCH/DELETE главного; `conferenceDataVersion=1` + `createRequest` → `hangoutLink: https://meet.google.com/fake-<id>` и `conferenceData.entryPoints`; копия `conferenceData` при POST сохраняет ссылку; журнал запросов уже пишет `query` и `json`. Старые развёрнутые фикстуры (без главного) продолжают работать.
- Тест `tests/c15-series.test.ts` (обвязка как в `c14-edit.test.ts`):
  - `create series`: каждую неделю × 10 → в fake одно главное событие с `RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=10`, `start.timeZone`; events за 12 недель — ровно 10 встреч на своих датах, все с клиентом (`manual`); каждые 2 недели без конца → `INTERVAL=2` без `COUNT`, встречи через 14 дней; `count` 1 или 53, `every` 3 → 400, POST не ушёл; с приглашением — один POST с `attendees` и `sendUpdates=all`.
  - `move following`: серия из 10, перенос 4-й на час позже «эту и следующие» → встречи 1–3 на старом времени, 4–10 на новом (всего 10), у главного `UNTIL` до 4-й и нет `COUNT`, новая серия `COUNT=7`; новые встречи с тем же клиентом (ручное назначение скопировано); перенос с изменением дня недели → новая серия по новому дню; «эту и следующие» для первой встречи → одна серия, все на новом времени; `scope: "following"` у одиночной → 400; сбой fake на PATCH главного после POST → 502 и новая серия удалена (в fake её нет), старая цела; несколько `RRULE`/без `RRULE` → 400 `CALENDAR_SERIES_UNSUPPORTED`.
  - `cancel following`: отмена 4-й «эту и следующие» → остаются 1–3; первой → серии нет; «только эту» → 9.
  - `call link`: Meet → в fake `conferenceDataVersion=1` и `createRequest`, в events `callLink` = `https://meet.google.com/…`; Zoom без сохранённой ссылки → 400 `ZOOM_LINK_MISSING`, POST не ушёл; `PATCH /calendar {zoomLink:"http://…"}` → 400; сохранённая `https://us02web.zoom.us/j/123` → `location` и `description` её содержат, `callLink` = она; «Отключить календарь» ссылку Zoom не стирает; другой коуч не видит её ссылку; без ссылки → `callLink: null`; «эту и следующие» у серии с Meet → новая серия с той же ссылкой Meet.
- Файлы: `lib/cabinet/calendar.ts`, `lib/cabinet/types.ts`, `lib/cabinet/store.ts`, `app/api/cabinet/calendar/meetings/route.ts`, `app/api/cabinet/calendar/route.ts`, `app/cabinet/ui/api.ts`, `tests/helpers/fake-google.ts`, `tests/c15-series.test.ts`.
- Готово: `node --import tsx --test tests/c15-series.test.ts tests/c14-edit.test.ts tests/c13-schedule.test.ts` зелёные, typecheck, lint.

**2. Окна и перетаскивание.** S-schedule-20, 21, 22, 23 — интерфейс.
- Превью-fake (`fake-google-server.ts`): серия `weekly-marina` — главное событие с `RRULE` (а не экземпляры), с `hangoutLink`; одна встреча со ссылкой Zoom в `location`. Проверить, что `c13-schedule.cjs` и `c14-edit.cjs` проходят (у них могут быть ожидания id экземпляров `weekly-marina_<дата>` — поправить на новый формат только если сломались, без ослабления).
- Тест `tests/c15-series.cjs` (обвязка `c14-edit.cjs`, контекст `Asia/Yekaterinburg`), шаги:
  - `create series`: «Новая встреча» → «Каждую неделю», «Сколько встреч» 4 → «Создать» → четыре недели подряд по блоку в той же колонке и времени; «Каждые 2 недели» + «Без конца» → блок через неделю не появился, через две — есть.
  - `move following`: окно встречи 2-й из серии → «Перенести» → «Эту и все следующие» → 1-я на месте, 2-я и следующие на новом времени; то же перетаскиванием (окно выбора после отпускания); «Не переносить» ничего не меняет.
  - `cancel following`: «Отменить встречу» → «Эту и все следующие» → следующих нет, предыдущая на месте.
  - `call link`: «Google Meet» → в окне встречи ссылка `https://meet.google.com/…` (открывается в новой вкладке); «Моя ссылка Zoom» без сохранённой → поле ввода, «http://x» → ошибка, `https://…` → «Сохранить ссылку» → создание → ссылка в окне встречи; в настройках календаря видна сохранённая ссылка, её можно убрать.
  - `layout`: окна с новыми полями на 1280/390/320 без горизонтальной прокрутки, всё с клавиатуры, Escape закрывает.
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/room.css`, `tests/helpers/fake-google-server.ts`, `tests/c15-series.cjs`; `app/cabinet/privacy/page.tsx` — одна фраза: кабинет хранит её ссылку Zoom, если она её ввела.

## Visible work

Те же окна C-14 (`Dialog`, `cc-form`, `cc-meeting-grid`), новые поля — нативные `select`/`input` с подписями; выбор «Только эту / Эту и все следующие» — радиокнопки в `fieldset` с `legend`. Ссылка на звонок — обычная ссылка кабинета, длинный адрес переносится (`overflow-wrap: anywhere`). На телефоне поля в одну колонку. Тексты на «ты».

## Risks

- **«Эта и следующие» задела прошедшие или другие серии** (бриф, «Would fail if») — правится только главное событие этой серии (`recurringEventId`), прошедшие остаются до `UNTIL`; тесты считают встречи до и после.
- **Неверное число встреч после разреза** — `COUNT` новой серии = прежний минус экземпляры до разреза, включая отменённые (`showDeleted=true`): Google считает их в `COUNT`. Тест на 10 → 3 + 7.
- **Исключения после разреза** (перенесённые по одной встречи старой серии позже точки разреза) Google при обрезке убирает — как и в самом Google при «эта и следующие». Принято.
- **Неверная ссылка на звонок у клиента** — Meet создаёт Google; Zoom — её сохранённая ссылка, проверка `https://`. Описание события перезаписывается только при создании кабинетом.
- **Сбой посередине разреза** — сначала новая серия, потом обрезка, откат новой при сбое обрезки.
- **Повторы и часовой пояс** — `start.timeZone` = пояс её браузера, Google считает повторы в нём (переход на летнее время в её поясе Google учитывает сам).
- Откат: новые поля необязательны; без них поведение C-14. Таблица `cabinet_calendar_prefs` безвредна.

## Decisions to keep

- Повторы — настоящие серии Google (RRULE), а не набор одиночных встреч: одно приглашение клиенту, серия правится и в самом Google.
- «Эта и все следующие» — как в Google: прежняя серия обрезается `UNTIL`, с этой встречи начинается новая (тот же клиент); сначала создаётся новая, потом обрезается старая.
- Ссылка Zoom — её постоянная ссылка, хранится в кабинете отдельно от подключения календаря (переживает «Отключить»); Meet создаёт Google.

## Review

Свежий ревьюер (vibeproof-reviewer, только чтение, без хода обсуждения), 2026-11-19. Блокирующих нет; 2 существенных, 5 мелких — все приняты. **Поправки ниже имеют приоритет над текстом выше.**

1. **(M1) Счёт встреч до разреза.** `k` считается только если в правиле есть `COUNT` (значит ≤ 52 экземпляров): `instances?showDeleted=true` **без `timeMax`** (все страницы), `k` = экземпляры с `originalStartTime` раньше `originalStartTime` разрезаемой встречи (по `originalStartTime`, а не по фактическому `start`). Fake отдаёт у экземпляров `originalStartTime`, у отменённых — `status:"cancelled"` с ним же. Тест в `move following`: серия 10; 2-ю отменить «только эту»; 6-ю перенести «только эту» на день раньше 4-й; разрезать по 4-й → новая серия `COUNT=7`, в старой остались 1, 3 и перенесённая 6-я исчезла (Google убирает исключения после разреза — так и в fake).
2. **(M2) Подпись C-14.** S-schedule-12 и S-schedule-13 остаются верными: выбор «Только эту» стоит по умолчанию. Строку `tests/c14-edit.cjs:196` (ждёт «Изменится только эта встреча») заменить проверкой: в окне «Перенести» у встречи серии выбрано «Только эту», и перенос меняет только её (остальная часть шага — как была). Это не ослабление: проверяется то же поведение, подпись заменена выбором по брифу C-15.
3. **(m1) Копия Meet в новую серию:** переносить только `conferenceId`, `conferenceSolution`, `entryPoints` (без `createRequest`) с `conferenceDataVersion=1`. Fake: `conferenceData` без `createRequest` сохраняет переданную ссылку; с `createRequest` — создаёт новую.
4. **(m2) Повтор разреза без дубля:** id новой серии = base32hex (26 знаков) от sha256(`masterId|originalStart`). Ответ 409 на POST новой серии → GET и `editableItem`, сверка как в C-14 (`createMeeting`), продолжение с шага 5. Тест: fake создаёт новую серию, но отвечает 500 (`failAfterWrite500`) → повтор того же переноса → одна новая серия, старая обрезана.
5. **(m3) Только будущее:** «Эту и все следующие» предлагается только для встречи, которая ещё не началась; сервер на `scope:"following"` для начавшейся встречи (её `start` ≤ сейчас) → 400 `INVALID_DATA`. Проверка в `move following` и `cancel following`.
6. **(m4) Что переносится в новую серию:** `summary`, `attendees`, `location`, `description`, `conferenceData` (п. 3), `reminders`, `colorId`, `transparency`, `visibility`. Назначение копируется, если ключ старой серии есть в `calendarAssignments` — в том числе со значением `null` («Это не клиент»).
7. **(m5) Хранение ссылки Zoom** записывается при закрытии новым решением (D25 не правим): кабинет хранит её постоянную ссылку Zoom открыто (она и так уходит в каждое приглашение), отдельно от подключения, «Отключить» её не стирает.
