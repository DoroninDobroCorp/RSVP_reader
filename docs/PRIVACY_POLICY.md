# PaceFlow Reader — Privacy Policy Draft

Effective date: **August 10, 2026**

This policy describes the current local-only iOS build, web reader, and optional Chrome extension. A copy is bundled inside the app; the public source remains available in this repository until a final product domain is selected.

## English

PaceFlow Reader is an offline document and ebook reader. The current iOS version does not require an account and does not include advertising, analytics, tracking, or cloud synchronization.

### Data processed on your device

When you import a file or paste text, the app processes that content locally to display it, build supported chapter navigation, search it, and save your reading position. Imported files and pasted text, library metadata, bookmarks, reading progress, and app settings remain in the app's private storage on your device. The developer does not receive this information.

### Network use

The current app does not upload your books, reading history, bookmarks, or settings. Its core reading features work without an internet connection.

If you choose **Import article**, the URL you submit is sent to the PaceFlow server. The server downloads that public page, extracts its readable text, and returns the result to your device. The submitted URL and downloaded page are processed in memory for that request and are not stored in a server-side PaceFlow library or analytics database. Standard hosting security logs may retain your IP address, request time, and API path; the POST body containing the submitted URL and the extracted article text are not included in those logs. The source website receives a request from the PaceFlow server and handles it under its own policy. Do not use article import for private, authenticated, or confidential URLs.

### Optional Chrome extension

The Chrome extension runs only after an explicit toolbar, context-menu, or keyboard action. Selected and pasted text is transferred directly to the PaceFlow website and stored in that browser's local PaceFlow library. Article actions transfer the public URL to the guarded importer described above. The extension reads the clipboard only when **Read copied text** is pressed. A pending handoff is kept in in-memory `chrome.storage.session` for no more than ten minutes and deleted after delivery. It does not request browsing-history, all-sites, analytics, advertising, or remote-code access.

Apple may process purchase, download, diagnostic, and support information under Apple's own policies; that processing is controlled by Apple, not by PaceFlow Reader.

### Export and deletion

You may export a local backup from Settings. An exported file is handled by the destination you choose through the system share or file interface. You may erase the app's locally stored books, progress, bookmarks, and settings with **Settings > Your data > Delete all local data**. Uninstalling the app also removes its private app container, subject to operating-system and device-backup behavior.

### Support messages

If you contact support, the developer receives the information you choose to include in your message, such as your email address and problem description. Do not attach copyrighted or sensitive book content unless it is necessary and you are authorized to share it. Support information is used only to respond to and resolve your request and is retained only as long as reasonably necessary for that purpose or legal obligations.

### Children

The app is a general-purpose reading utility and is not directed to children under 13. It does not knowingly collect personal information from children.

### Changes

This policy may change if the app's data practices change. The effective date above will be updated, and material changes will be described in the app or its store listing when appropriate.

### Contact

Developer: **DoroninDobroCorp / PaceFlow Reader project**

Support: **https://github.com/DoroninDobroCorp/RSVP_reader/issues**

Project: **https://github.com/DoroninDobroCorp/RSVP_reader**

## Русский

PaceFlow Reader — офлайн-читалка документов и электронных книг. Текущая версия для iOS не требует учётной записи и не содержит рекламы, аналитики, отслеживания или облачной синхронизации.

### Данные на устройстве

При импорте файла или вставке текста приложение обрабатывает содержимое локально: показывает текст, создаёт доступное оглавление, выполняет поиск и сохраняет позицию чтения. Импортированные файлы и вставленный текст, сведения библиотеки, закладки, прогресс и настройки остаются в приватном хранилище приложения на вашем устройстве. Разработчик не получает эти данные.

### Сеть

Текущая версия не загружает книги, историю чтения, закладки или настройки. Основные функции чтения работают без интернета.

Если вы выбираете **Импортировать статью**, введённая ссылка передаётся серверу PaceFlow. Сервер загружает публичную страницу, выделяет читаемый текст и возвращает результат на устройство. Ссылка и загруженная страница обрабатываются в памяти только для этого запроса и не сохраняются в серверной библиотеке PaceFlow или базе аналитики. Стандартные защитные журналы хостинга могут хранить IP-адрес, время запроса и путь API; POST-тело с введённой ссылкой и извлечённый текст статьи в эти журналы не входят. Исходный сайт получает запрос от сервера PaceFlow и обрабатывает его по собственным правилам. Не используйте импорт для приватных, авторизованных или конфиденциальных ссылок.

### Необязательное расширение Chrome

Расширение работает только после явного действия в popup, контекстном меню или с клавиатуры. Выделенный и вставленный текст передаётся прямо на сайт PaceFlow и сохраняется в локальной библиотеке этого браузера. Для статьи защищённому импортёру передаётся публичная ссылка. Буфер читается только по кнопке **Читать скопированный текст**. Незавершённая передача остаётся в оперативной `chrome.storage.session` не более десяти минут и удаляется после доставки. Расширение не запрашивает доступ к истории, всем сайтам, аналитике, рекламе или удалённому коду.

Apple может обрабатывать сведения о покупке, загрузке, диагностике и обращениях по собственным правилам; PaceFlow Reader не управляет этой обработкой.

### Экспорт и удаление

В Настройках можно экспортировать локальную резервную копию. Дальнейшая обработка файла зависит от выбранного вами системного приложения или места сохранения. Команда **Настройки > Ваши данные > Удалить все локальные данные** стирает локальные книги, прогресс, закладки и настройки. Удаление приложения также удаляет его приватный контейнер с учётом поведения операционной системы и резервных копий устройства.

### Обращения в поддержку

При обращении разработчик получает только те сведения, которые вы сами включили в сообщение, например адрес электронной почты и описание проблемы. Не прикладывайте защищённые авторским правом или конфиденциальные тексты без необходимости и права на их передачу. Эти сведения используются для ответа и решения вопроса и хранятся только разумно необходимое время либо в пределах требований закона.

### Дети и изменения политики

Приложение является универсальным инструментом чтения, не предназначено специально для детей младше 13 лет и сознательно не собирает их персональные данные. При изменении практик обработки данных обновятся дата вступления политики в силу и, при необходимости, описание существенных изменений в приложении или магазине.

### Контакты

Разработчик: **DoroninDobroCorp / проект PaceFlow Reader**

Поддержка: **https://github.com/DoroninDobroCorp/RSVP_reader/issues**

Проект: **https://github.com/DoroninDobroCorp/RSVP_reader**
