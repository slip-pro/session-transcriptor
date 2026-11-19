# C-9: report

I couldn't check: everything below was checked. In the built-in browser pane the cabinet showed only skeletons, so I showed the result as a test screenshot (c9-home-1280.png).
What changed: «Мои клиенты» на главной показывает не больше 6 клиентов в работе, начиная с недавно добавленных. Под карточками есть ссылка «Все клиенты · N».
Try it: http://localhost:3104/cabinet (учебный кабинет)
- На главной не больше 6 клиентов, новые первыми, архивных нет. Проверено: cabinet-c8-home.cjs › my-clients (тест создаёт 7 клиентов и ждёт 6 карточек от новых к старым).
- «Кресло свободно» появляется, только пока клиентов в работе меньше 6. Проверено: cabinet-c8-home.cjs › my-clients (при 6 и больше карточки нет).
- «Все клиенты · N» стоит под карточками и открывает «Клиенты». У заголовка ссылки больше нет. Проверено: cabinet-c8-home.cjs › my-clients.
- Карточка открывает страницу клиента. Проверено: cabinet-c8-home.cjs › my-clients.
- Страница «Клиенты» не изменилась. Проверено: cabinet-c5-clients.cjs и cabinet-c3-visual.cjs. В c3-visual предел нажатий Tab поднят с 80 до 400, потому что учебных клиентов стало больше. Сами проверки остались прежними.

Прогон на итоговом коде:
- прошли c8-home, c3-home, c5-clients, c3-visual, c6-meeting и c7-tidy;
- c3-roles в первом прогоне не дождался первой загрузки страницы, повторный прогон без изменений прошёл. Это известный сбой, он уже в очереди.

changelog: На главной не больше шести клиентов, новые первыми, и ссылка «Все клиенты» под ними.

## Learning signals
none observed

Learning urgency: normal
