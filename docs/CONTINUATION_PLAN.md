# PaceFlow Reader — план продолжения

Дата: 2026-08-03  
Рабочая папка: `/Users/macbookprom1/Desktop/RSVP_reader`  
Сервер: `serverforvovka:/srv/RSVP_reader`

## Точка отката

Понравившаяся исходная версия уже сохранена и отправлена:

- commit: `d0902a2542b07e227c165d2eb7a21efa62ad99a8`
- tag: `pre-app-store-polish-20260802`

Не удалять и не переписывать этот тег. Все новые изменения пока не закоммичены. Не включать в будущий commit пользовательские данные, особенно `data/sync-store.json` и личные книги.

## Уже сделано

- Выбрана архитектура Capacitor 8 для iOS вместо полного rewrite на Swift; добавлены iOS project, privacy manifest, app icons, splash и native plugins.
- Проведён большой дизайн-полиш: day/night themes, mobile safe areas, compact landscape, контраст, touch targets 44 px, keyboard и modal accessibility.
- UI стал English-first с полноценным русским языком; `en` и `ru` объявлены в iOS metadata.
- Реализованы все ключевые reader features: 2-second speed feedback, real active-time WPM, корректный word count, pause context 80/20, long-word font fitting, strict/flexible two-word modes, доступный поиск, библиотека, закладки, TOC.
- TOC работает для EPUB nav/NCX, FB2, DOCX headings и распознаваемых headings в текстах.
- Импорт книги автоматически сохраняет её в библиотеку; resume и current position сохраняются через IndexedDB/local/native storage.
- Для iOS сознательно не переопределяются volume buttons: это противоречит Apple guideline 2.5.9. Допустимые Media Session/keyboard controls оставлены как optional feature.
- Существенно усилены parser/import/server/service worker: ZIP safety limits, encoding/RTF improvements, HTML/EPUB content extraction, private static files закрыты, malformed URL не должен валить server, offline cache исправлен.
- Подготовлены `APP_STORE_CHECKLIST.md`, `APP_STORE_COPY.md`, `MARKET_ANALYSIS.md`, `PRIVACY_POLICY.md`.
- Сделан market analysis: ниша небольшая, но позиционирование как private/offline speed reader for real books выглядит жизнеспособно. Рабочее имя PaceFlow требует проверки на collision/trademark до публикации.

## Что осталось — обязательно до release

### Данные и восстановление (P0)

- Закончить и протестировать native/local fallback для больших книг: `nativeOnlyText` должен после restart всегда гидратироваться из native mirror.
- Закончить batch native persistence: один index write на import/recovery batch, а не O(N²).
- Протестировать versioned native draft + Preferences pointer при force quit, quota и stale draft -> saved book переходе.
- Закрыть newest-wins для local/IndexedDB/native draft и resume по content signature, а не только wall-clock timestamp.
- Довести tombstones: durable delete до native cleanup, без resurrection после crash/cleanup failure.
- Довести legacy migration: per-record invalid skip, transient storage failure остаётся retryable, legacy не перезаписывает newer native copy.
- Закрыть race conditions: ввод во время bootstrap/save/import/loadBook не должен перетираться.

### Большие книги и parser safety (P0)

- Проверить, что token limits срабатывают до больших массивов/DOM allocations: dense punctuation, >1M tokens, extreme long token.
- Подтвердить quarantine path: старая unsafe/corrupt книга не ломает library/export/delete/bootstrap; reader открывает её только с безопасной ошибкой.
- Проверить format-specific source size limits до DOMParser для HTML/FB2/XML/DOCX.
- Добавить regressions для encoding (UTF-16 BOM, cp1251/cp1252), RTF scoped `\\uc`, HTML/EPUB mixed blocks + `<br>`, standalone EPUB anchors, TOC nav priority, alternate DOCX namespaces, empty/binary ZIP.

### Settings, import и полиш (P1)

- Завершить atomic pair persistence для `settings` + `settingsUpdatedAt`; settings должны восстанавливаться из IndexedDB при localStorage eviction.
- Подтвердить atomic backup import: validate whole payload first, one IndexedDB transaction / native batch; malformed Nth record и quota не дают partial visible import.
- При наличии времени заменить оставшиеся browser `prompt()` / `confirm()` на локализованные app dialogs.
- Выбрать окончательное имя, bundle ID, seller identity, privacy/support URLs, цену и territories. Не обещать IAP/StoreKit, пока это не реализовано.

### Hosting и packaging (P1)

- Если используется Netlify: `npm run build`, publish только `dist`, без blanket `/* -> /index.html 200` redirect.
- После стабилизации повысить один раз cache/service-worker version.
- Выполнить `npm run build`, `npm run cap:sync`; проверить соответствие source, `dist` и `ios/App/App/public`.
- `plutil -lint`, `npx cap doctor`, `npx cap ls`.
- Для реального archive/TestFlight всё ещё нужны full Xcode, Apple Developer Team, signing, final bundle ID и iPhone/simulator QA.

## Обязательная финальная проверка

```sh
node --check app.js
node --check epub-parser.js
node --check i18n.js
node --check server.js
node --check service-worker.js
git diff --check
npm audit
npm test
npm run build
npm run cap:sync
```

`npm test` должен пройти в Chromium, WebKit и mobile Safari. До последних storage/parser изменений был почти чистый прогон; после них полный итоговый прогон ещё не выполнен.

Отдельно проверить: stale/new local-vs-native book, tombstone crash window, delayed native Preferences writes, localStorage quota, interrupted drafts, input while async action pending, large dense imports, import atomicity, corrupt native index repair, service-worker 503 fallback, portrait/landscape/day/night/EN/RU.

## Финальная последовательность

1. Закрыть P0 и добавить targeted regressions.
2. Гонять тесты, исправлять и повторять до чистого результата.
3. Собрать web + Capacitor и проверить packaged bundle.
4. Проверить `git status`, исключить private/test artifacts.
5. Только после завершения сделать commit/push.
6. Затем безопасно обновить сервер: `git pull --ff-only` в `/srv/RSVP_reader`, сохраняя его untracked personal files.
7. После этого Xcode archive/TestFlight/App Store Connect.

## Уже принятые решения

- Не переписывать на Swift сейчас: сначала подтвердить Capacitor build в TestFlight.
- Не использовать volume buttons как play/pause на iOS.
- Не включать legacy unauthenticated cloud sync в production.
- Не выпускать под рабочим именем PaceFlow без проверки collision/trademark.
