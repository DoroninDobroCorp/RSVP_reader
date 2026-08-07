# PaceFlow Reader — широкий продуктовый и рыночный пересмотр

Дата: 7 августа 2026 года.

## Новое решение

Платный запуск «как есть и надеяться на App Store» остаётся **no-go**. Но дешёвый product-discovery запуск теперь выглядит разумнее, чем полный отказ от рынка.

Причина пересмотра не в том, что ниша внезапно стала большой. Появились два более точных вывода:

1. Аудитория мобильного чтения существует за пределами личного круга владельца. По Pew 31% взрослых США читали e-book за предыдущий год, среди людей 18–29 лет — 41%. В исследовании британского e-lending смартфон использовали 62% читателей электронных книг, хотя предпочитали его для купленных книг только 21%.
2. Продукт не обязательно продавать как «читалку романов». Более широкий job-to-be-done — пройти длинный текст без скроллинга и постоянного отвлечения: статья, newsletter, отчёт, учебный материал, документ или собственная книга.

Источники:

- https://www.pewresearch.org/short-reads/2026/04/09/americans-still-opt-for-print-books-over-digital-or-audio-versions-few-are-in-book-clubs/
- https://www.librariesconnected.org.uk/sites/default/files/2025-02/INDEPE~1.PDF

## Что изменилось у конкурентов

### Outread — проверенный лидер ниши

- 4.7, около 1.3 тыс. оценок;
- RSVP и режим движущейся подсветки полного текста;
- Share Extension, URL/web import, PDF/DOCX/TXT/RTF/EPUB;
- заметки, статистика, comprehension/speed tests, sync;
- $29.99 в год или $119.99 lifetime среди текущих SKU.

https://apps.apple.com/us/app/outread-speed-reading/id778846279

### FocalRead и Readrrr — более молодые продукты

- FocalRead: 88 оценок, PDF/EPUB/MOBI/AZW3/DOCX/web, history/sessions;
- Readrrr: 86 оценок, PDF-first, narration, sync, stats; отзыв прямо указывает на ошибки глав EPUB и неприятие очередной подписки.

https://apps.apple.com/us/app/focalread-speed-reading/id6757935291

https://apps.apple.com/us/app/readrrr-focus-reader/id6757683148

### Новые прямые конкуренты

- RSVP Reader: URL, camera, clipboard, Safari/Share extensions, PDF, второй Cruise mode, streaks; всего 12 оценок.
- SpeedyReader: PDF/OCR/web/Share/Safari/iCloud и ежедневные обновления; всего 5 оценок.
- Strobe: бесплатный open-source local-first PDF/EPUB reader со scrubbing; всего 5 оценок.
- Blitzr: PDF/EPUB/DOCX/web, RSVP/Highlight/Classic/Teleprompter; публичного сильного сигнала спроса нет.

https://apps.apple.com/us/app/rsvp-reader-speed-reading-app/id6757968737

https://apps.apple.com/us/app/speed-reader-rsvp-reading/id6757832936

https://apps.apple.com/us/app/strobe-rapid-serial-reader/id6759187873

https://apps.apple.com/us/app/blitzr-rsvp-speed-reader/id6758737456

Вывод остаётся жёстким: богатый feature list сам по себе почти не создаёт distribution. Приложение с OCR, AI, sync и расширениями может всё равно получить пять оценок.

## Что перенести в PaceFlow

### Сделать сейчас

1. **Мгновенное встроенное демо.** Новый пользователь должен почувствовать ритм без поиска EPUB и без инструкции владельца. Добавлен локальный EN/RU-текст и кнопка запуска 45-секундного демо; книга не засоряет библиотеку.
2. **Точный scrub в focus mode.** Ползунок позволяет быстро вернуться назад или перейти к нужной части, остаётся доступным с клавиатуры и озвучивает позицию screen reader. Это отвечает повторяющейся потребности в rewind/navigation.

3. **Импорт публичной статьи по URL.** Добавлен 7 августа: сервер безопасно загружает страницу, выделяет основной текст, сохраняет результат в локальную библиотеку и открывает reader. Local/private адреса, нестандартные порты и повторно проверяемые redirects закрыты; размер, время и частота запросов ограничены.

### Следующий кандидат после первых внешних сессий

**Share Extension поверх уже работающего URL import.** Это уберёт ручное копирование ссылки: человек уже имеет текст в Safari, Reddit, Medium, Substack или другом приложении и отправляет его в PaceFlow. Функция всё ещё требует отдельного iOS target, lifecycle-тестов и QA на устройстве. Делать её стоит, если импорт ссылок используется повторно, но ручной вход мешает.

### Только при подтверждённом student/pro спросе

- PDF text extraction;
- on-device OCR для сканов;
- заметки/highlights;
- optional iCloud sync.

### Не переносить сейчас

- AI-переписывание и перевод;
- TTS/narration;
- streaks, achievements и каталог тренировочных игр;
- подписку;
- Android;
- собственный облачный аккаунт и sync backend.

Эти функции увеличивают площадь ошибок и поддержки, но не решают главную проблему — почему человек вообще узнает о приложении и попробует метод.

## Почему freemium требует больше работы

Paid-upfront использует готовую механику App Store: пользователь платит до установки, приложение не содержит логики покупки.

Freemium с lifetime unlock требует:

- создать non-consumable product в App Store Connect;
- встроить StoreKit или поддерживаемый Capacitor bridge;
- спроектировать бесплатный лимит и paywall;
- хранить entitlement, не доверяя одному локальному boolean;
- обрабатывать purchased, pending/deferred, cancelled, failed и revoked/refunded состояния;
- добавить Restore Purchases и восстановление на новом устройстве;
- проверить StoreKit Configuration, sandbox/TestFlight, разные storefronts и Family Sharing, если оно включено;
- локализовать цену, paywall, ошибки и App Review metadata;
- поддерживать людей, у которых покупка временно не подтверждается.

Apple прямо требует механизм восстановления restorable purchases и рекомендует тестировать interrupted purchases, refunds и события вне приложения:

- https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/
- https://developer.apple.com/documentation/storekit/restoring-purchased-products
- https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/

Для **одного non-consumable lifetime unlock без сервера** это несколько дополнительных инженерных дней и серьёзный QA, а не новый бизнес-отдел. Подписка существенно дороже: появляются renewals, grace/billing states, churn, ценовые планы и обязанность давать постоянную ценность.

Преимущество freemium для PaceFlow весомое: RSVP трудно купить, не попробовав. Реклама paid-upfront приложения просит пользователя одновременно поверить неизвестному разработчику и незнакомому методу. Бесплатное демо разделяет эти решения.

Если рынок будет проверяться через App Store, рекомендуемый вариант — бесплатная загрузка, полноценное демо/одна собственная книга и **один lifetime unlock**, без подписки.

## Кого считать аудиторией

Не «всех, кто читает книги» и не друзей владельца.

### Сегмент A — reading backlog

Люди, у которых накоплены статьи, newsletters, сохранённые посты и длинные рабочие тексты. URL import уже обслуживает этот сценарий; нативный Share Extension может убрать оставшееся ручное действие после подтверждения спроса.

### Сегмент B — владельцы DRM-free EPUB/FB2

Уже обслуживается продуктом. Особенно интересны RU/EN bilingual readers и пользователи FB2, который редко хорошо поддерживается на iOS.

### Сегмент C — study/productivity

Студенты, исследователи и специалисты с отчётами. Сейчас ограничен отсутствием PDF; не обещать ему решение раньше реализации.

### Сегмент D — language learners

Им полезны контролируемый темп, паузы, контекст и повтор позиции. Можно проверять без AI и перевода.

Не использовать медицинские обещания про ADHD, dyslexia или лечение. Допустимо говорить `focus-friendly`, `paced`, `distraction-free`.

## Необычный, но реалистичный funnel

### Верх воронки: не приложение, а challenge

Сообщение:

> Can you comfortably follow 500 words per minute for 45 seconds?

Человек открывает бесплатную web-версию, запускает встроенное демо и только потом видит предложение продолжить со своим текстом или установить приложение.

Это сильнее обычного «ещё одна speed-reading app», потому что контент одновременно является демонстрацией результата. Следующая итерация, только если демо работает, — короткая self-check и локально создаваемая карточка результата для системного Share Sheet.

### Где искать людей

- небольшие YouTube/TikTok/Instagram авторы про study systems, productivity, newsletters и language learning;
- Reddit/community posts с разрешения модераторов: speedreading, ebooks, productivity, language learning, iOS apps;
- RU-сообщества EPUB/FB2 и электронных читалок без распространения защищённых книг;
- Show HN / indie/open-source аудитория как технический запуск, но не как основной рынок;
- партнёрские демо на собственном тексте newsletter-автора: «прочитайте этот пост в PaceFlow».

Большой книжный блогер может дать дорогой нерелевантный охват: его аудитория любит книги, но не обязательно хочет RSVP. Маленький автор с точным workflow полезнее.

### Как тестировать блогеров

Не покупать один дорогой рекламный пост.

1. Выбрать 3–5 nano/micro creators с видимыми комментариями по теме, а не только числом подписчиков.
2. Дать каждому свою ссылку/campaign identifier и один сценарий: показать собственный длинный текст, 45-секундное демо и честную паузу/возврат назад.
3. Небольшая фиксированная оплата за производство плюс бонус за квалифицированную установку или покупку; обязательная маркировка рекламы.
4. Общий первый бюджет ограничить суммой, которую не жалко полностью потерять. Рабочий исследовательский cap — $300–500, но только после бесплатной точки входа.
5. Не масштабировать по просмотрам. Смотреть product-page visits, installs, first sessions и возврат.

Apple App Store Connect умеет разносить acquisition по app/web referrer и campaign links; custom product pages позволяют отправлять разные сегменты на разные тексты и screenshots:

- https://developer.apple.com/help/app-store-connect-analytics/acquisition/acquisition/
- https://developer.apple.com/app-store/custom-product-pages/

Apple Ads имеет смысл только на высокоинтентных запросах (`speed reader`, `RSVP reader`, `read articles faster`) и с маленьким max CPI. До измеренной install-to-paid конверсии даже $1 за установку может оказаться дорогим.

## Новый validation gate без знакомых

Людей не нужно знать лично. Нужны 100–300 релевантных посетителей из нескольких онлайн-источников.

Первый gate:

- не менее 100 уникальных переходов на demo page;
- не менее 25 запусков демо;
- не менее 10 человек доходят до использования собственного текста/книги;
- не менее 5 возвращаются в другой день;
- не менее 3 просят системный Share Extension/PDF либо готовы купить lifetime unlock.

Если верх воронки не запускает даже бесплатное демо, App Store-релиз и новые функции не помогут. Если демо запускают, но не возвращаются — проблема в ценности/методе. Если возвращаются и используют URL import, но ручное копирование мешает — тогда Share Extension получает доказанный приоритет.

## Экономика монетизации

Apple Developer Program стоит $99 в год. Участники Small Business Program, если одобрены и подходят по условиям, платят 15% комиссии с paid apps и IAP.

- https://developer.apple.com/programs/whats-included/
- https://developer.apple.com/app-store/small-business-program/

Разумные тесты после подтверждения использования:

- freemium + $7.99–9.99 lifetime unlock;
- либо hobby paid-upfront $4.99 с ожиданием почти нулевой выручки.

Не делать подписку без облачных или регулярно обновляемых сервисных расходов.

## Итог

Широкий взгляд не превращает PaceFlow в очевидный бизнес. Он показывает более дешёвый путь узнать правду:

1. продукт остаётся технически простым и local-first;
2. вход становится бесплатным и мгновенным через demo challenge;
3. аудитория ищется онлайн по job-to-be-done, а не среди знакомых книголюбов;
4. URL import проверяет сценарий уже сейчас, а Share Extension строится только после сигнала повторного использования;
5. блогеры используются как измеряемый маленький эксперимент, а не как ставка на чудо.

Это уже не «выпустить и надеяться», но ещё и не решение строить компанию. Это ограниченная проверка, после которой можно спокойно продолжить или закрыть коммерческую ветку.
