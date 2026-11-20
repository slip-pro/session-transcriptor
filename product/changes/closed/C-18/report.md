# C-18 report

Не смог проверить: с настоящим Google Календарём — нет ключей Google (как и C-13…C-17); проверено на поддельном Google.
Что изменилось: новый человек сам записывается на первую встречу по её ссылке — встреча встаёт в её Google Календарь с ним гостем, а он появляется в кабинете клиентом.
Попробовать: http://localhost:3111/cabinet/book/bf7rnjfl3nyqm3hy (превью на этом компьютере); настройки — «Расписание» → настройки календаря → «Запись на первую встречу · Настроить».
- Настройка записи: выключатель, окна по дням, длительность, ссылка «Скопировать» — проверено: c18-booking.test.ts › settings, c18-booking.cjs › settings
- Свободные слоты на 2 недели, не раньше чем через 12 часов, без занятого в календаре и постоянных слотов клиентов — c18-booking.test.ts › slots
- Запись: встреча «Первая встреча с <имя>» в календаре с гостем, клиент в кабинете, «Вы записаны…» — c18-booking.test.ts › book and client, c18-booking.cjs › book
- Время заняли / двойное нажатие — «Это время только что заняли», вторая встреча не создаётся — c18-booking.test.ts › taken, c18-booking.cjs › taken
- Закрытая или неверная ссылка, Google не прочитался — «Запись сейчас закрыта» / «временно недоступна», ничего о ней не видно — c18-booking.test.ts › closed, › failure of Google reading
- Google не ответил при записи — сообщение, введённое остаётся, клиента нет — c18-booking.test.ts › failure, c18-booking.cjs › taken
- Чужой коуч ничего не видит; не больше 5 попыток в час с адреса и 20 записей в сутки; имя без ссылок — c18-booking.test.ts › isolation, › name and day limit
- Телефон и компьютер (1280/390/320), клавиатура — c18-booking.cjs › layout
Также прошли: прежние проверки расписания и условий (c13–c17, вместе с c18 — 57/57), раскладка окон расписания (c14, c17 layout), сборка, typecheck, lint.
changelog: Запись новых клиентов на первую встречу по ссылке — сразу в её Google Календарь и в кабинет (не выложено).

## Learning signals
- Review-caught defects: design review found that a failed Google read would show every slot as free (the brief's "would fail if") and that a retry would answer "taken" — fixed in design before build (design.md § Review). Automatic security review after slice 1 found that an unverified email could edit an existing client card and that free text went into the invitation Google mails — fixed in 9974d64, 1b07a75 (D36).
- Avoidable rework: the security fix narrowed allowed names, but the browser test from slice 2 still used digit names; only the final check caught it (1b08ea9). Resolution: after a server rule change, rerun the browser test of the same change before showing.
- Slice 1 was built code-first; strength was checked by two mutations instead (log.md).
- Owner rescue / missing context: none observed.
Learning urgency: normal
Operations recipe (C-11/C-13/C-14 notes): applied as written; worked; no recurrence of the earlier flaky starts observed.
