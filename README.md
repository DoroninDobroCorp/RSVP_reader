# PaceFlow Reader 2.0

**English** · [Русский](#русский)

A private pace reader for books, articles, and long-form text, guided by Pico—the hummingbird focus pilot. PaceFlow presents text in controlled one- or two-word frames, preserves useful context when paused, and returns to the exact saved reading position.

The current product target is a native iPhone/iPad app built with Capacitor. The same reading core also runs as a local web/PWA build. Android is planned, but is not part of the current release.

> PaceFlow controls presentation pace; it does not promise a particular reading-speed or comprehension improvement. Results vary by reader, material, language, and selected speed.

## What is included

- Focused RSVP playback with ORP highlighting, 100–1000 target WPM, punctuation-aware pauses, adjustable typography, themes, and focus color.
- One-word mode plus two pair modes at 350+ WPM: strict pairs require each word to be at most 5 letters; optional flexible pairs allow up to 10 letters in total. Punctuation still closes the frame.
- Target and real WPM. Real WPM is calculated from words actually presented divided by active playback time; paused time is excluded. Before enough playback data exists, the UI shows an effective estimate that includes pacing delays.
- Clear repeated speed feedback: every speed change restarts a 2-second pressed-state fade.
- Pause context biased approximately 80/20 toward text already read, with the stopped word de-emphasized.
- Automatic shrinking of an unusually long focus token so it stays inside the viewport.
- Exact resume after reload, force-quit, or reopening a saved book, plus a local library, bookmarks, progress, rename/delete, and JSON import/export.
- Always-accessible book search with phrase matching and previous/next result navigation.
- Table of contents from EPUB navigation, FB2 sections, document headings, or detected headings when the source format permits it.
- English and Russian UI.
- A connected editorial interface and original Pico hummingbird character shared by the web/PWA, iOS icon and launch screen, and Chrome popup. See [docs/BRAND_SYSTEM.md](docs/BRAND_SYSTEM.md).
- Manifest V3 Chrome extension for sending selected text, copied text, pasted text, links, or the current article directly into the local PaceFlow library and focus mode.
- Optional Media Session controls on compatible web platforms. In the iOS build, Space works with a hardware keyboard while volume buttons always keep their normal system behavior.

## Supported input

- Pasted plain text
- TXT
- EPUB
- FB2/XML and FB2.ZIP/ZIP containers
- DOCX
- HTML/HTM
- Markdown (`.md`, `.markdown`)
- RTF (basic text extraction)

Structure quality depends on the source file. A well-formed EPUB or document with real headings produces a better table of contents than unstructured plain text.

## Privacy

The native app is local-only:

- no account, ads, analytics, tracking, or book uploads;
- books, settings, bookmarks, and reading state stay in the app container;
- article URL import is absent and no article-service endpoint is resolved;
- legacy cloud sync is permanently disabled in web and native builds.

The historical unauthenticated `/api/sync` route is unavailable. Upgraded browser
state is migrated to `cloudSyncEnabled: false` before any timer can be scheduled;
pending flags are cleared without removing local books or progress.

The Chrome extension uses `activeTab` only after an explicit click or shortcut, reads the clipboard only when **Read copied text** is pressed, and keeps pending handoffs in in-memory `chrome.storage.session` for at most ten minutes. It does not request browsing-history or all-sites access.

## Architecture

| Area | Current implementation |
| --- | --- |
| Reading core | Framework-free JavaScript in `app.js`, with parsing in `epub-parser.js` and localization in `i18n.js` |
| Web/PWA | Static application shell, manifest, service worker, local IndexedDB/localStorage persistence |
| Chrome | Manifest V3 service worker, popup, context menus, keyboard shortcut, session-only handoff, and a content bridge restricted to PaceFlow |
| Native iOS | Capacitor 8 shell in `ios/`, minimum iOS 15, bundled `dist/` assets, Filesystem/Preferences persistence, lifecycle, haptics, and pinned Keep Awake fallback |
| Android | Planned reuse of the same web core; no Android platform is shipped in this repository yet |

The native app starts from bundled assets and does not need a remote server for normal reading.

## Install and run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm start
```

Open `http://localhost:8081`.

Create a production web bundle:

```bash
npm run build
```

The generated output is placed in `dist/`.

## Build and install the Chrome extension

`npm run build` also creates `dist/downloads/paceflow-quick-send.zip`. Extract it, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder. During development, the tracked `chrome-extension/` folder can be loaded directly.

The extension supports:

- right-clicking selected text, the current page, or a link;
- sending the current selection, copied text, manually pasted text, or current article from the toolbar popup;
- `Alt+Shift+R` to send the selection, falling back to the current article URL.

## Build the iOS app

Requirements: macOS, full Xcode, an installed iOS SDK/simulator, and an Apple Developer team for device/archive signing.

```bash
npm ci
npm run ios:open
```

`ios:open` rebuilds `dist/`, synchronizes Capacitor, and opens `ios/App/App.xcodeproj`. Choose the App scheme and a simulator or signed device in Xcode. For a sync without opening Xcode, run `npm run cap:sync`.

## Test

Install the Chromium and WebKit test runtimes once:

```bash
npx playwright install chromium webkit
```

Then run:

```bash
npm test              # Node unit tests + complete Playwright suite
npm run test:unit     # unit tests only
npm run test:extension # real Chrome service-worker and website handoff
npm run test:local    # focused local regression suite
npm run test:prod     # smoke-test the deployed web demo
npm run test:headed   # Playwright with a visible browser
```

Playwright starts the local server automatically on port 8081. The production smoke suite targets the public PaceFlow demo by default; set `PACEFLOW_PRODUCTION_URL` (including its trailing slash) to validate another deployment. Native release QA, privacy checks, physical-device coverage, and App Store steps are tracked in [docs/APP_STORE_CHECKLIST.md](docs/APP_STORE_CHECKLIST.md).

## Project structure

```text
.
├── index.html, style.css       Web UI
├── app.js                      Reader, library, persistence, controls
├── epub-parser.js              EPUB parsing and navigation
├── i18n.js                     English/Russian localization
├── assets/, vendor/            Product assets and vendored JSZip
├── chrome-extension/           Manifest V3 extension source
├── scripts/build-web.mjs       Reproducible dist/ builder
├── server.js                   Local static server; legacy sync opt-in
├── ios/                        Capacitor/Xcode iOS project
├── tests/                      Playwright and Node regression tests
├── docs/                       Release, product, and market notes
└── capacitor.config.json       Native application configuration
```

See also [App Store copy](docs/APP_STORE_COPY.md) and the [market and positioning analysis](docs/MARKET_ANALYSIS.md).

---

## Русский

PaceFlow Reader — приватная читалка для книг, статей и длинных текстов с Пико, колибри-пилотом фокуса. Она показывает текст управляемыми кадрами по одному или два слова, сохраняет полезный контекст на паузе и возвращает к точной сохранённой позиции.

Текущая цель — нативное приложение для iPhone/iPad на Capacitor. То же ядро работает как локальная web/PWA-версия. Android запланирован, но пока не входит в текущий релиз.

> PaceFlow управляет темпом показа текста, но не обещает конкретного роста скорости чтения или сохранения понимания. Результат зависит от читателя, материала, языка и выбранной скорости.

## Возможности

- RSVP-показ с ORP-подсветкой, целевой скоростью 100–1000 слов/мин, паузами на пунктуации, настройкой шрифта, тем и цвета фокуса.
- Режим одного слова и два парных режима при скорости от 350 слов/мин: строгий объединяет слова длиной не более 5 букв каждое; гибкий допускает до 10 букв в сумме. Пунктуация завершает кадр.
- Целевая и реальная скорость. Реальная скорость считается по фактически показанным словам и активному времени чтения без пауз; до накопления достаточных данных показывается эффективная оценка с учётом задержек.
- Повторная визуальная реакция на каждое изменение скорости с плавным возвратом кнопки за 2 секунды.
- Контекст на паузе примерно 80/20 в пользу уже прочитанного текста; остановленное слово визуально уменьшено.
- Автоматическое уменьшение слишком длинного слова до размеров экрана.
- Точное продолжение после перезагрузки, принудительного закрытия или повторного открытия книги; локальная библиотека, закладки, прогресс, переименование/удаление и импорт/экспорт JSON.
- Всегда доступный поиск по книге, включая фразы и переходы к предыдущему/следующему совпадению.
- Оглавление из навигации EPUB, секций FB2, заголовков документов либо распознанных заголовков, если формат это позволяет.
- Интерфейс на английском и русском.
- Единый редакционный интерфейс и оригинальный персонаж Пико-колибри для web/PWA, иконки и стартового экрана iOS и popup Chrome. Правила собраны в [docs/BRAND_SYSTEM.md](docs/BRAND_SYSTEM.md).
- Расширение Chrome Manifest V3 отправляет выделенный, скопированный или вставленный текст, ссылку либо текущую статью прямо в локальную библиотеку и фокус-режим PaceFlow.
- Опциональное управление через Media Session на совместимых веб-платформах. В iOS-сборке пробел работает с аппаратной клавиатурой, а кнопки громкости всегда сохраняют системное назначение.

## Поддерживаемые форматы

- Вставленный обычный текст
- TXT
- EPUB
- FB2/XML и контейнеры FB2.ZIP/ZIP
- DOCX
- HTML/HTM
- Markdown (`.md`, `.markdown`)
- RTF с базовым извлечением текста

Качество структуры зависит от исходного файла: корректный EPUB или документ с настоящими заголовками даст более точное оглавление, чем неструктурированный текст.

## Приватность

Нативное приложение по умолчанию полностью локальное:

- без аккаунта, рекламы, аналитики, трекинга и загрузки книг;
- книги, настройки, закладки и позиция чтения остаются в контейнере приложения;
- облачная синхронизация в нативной версии отключена.

В `server.js` сохранён исторический однопользовательский endpoint синхронизации для доверенного self-hosted тестирования. По умолчанию он выключен и нативным приложением не используется. Явное включение: `PACEFLOW_ENABLE_LEGACY_SYNC=1 npm start`. У endpoint нет многопользовательской авторизации, поэтому для публичного сервиса он не подходит.

Расширение Chrome получает временный доступ к активной вкладке только после явного действия, читает буфер только по кнопке **Читать скопированный текст** и держит незавершённую передачу в оперативной `chrome.storage.session` не более десяти минут. Доступ к истории и ко всем сайтам не запрашивается.

## Архитектура

| Часть | Текущая реализация |
| --- | --- |
| Ядро чтения | JavaScript без фреймворка в `app.js`, парсинг в `epub-parser.js`, локализация в `i18n.js` |
| Web/PWA | Статическое приложение, manifest, service worker, локальное хранение IndexedDB/localStorage |
| Chrome | Manifest V3 service worker, popup, контекстное меню, горячая клавиша, сессионная передача и content bridge только для PaceFlow |
| Нативный iOS | Оболочка Capacitor 8 в `ios/`, минимум iOS 15, встроенные ресурсы `dist/`, Filesystem/Preferences, lifecycle и haptics |
| Android | Планируется на том же web-ядре; Android-платформа пока не поставляется в репозитории |

Для обычного чтения нативное приложение запускается из встроенных ресурсов и не требует удалённого сервера.

## Установка и локальный запуск

Нужны Node.js 22+ и npm.

```bash
npm ci
npm start
```

Откройте `http://localhost:8081`. Production-сборка web-ресурсов:

```bash
npm run build
```

Результат создаётся в `dist/`.

## Сборка и установка расширения Chrome

`npm run build` также создаёт `dist/downloads/paceflow-quick-send.zip`. Распакуйте архив, откройте `chrome://extensions`, включите **Режим разработчика**, нажмите **Загрузить распакованное расширение** и выберите папку. Для разработки можно загрузить отслеживаемую папку `chrome-extension/` напрямую.

Расширение умеет отправлять выделение, страницу или ссылку через контекстное меню; выделенный, скопированный или вручную вставленный текст и текущую статью через popup; `Alt+Shift+R` отправляет выделение, а при его отсутствии — адрес статьи.

## Сборка iOS

Нужны macOS, полный Xcode, установленный iOS SDK/симулятор и Apple Developer Team для подписи устройства или архива.

```bash
npm ci
npm run ios:open
```

Команда пересобирает `dist/`, синхронизирует Capacitor и открывает `ios/App/App.xcodeproj`. В Xcode выберите схему App и симулятор либо подписанное устройство. Только синхронизация без открытия Xcode: `npm run cap:sync`.

## Тесты

Один раз установите Chromium и WebKit для Playwright:

```bash
npx playwright install chromium webkit
```

Основные команды:

```bash
npm test              # unit-тесты Node + полный набор Playwright
npm run test:unit     # только unit-тесты
npm run test:extension # реальный Chrome service worker и передача на сайт
npm run test:local    # сфокусированный локальный регресс
npm run test:prod     # smoke-тест опубликованного web-demo
npm run test:headed   # Playwright с видимым браузером
```

Playwright автоматически поднимает локальный сервер на порту 8081. Production smoke suite по умолчанию проверяет публичное demo PaceFlow; другой deployment можно указать в `PACEFLOW_PRODUCTION_URL` с завершающим `/`. Проверки нативного релиза, приватности, физических устройств и App Store собраны в [docs/APP_STORE_CHECKLIST.md](docs/APP_STORE_CHECKLIST.md).

## Структура проекта

```text
.
├── index.html, style.css       Web-интерфейс
├── app.js                      Читалка, библиотека, хранение, управление
├── epub-parser.js              Парсинг и навигация EPUB
├── i18n.js                     Английская/русская локализация
├── assets/, vendor/            Ресурсы продукта и локальный JSZip
├── chrome-extension/           Исходники расширения Manifest V3
├── scripts/build-web.mjs       Сборщик dist/
├── server.js                   Локальный сервер; legacy-синхронизация opt-in
├── ios/                        Проект Capacitor/Xcode
├── tests/                      Регрессионные тесты Playwright и Node
├── docs/                       Материалы релиза, продукта и рынка
└── capacitor.config.json       Конфигурация нативного приложения
```

Дополнительно: [тексты для App Store](docs/APP_STORE_COPY.md) и [анализ рынка и позиционирования](docs/MARKET_ANALYSIS.md).
