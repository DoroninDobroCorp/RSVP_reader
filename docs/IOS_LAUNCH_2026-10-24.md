# HummingRead iOS launch — 2026-10-24

## Owner decisions and execution

Canonical development and all application source edits stay on serverforvovka:/srv/hummingread, branch mission/android-r5-recovery-20260814. The owner subsequently authorized the Mac as an isolated Xcode build/sign/install/test host and connected their iPhone for free Personal Team testing before buying membership. The Mac uses a checksummed export of committed server source; local build outputs, provisioning and device data are not committed or uploaded as public evidence. This supersedes the earlier prohibition on local Xcode execution. No paid Developer membership is needed for the first own-device trial.

HummingRead should be free and open source, with voluntary support instead of a paid download, subscription or locked reading features. The public repository already uses the MIT license. Public support email approved by owner: vladimir_doronin@icloud.com. No donation account exists yet; no real payment link or in-app purchase is claimed. The website exposes source and MIT rights, working demo, supported files, privacy, FAQs and feedback. A future HTTPS donation URL is configured once in product.config.json → website.donationUrl and rebuilt. It is independent of the native app; no external payment control is bundled into iOS.

No HummingRead-specific registration was found in the connected Gmail registrar search or this server's TLS certificate inventory. This is a bounded search, not proof that no domain exists elsewhere. A temporary free hostname is acceptable to the owner. Existing app origin and reading storage are preserved at https://145.239.82.124.sslip.io/rsvp/. New marketing hostname: https://hummingread.145.239.82.124.sslip.io/. Its activation and certificate must be verified in the final report.

## Prepared release materials

- release/app-store/en-US.json, ru.json, es-ES.json: names, subtitles, descriptions, keywords, promo text and six screenshot headlines.
- npm run store:prepare: exports individual plain-text App Store Connect/fastlane-compatible fields to artifacts/app-store-connect/. Enforces name/subtitle 30 characters, promo 170, description 4000 and keywords 100 UTF-8 bytes.
- docs/APP_STORE_COPY.md: reviewer workflow, privacy/account/age/content-rights inputs and official Apple references.
- npm run ios:verify-source: static checks for local-only iOS assets, public support, privacy declarations, icon, version, identifiers, SwiftPM pins and archive scheme. Does not claim to compile Swift.
- npm run ios:release-check: executes builds, package/metadata/security/unit/web/browser/offline checks. It exits 2 after successful source/web checks because native/account gates remain blocked; it never reports App Store release readiness from Linux.
- scripts/ios-xcode-check.sh: reproducible unsigned Simulator build/Analyze command for a future approved macOS build host. Explicitly exits BLOCKED on Linux.
- docs/PROMOTION_PLAN.md: free/open-source positioning, launch text and conservative support economics.

## Оставшийся план: сначала свой iPhone, затем расходы и публикация

Обновлено 24 октября 2026 по уточнению владельца. Приложение бесплатное, код MIT, поддержка добровольная. Домен и приём донатов — обязательные отдельные работы перед продвижением, а не неопределённое «потом». Вступление в платную программу Apple идёт после испытания на собственном устройстве.

### 1. Собрать и поставить на подключённый iPhone — сейчас

- Проверить актуальный Xcode/iOS support, подключение, доверие и Developer Mode.
- Из зафиксированного серверного SHA выполнить настоящие Release build + Analyze для iOS device и Simulator; сохранить SHA и логи, отделив их от старых Linux/browser проверок.
- Использовать уже существующий Apple Account / Personal Team и его development certificate. Проверить доступность текущего bundle ID; не менять публичную идентичность или ключи без необходимости.
- Собрать development-signed приложение, установить его на собственный iPhone и подтвердить запуск. Не покупать membership и не загружать сборку в App Store Connect на этом шаге.
- Зафиксировать дату истечения Personal Team profile и команду повторной установки. Apple указывает срок 7 дней; это тестовая установка.

Готово, когда приложение действительно установлено и запускается на телефоне. Успешная компиляция сама по себе этот пункт не закрывает.

Текущий результат: установлена и запущена development-signed HummingRead 1.0 (2) на iPhone 13 Pro / iOS 26.6.1; Xcode Release build + Analyze для device и Simulator завершились успешно. Personal Team profile истекает 31 октября 2026. Актуальные исправления, проверка обновления без потери файлов и границы QA: [IOS_UI_FIXES_2026-10-24.md](IOS_UI_FIXES_2026-10-24.md).

### 2. Проверить чтение и сохранность данных — до покупки Developer

Владелец пользуется приложением 3–5 дней. Параллельно выполняем настоящий iPhone/iPad Simulator QA и исправляем найденное на сервере: EN/RU/ES, светлая/тёмная темы, портрет/альбом, импорт заявленных форматов через Files, большая книга, RSVP/обычный текст/поиск/закладки, точная позиция после завершения процесса, фон/возврат, Keep Awake, размер текста и VoiceOver. Отдельно проверить экспорт бэкапа, системный Share и восстановление в отдельном тестовом контейнере; личную библиотеку не стирать ради пробы. Проверить Cancel/Confirm удаления на синтетической книге.

Первый native smoke выполнен на iPhone/iPad Simulator, но полный этот пункт остаётся открытым. Известные ошибки выбора/сохранения шрифта и длинных RU/ES подписей исправлены и перепроверены в build 2; текущая проба проводится уже на исправленной сборке.

Готово, когда нет потери книг/позиции и блокирующих ошибок; восстановление из бэкапа доказано на реальном native runtime. Симулятор, физический iPhone и пользовательские наблюдения отмечаются раздельно.

### 3. Оформить постоянный домен — параллельно испытанию, до продвижения

- Проверить доступные владельцу registrar accounts, письма о покупке и DNS: мог ли домен уже быть куплен. Предыдущая ограниченная проверка Gmail/сертификатов не нашла регистрацию HummingRead; отсутствие домена во всех аккаунтах этим не доказано.
- Если домена нет, выбрать короткое имя и проверить доступность, обычную цену продления, DNS-доступ и итоговую стоимость. Покупку и обязательные соглашения подтверждает владелец; бесплатный sslip.io остаётся рабочим временным адресом.
- Подключить DNS к текущему серверу, HTTPS с проверенным продлением, EN/RU/ES, редиректы маркетингового сайта, canonical/hreflang, sitemap/robots и social metadata. Проверить сайт с телефона и внешней сети.
- Обновить marketing/support/privacy URLs, README и будущие App Store поля. Исходный origin веб-читалки сохранять до проверенного экспорта/миграции библиотеки: простой перенос домена не переносит браузерные книги.

Готово, когда постоянный домен контролируется владельцем, HTTPS и все три языка работают, а ссылки/SEO согласованы. Статус сейчас: временный hostname работает, постоянный домен не подтверждён.

### 4. Оформить приём добровольной поддержки — параллельно испытанию, до продвижения

- Выбрать сервис по фактической стране аккаунта владельца и доступному способу вывода. До выбора проверить официальную доступность получения и вывода, комиссии, валюты, разовые платежи и требования проверки личности. Не считать наличие красивой платёжной страницы доказательством возможности получить деньги.
- Подготовить профиль HummingRead, описание на EN/RU/ES, благодарность, публичный URL и понятное обещание: поддержка добровольная, все функции бесплатны, платёж не включает подписку.
- Согласовать юридического получателя поддержки. Если им будет другой согласившийся человек, сначала подтвердить у сервиса допустимость такой модели для проекта. Данные платёжного аккаунта, проверки личности и счёта для вывода должны соответствовать требованиям провайдера; чужую карту не считать автоматически подходящей для аккаунта автора. Получатель сам проходит идентификацию, привязывает свой счёт и принимает условия. Пароли, документы, личные финансовые обстоятельства и реквизиты не сохраняем в публичном репозитории.
- Подключить реальный HTTPS URL через product.config.json → website.donationUrl, пересобрать и выложить сайт. Проверить кнопку на всех языках, мобильную страницу провайдера, выбранную валюту и отсутствие навязанной регулярности.
- Пройти тест провайдера в sandbox, если доступен. Для реальной проверки владелец отдельно согласует минимальный платёж и проверяет получение/доступность вывода; не делать собственный перевод без суммы и разрешения. Записать комиссии и условия вывода.
- Оставить внешнюю поддержку на сайте. Перед любым добавлением оплаты внутрь iOS отдельно проверить действующие правила Apple для выбранных storefronts и реализовать допустимый flow.

Готово, когда владелец может принимать и выводить поддержку, публичная ссылка подключена и проверена. Статус сейчас: аккаунта/URL нет, donationUrl=null, платёжной кнопки нет. До этого пункт остаётся открытым; не выдавать подготовленный текст за оформленный приём денег.

### 5. Купить Apple Developer Program — после успешного испытания

Владелец подтверждает готовность продолжать, юридическое имя/seller identity, страну и самостоятельно оплачивает membership и принимает соглашения. Затем подтверждаем доступность финального bundle ID в его team, signing и сохранение тестовых данных при переходе. Бесплатная Personal Team установка не считается выполненной регистрацией платного аккаунта.

### 6. TestFlight и финальный native QA

Создать App Store Connect app, signed archive, Validate и upload в согласованный аккаунт; пройти internal TestFlight, затем внешнее тестирование и beta review при необходимости. Проверить чистую установку/обновление, офлайн, импорт/backup/share, доступность и хотя бы один iPad/типоразмер. Закрыть блокирующие ошибки и повторить затронутые сценарии. Не путать Simulator screenshots с проверкой настоящего iPad.

### 7. Оформить App Store и материалы запуска

Уже подготовленные EN/RU/ES названия, описания, subtitle, keywords и promo text сверить с финальной сборкой. Сделать настоящие iPhone/iPad screenshots всех локализаций; заполнить privacy, age, copyright/content rights, export compliance, territories, EU trader/account declarations и review notes по реальным данным владельца. Проверить окончательные support/privacy/domain URLs. Подготовить короткий ролик импорта и чтения, README и посты с сайтом, MIT-кодом и проверенной донатной ссылкой; автор выбирает площадки и публикует сообщения сам, если отдельно не поручит отправку.

### 8. App Review, публикация и сопровождение

Отправить согласованный кандидат в App Review, ответить на замечания, после одобрения проверить настоящую публичную App Store страницу/установку. Только после этого добавить действующий App Store URL на сайт и запустить продвижение. После запуска проверять обращения/сбои, HTTPS/домен, донатный вывод и реальные установки/поддержки; не обещать окупаемость. Продление домена и Developer membership включить в ежегодные расходы. Напоминания/автоматизации создавать только по отдельному запросу владельца.

Приоритет: 1 → 2; во время 2 выполняем 3 и 4; затем 5 → 6 → 7 → 8. Домен и донаты не должны задерживать бесплатную пробу на своём iPhone, но должны быть готовы к продвижению.

Official own-device guidance checked 2026-10-24:
- https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices
- https://developer.apple.com/help/account/basics/about-your-developer-account

## Evidence rules

Source/package checks, mocked Capacitor browser tests, Linux WebKit, iOS Simulator, physical iPhone, TestFlight and App Review are distinct evidence levels. Old 2026-08 checklist ticks are historical only. The October source is not proven to compile or run on iOS until a new Xcode/device run exists.

Record tested source SHA and raw logs. Missing native evidence stays BLOCKED. Preserve Android R2–R5 artifacts; this iOS task does not accept or replace historical Android system tests.

## Cost model

Apple lists Developer membership at USD 99/year or local currency where available. Voluntary support is uncertain; do not promise recovery of the fee. At an average net contribution of USD 3, approximately 33 contributions cover USD 99; at USD 5, 20 contributions. These are arithmetic examples after all provider/platform fees, taxes and refunds, not a forecast.

Native tipping, if later implemented, must use a reviewed Apple-compliant flow for the chosen storefronts. The current build has no native monetization or StoreKit purchases.

References verified 2026-10-24:
- https://developer.apple.com/programs/whats-included
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- https://developer.apple.com/news/upcoming-requirements/

## Optional Lite design trial — 24 October 2026

По запросу владельца подготовлен отдельный [Lite web preview](https://145.239.82.124.sslip.io/rsvp/lite.html?lang=ru): книги, спокойное обычное чтение и упрощённый режим по одному слову. EN/RU/ES; проверены размеры iPhone 13 Pro в браузере, портрет/альбом и модели safe area. Библиотека общая с полной веб-версией, установленное приложение 1.0 (2) не заменялось. Lite не включён в native payload и не стал режимом по умолчанию.

Реализация, источники вдохновения, проверки, исправление первого запуска со старым кэшем и ссылка на опубликованный вариант: [LITE_PREVIEW_2026-10-24.md](LITE_PREVIEW_2026-10-24.md). Если владелец выберет Lite для iOS, сначала включить его в согласованный native вариант и выполнить соответствующий Xcode/device QA; затем сверить App Store тексты и скриншоты с финальным интерфейсом. Текущая веб-проба сама по себе эти пункты не закрывает.
