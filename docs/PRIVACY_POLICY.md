# HummingRead privacy policy source

Effective draft: 2026-08-11. Public HTML: `privacy.html`. Final public domain and no-login support email remain owner gates.

## Native iOS

The iOS build requires no account and includes no advertising, analytics, tracking SDK, cloud sync, or article URL importer. Imported books/documents, extracted text, positions, bookmarks, and settings remain in app storage on the device. Core reading works offline. The user can export a backup or delete all local app data.

## Web/PWA

Imported books, pasted text, library records, positions, bookmarks, and settings stay in the browser’s local storage/IndexedDB. There is no account or enabled cloud sync.

Optional article import is different: the entered credential-free HTTP(S) URL is sent to the first-party `/api/article` service. The server resolves and validates public global-unicast addresses, pins the approved DNS result, follows only revalidated redirects, fetches the destination transiently, extracts readable text, returns it, and does not write the submitted URL, page text, or a server-side library record to disk/database.

The prepared production nginx policy disables access logging for the article endpoint. The Node service uses the raw source IP only as an in-memory abuse-prevention key; a bucket has a hard ten-minute expiry with no sliding extension and bounded population. Process restart clears it. Destination sites and infrastructure providers may process the server request/IP under their own policies. Do not submit private, authenticated, paywalled, intranet, or unauthorized URLs.

Ordinary hosting/TLS infrastructure may process connection metadata outside the application. “No analytics SDK” is not the same claim as “no infrastructure processing.”

## Chrome extension

Selected text, locally extracted current-page text, explicitly pasted text, settings, and reading progress remain in Chrome extension storage for standalone reading. The extension requests no clipboard, browsing-history, all-sites, analytics, advertising, or remote-code access and makes no automatic content transmission.

Optional **Quick Send** is a separate explicit action. It stores the selected payload behind a random scoped nonce in in-memory `chrome.storage.session`, opens the centrally configured tester website, hands the payload to that same-origin bridge, and removes it after acknowledgement or a hard maximum of ten minutes. Article Quick Send transfers the public URL to the web article flow described above.

## Retention, deletion, and support

Local content remains until the user removes a book, clears the extension/app, deletes all local data, or browser/OS storage is cleared. The developer cannot remotely delete content it never receives. Article text/URL is transient and not stored by the application server, so there is no retained server article record to retrieve or delete. Abuse buckets expire after at most ten minutes.

Support must have a no-login contact route. The current tester page provides public recovery guidance, but not a no-login contact channel; a branded support email or equivalent route is therefore still an owner-supplied release blocker. GitHub Issues may remain an optional technical channel but cannot be the sole consumer contact route.

## Русская версия

Нативная iOS-версия не требует аккаунта, не содержит рекламы, аналитики, отслеживания, облачной синхронизации и импорта статьи по ссылке. Книги, текст, позиции, закладки и настройки остаются на устройстве; основное чтение работает офлайн.

В веб-версии книги, вставленный текст, библиотека и прогресс остаются в браузере. Необязательный импорт статьи передаёт введённый публичный HTTP(S)-адрес сервису `/api/article`: сервис проверяет публичность адреса и каждого редиректа, закрепляет проверанный DNS-результат, временно получает страницу, выделяет текст и не сохраняет ссылку, текст или серверную библиотеку. Для endpoint отключён access log; исходный IP используется только в ограниченном оперативном bucket для защиты от злоупотреблений с жёстким сроком не более десяти минут.

Самостоятельная Chrome-читалка хранит выделенный, локально извлечённый или явно вставленный текст и прогресс в хранилище расширения и ничего не передаёт автоматически. Только отдельная команда Quick Send после явного нажатия может передать выбранный payload настроенному тестовому сайту; сессионная запись удаляется после подтверждения или не позднее десяти минут.

Финальные домен, публичные URL и адрес поддержки утверждает владелец перед публикацией. Бренд остаётся **provisional pending owner/legal confirmation**.
