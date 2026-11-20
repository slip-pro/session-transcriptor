# C-18 design: запись новых клиентов

Код — в отдельном репозитории `.local/web` (Next 16, node:sqlite, свои тесты `npm test` = `node --import tsx --test tests/*.test.ts`). Память продукта — в корне.

## Map (read in code)
- Календарь: `lib/cabinet/calendar.ts`. Доступ к Google — `api()` (чтение, кэш `cached()` на `CALENDAR_CACHE_SECONDS`), `write()` (запись, без повторов; 409 на POST возвращается вызывающему), `translate()`, `dropEvents(owner)`, `targetCalendar(owner)`, `state(owner)`, `connected(owner)`. События: `fetchEvents()` → `events(owner, from, to)` по выбранным календарям (`selectedIds`). `createMeeting()` (l.428) — образец создания встречи с гостем `sendUpdates=all`; **его ветка 409 переписывает существующее событие на запрошенные значения — для записи её брать нельзя** (перезапишет гостя чужой записи).
- Клиенты: `lib/cabinet/store.ts` — `createClient(owner, {name, contact, request})`, `deleteClient`, `listClients`, `setCalendarAssignment(owner, seriesKey, clientId)`; таблицы создаются в конструкторе (`CREATE TABLE IF NOT EXISTS`, l.28–95); пример маленькой таблицы настроек — `cabinet_calendar_prefs` + `zoomLink/setZoomLink` (l.220).
- Почта в контакте: `contactAddresses()` (`lib/cabinet/contact.ts`, реэкспорт из store).
- HTTP: `lib/cabinet/http.ts` — `cabinetJson`, `cabinetError`, `requireOrigin`, `readCabinetJson`; `requireCoach` из `lib/cabinet/auth.ts`. Образец маршрута — `app/api/cabinet/calendar/meetings/route.ts`.
- Интерфейс расписания: `app/cabinet/ui/schedule.tsx`, `SettingsDialog` (l.370) — «Настройки календаря» со ссылкой Zoom; `Dialog` из `ui/dialog.tsx`; стили `app/cabinet/room.css` (`cc-form`, `cc-button`, `cc-hint`, `cc-error`).
- Сервер: nginx `location ^~ /cabinet` (noindex, no-store) и `location ^~ /api/cabinet/` уже проксируют всё нужное; `X-Forwarded-For $remote_addr` ставится nginx.
- Тесты: `tests/helpers/c11.ts` (`setupC11`, `inviteUser`, `login`, `apiRequest`, `ORIGIN`), `tests/helpers/fake-google.ts` (`startFakeGoogle`, `FakeEvent`, флаги отказов, `/__events`). Образец серверного теста с поддельным Google — `tests/c14-edit.test.ts` (TZ=Europe/Moscow, ENV_KEYS, mock stderr). Браузерный — `tests/c17-terms.cjs` (превью 3111, fake Google 3121, учётка из `.local/c11-preview/accounts.md`).
- Писатели данных: клиенты — только store (кабинет, импорт нет); назначения встреч — calendar.ts. Новая таблица пишется только новым модулем. Сбросов/кронов на эти таблицы нет (проверено grep по `DELETE FROM cabinet_`).

## Options
1. Ничего не строить, давать ссылку Google «Расписание встреч» (appointment schedules). Бесплатно в Google, но у бесплатного аккаунта ограничено, клиент не попадает в кабинет, окна настраиваются в Google — мимо «Why».
2. Своя страница записи поверх уже подключённого календаря (выбрано). Новое: одна таблица, один модуль, 3 маршрута, 2 экрана. Отключается выключателем.
3. Google freeBusy API для занятости — точнее, но нужна ещё одна область доступа (переподключение у всех) и доработка поддельного Google. Занятость считаем из уже читаемых событий, с учётом «свободен»/отклонённых.

## Decision
Вариант 2, занятость из `events`-чтения. Почему не 1 — клиент не появляется в кабинете; не 3 — переподключение ради того же результата.

## Program design
Новый модуль `lib/cabinet/booking.ts` (владелец логики записи):
```
type BookingWindow = { weekday: 0..6 (0=вс); from: "HH:MM"; to: "HH:MM" }   // from < to, шаг 15 мин
type BookingSettings = { enabled: boolean; code: string; minutes: number /*30*/; windows: BookingWindow[] /*≤21*/; timeZone: string }
const NOTICE_HOURS = 12; const AHEAD_DAYS = 14;
getSettings(owner): BookingSettings            // создаёт выключенные настройки с новым кодом при первом чтении
saveSettings(owner, value): BookingSettings    // проверка полей; enabled=true без подключённого календаря → CabinetError("CALENDAR_NOT_CONNECTED",409)
freeSlots(settings, busy: Interval[], now): string[]  // чистая функция: ISO-начала; окна в settings.timeZone, шаг = minutes от начала окна, [now+12ч, now+14д], без пересечения с busy
publicSlots(code, now): { open: true; coachName; minutes; slots } | { open: false }
book(code, input: { start; name; email; request?; id }, ip, now): Promise<{ start; email }>
```
- Код ссылки: 16 символов base32 из `randomBytes`, UNIQUE. Ссылка: `${cabinetUrl}/cabinet/book/<code>`.
- Таблица `cabinet_booking(owner_id PK, code UNIQUE, enabled, minutes, windows_json, time_zone, updated_at)` в store + методы `bookingByOwner`, `bookingByCode`, `saveBooking`, `findClientByEmail(owner, email)` (неархивный, `contactAddresses` содержит адрес).
- Время по поясу: функция `zoned(date "YYYY-MM-DD", time "HH:MM", tz) → Date` через `Intl.DateTimeFormat(...).formatToParts` (вычислить смещение, повторить один раз для перехода на летнее время). Пояс коуча берётся из браузера при сохранении настроек.
- В `calendar.ts` два новых экспорта (используют внутренние `api/write/cached`):
  - `busyIntervals(owner, from, to, fresh: boolean): Promise<Interval[] | null>` — по выбранным календарям; `fresh` сбрасывает кэш владельца перед чтением; `null`, если календарь не подключён/нужно переподключение. Занято: событие не отменено, `transparency !== "transparent"`, её собственный ответ (`attendees[self].responseStatus`) не `declined`. Весь-день-событие с `transparency` opaque занимает весь день в её поясе. Для этого `fetchEvents` (или параллельная внутренняя функция) должен сохранять `transparency` и `declined` — расширить `RawEvent` внутренними полями, наружу (`ScheduleEvent`) не отдавать.
  - `createBooking(owner, { id, start, minutes, timeZone, title, email }): Promise<{ key }>` — POST в `targetCalendar` с `attendees:[{email}]`, `sendUpdates=all`. При 409 (повтор того же id) читает событие: тот же гость и время → успех; иначе `CabinetError("BOOKING_TAKEN",409)`. Ничего не PATCH-ит. Потом `dropEvents(owner)`.
- `id` события детерминированный: base32hex от sha256(`owner|start|email`) (как `cutId`) — повторное нажатие даёт тот же id → одна встреча.
- `book()`: лимит (ниже) → проверка полей (имя 1–120, почта по простому шаблону ≤200, запрос ≤2000, start ISO) → настройки по коду, `enabled`, календарь подключён, иначе `BOOKING_CLOSED` 404 → **под замком владельца** (Map<owner, Promise> цепочка, процесс один): `busyIntervals(fresh=true)` → `freeSlots` содержит start? иначе `BOOKING_TAKEN` 409 → клиент: `findClientByEmail` или `createClient({name, contact: email, request})` (новый запоминаем) → `createBooking` (заголовок «Первая встреча с <имя>») → при ошибке удалить только что созданного клиента и пробросить (`CALENDAR_SAVE_FAILED` 502) → `setCalendarAssignment(owner, key, clientId)`.
- Лимит: в памяти, на IP (последний адрес `x-forwarded-for`, иначе `"local"`), 5 попыток POST в скользящий час → `BOOKING_TOO_MANY` 429. Сбрасывается рестартом — приемлемо (один сервер, вред — лишняя встреча, которую она отменит).
- Журналы: только коды, никаких имён/почт (как `down()` в calendar.ts).

Маршруты:
- `app/api/cabinet/booking/route.ts`: GET (requireCoach) → настройки + `url`; PUT (requireOrigin, requireCoach) → `saveSettings`.
- `app/api/cabinet/booking/[code]/route.ts`: GET без входа → `publicSlots`; POST (requireOrigin, без входа) → `book`. Закрытая/неверная ссылка — `{open:false}` с 200 для GET (одинаково для обоих случаев), POST → 404 `BOOKING_CLOSED`. Ответ GET не содержит названий/гостей событий — только времена слотов и имя коуча (`user.name`).
- Страница `app/cabinet/book/[code]/page.tsx` (клиентская): шапка «Запись на первую встречу · <имя>», «Время указано для пояса <браузерный пояс>», слоты сгруппированы по дням (кнопки-времена), форма имя/почта/запрос, «Записаться»; итог «Вы записаны на <дата, время>. Приглашение придёт на <почта>». Ошибки: `BOOKING_TAKEN` → «Это время только что заняли, выберите другое» + перезагрузка слотов; 502 → «Не удалось записаться, попробуйте ещё раз» (форма сохраняется); 429 → «Слишком много попыток, попробуйте позже»; закрыто → «Запись сейчас закрыта». Пустой список при открытой записи → «Свободного времени на ближайшие две недели нет».
- Кабинет: в `SettingsDialog` строка «Запись на первую встречу · Настроить» открывает новый `BookingDialog` (новый файл `app/cabinet/ui/booking.tsx`): выключатель, длительность (30 по умолчанию, выбор из 30/45/60), окна по дням недели (день + с/до, добавить/удалить строку), ссылка + «Скопировать», подсказка без календаря «Сначала подключите Google Календарь». Если календарь не подключён, пункт настройки виден на пустом экране расписания? — нет: `SettingsDialog` открыт только при подключённом; сервер всё равно отклоняет включение (S-booking-1 проверяется сервером и подсказкой в окне при ответе 409).

## Slices
1. **Сервер: настройки, слоты, запись** — S-booking-1 (сервер), 2, 3, 4, 5, 6, 7, 8. Test `tests/c18-booking.test.ts` (TZ=Europe/Moscow, fake Google, `mock.timers` или передача `now`):
   - settings: GET создаёт выключенные с кодом; PUT сохраняет окна/длительность/пояс, переживает новый store; включение без календаря → 409; кривые окна → 400.
   - slots: окна вт 10–12 → слоты 10:00,10:30,11:00,11:30 по Москве; событие 10:30–11:00 убирает 10:30; `transparency:"transparent"` и отклонённое — не убирают; слот раньше now+12ч и позже 14 дней нет; ответ не содержит заголовков событий (JSON.stringify не включает summary фикстуры).
   - book: событие в fake (`/__events`) с гостем и `sendUpdates=all`, заголовок «Первая встреча с …»; клиент создан с контактом/запросом; назначение есть (`events()` показывает клиента); второй раз та же почта → тот же клиент, нового нет.
   - taken: событие появилось после показа (кэш 120 с!) → 409, встреча не создана; двойной POST того же тела → одна встреча; два разных человека параллельно на один слот → одна встреча, второй 409.
   - closed: выключено/неверный код/переподключение → `{open:false}`, POST 404; ответы для неверного и выключенного одинаковы.
   - failure: флаг отказа записи в fake → 502, клиент не появился (количество клиентов то же).
   - isolation: B не читает/не меняет настройки A (у каждого свои); без входа GET/PUT настроек 401; 6-я попытка с одного IP → 429, с другого IP — проходит; stderr не содержит почты и имени.
   Files: `lib/cabinet/booking.ts`, `lib/cabinet/store.ts`, `lib/cabinet/calendar.ts`, `lib/cabinet/types.ts`, два route, `tests/helpers/fake-google.ts` (если список событий не отдаёт `transparency`/`responseStatus` из фикстуры — добавить). Done: тест зелёный, `npm run typecheck`, `npm run lint`, прежние c13–c17 `.test.ts` зелёные.
2. **Экраны: настройки в кабинете и публичная страница** — S-booking-1 (окно), 3 (видимый итог), 5–7 (сообщения), 9. Test `tests/c18-booking.cjs` (превью 3111 + fake 3121, как c17-terms.cjs; шаги `settings`, `book`, `taken`, `layout`): настроить окна, скопировать ссылку, открыть в новом контексте без входа, записаться, увидеть итог и встречу в расписании с креслом клиента; занятый слот → сообщение; 1280/390/320 без горизонтальной прокрутки, весь путь клавиатурой (Tab/Enter). В конце удалить созданных клиентов и встречи, выключить запись.
   Files: `app/cabinet/ui/booking.tsx`, `app/cabinet/ui/schedule.tsx` (строка в `SettingsDialog`), `app/cabinet/book/[code]/page.tsx`, `app/cabinet/room.css` (или свой css рядом). Done: шаги зелёные, скриншоты 1280/390 показаны владельцу.

## Visible work
Язык кабинета: светлые карточки `cc-*`, кнопки `cc-button`, тихие подсказки `cc-hint`. Публичная страница — тот же стиль без шапки кабинета и без навигации; слоты — сетка кнопок-таблеток по дням, на телефоне по 3 в ряд. Состояния: загрузка («Ищем свободное время…»), пусто, закрыто, ошибка, успех. Кнопки ≥44px, фокус виден, `role="alert"` для ошибок, `role="status"` для итога. Время с подписью пояса.

## Risks
- Двойная запись («Would fail if»): закрывается свежим чтением под замком + детерминированным id. Остаётся окно, если она сама ставит встречу в Google в ту же секунду — приемлемо.
- Пояс/переход времени: тест на `zoned()` с датой перехода не нужен для Москвы, но функция проверяется на Europe/Berlin 29.03.2026.
- Спам записями: лимит 5/час на IP + встреча видна ей и отменяется в один клик. Капчу не ставим.
- Посторонние данные: имя/почта/запрос живут только в карточке клиента её кабинета и в событии её календаря; новых получателей нет (письмо шлёт Google как приглашение — так же, как в C-14). Удаление клиента удаляет данные из кабинета; событие в Google — её.
- Откат: выключить запись (ссылка закрывается); таблица остаётся безвредной.

## Decisions to keep
- D35: запись идёт поверх её Google Календаря, занятость — из её событий (кроме «свободна» и отклонённых), а не через freeBusy — без нового разрешения Google.
- D36: публичная ссылка — по случайному коду, не по имени; закрытая и неверная ссылка неотличимы.
- D37: встреча записи создаётся детерминированным id и никогда не переписывает существующее событие; занятый слот — отказ.

## Review
Fresh `vibeproof-reviewer` (2026-11-20), one round. Findings and what was done — these override the text above where they differ:
- **B1 (accepted).** `busyIntervals` returns `null` when ANY selected calendar's read is null or stale (Google failure), not only when disconnected. Public GET then answers `{open:false, reason:"unavailable"}` → page «Запись временно недоступна, попробуйте позже»; `book()` refuses with `CALENDAR_SAVE_FAILED` 502 and creates nothing. Test `slots`/`failure`: fake read failure (flag) → no slots, POST 502, no event, no client.
- **M2 (accepted).** The deterministic id is the person's own booking: in the busy check under the lock, an event whose id equals this booking's id is ignored; `createBooking`'s 409 branch accepts the existing event if guest and time match and it is not `cancelled` (cancelled or different → `BOOKING_TAKEN`). Client cleanup on failure stays (retry recreates or finds it by email). Test `taken`: `failAfterWrite500` then the same POST again → 200, one event, one client.
- **M3 (decided by us).** Busy time comes from the calendars she shows in the cabinet (`selectedIds`) — she controls them in «Изменить календари». The booking dialog shows «Занятость берётся из календарей: <список>». Reading every calendar would block on holidays and colleagues' shared calendars.
- **M4 (decided by us, consistent with D34).** Permanent slots of other non-archived clients (C-17 `terms.slot`, 60 min, «раз в 2 недели» = every week) are busy too, in her time zone. Test `slots`: client slot Tue 10:00 removes 10:00 and 10:30.
- **M5 (accepted).** The public read uses a stable range: from = start of the current hour (UTC), to = from + 15 days, so the cache key changes at most hourly and anonymous loads hit Google at most once per `CALENDAR_CACHE_SECONDS`. Slots are then filtered by now+12h / now+14d.
- Minor (accepted): map `CALENDAR_READ_ONLY`, `CALENDAR_NOT_CONNECTED`, `CALENDAR_NO_WRITE` on POST to `BOOKING_CLOSED`-style «Запись сейчас закрыта» (404); `saveSettings` enabling requires a connected calendar with a writable target (`targetCalendar`), else 409 with the hint; public POST body cap 8 KB (`readCabinetJson(request, 8192)`); `start` compared by `Date.parse`; cancelled event on 409 = taken.
- **Q3 (decided by us).** Existing client with that email: card's empty «Запрос» is filled; a non-empty one is kept and the new request is appended to notes as «Запрос при записи <дата>: …». No new client.
- Checked true by reviewer: createMeeting 409 PATCH, write() 409, tables, nginx overwrites X-Forwarded-For, fake stores transparency. fake-google needs `responseStatus` on attendees (to add).
