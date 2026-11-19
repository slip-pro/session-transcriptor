# C-13 design: расписание из Google Календаря

Код: `.local/web` (свой git-репозиторий, ветка `codex/linux-hosting`). Пути ниже — от `.local/web`. Перед первым коммитом кода скопировать `brief.md` и этот файл в `.local/web/product/changes/C-13/` (так проверка коммитов того репозитория видит изменение, как с C-10/C-11).

## Map

- **Вход и доступ.** `lib/cabinet/auth.ts`: better-auth на `node:sqlite`, cookie `coach-cabinet.*` с `sameSite: "strict"`. `requireCoach(request)` → пользователь с `cabinetAccess` или `CabinetError` 401/403 (`CABINET_INVITE_ONLY`). Секрет `CABINET_AUTH_SECRET` (≥32 символа), адрес `CABINET_URL` (`cabinetSettings()`).
- **Маршруты.** Образец: `app/api/cabinet/clients/route.ts` и `[id]/route.ts` — `requireCoach` → `getCabinetStore()` → `cabinetJson`; изменяющие методы начинаются с `requireOrigin(request)`; ошибки — `cabinetError`. Тело — `readCabinetJson`. `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- **Данные.** `lib/cabinet/store.ts`, класс `CabinetStore`: схема в конструкторе (`CREATE TABLE IF NOT EXISTS`, догоняющие `ALTER` ниже), `foreign_keys=ON`, у клиентов `UNIQUE(id, owner_id)`, все запросы фильтруют `owner_id`. Клиент: `contact` — свободный текст до 500 символов (телефон, почта — что угодно), `archived`. `deleteClient` удаляет встречи и клиента в транзакции — других писателей клиентов нет, кроме маршрутов клиентов.
- **Другие писатели/сбросы той же базы:** better-auth миграции (таблицы `user`, `session`, `account`…, не трогаем), ежедневная копия базы `lib/cabinet/backup.ts` (`VACUUM INTO`, 14 копий) — копия будет содержать новые таблицы, токены в ней зашифрованы ключом, которого в копии нет (безопасно). Очистка аудио `lib/cabinet/audio.ts` — не касается. Конфликтов нет.
- **Исходящие сервисы сейчас:** Deepgram (`lib/deepgram.ts`), почта (`lib/mail.ts`: транспорт `outbox` для тестов — образец подмены внешнего сервиса через переменную окружения). Google — новый получатель (согласован в брифе: её календари → наш сервер).
- **Интерфейс.** Один клиентский компонент `app/cabinet/ui/workspace.tsx`: `type View = "home" | "clients" | "sessions"`, вкладки в `cc-navigation` (стр. 171), адрес `?view=…&client=…` (`navigate`, `rememberLocation`, разбор `params.get("view")` стр. 91). Главная: блок `cc-home-clients` «Мои клиенты» (стр. 179). Шапка клиента `cc-client-head` с «Запрос» (стр. 183). Окно — `ui/dialog.tsx`; выбор клиента с «+ Новый клиент» — `ui/client-picker.tsx`; запросы — `api()` и `errorMessages` в `ui/api.ts`; пустые состояния — компонент `Empty` в workspace; кресла — `ui/chairs.tsx` (`Chair role="client" letter=…`, `look="line"` для пустого). Стили — `app/cabinet/room.css`, префикс `cc-`, телефон `@media(max-width:760px)`.
- **Тесты.** Серверные: `node:test` + `tsx`, `npm test` (Node 24.22.1, см. product/operations.md C-3/C-5). Готовая обвязка C-11: `tests/helpers/c11.ts` — `setupC11(t, name)` (временная база, секрет, `CABINET_URL=http://localhost:3000`), `inviteUser`, `login`, `apiRequest`, `ORIGIN`. Маршруты вызываются как функции (`import * as route from "../app/api/..."`). Браузерные: `.cjs` на Playwright из codex-runtime и установленном Chrome (образец `tests/cabinet-c8-home.cjs`: шаги по аргументам, `check`, скриншоты в `.git/vibeproof-logs` основного репозитория). Превью текущего сайта — `.local/c11-preview` (порт 3111, `run.env`, `sync.sh`, `start.cjs`, учётки в `accounts.md`), см. product/operations.md «C-11 notes». Лимит входа 5/мин — между браузерными прогонами ~70 с.

## Options

1. **Оставить как есть** — расписание смотрит в Google. Не выполняет согласованное.
2. **Секретный адрес iCal** — проще, но владелец выбрал вход через Google (бриф, 2026-11-19), и правка встреч (следующее изменение) через iCal невозможна. Отпало.
3. **better-auth `linkSocial` с провайдером Google.** Плюс: тот же провайдер позже даст «Войти через Google». Минусы: привязка Google-аккаунта к пользователю сразу становится способом входа (вход через Google — вне этого изменения), по умолчанию требует совпадения почт (у неё почта кабинета может отличаться от Google), токены хранятся в `account` открыто без отдельной настройки, адреса Google зашиты — подменить на поддельный Google в тестах нельзя.
4. **Свой небольшой модуль OAuth + Calendar API на `fetch`** (без новых пакетов): адреса Google настраиваются (поддельный Google в тестах), токен шифруется, подключение календаря не связано со входом.

## Decision

Вариант 4. Он не добавляет зависимостей, тестируется целиком на поддельном Google и не открывает вход через Google раньше времени. Будущий «Войти через Google» пойдёт через better-auth `socialProviders.google` на том же OAuth-клиенте Google; подключение календаря останется отдельным (своё разрешение, свой токен).

## Program design

**Окружение** (`lib/cabinet/calendar.ts`, функция `calendarSettings()`):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — нет хотя бы одного → состояние `unavailable` (кабинет работает, расписание скрыто/«пока не настроено»).
- `GOOGLE_OAUTH_BASE` (по умолчанию `https://accounts.google.com/o/oauth2/v2/auth`), `GOOGLE_TOKEN_URL` (`https://oauth2.googleapis.com/token`), `GOOGLE_REVOKE_URL` (`https://oauth2.googleapis.com/revoke`), `GOOGLE_API_BASE` (`https://www.googleapis.com/calendar/v3`). Подмена принимается, только если хост `CABINET_URL` — localhost/127.0.0.1/[::1]; иначе игнорируется (боевой сервер ходит только в Google).
- `CALENDAR_CACHE_SECONDS` (по умолчанию 120).
- Адрес возврата: `${CABINET_URL}/api/cabinet/calendar/callback`.
- Разрешения: `https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events` (список календарей — чтение; события — чтение и правка, правка нужна в следующем изменении). Проверено по developers.google.com (calendar/api/auth, oauth2/web-server), 2026-11-19.

**Таблицы** (в конструкторе `CabinetStore`, `CREATE TABLE IF NOT EXISTS`):
```
cabinet_calendar_connections(owner_id TEXT PRIMARY KEY, token_enc TEXT, state TEXT NOT NULL /* connected|reconnect */,
  selected_json TEXT NOT NULL DEFAULT '[]', connected_at TEXT NOT NULL, updated_at TEXT NOT NULL)
cabinet_calendar_flows(state_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, verifier TEXT NOT NULL,
  browser_hash TEXT NOT NULL, created_at TEXT NOT NULL)            -- одноразовые, живут 10 минут
cabinet_calendar_assignments(owner_id TEXT NOT NULL, series_key TEXT NOT NULL, client_id TEXT /* NULL = «Не клиент» */,
  PRIMARY KEY(owner_id, series_key), FOREIGN KEY(client_id, owner_id) REFERENCES cabinet_clients(id, owner_id) ON DELETE CASCADE)
```
Удаление клиента каскадом снимает его назначения (встречи снова «Чья это встреча?»).

**Типы** (`lib/cabinet/types.ts`):
```
CalendarState = "unavailable" | "not_connected" | "connected" | "reconnect"
CalendarStatus = { state; calendars: { id; name; primary: boolean; selected: boolean }[] }   // calendars пусты, если не connected
ScheduleEvent = { key: string /* calendarId|eventId */; seriesKey: string /* calendarId|(recurringEventId||id) */;
  title: string; start: string; end: string /* ISO; для «весь день» — YYYY-MM-DD */; allDay: boolean;
  client: { id: string; name: string } | null; match: "manual" | "email" | "name" | "not_client" | null }
ScheduleResponse = { state: CalendarState; events: ScheduleEvent[]; updatedAt: string | null; stale: boolean }
```
В ответ не попадают участники, описание, ссылки на звонок, токены.

**Модуль `lib/cabinet/calendar.ts`** (сервер):
- `calendarSettings(): Settings | null`
- `startConnect(owner): { url: string; browserNonce: string }` — `state`, `verifier` (PKCE S256), `nonce` случайные; в `cabinet_calendar_flows` — sha256 от state и nonce. URL: `client_id, redirect_uri, response_type=code, scope, access_type=offline, prompt=consent, include_granted_scopes=true, state, code_challenge, code_challenge_method=S256`.
- `finishConnect(query: URLSearchParams, browserNonce: string | undefined): "connected" | "denied" | "failed"` — находит и сразу удаляет запись flow по state; отказ, если нет, старше 10 минут или nonce не совпал; `error=access_denied` → `denied`. Обмен кода (POST form на token URL с `client_secret` и `code_verifier`). В `scope` ответа должны быть оба разрешения, иначе отозвать полученный токен и вернуть `denied`. Без `refresh_token` → `failed`. Сохраняет `token_enc`, `state=connected`, `selected_json` = `["primary"]`-эквивалент (id основного календаря узнаётся при первом списке; до этого пустой выбор трактуется как «основной»).
- `status(owner): Promise<CalendarStatus>` — список календарей (`GET {api}/users/me/calendarList`), кеш как у событий.
- `select(owner, ids: string[])` — только id из списка календарей этого владельца, 1–10 штук.
- `disconnect(owner): { revoked: boolean }` — POST revoke с refresh-токеном; строка и кеши удаляются в любом случае. Назначения остаются. `revoked:false` → интерфейс пишет «Доступ на сервере удалён, но Google не ответил — отзови доступ в аккаунте Google: myaccount.google.com/permissions».
- `events(owner, from: Date, to: Date): Promise<ScheduleResponse>` — `to - from` ≤ 62 дня, иначе `CabinetError("INVALID_RANGE")`. Для каждого выбранного календаря `GET {api}/calendars/{id}/events?singleEvents=true&orderBy=startTime&timeMin&timeMax&maxResults=2500` с `nextPageToken`; отбросить `status === "cancelled"`; сопоставить клиентов; отсортировать по началу.
- Токены: access-токен в памяти до `expires_in − 60 с`; обновление POST `grant_type=refresh_token`. `invalid_grant` → удалить `token_enc`, `state=reconnect`, ответ `{state:"reconnect", events:[]}`.
- Кеш в памяти: ключ `owner|calendarId|from|to`, свежий `CALENDAR_CACHE_SECONDS`. Ошибка Google/сети → последний удачный результат того же ключа с `stale:true` и его `updatedAt`; если его нет — `events:[]`, `stale:true`, `updatedAt:null`.
- Шифрование: AES-256-GCM, ключ = HKDF-SHA256(`CABINET_AUTH_SECRET`, info `"cabinet-calendar-token"`). Не расшифровывается (секрет сменили) → как `invalid_grant`.
- Журналы: только коды (`CALENDAR_GOOGLE_FAILED 503` и т.п.), никогда токены, коды авторизации, адреса с параметрами, названия событий.
- `matchClient(event, clients, assignments)` — чистая функция: назначение по `seriesKey` (клиент или «не клиент») → почта участника (без `self:true`), совпадающая (без регистра) с любой почтой из `contact` клиента в работе → имя клиента в работе целым словом в названии: полное имя карточки или его первое слово, если в нём ≥2 букв («Вера Иванова» узнаётся и по «Вера»); граница `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`, флаги `iu`. Несколько кандидатов на шаге → `null`. Архивные клиенты в автоопределении не участвуют (назначенные вручную остаются).

**Маршруты** (`app/api/cabinet/calendar/…`, все через `requireCoach`, изменяющие — через `requireOrigin`):
- `route.ts`: `GET` → `CalendarStatus`; `PATCH {calendars: string[]}` → `CalendarStatus`; `DELETE` → `{ok:true}`.
- `connect/route.ts`: `GET` (переход из кабинета, cookie сессии придёт) → 302 на Google и cookie `coach-cabinet.calendar-flow=<nonce>`; `HttpOnly; SameSite=Lax; Path=/api/cabinet/calendar/callback; Max-Age=600`; `Secure`, если `CABINET_URL` https. `unavailable` → 303 на `/cabinet?view=schedule&calendar=unavailable`.
- `callback/route.ts`: `GET` без `requireCoach` (strict-cookie сессии с перехода от Google не придёт; владелец берётся из записи flow, браузер — по cookie). Удалить cookie, 303 на `${CABINET_URL}/cabinet?view=schedule&calendar=connected|denied|failed`.
- `events/route.ts`: `GET ?from=ISO&to=ISO` → `ScheduleResponse`.
- `assignments/route.ts`: `PUT {seriesKey, clientId: string | null}` (null = «Не клиент»; клиент проверяется `store.client(owner,id)` → 404 для чужого/несуществующего); `DELETE {seriesKey}` → вернуть автоопределение. `seriesKey` — строка до 1100 символов. После записи сбросить кеш событий владельца не нужно: сопоставление делается на каждом ответе поверх кеша событий.

**Интерфейс** (`app/cabinet/ui/schedule.tsx`, новый; чистые функции дат — `lib/cabinet/schedule-view.ts`, их используют неделя, главная и шапка клиента):
- `weekStart(date)`, `groupByDay(events, weekStart): { day: Date; events }[]`, `formatRange(event)` («18:00–19:00», «весь день»), `formatNext(event)` («вт, 25 ноября, 18:00») — `Intl` с `ru-RU`, часовой пояс браузера.
- Все запрашиваемые диапазоны начинаются с полуночи дня в часовом поясе браузера (неделя — с понедельника; главная — сегодня 00:00 + 2 дня; следующая встреча — сегодня 00:00 + 60 дней, в ответе берётся первая не закончившаяся). Так ключ кеша стабилен в течение дня и запасной результат при сбое Google есть.
- `useSchedule(from, to)` — загрузка `/calendar/events`, повтор каждые 2 мин, пока компонент на экране; отмена при уходе.
- Политика `app/cabinet/privacy/page.tsx`: абзац о календаре — что читаем (список календарей и события выбранных календарей), зачем (расписание и узнавание клиентов), что храним (зашифрованный доступ, выбор календарей, «чья встреча»; события не храним), как отключить. Это следствие согласованного потока данных, не новое поведение; Google требует его для экрана согласия.
- `ScheduleView` (вкладка): состояния —
  - `unavailable`: `Empty` «Календарь пока не настроен» без кнопки;
  - `not_connected`: `Empty` «Подключи Google Календарь — увидишь, с кем и когда встречи» + кнопка «Подключить Google Календарь» (ссылка на `/api/cabinet/calendar/connect`) + подсказка «Google спросит разрешение. Если увидишь „Приложение не проверено“ — нажми „Дополнительно“ и „Перейти“»;
  - `reconnect`: полоса «Доступ к календарю пропал» + «Переподключить»;
  - `connected`: шапка «Расписание» и «18–24 ноября», кнопки «←» (aria «Предыдущая неделя»), «Сегодня», «→» («Следующая неделя»); строка «Календари: Основной, Работа · Изменить» (окно с флажками, хотя бы один); дни с встречами (заголовок «Пн, 18 ноября», у сегодняшнего «· сегодня»), строка встречи: время, кресло (клиент — зелёное с буквой; «не клиент» и неизвестная — контурное), имя клиента крупно + название события мелко, если отличается; нажатие по встрече клиента → его страница; у неизвестной — кнопка «Чья это встреча?», у «не клиент» — тихая «Не клиент · изменить». Нет встреч за неделю — «На этой неделе встреч нет». `stale` → «Не удалось обновить календарь · обновлено в 14:05» (или «пока не загружено»). Внизу тихая «Отключить календарь» с подтверждением.
  - После возврата от Google `?calendar=connected|denied|failed|unavailable` → сообщение («Календарь подключён. Выбери, какие календари показывать», «Календарь не подключён — Google не дал разрешение», «Не получилось подключить календарь, попробуй ещё раз»), параметр убрать из адреса; при `connected` сразу открыть окно выбора календарей.
- `WhoseMeeting` (окно на `Dialog`, заголовок «Чья это встреча?»): название и время, `ClientPicker` (с «+ Новый клиент»), «Сохранить» (неактивна без клиента), «Это не клиент», и при ручном выборе — «Определять автоматически». Для повторяющейся серии подпись «Запомним для всех повторов этой встречи».
- `UpcomingMeetings` (главная, над «Мои клиенты», только если состояние не `unavailable`): `cc-section-heading` «Ближайшие встречи», группы «Сегодня» / «Завтра», строки как в неделе без «не клиент», до 8 строк и ссылка «Всё расписание»; нет встреч — «Сегодня и завтра встреч нет»; не подключён — одна тихая ссылка «Подключить календарь» (ведёт во вкладку «Расписание»); `reconnect` — «Переподключить календарь».
- `NextMeeting` (шапка клиента, под «Запрос»): запрос событий на 60 дней от сейчас, первая встреча этого клиента → «Следующая встреча: вт, 25 ноября, 18:00»; нет — ничего.
- `workspace.tsx`: `View` + `"schedule"`, вкладка «Расписание» между «Главная» и «Клиенты», разбор `view=schedule` и `calendar=` в адресе.
- Ошибки в `ui/api.ts errorMessages`: `INVALID_RANGE`, `CALENDAR_NOT_CONNECTED`, `CALENDAR_INVALID_SELECTION`.

## Slices

**1. Подключение и данные (сервер).** Делает правдой S-schedule-1 (серверная часть), 3, 4 (сервер), 7, 8 и серверную часть 2.
- Тест `tests/c13-schedule.test.ts` с поддельным Google `tests/helpers/fake-google.ts` (`startFakeGoogle()` — http-сервер на свободном порту: страница разрешения отвечает 302 на `redirect_uri` с кодом или `error=access_denied` по флагу; token, revoke, calendarList, events с фильтром по timeMin/timeMax; журнал запросов; переключатели «отвечать 500», «invalid_grant», «выдать неполный scope»). Окружение тестов: `setupC11` + `GOOGLE_*` на поддельный, `CALENDAR_CACHE_SECONDS=0` там, где проверяется обновление.
  - `connect`: полный путь connect → fake auth → callback с cookie → `connected`, URL содержит PKCE S256, `access_type=offline`, оба scope; в файле базы нет открытого refresh-токена (поиск по байтам файла `cabinet.sqlite` и `-wal`); отказ → `denied`, строки нет; callback без cookie / с чужой cookie / повторный state / старше 10 мин → `failed`, строки нет; неполный scope → `denied` + revoke вызван; `DELETE` → revoke с этим токеном, строки нет, events → `not_connected`; `invalid_grant` → `reconnect`.
  - `week` (тест задаёт `process.env.TZ = "Europe/Moscow"` до импорта функций дат): серия с перенесённым экземпляром и отменённым (fake отдаёт `status:"cancelled"`) → перенесённый на новой дате, отменённого нет; порядок по началу; `to-from` 63 дня → 400 `INVALID_RANGE`; `groupByDay` раскладывает события, пересекающие полночь, по дню начала; «весь день» отдельно.
  - `match`: «Вера Иванова» узнаётся в «Встреча — Вера» и в «вера иванова, сессия»; почта участника = почта из `contact` «+7 900 000-00-00, vera@example.test» → клиент, `match:"email"`; «Встреча — Вера» → `name`; «Вероника» не совпадает с «Вера»; архивный — нет; два кандидата → `null`; `self:true` участник игнорируется.
  - `assign`: PUT на `seriesKey` → все экземпляры серии с клиентом, `manual`; после нового запроса — на месте; `null` → `not_client`; DELETE → снова авто; чужой клиент → 404; удаление клиента снимает назначение.
  - `refresh`: смена названия в fake видна в следующем ответе после истечения кеша; fake 500 → прежние события, `stale:true`, `updatedAt` прежний; без прежних → `events:[]`, `stale:true`.
  - `isolation`: второй коуч — `not_connected`, его PUT по чужому `seriesKey` не меняет ответ первого; без входа — 401 на всех маршрутах; аккаунт транскрибатора — 403; ни одно тело ответа не содержит refresh/access-токен, код авторизации и `GOOGLE_CLIENT_SECRET`; перехват `process.stderr.write` за весь тест не содержит их и названий событий; PATCH/PUT/DELETE без Origin → 403.
  Каждая проверка падает на сегодняшнем коде (маршрутов нет).
- Файлы: `lib/cabinet/calendar.ts` (новый), `lib/cabinet/schedule-view.ts` (новый, только `groupByDay`/`weekStart` здесь), `lib/cabinet/store.ts`, `lib/cabinet/types.ts`, 5 маршрутов, `tests/helpers/fake-google.ts`, `tests/c13-schedule.test.ts`, `deploy/README.md` и `deploy/compose.yaml` (необязательные `GOOGLE_CLIENT_ID/SECRET`). Больше 8 файлов — это маршруты по образцу clients, без новых абстракций кроме модуля календаря.
- Готово: `npm test` зелёный целиком, `npm run typecheck`, `npm run lint`.

**2. Вкладка «Расписание».** S-schedule-1 (интерфейс), 2, 3, 4 (интерфейс).
- Превью: `.local/c11-preview` + запуск поддельного Google отдельным процессом (`tests/helpers/fake-google-server.ts`, тонкая обёртка над `startFakeGoogle` с фиксированным портом и событиями относительно «сегодня»); в `run.env` превью — `GOOGLE_*` на него. Описать запуск в product/operations.md.
- Тест `tests/c13-schedule.cjs` шаги `connect` (кнопка → возврат → «Календарь подключён», окно выбора), `week` (листание, «Сегодня», клиентская встреча открывает клиента), `assign` (окно «Чья это встреча?», «+ Новый клиент», «Это не клиент», после перезагрузки на месте, Escape закрывает).
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/ui/workspace.tsx`, `app/cabinet/ui/api.ts`, `app/cabinet/room.css`, `app/cabinet/privacy/page.tsx`, `lib/cabinet/schedule-view.ts`, `tests/c13-schedule.cjs`, `tests/helpers/fake-google-server.ts`.

**3. Главная и шапка клиента, раскладка.** S-schedule-5, 6, 9.
- `tests/c13-schedule.cjs` шаги `home` (не подключён — ссылка; подключён — «Сегодня»/«Завтра»; пустой день — «Сегодня и завтра встреч нет»; «Мои клиенты» на месте ниже), `client` (строка «Следующая встреча: …» у клиента со встречей, нет строки у клиента без встреч), `layout` (вкладка, главная, окно «Чья это встреча?» на 1280/390/320 без горизонтальной прокрутки; всё достижимо Tab, видимый фокус; длинные названия событий и имён переносятся). Плюс прогон старых `cabinet-c8-home.cjs my-clients` и `cabinet-c3-visual.cjs` (последний — с известными устаревшими шагами из очереди, сравнить с прошлым результатом).
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/ui/workspace.tsx`, `app/cabinet/room.css`, `tests/c13-schedule.cjs`.

## Visible work

Язык «Два кресла» (S-chairs-1): зелёное кресло — только у клиента, контурное — встреча без клиента, жёлтый — коуч (в расписании не нужен). Новые классы `cc-schedule-*` на токенах `--cc-paper`, `--cc-line`, `--cc-muted`; строки встреч по образцу `cc-recording-row`/`cc-history-list`, заголовки по `cc-section-heading`; телефон — одна колонка, кнопки ≥40 px, текст ≥13 px, контраст ≥4.5:1, видимый фокус. Новой композиции экрана не вводим — это список в существующем каркасе вкладок. Скриншоты «до» главной и шапки клиента на 1280 и 390 — до начала слайса 3.

## Risks

- **Google показывает «Приложение не проверено»**, пока владелец не пройдёт проверку Google; в статусе «Testing» refresh-токен живёт 7 дней (developers.google.com/identity/protocols/oauth2) — поэтому OAuth-клиент для неё переводится в «In production» (без проверки, с предупреждением). Проверка Google — до открытия кабинета другим коучам (в очередь при закрытии).
- **Склонения имён:** «Сессия с Верой» не узнаётся по имени «Вера» (целое слово). Сознательно: ложное совпадение хуже вопроса, а повторяющиеся серии спрашиваются один раз. Если раздражает — следующий шаг.
- **Личные события** видны, только если выбран календарь, где они лежат; по умолчанию выбран только основной — после подключения сразу открывается выбор.
- **Расхождение до 4 минут** (кеш 2 мин + опрос 2 мин) — в пределах согласованных 5.
- **Смена `CABINET_AUTH_SECRET`** делает токен нерасшифровываемым → «Переподключить», без потери остальных данных.
- Откат: изменение только добавляет таблицы и маршруты; без `GOOGLE_*` расписание выключено. Таблицы можно оставить.

## Outside setup (владелец, перед живой проверкой)

Проект в Google Cloud на его аккаунте → включить Google Calendar API → экран согласия (название «Своя практика», почта поддержки, домен kiberry.ai, ссылка на политику `/cabinet/privacy`) → OAuth-клиент «Web application» с адресом возврата `https://transcribe.kiberry.ai/api/cabinet/calendar/callback` (и `http://localhost:3111/…` для превью) → статус «In production». Ключи — в `secrets/access.env` как `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Сборка от этого не зависит.

## Decisions to keep

- Календарь подключается своим OAuth-модулем, отдельно от входа; «Войти через Google» позже — через better-auth на том же OAuth-клиенте. Причина: тестируемость и вход не открывается раньше времени.
- События Google не хранятся в базе; хранятся зашифрованный refresh-токен (ключ из `CABINET_AUTH_SECRET`), выбранные календари и назначения «чья встреча» по серии.

## Review

Свежий ревьюер (vibeproof-reviewer, только чтение, без хода обсуждения), 2026-11-19. Блокирующих нет, 5 мелких:
1. Неясно, что значит «имя клиента» при имени из двух слов — принято: полное имя или первое слово, тест на «Вера Иванова».
2. Бриф: «не делаем несколько календарей» против «отмечает, какие календари показывать» — строка «Won't do» осталась от варианта с iCal; согласованный показ владельцу — выбор календарей одного аккаунта. Читаем «несколько календарей сразу» в «Won't do» как «несколько аккаунтов Google сразу»; бриф не правим (согласованный текст).
3. Ключ кеша для «следующей встречи» менялся каждый запрос — принято: все диапазоны от полуночи дня.
4. Политика кабинета не упоминает календарь — принято: абзац в слайсе 2.
5. «Отключить» игнорировал сбой отзыва — принято: подсказка отозвать в аккаунте Google, без повторов.
Многодневные события «весь день» показываются в день начала — оставлено (редкость для коуча).

## Correction after showing (2026-11-19)

Владелец на показе прислал снимок обычного календаря (сетка недели) и написал: «давай нормальный привычный интерфейс календаря сделаем». Сценарии не меняются (S-schedule-2: «встречи недели по дням со временем начала и конца» — сетка это выполняет); меняется вид вкладки «Расписание». Главная и шапка клиента остаются списком.

- **Неделя — сетка времени**: слева шкала часов, 7 колонок Пн–Вс с заголовком «пн 16» (сегодня — номер в круге акцентным цветом кабинета, не синим), строка «весь день» над сеткой. Видно 07:00–23:00, вертикальная прокрутка внутри сетки; при открытии прокручено к текущему часу минус час (на другой неделе — к первой встрече или 09:00). Встреча — блок от начала до конца (минимальная высота — на одну строку текста), внутри название/имя и время начала; пересекающиеся встречи делят ширину колонки. Линия текущего времени в колонке сегодня.
- **Панель**: «‹» «›» (aria «Предыдущий период»/«Следующий период»), «Сегодня», подпись «ноябрь 2026» (или «ноябрь – декабрь 2026»), переключатель «День | Неделя». «День» — одна колонка выбранного дня.
- **Телефон (≤760 px)**: по умолчанию «День»; над сеткой полоса дней недели (пн…вс с числами) для выбора дня; «Неделя» на телефоне недоступна. Без горизонтальной прокрутки на 390/320.
- **Цвета по D07 / S-chairs-1** (цвет — это человек): встреча клиента — светло-зелёный блок с зелёной полосой слева и креслом с буквой; неизвестная — белый блок с тонкой рамкой; «не клиент» — серый приглушённый. Цвета Google не используем.
- **Нажатие на встречу** открывает окно (на `Dialog`): название, день и время, кресло и имя клиента; кнопки «Открыть клиента» (если клиент), «Чья это встреча?» / «Не тот клиент?» (ведут в существующее окно выбора). Встречи — кнопки в порядке времени, доступны Tab, Enter открывает окно, видимый фокус.
- **Строка календарей и «Отключить календарь»** остаются: «Календари: … · Изменить» — в настройках (значок шестерёнки на панели, aria «Настройки календаря»), там же «Отключить календарь».
- **Тесты**: шаги `week`, `assign`, `layout` в `tests/c13-schedule.cjs` переводятся на сетку (блоки по дате и времени, окно встречи, День/Неделя, телефон — полоса дней). Положение блока проверяется: верх блока встречи 18:00 ниже блока 12:00 в той же колонке, колонка совпадает с днём.
- Файлы: `app/cabinet/ui/schedule.tsx`, `app/cabinet/room.css`, `lib/cabinet/schedule-view.ts` (раскладка пересечений — чистая функция `layoutDay(events) → {event, top, height, column, columns}`, тест в `tests/c13-schedule.test.ts` › week), `tests/c13-schedule.cjs`.
