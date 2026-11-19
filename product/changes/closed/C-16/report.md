# C-16 report: Войти через Google

I couldn't check: вход с настоящим Google — в OAuth-клиенте ещё нет адреса возврата `/api/cabinet/auth/callback/google`; всё проверено на поддельном Google.
What changed: на регистрации и входе транскрибатора и на входе в кабинет появилась кнопка «Войти через Google»; новый человек после выбора почты соглашается на обработку данных и сразу попадает в транскрибатор.
Try it: http://localhost:3111/transcriber?mode=sign-up (локальное превью с поддельным Google)
- Новый человек входит через Google и соглашается — видит «Осталось бесплатных записей: 3 из 3» — checked by tests/c16-google.test.ts › new account и tests/c16-google.cjs › new
- Без галочки согласия аккаунт не создаётся, в обход страницы тоже — checked by c16-google.test.ts › consent required и c16-google.cjs › no-consent
- Почта Google совпала с существующим аккаунтом — тот же аккаунт, те же записи и остаток бесплатных — checked by c16-google.test.ts › link existing
- У совпавшего аккаунта почту не подтверждали — старый пароль и входы перестают работать — checked by c16-google.test.ts › unverified takeover
- Отмена в Google или неподтверждённая почта — понятное сообщение, можно войти почтой — checked by c16-google.test.ts › refused и c16-google.cjs › cancel
- Аккаунт без приглашения через вход в кабинет — «Кабинет пока открыт по приглашению»; приглашённый входит — checked by c16-google.test.ts › cabinet и c16-google.cjs › cabinet
- Кнопка на трёх экранах, с клавиатуры, без горизонтальной прокрутки на 1280, 390 и 320 px — checked by c16-google.cjs › buttons
- Токены и фото Google не хранятся; команда сброса пароля владельца работает после захвата — checked by c16-google.test.ts › no tokens or photo are stored, owner reset recreates a missing password

Final checks on fbe2e9d: C-16, C-11 and C-13 server tests together 47/47; tsc and lint clean; browser script all parts pass. After review, two test assertions strengthened (60c8d8d): server 12/12, browser cabinet part pass.
changelog: Вход и регистрация через Google в транскрибаторе и кабинете (не выложено).

## Learning signals
- Design review caught a wrong library assumption: better-auth 1.7.16 generic OAuth has no `/sign-in/oauth2` / `/oauth2/callback` endpoints, and a provider profile without `id` fails every sign-in (design.md § Review). Resolved before build. Source: design written from partial reading of `plugins/generic-oauth`.
- Implementation review caught two always-true test assertions and a browser step that could pass before the click (commit 60c8d8d in .local/web).
- I edited the agreed brief's technical note while correcting the design; the commit check refused (VP-BRIEF-EDIT) and the agreed text was restored unchanged.
- Owner rescue: none observed.
Learning urgency: normal
