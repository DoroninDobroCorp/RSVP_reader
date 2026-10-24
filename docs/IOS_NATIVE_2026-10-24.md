# HummingRead — нативная сборка и пробная установка, 24 октября 2026

Текущий [план до публикации](IOS_LAUNCH_2026-10-24.md) сохраняет порядок: собственный iPhone бесплатно → испытание и исправления, параллельно домен и донаты → платный Developer → TestFlight → App Store.

## Подтверждено на Mac и физическом iPhone

Исходники и канонические изменения остаются на serverforvovka:/srv/hummingread. По последующему разрешению владельца Mac использован только для Xcode, development signing, установки и native QA. Это дополнение к первоначальному серверному [отчёту](RELEASE_2026-10-24.md), а не переименование Linux/WebKit проверок в iOS QA.

- Проверенный серверный source SHA: cccc259dfc239334f923b110a0d5c098d7acf519. Application/site payload соответствует ранее проверенному 7680a15; промежуточные изменения — конфигурация nginx и документация.
- SHA-256 архива build-only kit: 262c5f6e22a1b69be1637923fab8925e5b9b824817cae994b62a74eeacc3bf14. Перед сборкой и после подписи совпали все 241 payload hash.
- macOS 26.4.1, Apple Silicon, Xcode 26.6 (17F113), iOS SDK 26.5; DEVELOPER_DIR выбран только для процессов сборки.
- SwiftPM: capacitor-swift-pm 8.5.3 и IONFilesystemLib 1.1.2, версии из lock-файлов; шесть локальных Capacitor plugin packages.
- Семь шагов runner завершились exit 0: toolchain, first-launch status, SDK inventory, runtime inventory, dependency resolve, device Release build + Analyze, Simulator Release build + Analyze.
- В обоих compile/Analyze логах есть BUILD SUCCEEDED и ANALYZE SUCCEEDED. Единственное зафиксированное AppIntents предупреждение означает пропуск извлечения metadata при отсутствии зависимости AppIntents.framework; оно не мешает сборке.
- Development-signed Release build для подключённого устройства завершился exit 0 с существующей Personal Team и сертификатом владельца. codesign --verify --deep --strict завершился exit 0.
- Через devicectl приложение установлено и запущено на физическом iPhone 13 Pro / iOS 26.6.1. Наличие HummingRead подтверждено в Xcode Devices; сделан настоящий снимок первого экрана с телефона.
- Версия HummingRead 1.0 (1), bundle ID team.ibet.paceflow сохранён. Предыдущей установки этого приложения на устройстве до текущей операции не было.
- Personal Team profile истекает 31 октября 2026, 19:47:27 UTC. Это бесплатная development-установка, не TestFlight/App Store и не платное Developer enrollment.

Личные device identifiers, provisioning profiles, сертификаты, полный список приложений телефона и signing material не публикуются в Git. Исходный код приложения в этом проходе не менялся.

## Наблюдения в настоящем iOS Simulator

Отдельные чистые HummingRead QA devices используют iOS 26.5. Это настоящий Apple runtime на Mac, а не browser mobile emulation. Симуляторы изолированы от личной библиотеки телефона.

На iPhone 13 Pro Simulator:

- первый экран приложения открыт;
- язык настроек переключён EN → RU → ES → RU, интерфейс и подсказки меняются;
- запущено русское встроенное демо, наблюдались RSVP и контекст на паузе;
- на паузе счётчик показал 16 / 188; после завершения процесса и повторного запуска русский язык и счётчик 16 / 188 сохранились, открылся обычный текст;
- обычный текст и управление просмотрены в альбомной ориентации.

На iPad Pro 13-inch (M5) Simulator / iOS 26.5:

- открыт первый экран и английский демо-текст;
- открыт focus mode, продолжено воспроизведение, наблюдалось продвижение от 16 до 83 / 230 слов;
- ручная пауза вернула контекст и остановила счётчик на 83 / 230;
- экран focus mode просмотрен в портретной и альбомной ориентации; основные элементы управления доступны;
- после остановки/повторной загрузки iPad Simulator и успешного CLI launch в обычном тексте восстановились счётчик 83 / 230 и выделенное слово «at».

Это базовые сценарии на двух Simulator profiles. Все локализации во всех состояниях, VoiceOver, крупный системный текст, Files/backup и настоящий физический iPad ещё не приняты. Симуляторы после проверки остановлены.

## Что ещё проверить до выпуска

Это базовая native проверка и установка для личного испытания. Полное физическое iPhone/iPad QA не заявляется.

- Найден неблокирующий дефект: на iPhone 13 Pro portrait открыть Settings → Русский / Español → Reading font; последний вариант Rounded («Скругленный» / «Redondeada») теснится/обрезается в строке из четырёх вариантов. Исправить на сервере и перепроверить перед магазином.
- Все рекламируемые форматы через настоящий Files picker, большие книги, реальный export/share/import backup, прерывание операций, удаления с Cancel/Confirm, полный VoiceOver и Dynamic Type ещё требуют приёмки.
- Сохранение счётчика на одном демо не доказывает отсутствие потерь для всех книг/сценариев.
- Владелец пользуется приложением 3–5 дней и сообщает воспроизводимые ошибки до покупки membership.
- TestFlight, App Store archive/upload, App Review, постоянный домен и работающие донаты остаются открытыми пунктами плана.

## Где сохранена проверка

На сервере: /srv/hummingread/artifacts/ios-step1-20261024/mac-native-cccc259/. Экспортированы фактические build/Analyze/sign/installation logs, summary и снимки симуляторов; CHECKSUMS.sha256 проверен после переноса. В текстовом экспорте явно заменены hardware/team/certificate IDs и пути личного build host. Полные оригинальные логи, xcresult bundles, provisioning, signed app и снимки физического телефона остаются на личном Mac; они не добавляются в Git.

Первый CLI launch нового iPad Simulator не вернул process handle (NSPOSIXErrorDomain 3). Этот сбой сохранён в sim-ipad-boot.log; приложение затем открыто через native Simulator UI, где выполнены описанные сценарии. Не представлять этот первый CLI запуск как PASS. Повторная загрузка того же Simulator и CLI launch затем завершились exit 0; лог sim-ipad-warm-relaunch.log сохранён отдельно. Это не замер скорости старта и не дополнительная приёмка всех данных iPad. После проверки убрана только ошибочная дублирующая регистрация iOS runtime с сохранением Apple asset; CoreSimulator обновлён, iOS 26.5 снова доступен.

## Повторная установка после истечения бесплатной подписи

На Mac сохранён checksummed build-only kit и results. До запуска проверить его BUILD_KIT_MANIFEST.json, подключить и разблокировать iPhone. В Xcode открыть ios/App/App.xcodeproj из этого kit, выбрать App, своё устройство и существующую Personal Team в Signing & Capabilities; Product → Run обновит development profile/сборку. Существующий bundle ID сохранить, приложение не удалять ради продления — удаление стирает контейнер данных. Перед изменением идентичности или очисткой нужен проверенный экспорт библиотеки.

Уже выполненная CLI-последовательность для автоматизации: xcodebuild Release с DEVELOPMENT_TEAM существующей Personal Team, CODE_SIGN_IDENTITY=Apple Development, CODE_SIGN_STYLE=Automatic, -allowProvisioningUpdates и -allowProvisioningDeviceRegistration; затем devicectl device install app и devicectl device process launch. Team/device IDs остаются только на личном build host. Пароли/документы вводит владелец в штатном интерфейсе Apple.

Официальные правила бесплатной установки и подписи проверены 24 октября 2026:
- [Apple: Personal Team, 7 дней и ограничения](https://developer.apple.com/help/account/basics/about-your-developer-account).
- [Apple: запуск на физических устройствах и code signing](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices).
