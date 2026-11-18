# C-11 report

Не смог проверить: настоящее письмо через Zoho (пароля приложения нет на этом компьютере — его вписывает владелец на сервере); путь «запись → Word» под аккаунтом с настоящим распознаванием (на тестовом сайте нет ключей Deepgram и Codex — проверено тестами с заглушкой); выкладку (не выкладывали).
Что изменилось: главная transcribe.kiberry.ai — экран входа «Своя практика» с блоком «Мне нужен только транскрибатор»; самостоятельная регистрация в транскрибатор с подтверждением почты и сбросом пароля, 3 бесплатные записи, кабинет по-прежнему по приглашению; «Для своих» переехала на /svoi; кнопка Word названа «Скачать Word в формате ICF для менторинга».
Попробовать: http://localhost:3111/ на этом компьютере (тестовые аккаунты — `.local/web/.local/c11-preview/accounts.md`).
- Главная без входа: слева «Своя практика», справа вход в кабинет и под ним тихий блок транскрибатора с ценой — проверено `tests/c11-start.cjs` (1280/390/320 px) и мной в браузере.
- Регистрация с согласием, письмо, ссылка подтверждает почту и ведёт на вход «Почта подтверждена — войди.» — `tests/c11-accounts.test.ts`, `tests/c11-start.cjs`, и я прошёл это вживую.
- Вход/выход, неверный пароль, повторная регистрация не выдаёт, что почта занята — `tests/c11-accounts.test.ts`.
- «Забыли пароль?»: письмо, новый пароль работает, старый нет, ссылка одноразовая и истекает — `tests/c11-accounts.test.ts`.
- Загрузка под аккаунтом → Word в формате ICF, список за 24 часа — `tests/c11-transcriber.test.ts` (распознавание заглушкой).
- «Осталось бесплатных записей: N из 3» уменьшается только при готовом Word; сбой, прерванная загрузка, повторное скачивание и поздний повтор не списывают — `tests/c11-transcriber.test.ts`.
- После трёх записей загрузка закрыта (и на сервере), старые Word скачиваются — `tests/c11-transcriber.test.ts`.
- Чужие записи не видны и не скачиваются — `tests/c11-transcriber.test.ts`.
- Аккаунт транскрибатора не входит в кабинет («Кабинет пока открыт по приглашению»), приглашённый входит — `tests/c11-accounts.test.ts`, `tests/c11-start.cjs`, вживую.
- «Для своих» работает по /svoi за тем же паролем; главная и кабинет отдают заголовки безопасности — `tests/cabinet-c10-docker.sh old-site` (65/65).
- Кнопка Word в кабинете «Скачать Word в формате ICF для менторинга» — `tests/cabinet-c3-roles.cjs`, `tests/cabinet-c3-home.cjs`.
changelog: Главная с блоком «Мне нужен только транскрибатор», регистрация в транскрибатор с подтверждением почты, 3 бесплатные записи; «Для своих» — по адресу /svoi.

Проверки на итоговом коде: тесты изменения вместе 36/36; весь набор 118 (117 pass, 1 skipped) на b52bb92; typecheck 0; lint 0; Docker old-site 65/65; браузер c11-start.cjs и cabinet-c3-home.cjs — pass; next build — ok; сканирование браузерного бандла на секреты — pass (на временной копии: в настройках проекта нет строки `browser-output`). Ревью: дизайн — свежий агент (M1–M4 исправлены в дизайне); реализация — свежий агент, 0 блокеров/0 серьёзных, 4 мелких исправлены (41cb2a3) и перепроверены свежим агентом; его замечание — страница пароля «Для своих» могла встраиваться в чужие сайты — исправлено следующим коммитом и проверено Docker-тестом, без ещё одного ревью (две строки заголовков nginx).

## Learning signals
- Automated commit security review caught a real defect after slice 1: the verification link auto-signed-in (login CSRF / pre-hijack). Resolved in 7c962fc with a test. Source: product/changes/closed/C-11/log.md «Security follow-up».
- Owner rescue: the first sketch invented a new start page instead of building on the existing cabinet sign-in screen («эээ, ты чо, дядь, у нас есть же главная»). Missing context: the owner calls /cabinet's sign-in screen «главная». Resolved by redrawing on the real screen (product/changes/closed/C-11/sketch.html history).
- Commit check refused an edit of an agreed brief (test paths) and a second guard-ok for the same lockfile; both resolved by the documented route (revision; dropping the used guard line first — noted in product/operations.md «C-11 notes»).
- Builder slice 1 left a lint error and an unused import that surfaced only in the Docker build (slice 3) and implementation review. Resolved in 5a88290 / 41cb2a3.
- Learning urgency: normal
