# C-17 design: условия работы в карточке клиента

## Map
Код — `.local/web` (ветка `codex/linux-hosting`); продуктовая память — корневой `product/`.
- Клиенты: таблица `cabinet_clients` (`lib/cabinet/store.ts:27`), чтение `listClients` (`store.ts:112`, SQL с `count(s.id) AS session_count` по `cabinet_sessions`), `createClient`/`updateClient` (`store.ts:123–134`). Миграции колонок — `ALTER TABLE … ADD COLUMN` под проверкой `PRAGMA table_info` в конструкторе (`store.ts:96–98`, образец `meeting_minutes`). Другие писатели `cabinet_clients`: `setCalendarAssignment` пишет только `contact` (`store.ts:176–193`); `deleteClient` удаляет строку. Пересечение с новыми полями — нет.
- API: `app/api/cabinet/clients/route.ts` (POST), `app/api/cabinet/clients/[id]/route.ts` (PATCH → `updateClient`). Владелец — из `requireCoach`; все запросы `WHERE owner_id=?`.
- Тип `CabinetClient` — `lib/cabinet/types.ts:9`.
- Профиль клиента: `ClientForm` (`app/cabinet/ui/forms.tsx:7`) — одна форма для «Новый клиент» и «Профиль клиента», отправляет `Object.fromEntries(form)`. Сохранение и открытие клиента — `workspace.tsx:201`.
- Шапка клиента: `workspace.tsx:192` (`cc-client-head`: имя, «Запрос», `<ClientMeetings>`). `ClientMeetings` (`app/cabinet/ui/schedule.tsx:530`) рисуется только при подключённом календаре, показывает «Следующая встреча» и «Назначить встречу» → `MeetingForm`.
- Серии: `MeetingForm` (`schedule.tsx:128`) уже умеет «Повторять» каждые 1/2 недели, «Сколько встреч» 2..52 или «Без конца», приглашение, ссылку на звонок; POST `/calendar/meetings` с `repeat: { every, count|null }` (`schedule.tsx:164`) → `createMeeting` (`lib/cabinet/calendar.ts:428`). Начальные значения приходят пропом `initial: { date, time, minutes }`; повтор сейчас всегда стартует с `"none"` (`schedule.tsx:134`).
- Расписание для проверки занятости: `useSchedule(from, to)` (`schedule.tsx:22`) отдаёт `ScheduleEvent[]` с `start/end/allDay/title/client`.
- Тесты: серверные — `node --import tsx --test tests/*.test.ts` (Node 24.22.1, см. `product/operations.md`), образец `tests/c15-series.test.ts` (`setupC11`, `inviteUser`, `login`, `apiRequest` из `tests/helpers/c11`, роуты импортируются напрямую). Браузерные — `tests/c15-series.cjs` против превью 3111 + поддельный Google 3121 (operations.md «C-13 notes»), учётки в `.local/c11-preview/accounts.md`, лимит входа ~70 с между скриптами.
- Слабые места: `listClients` вызывается часто (`client()` перечитывает всех) — новый подсчёт должен остаться одним SQL-запросом.

## Options
1. **Оставить как есть / заметки.** Условия пишутся в «Напоминание» текстом. Ничего нового, но счёта нет, серия не ставится — не выполняет бриф.
2. **Колонка JSON в `cabinet_clients` + подсчёт в том же SQL** (выбрано). Одна колонка `terms_json`, счёт — подзапрос в `listClients`, серия — через существующий `MeetingForm` с предзаполнением. Мало нового, откат — игнорировать колонку.
3. **Отдельная таблица программ (история программ клиента).** Позволит несколько программ подряд, но это продление/история, которых бриф не просит; больше кода.

## Decision
Вариант 2. Вариант 3 отложен до реальной потребности во второй программе у одного клиента; вариант 1 не даёт счёта.

## Program design
`lib/cabinet/types.ts`:
```
type SlotEvery = 1 | 2;
type ClientSlot = { weekday: 0..6 /* 0 = воскресенье, как Date.getDay */; time: "HH:MM"; every: SlotEvery };
type ClientTerms = {
  kind: "program" | "once";
  sessions: number | null;      // program: 1..100; once: null
  startDate: string | null;     // program: YYYY-MM-DD; once: null
  adjust: number;               // ручная поправка к автосчёту, целое, по умолчанию 0
  slot: ClientSlot | null;
} | { kind: null; slot: ClientSlot | null; adjust: 0; sessions: null; startDate: null }; // без условий, но со слотом
CabinetClient += { terms: ClientTerms | null; programDone: number | null } // programDone только у kind="program"
```
Хранение: `cabinet_clients.terms_json TEXT` (NULL = нет условий и нет слота). Миграция — ADD COLUMN под проверкой, как `meeting_minutes`.

`lib/cabinet/terms.ts` (новый, чистые функции, без React и БД):
```
parseTerms(value: unknown, before: ClientTerms | null): ClientTerms | null   // валидация входа PATCH/POST → CabinetError("INVALID_DATA")
programDone(auto: number, terms): number                                      // max(0, auto + adjust)
programLine(terms, done): { progress: string; status: string | null }        // «Программа: 4 из 10» / «Разово»; «Осталась последняя сессия» при done = sessions-1; «Программа завершена» при done ≥ sessions
slotLine(slot): string                                                        // «Вторник, 19:00, каждую неделю» / «… раз в 2 недели»
seriesPlan(terms, done, now: Date): { date: "YYYY-MM-DD"; time; every; count: number | null; single: boolean }
   // ближайший день недели слота строго позже now (локальное время браузера);
   // program: remaining = max(sessions - done, 0); remaining ≥ 2 → count=remaining; remaining = 1 → single (без повтора); remaining = 0 → не предлагать (возвращает null)
   // once / kind=null → count=null («Без конца»)
slotConflicts(slot, own: clientId, clients: CabinetClient[], events: ScheduleEvent[], now: Date): string[]
   // слот длится 60 минут. Конфликт: (а) у другого неархивного клиента слот в тот же день недели и пересечение по времени (каждые 2 недели считаем конфликтом всегда — фаза неизвестна);
   // (б) событие календаря (не allDay) пересекается с одним из 4 ближайших вхождений слота и не является встречей этого же клиента.
   // Строки: «<День> <ЧЧ:ММ> уже занят: <имя клиента | название встречи>», без повторов.
```
Store (`store.ts`):
- `listClients`: добавить в SELECT `c.terms_json` и подзапрос `(SELECT count(*) FROM cabinet_sessions p WHERE p.client_id=c.id AND p.owner_id=c.owner_id AND p.session_date >= json_extract(c.terms_json,'$.startDate')) AS program_auto`; в маппинге `terms = parse(row.terms_json)`, `programDone = terms?.kind === "program" ? programDone(program_auto, terms) : null`. Проверить формат `session_date` (ожидается `YYYY-MM-DD`; если с временем — сравнивать `substr(p.session_date,1,10)`).
- `createClient`/`updateClient`: если во входе есть `terms` — `parseTerms(input.terms, before?.terms)` и запись `terms_json`; отсутствие ключа — не трогать.
- Ручная правка: вход `{ programDone: N }` (целое 0..sessions+100) → `adjust = N - auto` (auto читается в той же транзакции). Так новые записи продолжают прибавляться, удалённые — убавлять (S-terms-9).
- Смена `startDate` или `sessions` в профиле сбрасывает `adjust` в 0 только при смене `startDate` (счёт другой программы); смена `sessions` поправку сохраняет.

UI:
- `ClientForm`: в скрытой части «дополнительных полей» блок `<fieldset>` «Условия»: радио «Без условий» / «Программа» / «Разово»; у «Программа» — «Сколько сессий» (число) и «С какой даты» (date, по умолчанию сегодня). Флажок «Постоянный слот» → «День недели» (select Пн..Вс), «Время» (time), «Как часто» (каждую неделю / раз в 2 недели). Под слотом — строки конфликтов `slotConflicts` (данные: `clients` пропом + `useSchedule(сегодня, +29 дней)`; без календаря — только конфликты слотов клиентов). Предупреждение не мешает сохранить. Подпись кнопки сворачивания: «Добавить контакт, запрос и условия». Отправка: форма собирает поля в `terms` JSON (не плоско), остальные поля как сейчас. Профиль клиента с условиями открывает дополнительные поля сразу (как сейчас при `client`).
- Шапка (`workspace.tsx:192`): новый компонент `ClientTerms` (`app/cabinet/ui/terms.tsx`) под строкой «Запрос»: прогресс-кнопка «Программа: 4 из 10» → инлайн-поле «Сколько сессий уже прошло?» + «Сохранить»/«Отмена» (PATCH `{programDone}`), статус-строка, строка слота. Без условий — ничего.
- Предложение серии: `workspace` хранит `offerSeries: clientId | null`; после сохранения профиля, если слот появился или изменился и `seriesPlan` не null, ставит его. `ClientMeetings` получает проп `offer` и `dismiss`: при подключённом календаре показывает «Постоянный слот сохранён. Поставить серию в календарь?» с кнопками «Поставить серию» (открывает `MeetingForm` с `initial` из `seriesPlan` и новым пропом `initialRepeat: { every, count|null } | null`) и «Не нужно». `MeetingForm`: `useState(initialRepeat ? String(every) : "none")`, count/endless из `initialRepeat`. Без календаря `ClientMeetings` возвращает null — предложения нет (бриф: «с подключённым календарём»).

## Slices
**Slice 1 — условия хранятся и считаются (сервер).** Сценарии S-terms-1, S-terms-2 (счёт), S-terms-3 (функция строк), S-terms-7, S-terms-9.
- Тест `tests/c17-terms.test.ts`: `save terms` (POST и PATCH с terms → GET после «перезапуска» — новый `getCabinetStore` на той же базе, если хелпер позволяет, иначе повторный GET; невалидные: sessions 0, дата не дата, weekday 7, time «25:00», every 3 → 400 INVALID_DATA, данные не меняются); `progress` (3 записи клиента: одна до startDate, две после → programDone 2; запись другого клиента не считается; `kind:"once"` → programDone null; `programLine` даёт «Программа: 2 из 10», «Разово»); `program end` (`programLine` при done 9/10 → «Осталась последняя сессия», 10/10 и 11/10 → «Программа завершена»); `manual count` (PATCH programDone 5 при auto 2 → 5; добавить запись → 6; удалить запись → 5; после смены startDate поправка сброшена); `isolation` (второй коуч: GET/PATCH чужого клиента → 404, в его списке чужих условий нет; без входа → 401). Отвергает: подсчёт всех записей без даты начала, хранение N вместо поправки (тест «добавить запись → 6» падает).
- Файлы: `lib/cabinet/types.ts`, `lib/cabinet/store.ts`, `lib/cabinet/terms.ts`, тест.
- Где смотреть: `store.ts:96–134`, `tests/c15-series.test.ts` (setup), `tests/helpers/c11.ts`.
- Готово: `npm test` зелёный целиком.

**Slice 2 — профиль, шапка и правка счёта (браузер).** Сценарии S-terms-1 (форма), S-terms-2/3 (шапка), S-terms-4, S-terms-6, S-terms-8, S-terms-9 (UI).
- Тест сервера дополнить: `slot` (slotLine для 1 и 2 недель; слот сохраняется и читается), `slot conflict` (`slotConflicts`: другой клиент вт 19:00 vs вт 19:30 → конфликт с именем; вт 20:00 → нет; событие календаря во вторник 19:15 через неделю → конфликт с названием; встреча самого клиента → нет; архивный клиент → нет).
- Браузерный `tests/c17-terms.cjs` [save|header|manual|conflict|layout]: новый клиент с программой 10 с сегодняшней даты и слотом → шапка «Программа: 0 из 10», «<день>, 19:00, каждую неделю»; перезагрузка — на месте; правка «Сколько сессий уже прошло?» 9 → «Программа: 9 из 10» и «Осталась последняя сессия»; слот второго клиента на то же время → строка «… уже занят: <имя>», сохранение проходит; `layout` — 1280/390/320 без горизонтальной прокрутки, форма и правка счёта проходятся Tab/Enter.
- Файлы: `forms.tsx`, `app/cabinet/ui/terms.tsx`, `workspace.tsx`, стили кабинета (найти файл с `.cc-labelled-request`), `lib/cabinet/terms.ts`.
- Готово: оба теста зелёные на превью 3111 (после `sh .local/c11-preview/sync.sh`).

**Slice 3 — серия в календарь.** Сценарий S-terms-5.
- Сервер: `slot series` — `seriesPlan` (program 10, done 3 → count 7, every из слота, дата — ближайший день недели позже now, включая случай «сегодня тот же день, но время прошло» и «время ещё не наступило» — оба дают следующую неделю/сегодня по правилу «строго позже now»; done 9 → single; done 10 → null; once → count null).
- Браузер `tests/c17-terms.cjs series` (поддельный Google 3121): после сохранения слота у клиента с программой 10 и 3 записями (или поправкой 3) — «Поставить серию в календарь?»; «Поставить серию» открывает окно с «Повторять: каждую неделю», «Сколько встреч» 7, датой ближайшего дня слота; «Создать» → в поддельном Google одна серия с `RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=7`; «Не нужно» на другом клиенте убирает предложение и ничего не пишет в Google.
- Файлы: `schedule.tsx` (`MeetingForm` `initialRepeat`, `ClientMeetings` `offer`), `workspace.tsx`.
- Готово: `npm test` и `c17-terms.cjs` целиком, плюс `c15-series.cjs create` (MeetingForm не сломан).

## Visible work
Тот же язык кабинета: подписи-«лейблы» как «Запрос» (`cc-labelled-request`), тихие строки `cc-muted`, `cc-text-button` для действий, `Dialog` для окон. В шапке: «Программа: 4 из 10» — кнопка-текст; статус — `cc-muted`; слот — отдельная строка. Ошибки — `cc-error role=alert`, «Сохранено» — как в профиле. Телефон: поля условий в одну колонку, select/time во всю ширину. Клавиатура: радио и флажок — нативные; инлайн-правка — Enter сохраняет, Escape отменяет.

## Risks
- **Счёт врёт** (главный «Would fail if»): записи без клиента, записи на другого клиента, дата начала позже записей — покрыто тестами `progress`/`manual count`. Формат `session_date` проверить до написания SQL.
- **Условия станут обязательными**: всё в скрытом блоке, «Без условий» по умолчанию; тест `save` создаёт клиента только с именем.
- **Серия задваивается** при повторном предложении: предложение показывается один раз после сохранения слота и исчезает после «Поставить» или «Не нужно»; серия создаётся только явным «Создать» в знакомом окне.
- Откат: колонка `terms_json` безвредна для старого кода; данные не удаляются.

## Decisions to keep
- Условия — одна JSON-колонка клиента, без истории программ (новая программа = новая дата начала, поправка сбрасывается).
- Счёт = записи клиента в кабинете с даты начала + ручная поправка, хранимая разницей (владелец 2026-11-19).
- Слот длится 60 минут для проверки занятости; «раз в 2 недели» считается занятым каждую неделю — фаза не хранится.
- Серия ставится через существующее окно «Новая встреча», а не отдельным путём — одна логика приглашений и ссылок на звонок.

## Clarifications after review (binding for the builder)
- `session_date` всегда `YYYY-MM-DD` (`lib/cabinet/transcript.ts:18–21`) — сравнение строкой, без `substr`.
- `seriesPlan` ограничивает `count` числом 52 (предел повтора в `MeetingForm` `schedule.tsx:142` и на сервере `calendar.ts:413`); при оставшихся > 52 окно открывается с 52, остальное коуч доставит позже. Возвращает также `minutes: 60` для `initial`.
- Поле «Время» слота — `<input type="time" step={900}>` (как в `MeetingForm`, `schedule.tsx:179`); сервер принимает только минуты 00/15/30/45.
- `adjust` никогда не берётся из `terms` во входе: `parseTerms` копирует `adjust` из `before`, сбрасывает в 0 только при смене `startDate` или смене `kind`; меняет его лишь `{programDone}`. Профиль, сохранённый без изменений, поправку не трогает.
- PATCH `{programDone}` у клиента без программы (`terms` NULL или `kind` ≠ "program") → 400 INVALID_DATA; `programDone` вместе с `terms` в одном запросе → 400 INVALID_DATA. Оба случая — в тесте `manual count`.
- `slotConflicts` с календарём проверяет 4 еженедельных вхождения слота в ближайшие 28 дней — и для «каждую неделю», и для «раз в 2 недели» (то же правило «занят каждую неделю»); окно `useSchedule(сегодня, +29 дней)` их покрывает.
- `isolation`: коуч Б делает PATCH `{terms}` и `{programDone}` клиенту коуча А → 404; затем у А условия и `programDone` не изменились; у Б свой клиент с той же датой начала и своими записями — счёты не смешиваются; без входа → 401.
- `save terms` перечитывает через новый `CabinetStore` на том же файле базы (`setupC11` даёт временный каталог, `tests/helpers/c11.ts:20`) и проверяет, что база без колонки `terms_json` открывается и старые клиенты читаются с `terms: null`.
- Другие PATCH клиента — заметки (`client-reminder.tsx:10`, только `notes`) и архив (`workspace.tsx:157`) — ключа `terms` не шлют и условия не трогают.

## Review
Fresh read-only reviewer (vibeproof-reviewer, 2026-11-19): no blockers, no majors; 6 minors — series limit vs program length, slot time step and missing minutes, who sets `adjust`, `programDone` without a program, conflict window for 2-week slots, isolation test passing on today's code. All six accepted and written in «Clarifications after review»; the optional reload-through-new-store suggestion adopted. No re-review: contract, data and access unchanged.
