# C-14 design: правка встреч из кабинета

Код: `.local/web` (свой git-репозиторий, ветка `codex/linux-hosting`). Пути ниже — от `.local/web`. Перед первым коммитом кода скопировать `brief.md` и этот файл в `.local/web/product/changes/C-14/` (так проверка коммитов того репозитория видит изменение, как с C-13). Следом идёт C-15 (серии, ссылка на звонок) — его дизайн отдельно, но типы здесь оставляют для него место.

## Map

- **Всё из C-13** (`product/changes/closed/C-13/design.md`): вход `requireCoach`, `requireOrigin` на изменяющих методах, ошибки `cabinetError`, тело `readCabinetJson` + `object()` (`lib/cabinet/transcript.ts`), хранилище `getCabinetStore()`.
- **Модуль календаря** `lib/cabinet/calendar.ts` (read in code):
  - `api(owner, pathAndQuery)` — только GET, повтор один раз на 401 с новым access-токеном; ошибки → `GoogleDown(code)` (в журнал только код) или `Reconnect`.
  - `cached(key, load)` — кеш в памяти, ключи `${owner}|list` и `${owner}|${calendarId}|${from}|${to}`; `forget(owner)` чистит и токен, и кеш.
  - `calendarList` → `Listed {id,name,primary}` — `accessRole` сейчас не сохраняется (нужен).
  - `fetchEvents` строит `RawEvent`: `key = calendarId|eventId`, `seriesKey = calendarId|(recurringEventId||id)`, отбрасывает `cancelled`; в ответ не идут организатор, описание, ссылки.
  - `selectedIds(selected, list)` — выбранные или основной.
  - `matchClient` — назначение по `seriesKey` → почта гостя → имя.
- **Назначения** `store.setCalendarAssignment(owner, seriesKey, clientId, learnEmails)` (`lib/cabinet/store.ts` ~173) — образец транзакции; встреча, созданная кабинетом, привязывается через неё же (`manual`).
- **Писатели событий:** только Google (её правки в Google и теперь кабинет). В базе событий нет (D25) — сбросов и миграций нет. Кеш событий — единственное, что надо сбрасывать после записи.
- **Интерфейс** `app/cabinet/ui/schedule.tsx`: `ScheduleView` (панель, `Grid`, окна), `MeetingWindow` (окно встречи), `GridBlock` (блок-кнопка, позиция `top`/`height` из `layoutDay`, `HOUR_PX = 68`), `WhoseMeeting` (образец окна с `ClientPicker`, `busy`, `error`), `useSchedule(...).reload`. Шапка клиента — `workspace.tsx` стр. 188 (`<NextMeeting clientId=…/>`). Окно — `ui/dialog.tsx`; выбор клиента — `ui/client-picker.tsx`; ошибки — `errorMessages` в `ui/api.ts`.
- **Почта клиента:** `contactAddresses(contact)` из `lib/cabinet/contact.ts` (разбор контакта, а не подстрока) — первая почта = адрес приглашения.
- **Тесты.** Серверные: `tests/c13-schedule.test.ts` — образец обвязки (`setupC11`, `startFakeGoogle`, `ENV_KEYS`, `call()` собирает все тела ответов, перехват stderr, `connect(cookie)`); `npm test` (node:test + tsx, Node 24). Браузерные: `tests/c13-schedule.cjs` (шаги по аргументам; превью `.local/c11-preview` на 3111 + поддельный Google 3121 — `product/operations.md` «C-13 notes»; лимит входа 5/мин → ~70 с между прогонами).
- **Поддельный Google** `tests/helpers/fake-google.ts`: только чтение (calendarList, events list). Нужно добавить запись. `fake-google-server.ts` — набор событий превью.
- **Google Calendar API v3** (проверить по context7/developers.google.com при сборке): `events.insert` POST `/calendars/{cal}/events?sendUpdates=all|none`; `events.get` GET `/calendars/{cal}/events/{id}`; `events.patch` PATCH `/calendars/{cal}/events/{id}?sendUpdates=…`; `events.delete` DELETE `…/{id}?sendUpdates=…` (204). Экземпляр серии из `singleEvents=true` имеет свой id — patch/delete по нему меняет только этот раз (Google создаёт исключение). `calendarList` отдаёт `accessRole` (`owner|writer|reader|freeBusyReader`). У события — `organizer {email, self}`, `locked`, `eventType` (`default`, `outOfOffice`, `focusTime`, `workingLocation`, `birthday`, `fromGmail`).

## Options

1. **Оставить как есть** — правка в Google Календаре. Не выполняет согласованное.
2. **Ссылка «Открыть в Google Календаре»** (`htmlLink` события) — почти ничего нового, но это и есть «переключаться в Google»; бриф говорит обратное.
3. **Запись через тот же модуль `calendar.ts`** — `api()` получает метод и тело; три новые функции и один маршрут; поддельный Google учится записи. Разрешение `calendar.events` уже есть у всех подключений (C-13 требует его при подключении).

## Decision

Вариант 3. Новых зависимостей и разрешений нет, токен и журналы — по правилам C-13, тестируется на поддельном Google.

## Program design

**Типы** (`lib/cabinet/types.ts`):
```
ScheduleEvent += editable: boolean      // её встреча, её календарь с правом записи, не «весь день», обычный тип, не locked
               recurring: boolean       // часть серии (есть recurringEventId)
NewMeeting  = { clientId: string; start: string /* ISO с отступом */; minutes: number; title: string; invite: boolean; timeZone: string }
MoveMeeting = { key: string; start: string; minutes: number; timeZone: string }
```
`guestEmails` уже есть (C-13) — по нему окно отмены/переноса пишет «Гости получат уведомление от Google».

**Модуль `lib/cabinet/calendar.ts`:**
- `api(owner, path, init?: { method: "POST"|"PATCH"|"DELETE"; body?: unknown })` — JSON-тело, `content-type: application/json`; 204 → `null`. Для записи ошибки Google отображаются в `CabinetError`: 401 после обновления токена → `Reconnect`; 403 с причиной `insufficientPermissions`/`forbidden` → `CALENDAR_NO_WRITE` 403; 404/410 → `CALENDAR_EVENT_GONE` 404; прочее и сеть → `CALENDAR_SAVE_FAILED` 502. Запись **не повторяется** (повтор POST после таймаута мог бы создать вторую встречу). Журнал — только код, как сейчас.
- `Listed += accessRole`; `writable = owner|writer`.
- `fetchEvents`: `editable = writable(calendar) && !allDay && (organizer?.self === true || organizer?.email === calendarId) && !locked && (eventType ?? "default") === "default"`; `recurring = Boolean(recurringEventId)`.
- `targetCalendar(owner): string` — основной, если он среди показываемых и writable; иначе первый показываемый writable; нет → `CabinetError("CALENDAR_READ_ONLY", 409)`.
- `createMeeting(owner, input: NewMeeting): Promise<{ key: string }>`:
  клиент `store.client(owner, clientId)` (чужой/нет → 404, архивный → 400 `INVALID_DATA`); `minutes` 15–480, кратно 5; `title` 1–200 символов после trim; `timeZone` — проверка `new Intl.DateTimeFormat("ru", {timeZone})`; `start` — валидная дата. Тело: `{ summary, start: {dateTime, timeZone}, end: {dateTime: start+minutes, timeZone}, attendees: invite && почта ? [{email}] : undefined }`, `sendUpdates = invite && почта ? "all" : "none"`. После ответа: `store.setCalendarAssignment(owner, `${cal}|${id}`, clientId)` и сброс кеша событий владельца.
  `invite: true` без почты у клиента → просто без гостей (интерфейс галочку не показывает).
- `moveMeeting(owner, input: MoveMeeting)`: `editableEvent(owner, key)` → PATCH `{start, end}` с `sendUpdates = есть гости ? "all" : "none"`; сброс кеша.
- `cancelMeeting(owner, key)`: `editableEvent` → DELETE с тем же правилом `sendUpdates`; сброс кеша. Назначение по `seriesKey` не трогаем (у одиночной встречи оно просто больше не встречается).
- `editableEvent(owner, key)`: разобрать `calendarId|eventId` по **первому** `|` (id календаря — почта или `…@group.calendar.google.com`, без `|`; длина ключа ≤ 1100); `calendarId` должен быть среди её календарей списка; GET события (её токеном) и та же проверка `editable` → иначе `CALENDAR_NOT_EDITABLE` 403. Возвращает `{ calendarId, eventId, hasGuests }`.
- `dropEvents(owner)` — удалить ключи `${owner}|…` кроме токена (сейчас `forget` чистит и токен — разделить).

**Маршрут** `app/api/cabinet/calendar/meetings/route.ts` (по образцу `assignments/route.ts`):
- `POST` → `createMeeting` → `{ ok: true, key }`
- `PATCH {key, start, minutes, timeZone}` → `moveMeeting` → `{ ok: true }`
- `DELETE {key}` → `cancelMeeting` → `{ ok: true }`
Все: `requireOrigin` → `requireCoach` → состояние `connected`, иначе `CALENDAR_NOT_CONNECTED` 409 (`unavailable` → 503).

**Ошибки** в `ui/api.ts`: `CALENDAR_SAVE_FAILED` «Не удалось сохранить в Google Календаре. Попробуй ещё раз.», `CALENDAR_NOT_EDITABLE` «Эту встречу можно изменить только в Google Календаре.», `CALENDAR_READ_ONLY` «Нет календаря, куда кабинет может записать встречу. Выбери свой календарь в настройках.», `CALENDAR_NO_WRITE` «Google не дал права менять встречи. Переподключи календарь.», `CALENDAR_EVENT_GONE` «Этой встречи уже нет в Google Календаре.».

**Интерфейс** (`app/cabinet/ui/schedule.tsx`, новые компоненты там же; чистые функции времени — `lib/cabinet/schedule-view.ts`):
- `MeetingForm` (окно на `Dialog`) — два режима:
  - «Новая встреча»: `ClientPicker` (с «+ Новый клиент»; подставлен, если открыто от клиента), дата `<input type="date">`, начало `<input type="time" step="900">`, длительность `<select>` 30/45/50/60/75/90/120 мин (по умолчанию 60), название (по умолчанию «Сессия с <имя>», меняется при смене клиента, пока его не правили руками), галочка «Отправить приглашение на <первая почта контакта>» — видна, только если почта есть, включена по умолчанию. Кнопки «Создать», «Отмена».
  - «Перенести»: дата, начало, длительность (заполнены текущими), «Перенести», «Отмена»; при гостях — строка «Гости получат уведомление от Google».
  - Ошибка показывается в окне (`role="alert"`), поля не сбрасываются, окно не закрывается. `CALENDAR_NO_WRITE` — ещё и ссылка «Переподключить» (`/api/cabinet/calendar/connect`).
  - Время: `localStart(date, time)` → `Date` в поясе браузера → ISO; `timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `MeetingWindow`: при `editable` — кнопки «Перенести» и «Отменить встречу»; иначе (кроме «весь день») тихая строка «Изменить можно в Google Календаре». У повторяющейся (`recurring`) подпись «Изменится только эта встреча» (до C-15).
- Подтверждение отмены (`Dialog` «Отменить встречу?»): название, время, при гостях «Гости получат уведомление от Google»; «Отменить встречу» / «Не отменять».
- Панель расписания: кнопка «Новая встреча» (основная, `cc-button`) рядом с «Сегодня»; дата по умолчанию — выбранный день (если он не в прошлом) или сегодня, время — следующий целый час (с 08:00 до 21:00; иначе 10:00 следующего дня).
- Шапка клиента (`workspace.tsx`, рядом с `NextMeeting`): `<ScheduleMeetingButton client=… />` — тихая кнопка «Назначить встречу», только если календарь `connected` (берёт состояние из того же запроса, что `NextMeeting` — объединить их в один компонент `ClientMeetings`, чтобы не было второго запроса). После создания — `reload()` и строка «Следующая встреча» обновляется.
- После любой успешной записи: закрыть окно, `reload()` расписания, сообщение `role="status"` «Встреча создана» / «Встреча перенесена» / «Встреча отменена».
- **Перетаскивание** (`GridBlock`, только `editable`, только мышь/перо — `pointerType !== "touch"`, на телефоне не включается): `pointerdown` → после сдвига ≥ 4 px начинается перенос (иначе это клик и окно встречи открывается как раньше); блок следует за указателем с шагом 15 мин по вертикали и по колонкам дней (колонка — по `data-day` под указателем, `document.elementsFromPoint`); подпись времени в блоке показывает новое начало; `Escape` — отмена переноса. Отпустили — блок остаётся на новом месте с `aria-busy`, PATCH; успех — `reload()`; отказ — блок возвращается, сообщение об ошибке над сеткой. Длительность сохраняется. Чистая функция `dropTarget(startMin, deltaY, hourPx, day): { start: Date }` в `schedule-view.ts` (шаг 15 мин, не раньше 00:00, конец не позже 24:00 того же дня).
- Клавиатура: перенос — через окно «Перенести» (перетаскивание — только дополнение).

## Slices

**1. Запись в Google (сервер).** S-schedule-11, 12, 13, 14, 15, 16, 17 — серверная часть.
- Поддельный Google (`tests/helpers/fake-google.ts`): `calendarList` отдаёт `accessRole` (по умолчанию `owner`; `FakeCalendar.accessRole?`); `FakeEvent += organizer?: {email; self?}, locked?, eventType?` — по умолчанию организатор — сам календарь, `self: true`; GET одного события; POST (новый id `fake-ev-<uuid>`, хранит `attendees`, запоминает `sendUpdates` в журнале — он уже пишет `query`); PATCH (меняет `start`/`end` экземпляра или события); DELETE (у экземпляра → `status:"cancelled"`, у одиночного — удалить; 204); флаги `failWrite500`, `forbidWrite403`. JSON-тело запроса записывать в журнал (`FakeLogEntry.json`).
- Тест `tests/c14-edit.test.ts` (копия обвязки `c13-schedule.test.ts`: `setupC11`, `startFakeGoogle`, `connect`, `call`, перехват stderr; `TZ=Europe/Moscow`, `CALENDAR_CACHE_SECONDS` = 120 — чтобы проверить, что запись сбрасывает кеш):
  - `create`: POST → в fake событие в основном календаре с `start.dateTime` = введённое время, `timeZone` = переданный, `end` = +60 мин, `summary` «Сессия с Верой…»; следующий GET events (без ожидания кеша) — встреча с клиентом, `match:"manual"`, `editable:true`. Основной не выбран, выбран `work` → создаётся в `work`. Только календари `reader` выбраны → 409 `CALENDAR_READ_ONLY`, в fake ничего. `minutes: 7`, пустое название, неверный `timeZone`, неверная дата → 400, POST в fake не ушёл. Архивный/чужой клиент → 400/404.
  - `move`: PATCH экземпляра серии → у fake изменён только он, соседние экземпляры на местах; ответ events показывает новое время сразу.
  - `cancel`: DELETE экземпляра → в events его нет, остальные экземпляры серии есть; одиночное событие → пропало.
  - `invite`: клиент с контактом «+7 900…, vera@example.test», `invite:true` → `attendees:[{email:"vera@example.test"}]`, `sendUpdates=all`; `invite:false` → без attendees, `sendUpdates=none`; клиент без почты + `invite:true` → без attendees, `none`. Перенос и отмена события с гостем → `sendUpdates=all`; без гостей → `none`.
  - `not own`: событие с `organizer:{email:"boss@x.test"}` → в events `editable:false`; PATCH и DELETE по нему → 403 `CALENDAR_NOT_EDITABLE`, в fake ни одного PATCH/DELETE; календарь `reader` → то же; «весь день» → `editable:false`; ключ с календарём не из её списка → 403.
  - `failure`: `failWrite500` → POST 502 `CALENDAR_SAVE_FAILED`, назначения нет, events прежние; ровно один POST в fake (без повтора); `forbidWrite403` → 403 `CALENDAR_NO_WRITE`; fake 404 на PATCH → 404 `CALENDAR_EVENT_GONE`; refresh-токен отозван → ответ `reconnect` (409 `CALENDAR_NOT_CONNECTED` или состояние reconnect — как у events). В stderr только коды.
  - `isolation`: второй коуч без подключённого календаря — POST/PATCH/DELETE (в том числе по ключу первого) → 409 `CALENDAR_NOT_CONNECTED`, в fake ни одной записи, события первого не изменились (доступ к чужому календарю невозможен: запись идёт только токеном того, кто вошёл, а ключ проверяется по его списку календарей); без входа 401; аккаунт транскрибатора 403; без Origin 403; ни одно тело ответа не содержит токенов и `GOOGLE_CLIENT_SECRET`.
  Каждая проверка падает на сегодняшнем коде (маршрута нет; `editable` нет).
- Файлы: `lib/cabinet/calendar.ts`, `lib/cabinet/types.ts`, `app/api/cabinet/calendar/meetings/route.ts` (новый), `app/cabinet/ui/api.ts` (тексты ошибок), `tests/helpers/fake-google.ts`, `tests/c14-edit.test.ts` (новый).
- Готово: `npm test` целиком зелёный (включая `c13-schedule.test.ts` — `accessRole`/`organizer` по умолчанию не должны его ломать), `npm run typecheck`, `npm run lint`.

**2. Окна: новая встреча, перенос, отмена.** S-schedule-11, 12, 13, 14, 15, 16 (интерфейс), 18.
- `fake-google-server.ts`: календарь `holidays@group.test` с `accessRole: "reader"` и одним событием; событие от чужого организатора «Встреча у Ани» (`organizer:{email:"anya@example.test"}`); у клиента превью с почтой — встреча с гостем.
- Браузерный тест `tests/c14-edit.cjs` (копия запуска `c13-schedule.cjs`), шаги:
  - `create`: «Новая встреча» → выбрать клиента → название «Сессия с …» подставилось → поменять время на 15:30, 45 мин → «Создать» → блок появился в колонке дня, верх ниже блока 12:00 того же дня, «Встреча создана»; со страницы клиента «Назначить встречу» — клиент уже выбран, после создания строка «Следующая встреча» показывает эту встречу. Галочка приглашения видна и включена у клиента с почтой, нет у клиента без почты.
  - `move`: окно встречи → «Перенести» → другой день и время → блок в новой колонке/месте, старого нет.
  - `cancel`: «Отменить встречу» → подтверждение → «Не отменять» ничего не меняет → снова и «Отменить встречу» → блока нет.
  - `not own`: окно встречи «Встреча у Ани» — нет «Перенести»/«Отменить», есть «Изменить можно в Google Календаре».
  - `failure`: превью-fake получает флаг через свой адрес `POST /__flags {failWrite500:true}` (добавить в `fake-google.ts`, только для тестов) → «Создать» → ошибка в окне, поля сохранены; снять флаг → «Создать» ещё раз → создано.
  - `layout`: окна «Новая встреча», «Перенести», подтверждение — на 1280/390/320 без горизонтальной прокрутки (`scrollWidth <= innerWidth`), поля и кнопки достижимы Tab, видимый фокус, Escape закрывает.
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/ui/workspace.tsx` (кнопка у клиента), `app/cabinet/room.css`, `lib/cabinet/schedule-view.ts` (`localStart`, `defaultStart`), `tests/helpers/fake-google-server.ts`, `tests/helpers/fake-google.ts` (`/__flags`), `tests/c14-edit.cjs`.

**3. Перетаскивание.** S-schedule-19.
- `dropTarget` — серверный тест в `tests/c14-edit.test.ts` › drag math: +68 px при `HOUR_PX=68` = +60 мин; +20 px → +15 мин (округление к ближайшим 15); не раньше 00:00 и конец не позже 24:00.
- Шаг `drag` в `tests/c14-edit.cjs`: мышью (`page.mouse.down/move/up`) встречу клиента вниз на 2 часа и в соседнюю колонку → блок в новой колонке, верх на 2×68 px ниже, после перезагрузки там же (в fake изменилось время); щелчок без сдвига открывает окно встречи как раньше; Escape во время переноса — блок на старом месте, PATCH не ушёл; при `failWrite500` — блок вернулся, сообщение; чужая встреча не двигается; на 390 (телефон) перетаскивания нет — нажатие открывает окно.
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/room.css`, `lib/cabinet/schedule-view.ts`, тесты.
- Прогон в конце: `npm test`, `c13-schedule.cjs` (все шаги — расписание C-13 не сломано), `c14-edit.cjs` целиком.

## Visible work

Язык «Два кресла» (S-chairs-1), окна — существующий `Dialog`, поля — классы форм кабинета (`cc-field`, как в окне клиента `forms.tsx`), кнопки `cc-button`/`cc-secondary`/`cc-text-button`. «Новая встреча» — одна основная кнопка на панели; на телефоне панель переносится, кнопка не уезжает за край. Перетаскиваемый блок — `cursor: grab`, во время переноса тень и `opacity` у исходного места; цвета блоков по D07 не меняются. Нативные поля даты и времени — на телефоне откроют системные пикеры. Тексты на «ты», как во всём кабинете.

## Risks

- **Повтор записи создаёт дубль** — поэтому запись не повторяется автоматически; при `CALENDAR_SAVE_FAILED` после таймаута встреча могла всё же создаться — после ошибки расписание перезагружается, и она увидит её, если создалась.
- **Письма клиентам** уходят только через Google и только когда есть гость: создание — по галочке; перенос/отмену встречи с гостями Google уведомляет (окно предупреждает). Тесты — только на поддельном Google и синтетических адресах `example.test`.
- **Не тот час из-за часового пояса** (бриф, «Would fail if») — время отправляется с отступом и `timeZone` браузера; тест сравнивает `dateTime` в fake.
- **Правка чужого** — сервер перед записью сам читает событие из Google её токеном и проверяет организатора и права календаря; ключ из браузера не доверяется.
- **Отмена** — у Google встреча 30 дней лежит в корзине; кабинет не восстанавливает. Подтверждение перед отменой.
- Откат: новый маршрут и кнопки; без них C-13 работает как раньше. Данных в базе не добавляется (кроме назначения созданной встречи — обычная строка C-13).

## Decisions to keep

- Запись в Google не повторяется автоматически (дубли встреч хуже одной ошибки).
- Право правки решает сервер по самому событию в Google (организатор = она/её календарь, календарь `owner|writer`, не locked, обычный тип, не «весь день»), а не по данным из браузера.
- Перенос и отмена встречи с гостями уведомляют гостей (`sendUpdates=all`), как предлагает сам Google; окно об этом предупреждает.
- Встречи «весь день» кабинет не правит (это не сессии с клиентами).

## Review

Свежий ревьюер (vibeproof-reviewer, только чтение, без хода обсуждения), 2026-11-19. Блокирующих нет; 3 существенных, 5 мелких — все приняты. **Поправки ниже имеют приоритет над текстом выше.**

1. **(M1) Перетаскивание встречи с гостями** — после отпускания, если у встречи есть гости (см. п. 7), сначала окно «Перенести? Гости получат уведомление от Google» с «Перенести» / «Не переносить»; PATCH уходит только после «Перенести», «Не переносить» возвращает блок. Без гостей — сразу. Шаг `drag` в `c14-edit.cjs`: встреча с гостем — до подтверждения в fake нет PATCH, после — PATCH с `sendUpdates=all`.
2. **(M2) Часовой пояс.** Сервер принимает `start` только с явным `Z` или `±hh:mm` (регулярка до `Date.parse`), иначе 400 `INVALID_DATA`, в fake ничего не уходит — тест в `create`. Браузерные шаги `create` и `move` идут в контексте Playwright с `timezoneId: "Asia/Yekaterinburg"` (машина и сервер — в другом поясе); проверка: `start.dateTime` в fake — тот же момент, что введён в Екатеринбурге, `start.timeZone === "Asia/Yekaterinburg"`.
3. **(M3) Изоляция по-настоящему.** Поддельный Google хранит календари и события по аккаунту: страница разрешения принимает `login_hint`-подобный выбор аккаунта через флаг `state.nextAccount` (по умолчанию `"me"`), refresh/access-токены привязаны к аккаунту, calendarList/events/запись — только по календарям этого аккаунта (`setEvents(calendarId, list, account = "me")`, `state.calendars` → по аккаунтам; у `"other"` — `other@gmail.test`). Существующие вызовы C-13 без аккаунта работают как раньше. Тест `isolation`: коуч B подключён к аккаунту `other`; PATCH и DELETE с ключом A → 403 `CALENDAR_NOT_EDITABLE` (календаря нет в его списке), в fake записи по календарю A нет, события A прежние. Плюс прежние проверки: без календаря 409, без входа 401, транскрибатор 403, без Origin 403, нет токенов в ответах.
4. **(m1) Разбор 403 от Google:** `error.errors[0].reason === "insufficientPermissions"` или `ACCESS_TOKEN_SCOPE_INSUFFICIENT` в `error.details` → `CALENDAR_NO_WRITE`; `rateLimitExceeded`/`userRateLimitExceeded`/`quotaExceeded` → `CALENDAR_SAVE_FAILED`; прочие 403 (`forbidden`, `requiredAccessLevel`, `forbiddenForNonOrganizer`) → `CALENDAR_NOT_EDITABLE`. Флаг fake `forbidWrite403` отдаёт `reason: "insufficientPermissions"`; добавить флаг `forbidNonOrganizer403` (`forbiddenForNonOrganizer`) и проверку → `NOT_EDITABLE`.
5. **(m2) Без дублей при повторном «Создать».** Окно «Новая встреча» при открытии создаёт id (base32hex: символы `0-9a-v`, 26 знаков) и шлёт его в POST (`NewMeeting += id`); сервер проверяет формат и передаёт `id` в `events.insert`. Ответ Google 409 (`duplicate`) — считается успехом: сервер делает GET этого id, проверяет, что событие её и в том же календаре, и возвращает `{ok, key}`. Fake принимает переданный `id` и отвечает 409 на повтор. Тест `failure`: fake создаёт событие, но отвечает 500 (флаг `failAfterWrite500`) → повтор с тем же id → 200, событие одно.
6. **(m3) Пропавший доступ при записи:** `invalid_grant` при обновлении токена → `lose()` (как при чтении) → 409 `CALENDAR_NOT_CONNECTED` → окно показывает «Переподключить». Повторный 401 после свежего токена → `CALENDAR_SAVE_FAILED`, токен не стирается.
7. **(m4) «Есть гости»** = есть участник без `self: true` и без `resource: true`. Fake по умолчанию кладёт организатора в `attendees` с `self:true` — тест: встреча без гостей → `sendUpdates=none`, предупреждения нет.
8. **(m5) Шаг `failure` в `c14-edit.cjs`** дополнительно: флаг `forbidWrite403` → в окне «Google не дал права менять встречи…» и ссылка «Переподключить», введённые поля на месте.
9. **Примечание для сборщика:** `fetchEvents` получает `accessRole` календаря (передать `Listed` вместо id). Если список календарей не загрузился и выбран запасной `"primary"`, события получают `editable:false` (право неизвестно), а ключ `primary|…` сервер отклоняет `CALENDAR_NOT_EDITABLE` — это нормально.
