# Capability: кабинет готов к выпуску (сервер, `.local/web/deploy`)

Записано при закрытии C-10 (2026-11-12). Кабинет не выложен: всё ниже проверено локально.

- S-release-1: настоящая запись, загруженная в кабинет, становится Word в формате ICF с ролями коуча и клиента — test: .local/web/tests/cabinet-c10-live.cjs › audio-to-word (ручной платный прогон, ~$0.20; результат в отчёте C-10)
- S-release-2: после перезапуска и пересборки серверных контейнеров клиенты, встречи, расшифровки и Word на месте — test: .local/web/tests/cabinet-c10-docker.sh › persist
- S-release-3: два тестировщика: каждый видит только своих клиентов и записи, чужие ссылки отвечают «не найдено» — test: .local/web/tests/cabinet-c10-docker.sh › isolation
- S-release-4: аккаунт тестировщика заводится одной командой; без аккаунта в кабинет не попасть, регистрации нет, общий пароль старого сайта для кабинета не нужен — test: .local/web/tests/cabinet-c10-docker.sh › accounts
- S-release-5: резервная копия базы, расшифровок и Word создаётся ежедневно, из неё восстанавливается рабочий кабинет — test: .local/web/tests/cabinet-c10-docker.sh › backup-restore; .local/web/tests/cabinet-backup.test.ts
- S-release-6: аудио старше 30 дней удаляется автоматически; встреча, расшифровка и Word остаются, прослушивание показано недоступным — test: .local/web/tests/cabinet-retention.test.ts › audio-expires
- S-release-7: старый сайт в той же сборке работает как раньше: загрузка по общему паролю → Word — test: .local/web/tests/cabinet-c10-docker.sh › old-site
- S-release-8: протухший вход Codex виден в проверке здоровья обработчика до того, как упадёт задание — test: .local/web/tests/worker-health.test.ts › codex-auth
- S-release-9: в Deepgram уходит сжатый файл, примерно втрое меньше WAV, распознавание то же — test: .local/web/tests/deepgram-upload.test.ts › compressed; .local/web/scripts/c10-compare-asr.ts (ручной, ~$0.02)
