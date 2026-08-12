// Lightweight, dependency-free localisation for the web and native bundles.
(function initialisePaceFlowI18n(global) {
    const messages = {
        en: {
            appName: 'HummingRead',
            appTagline: 'Read in rhythm with Pico',
            heroKicker: 'Meet Pico · your reading wingmate',
            heroTitle: 'Long reads.',
            heroTitleAccent: 'Zero drag.',
            heroHint: 'Pico turns books, articles and pasted text into a calm rhythm that keeps your eyes—and your place—moving forward.',
            nativeHeroHint: 'Pico turns local books, documents and pasted text into a calm rhythm that keeps your eyes—and your place—moving forward.',
            heroPromise: 'No account · books and pasted text stay on this device',
            heroWordBefore: 'keep',
            heroWordFocus: 'your',
            heroWordAfter: 'rhythm',
            picoSignature: 'PICO · FOCUS PILOT',
            flowMapLabel: 'How HummingRead works',
            flowBringTitle: 'Bring the text',
            flowBringHint: 'Paste, import, or send it from Chrome.',
            nativeFlowBringHint: 'Paste text or import a book or document from this device.',
            flowPaceTitle: 'Pick your pace',
            flowPaceHint: 'Pico shapes timing around words and punctuation.',
            flowReadTitle: 'Stay in the flow',
            flowReadHint: 'Read, pause, rewind, and return exactly where you left.',
            dockKicker: "Pico's reading dock",
            dockTitle: 'What are we reading?',
            dockHint: 'Drop text into the main lane, or use a fast lane for a link or Chrome handoff.',
            nativeDockHint: 'Paste text into the reading lane or import a local book or document.',
            pasteSourceTitle: 'Paste or import',
            pasteSourceHint: 'Your text stays readable, editable, and local.',
            fastLanes: 'Fast reading lanes',
            skipToContent: 'Skip to content',
            homeAria: 'HummingRead home',
            bookTitleLabel: 'Book title',
            readingControls: 'Reading controls',
            checkingCache: 'Preparing offline mode…',
            settings: 'Settings',
            textOrBook: 'Start reading',
            textOrBookHint: 'Paste text or import a DRM-free book. Your reading stays on this device.',
            textPlaceholder: 'Paste text here, or import EPUB, FB2, DOCX, TXT, HTML, Markdown or RTF…',
            tryDemoTitle: 'No book ready?',
            tryDemoHint: 'Try the reading flow with a short built-in text. Nothing is added to your library.',
            tryDemo: 'Fly through the 45-second demo',
            importYourBook: 'Import your book',
            continueReading: 'Continue reading',
            continueProgress: '{progress}% complete',
            continueProgressWithTime: '{progress}% complete · approximately {minutes} min left',
            demoBookTitle: 'A quiet reading demo',
            demoReplaceTitle: 'Open the demo?',
            demoReplaceMessage: 'This replaces the current unsaved draft. Books already saved in your library are not changed.',
            demoLoadFailed: 'The built-in demo could not be opened.',
            chromeExtensionTitle: 'Read locally without leaving Chrome',
            chromeExtensionHint: "Selections, pages and pasted text open in the extension's own local RSVP reader. Quick Send to this preview is optional.",
            chromeExtensionDownload: 'Tester build · ZIP',
            chromeStorePending: 'Chrome Web Store · coming after review',
            chromeExtensionInstall: 'Install unpacked for testing',
            chromeExtensionStepOne: 'Download and extract the extension ZIP.',
            chromeExtensionStepTwo: 'Open chrome://extensions and enable Developer mode.',
            chromeExtensionStepThree: 'Choose Load unpacked and select the extracted folder.',
            chromeExtensionPrivacy: 'Standalone reading is local and needs no clipboard, browsing-history or all-sites permission. Quick Send transfers text only after an explicit action.',
            extensionReplaceTitle: 'Open the Chrome import?',
            extensionReplaceMessage: 'The incoming text will replace the current text on screen. Saved library books are not changed.',
            extensionOpen: 'Open in HummingRead',
            extensionSelectionTitle: 'Chrome selection',
            extensionEmptyText: 'The Chrome extension did not send any readable text.',
            extensionImportFailed: 'The Chrome import could not be opened safely.',
            extensionTextImported: 'Saved and opened “{title}” · {count}',
            articleImportTitle: 'Read an article from a link',
            articleImportHint: 'HummingRead sends this URL to its article service, removes page chrome, then stores the returned text locally.',
            articleUrlLabel: 'Article URL',
            articleUrlPlaceholder: 'https://example.com/article',
            importArticle: 'Import article',
            articleOnlineOnly: 'Requires an internet connection. Paywalled and app-only pages may not be readable.',
            importingArticle: 'Importing…',
            articleReplaceTitle: 'Import this article?',
            articleReplaceMessage: 'The current text will be replaced on screen. Anything already saved in your library stays unchanged.',
            articleImported: 'Saved “{title}” · {count}',
            articleInvalidUrl: 'Enter a complete public article link.',
            articlePrivateAddress: 'Local and private network addresses cannot be imported.',
            articleTooLarge: 'This page is too large to import safely.',
            articleNotPage: 'This link does not point to a readable web page.',
            articleUnreadable: 'No readable article text was found. Try pasting the text instead.',
            articleTimeout: 'The website took too long to respond.',
            articleRateLimited: 'Too many article imports. Wait a few minutes and retry.',
            articleDraftChanged: 'The text changed while the article was loading, so it was left untouched. Import the link again when ready.',
            articleImportFailed: 'The article could not be imported. The site may block automated reading; try pasting the text instead.',
            bookNamePlaceholder: 'Book title (optional)',
            importBook: 'Import book',
            productStoryKicker: 'ONE STILL POINT · A QUICKER RHYTHM',
            productStoryTitle: 'A reader that gets out of your way',
            productStoryHint: 'Choose a comfortable pace, pause to recover the sentence around you, and return to the exact saved word.',
            benefitBooksTitle: 'Real books',
            benefitBooksText: 'EPUB, FB2, DOCX, TXT, HTML, Markdown and RTF—without an account.',
            benefitContextTitle: 'Context on pause',
            benefitContextText: 'The surrounding passage returns with the current word visibly anchored.',
            benefitPrivateTitle: 'Surface-specific privacy',
            benefitPrivateText: 'Books, pasted text and progress stay local. The optional web article importer sends only the URL to the article service.',
            nativeBenefitPrivateTitle: 'Private on this device',
            nativeBenefitPrivateText: 'Books, documents, pasted text, bookmarks and reading progress stay in the app’s local storage.',
            appStorePending: 'App Store · pending owner signing and review',
            faqQuestion: 'Does HummingRead promise faster comprehension?',
            faqAnswer: 'No. It controls presentation pace; comprehension varies with the reader, material, language and chosen speed.',
            startReading: 'Open reader',
            saveBook: 'Save to library',
            myLibrary: 'Library',
            libraryTitle: 'Your library',
            searchLibrary: 'Search your library',
            export: 'Export',
            import: 'Import',
            back: 'Back',
            findInBook: 'Find in book',
            previousResult: 'Previous result',
            nextResult: 'Next result',
            bookmark: 'Bookmark',
            bookmarks: 'Bookmarks',
            contents: 'Contents',
            startRsvp: 'Start focus mode',
            decreaseSpeed: 'Decrease speed by 20 words per minute',
            increaseSpeed: 'Increase speed by 20 words per minute',
            addBookmark: 'Add bookmark',
            stopFocusMode: 'Close focus mode',
            pause: 'Pause',
            continue: 'Continue',
            sessionProgress: 'Session 0% · book 0% · 0 min left',
            targetWpmShort: '350 target WPM',
            readingPosition: 'Reading position',
            readingSpeed: 'Reading speed',
            rewindTenWords: 'Rewind 10 words',
            readingPositionValue: '{progress}% · word {current} of {total}',
            appearance: 'Appearance',
            language: 'Language',
            languageHint: 'The app follows your system language when it is Russian or Spanish; you can switch languages here at any time.',
            english: 'English',
            russian: 'Русский',
            spanish: 'Español',
            theme: 'Theme',
            night: 'Night',
            day: 'Day',
            readingRhythm: 'Reading rhythm',
            speedWpm: 'Target speed (WPM)',
            recommendedSpeed: 'A comfortable starting range is 250–400 WPM.',
            focusColour: 'Focus-letter color',
            fontSize: 'Preferred focus font size (px)',
            adaptiveFontHint: 'Long words shrink automatically so they are never clipped.',
            focusOptions: 'Focus options',
            orpAlignment: 'Align by optimal recognition point (ORP)',
            orpAlignmentHint: 'Keeps the coloured focus letter on a fixed visual axis.',
            lengthScaling: 'Give long words more time',
            lengthScalingHint: 'Short words move faster; longer words remain visible longer.',
            shortPairs: 'Pair two short words',
            shortPairsHint: 'At 350+ WPM, pair words when each is 5 letters or fewer.',
            balancedPairs: 'Flexible pairs up to 10 letters total',
            balancedPairsHint: 'Also permits combinations such as 7 + 3 letters. Punctuation still ends a frame.',
            speedRamp: 'Ease into reading over 3 seconds',
            speedRampHint: 'Starts at 70% and reaches the selected rhythm after reading begins.',
            orpMarkers: 'Show focus-axis markers',
            orpMarkersHint: 'Adds subtle guides above and below the focus point.',
            punctuationPauses: 'Punctuation timing',
            commaPause: 'Comma multiplier',
            periodPause: 'Sentence-ending multiplier',
            semicolonPause: 'Semicolon and colon multiplier',
            controls: 'Controls',
            hardwareControls: 'External media controls',
            hardwareControlsHint: 'Uses Media Play/Pause events on compatible web platforms. Space always works in the reader. iOS keeps its volume buttons unchanged.',
            yourData: 'Your data',
            yourDataHint: "Books and reading progress stay on this device. Export a backup or permanently erase the app's local data.",
            aboutPrivacy: 'About and privacy',
            aboutPrivacyHint: 'Review how local data is handled, get support, and check the installed version.',
            privacyPolicy: 'Privacy policy',
            acknowledgements: 'Acknowledgements',
            support: 'Support',
            versionLabel: 'Version 1.0',
            exportBackup: 'Export backup',
            deleteAllData: 'Delete all local data',
            confirmDeleteAllData: 'Permanently delete every local book, bookmark, reading position and setting from HummingRead?',
            deleteAllTitle: 'Delete all local data?',
            deleteBookTitle: 'Delete book?',
            renameBookTitle: 'Rename book',
            bookmarkDialogTitle: 'Add bookmark',
            cancel: 'Cancel',
            confirm: 'Confirm',
            save: 'Save',
            allDataDeleted: 'All local HummingRead data was deleted.',
            deleteAllFailed: 'Local data could not be deleted safely. Nothing was cleared; please retry or reinstall the app.',
            deleteBookFailed: 'This book could not be deleted safely. Nothing was cleared; please retry or reinstall the app.',
            resetSettings: 'Restore defaults',
            addCurrentBookmark: 'Add current position',
            noChapters: 'No chapter markers were found. You can still search the full book.',
            close: 'Close',
            search: 'Search',
            showEarlier: 'Show earlier text',
            showLater: 'Show later text',
            jumpToWord: 'Move reading position to “{word}”',
            localStorageReady: 'Private, local storage is ready.',
            skipDemo: 'Skip guide',
            demoGuidePlayTitle: 'Watch the rhythm settle',
            demoGuidePlayHint: 'Words advance automatically from one steady focal point.',
            demoGuidePauseAction: 'Pause now',
            demoGuidePauseTitle: 'Pause restores the sentence',
            demoGuidePauseHint: 'The current word stays anchored while the surrounding context returns.',
            demoGuideRewindAction: 'Rewind 10 words',
            demoGuideRewindTitle: 'Replay without losing your place',
            demoGuideRewindHint: 'The rewind control moves back exactly ten readable words.',
            demoGuideScrubAction: 'Try exact scrubbing',
            demoGuideFinishTitle: 'Ready for your own text',
            demoGuideFinishHint: 'Import a book, paste text, or keep exploring—the demo is never added to your library.',
            demoGuideImportAction: 'Import your first book',
            indexedDbUnavailable: 'Durable browser storage is unavailable; some features may be limited.',
            actionFailed: 'The action could not be completed.',
            indexedDbUnsupported: 'This browser does not support IndexedDB.',
            indexedDbOpenFailed: 'Could not open IndexedDB.',
            untitled: 'Untitled',
            position: 'Position {index}',
            processingFile: 'Processing {format}…',
            fileProcessed: '{format} ready · {count}',
            fileLoadFailed: 'Could not load {file}: {message}',
            unsupportedFormat: '.{format} is not supported yet.',
            noBookInArchive: 'No FB2 or TXT book was found in this archive.',
            fileReadFailed: 'The file could not be read.',
            zipLoadFailed: 'The archive reader could not be loaded.',
            importSafetyLimit: 'This book exceeds the safe size or complexity limit for this device.',
            noReadableText: 'No readable words were found in this book.',
            draftSaveFailed: 'This draft is too large for available storage. Save or import it as a book before closing the app.',
            invalidDocx: 'The DOCX file does not contain word/document.xml.',
            invalidDocxXml: 'The DOCX file contains invalid XML.',
            emptyDocx: 'No readable text was found in the DOCX file.',
            invalidFb2Xml: 'The FB2/XML file contains invalid XML.',
            emptyFb2: 'No readable text was found in the FB2/XML file.',
            emptyHtml: 'No readable text was found in the HTML file.',
            emptyMarkdown: 'No readable text was found in the Markdown file.',
            emptyRtf: 'No readable text was found in the RTF file.',
            addTextFirst: 'Paste text or import a book first.',
            notFound: 'No matches',
            targetOnly: '{target} target WPM',
            targetActual: '{target} target · {actual} actual WPM',
            targetEstimated: '{target} target · ~{actual} effective WPM',
            decreaseSpeedTitle: 'Decrease speed by 20 ({speed})',
            increaseSpeedTitle: 'Increase speed by 20 ({speed})',
            remaining: '{progress} · {time} left',
            totalTime: '{count} · about {time} total',
            rsvpProgress: 'Session {session}% · book {book}% · {time} left',
            zeroMinutes: '0 min',
            minutes: '{count} min',
            hours: '{count} hr',
            hoursMinutes: '{hours} hr {minutes} min',
            saveTextFirst: 'Import or paste text first.',
            bookUpdated: 'Book updated.',
            bookSaved: 'Book saved to your library.',
            bookNumber: 'Book {count}',
            emptyLibrary: 'Your library is empty. Import a book or save the current text.',
            noLibraryMatches: 'No books match this search.',
            bookMeta: '{words} · {progress}% · {bookmarks}',
            lastRead: 'Last read {date}',
            read: 'Read',
            rename: 'Rename',
            delete: 'Delete',
            bookCount: '{count, plural, one {# book} other {# books}}',
            filteredBookCount: '{filtered} of {total} books',
            bookNotFound: 'Book not found.',
            confirmDeleteBook: 'Remove “{name}” from your library?',
            bookDeleted: 'Book removed.',
            newTitle: 'New title',
            noTextForBookmark: 'There is no text to bookmark.',
            bookmarkName: 'Bookmark name',
            bookmarkAdded: 'Bookmark added.',
            noBookmarks: 'No bookmarks yet.',
            bookmarkMeta: '{progress}% · word {word} · {date}',
            goTo: 'Go to',
            importedBook: '{name} added to your library.',
            invalidLibraryExport: 'This backup does not contain a book list.',
            importedSuffix: 'import',
            importedBooks: '{count} imported.',
            importFailed: 'Import failed: {message}',
            draft: 'Draft',
            shortBookmarks: '{count}',
            libraryButton: 'Library ({count})',
            storageSummary: '{books} · {words} · {storage} · {sync}',
            syncDisabled: 'local only',
            syncOffline: 'sync offline',
            syncing: 'syncing…',
            syncPending: 'sync pending',
            syncedAt: 'synced {date}',
            syncReady: 'sync ready',
            unknown: 'unknown',
            online: 'Online',
            offline: 'Offline',
            localOnly: 'Private · local only',
            localLibrary: 'Library · local on this device',
            epubZipFailed: 'Could not load the bundled EPUB archive reader.',
            epubOpfMissing: 'The EPUB package manifest is missing.',
            epubReadFailed: 'Could not read EPUB: {message}',
            chapterFallback: 'Chapter {count}',
            hardwareUnavailableIos: 'Unavailable in the iOS build. Space still works with a hardware keyboard; volume buttons always control system volume.',
            hardwareEnabled: 'Hardware play/pause controls enabled.',
            hardwareDisabled: 'Hardware play/pause controls disabled.',
            chapterPosition: '{progress}% · word {word}'
        },
        ru: {
            nativeHeroHint: 'Пико превращает локальные книги, документы и вставленный текст в спокойный ритм, который ведёт взгляд и не даёт потерять место.',
            nativeFlowBringHint: 'Вставьте текст или импортируйте книгу либо документ с этого устройства.',
            nativeDockHint: 'Вставьте текст в полосу чтения или импортируйте локальную книгу либо документ.',
            nativeBenefitPrivateTitle: 'Приватно на этом устройстве',
            nativeBenefitPrivateText: 'Книги, документы, вставленный текст, закладки и прогресс остаются в локальном хранилище приложения.',
            appName: 'HummingRead', appTagline: 'Читайте в ритме с Пико', heroKicker: 'Пико · ваш штурман по тексту', heroTitle: 'Длинные тексты.', heroTitleAccent: 'Без пробуксовки.', heroHint: 'Пико превращает книги, статьи и вставленный текст в спокойный ритм, который ведёт взгляд и не даёт потерять место.', heroPromise: 'Без аккаунта · книги и вставленный текст остаются на устройстве', heroWordBefore: 'держи', heroWordFocus: 'свой', heroWordAfter: 'ритм', picoSignature: 'ПИКО · ПИЛОТ ФОКУСА', flowMapLabel: 'Как работает HummingRead', flowBringTitle: 'Добавьте текст', flowBringHint: 'Вставьте, импортируйте или откройте из Chrome.', flowPaceTitle: 'Выберите темп', flowPaceHint: 'Пико подстраивает ритм под слова и пунктуацию.', flowReadTitle: 'Оставайтесь в потоке', flowReadHint: 'Читайте, ставьте на паузу и возвращайтесь точно на место.', dockKicker: 'Читательский док Пико', dockTitle: 'Что будем читать?', dockHint: 'Положите текст в основную полосу или используйте быстрый маршрут для ссылки и Chrome.', pasteSourceTitle: 'Вставить или импортировать', pasteSourceHint: 'Текст остаётся читаемым, редактируемым и локальным.', fastLanes: 'Быстрые маршруты чтения', skipToContent: 'Перейти к содержимому', homeAria: 'На главную HummingRead', bookTitleLabel: 'Название книги', readingControls: 'Управление чтением', checkingCache: 'Подготовка офлайн-режима…',
            settings: 'Настройки', textOrBook: 'Начать чтение', textOrBookHint: 'Вставьте текст или импортируйте книгу без DRM. Всё чтение остаётся на устройстве.',
            textPlaceholder: 'Вставьте текст или импортируйте EPUB, FB2, DOCX, TXT, HTML, Markdown или RTF…', tryDemoTitle: 'Нет книги под рукой?', tryDemoHint: 'Попробуйте чтение на коротком встроенном тексте. Он не добавится в библиотеку.', tryDemo: 'Пролететь демо за 45 секунд', importYourBook: 'Импортировать свою книгу', continueReading: 'Продолжить чтение', continueProgress: 'Прочитано {progress}%', continueProgressWithTime: 'Прочитано {progress}% · осталось примерно {minutes} мин', demoBookTitle: 'Небольшое демо чтения', demoReplaceTitle: 'Открыть демо?', demoReplaceMessage: 'Текущий несохранённый черновик будет заменён. Книги в библиотеке не изменятся.', demoLoadFailed: 'Не удалось открыть встроенное демо.', chromeExtensionTitle: 'Читайте локально, не покидая Chrome', chromeExtensionHint: 'Выделение, страница или вставленный текст открываются в собственной локальной RSVP-читалке расширения. Quick Send в preview необязателен.', chromeExtensionDownload: 'Тестерская сборка · ZIP', chromeStorePending: 'Chrome Web Store · после проверки', chromeExtensionInstall: 'Установить распакованным для тестирования', chromeExtensionStepOne: 'Скачайте ZIP расширения и распакуйте его.', chromeExtensionStepTwo: 'Откройте chrome://extensions и включите режим разработчика.', chromeExtensionStepThree: 'Нажмите «Загрузить распакованное расширение» и выберите папку.', chromeExtensionPrivacy: 'Самостоятельное чтение локально и не требует доступа к буферу, истории или всем сайтам. Quick Send передаёт текст только после явного действия.', extensionReplaceTitle: 'Открыть импорт из Chrome?', extensionReplaceMessage: 'Полученный текст заменит текущий текст на экране. Сохранённые книги не изменятся.', extensionOpen: 'Открыть в HummingRead', extensionSelectionTitle: 'Выделение из Chrome', extensionEmptyText: 'Расширение Chrome не передало читаемый текст.', extensionImportFailed: 'Не удалось безопасно открыть импорт из Chrome.', extensionTextImported: 'Сохранено и открыто «{title}» · {count}', articleImportTitle: 'Прочитать статью по ссылке', articleImportHint: 'HummingRead передаёт эту ссылку сервису статей, убирает элементы страницы и сохраняет возвращённый текст локально.', articleUrlLabel: 'Ссылка на статью', articleUrlPlaceholder: 'https://example.com/article', importArticle: 'Импортировать статью', articleOnlineOnly: 'Нужен интернет. Платные и доступные только внутри приложений страницы могут не открыться.', importingArticle: 'Импортируем…', articleReplaceTitle: 'Импортировать эту статью?', articleReplaceMessage: 'Текущий текст на экране будет заменён. Всё уже сохранённое в библиотеке останется без изменений.', articleImported: 'Сохранено «{title}» · {count}', articleInvalidUrl: 'Введите полную публичную ссылку на статью.', articlePrivateAddress: 'Локальные и приватные сетевые адреса импортировать нельзя.', articleTooLarge: 'Страница слишком велика для безопасного импорта.', articleNotPage: 'По этой ссылке нет читаемой веб-страницы.', articleUnreadable: 'Не удалось найти читаемый текст статьи. Попробуйте вставить текст вручную.', articleTimeout: 'Сайт слишком долго не отвечал.', articleRateLimited: 'Слишком много импортов подряд. Подождите несколько минут и повторите.', articleDraftChanged: 'Пока статья загружалась, текст изменился, поэтому мы его не тронули. Запустите импорт ссылки ещё раз.', articleImportFailed: 'Не удалось импортировать статью. Возможно, сайт блокирует автоматическое чтение — попробуйте вставить текст вручную.', bookNamePlaceholder: 'Название книги (необязательно)',
            importBook: 'Импортировать книгу', startReading: 'Открыть читалку', saveBook: 'Сохранить в библиотеку', myLibrary: 'Библиотека', libraryTitle: 'Ваша библиотека',
            productStoryKicker: 'ОДНА НЕПОДВИЖНАЯ ТОЧКА · БЫСТРЫЙ РИТМ', productStoryTitle: 'Читалка, которая не мешает читать', productStoryHint: 'Выберите комфортный темп, поставьте чтение на паузу ради контекста и вернитесь к точно сохранённому слову.', benefitBooksTitle: 'Настоящие книги', benefitBooksText: 'EPUB, FB2, DOCX, TXT, HTML, Markdown и RTF — без аккаунта.', benefitContextTitle: 'Контекст на паузе', benefitContextText: 'Фрагмент вокруг текущего слова возвращается, а само слово остаётся визуально закреплено.', benefitPrivateTitle: 'Точная приватность для каждой поверхности', benefitPrivateText: 'Книги, вставленный текст и прогресс остаются локально. Необязательный web-импорт статьи передаёт сервису только ссылку.', appStorePending: 'App Store · ожидает подписи владельца и проверки', faqQuestion: 'HummingRead обещает ускорить понимание текста?', faqAnswer: 'Нет. Приложение управляет темпом показа; понимание зависит от читателя, материала, языка и выбранной скорости.',
            searchLibrary: 'Поиск по библиотеке', export: 'Экспорт', import: 'Импорт', back: 'Назад', findInBook: 'Найти в книге', previousResult: 'Предыдущий результат', nextResult: 'Следующий результат',
            bookmark: 'Закладка', bookmarks: 'Закладки', contents: 'Оглавление', startRsvp: 'Включить фокус-режим', decreaseSpeed: 'Уменьшить скорость на 20 слов в минуту', increaseSpeed: 'Увеличить скорость на 20 слов в минуту',
            addBookmark: 'Добавить закладку', stopFocusMode: 'Закрыть фокус-режим', pause: 'Пауза', continue: 'Продолжить', sessionProgress: 'Сеанс 0% · книга 0% · осталось 0 мин', targetWpmShort: 'Цель 350 слов/мин', readingPosition: 'Позиция чтения', readingPositionValue: '{progress}% · слово {current} из {total}', readingSpeed: 'Скорость чтения', rewindTenWords: 'Назад на 10 слов',
            appearance: 'Оформление', language: 'Язык', languageHint: 'Если язык системы русский или испанский, приложение выберет его автоматически; здесь язык всегда можно сменить.', english: 'English', russian: 'Русский', spanish: 'Español', theme: 'Тема', night: 'Ночная', day: 'Дневная',
            readingRhythm: 'Ритм чтения', speedWpm: 'Целевая скорость (слов/мин)', recommendedSpeed: 'Комфортная стартовая скорость — 250–400 слов/мин.', focusColour: 'Цвет фокусной буквы', fontSize: 'Предпочтительный размер фокусного шрифта (px)', adaptiveFontHint: 'Длинные слова автоматически уменьшаются и не обрезаются.',
            focusOptions: 'Фокус-режим', orpAlignment: 'Центрировать по оптимальной точке распознавания (ORP)', orpAlignmentHint: 'Цветная фокусная буква остаётся на постоянной зрительной оси.', lengthScaling: 'Давать длинным словам больше времени', lengthScalingHint: 'Короткие слова сменяются быстрее, длинные видны дольше.',
            shortPairs: 'Объединять два коротких слова', shortPairsHint: 'При скорости от 350 слов/мин объединяет слова, если каждое не длиннее 5 букв.', balancedPairs: 'Гибкие пары до 10 букв в сумме', balancedPairsHint: 'Разрешает сочетания вроде 7 + 3 букв. Пунктуация всё равно завершает кадр.',
            speedRamp: 'Плавный разгон за 3 секунды', speedRampHint: 'После запуска начинает с 70% и выходит на выбранный ритм.', orpMarkers: 'Показывать метки фокусной оси', orpMarkersHint: 'Добавляет деликатные направляющие над и под точкой фокуса.',
            punctuationPauses: 'Паузы на пунктуации', commaPause: 'Множитель запятой', periodPause: 'Множитель конца предложения', semicolonPause: 'Множитель точки с запятой и двоеточия', controls: 'Управление', hardwareControls: 'Внешнее медиауправление', hardwareControlsHint: 'Использует события Play/Pause на совместимых веб-платформах. Пробел в читалке работает всегда. На iOS кнопки громкости не переназначаются.', yourData: 'Ваши данные', yourDataHint: 'Книги и прогресс чтения остаются на этом устройстве. Можно экспортировать резервную копию или навсегда стереть локальные данные приложения.', aboutPrivacy: 'О приложении и приватности', aboutPrivacyHint: 'Узнайте, как обрабатываются локальные данные, обратитесь в поддержку и проверьте версию.', privacyPolicy: 'Политика конфиденциальности', acknowledgements: 'Благодарности и лицензии', support: 'Поддержка', versionLabel: 'Версия 1.0', exportBackup: 'Экспортировать копию', deleteAllData: 'Удалить все локальные данные', confirmDeleteAllData: 'Навсегда удалить из HummingRead все локальные книги, закладки, позиции чтения и настройки?', deleteAllTitle: 'Удалить все локальные данные?', deleteBookTitle: 'Удалить книгу?', renameBookTitle: 'Переименовать книгу', bookmarkDialogTitle: 'Добавить закладку', cancel: 'Отмена', confirm: 'Подтвердить', save: 'Сохранить', allDataDeleted: 'Все локальные данные HummingRead удалены.', deleteAllFailed: 'Не удалось безопасно удалить локальные данные. Ничего не очищено; повторите попытку или переустановите приложение.', deleteBookFailed: 'Не удалось безопасно удалить книгу. Ничего не очищено; повторите попытку или переустановите приложение.', resetSettings: 'Вернуть настройки по умолчанию',
            addCurrentBookmark: 'Добавить текущую позицию', noChapters: 'Метки глав не найдены. Поиск по всей книге всё равно доступен.', close: 'Закрыть', search: 'Поиск', showEarlier: 'Показать предыдущий текст', showLater: 'Показать следующий текст', jumpToWord: 'Переместить позицию чтения на «{word}»',
            localStorageReady: 'Приватное локальное хранилище готово.', skipDemo: 'Пропустить подсказки', demoGuidePlayTitle: 'Посмотрите, как выравнивается ритм', demoGuidePlayHint: 'Слова движутся автоматически вокруг одной неподвижной точки фокуса.', demoGuidePauseAction: 'Поставить на паузу', demoGuidePauseTitle: 'Пауза возвращает предложение', demoGuidePauseHint: 'Текущее слово остаётся закреплено, а вокруг появляется контекст.', demoGuideRewindAction: 'Назад на 10 слов', demoGuideRewindTitle: 'Повтор без потери места', demoGuideRewindHint: 'Кнопка перемотки возвращает ровно десять читаемых слов.', demoGuideScrubAction: 'Попробовать точный переход', demoGuideFinishTitle: 'Теперь ваш текст', demoGuideFinishHint: 'Импортируйте книгу, вставьте текст или продолжайте знакомство — демо не попадёт в библиотеку.', demoGuideImportAction: 'Импортировать первую книгу', indexedDbUnavailable: 'Надёжное хранилище браузера недоступно; часть функций может быть ограничена.', actionFailed: 'Не удалось выполнить действие.', indexedDbUnsupported: 'Этот браузер не поддерживает IndexedDB.', indexedDbOpenFailed: 'Не удалось открыть IndexedDB.', untitled: 'Без названия', position: 'Позиция {index}',
            processingFile: 'Обработка {format}…', fileProcessed: '{format} готов · {count}', fileLoadFailed: 'Не удалось загрузить {file}: {message}', unsupportedFormat: 'Формат .{format} пока не поддерживается.', noBookInArchive: 'В архиве не найдена книга FB2 или TXT.', fileReadFailed: 'Не удалось прочитать файл.', zipLoadFailed: 'Не удалось загрузить обработчик архивов.', importSafetyLimit: 'Книга превышает безопасный для устройства предел размера или сложности.', noReadableText: 'В книге не найдено читаемых слов.', draftSaveFailed: 'Черновик слишком велик для доступного хранилища. Сохраните или импортируйте его как книгу до закрытия приложения.', invalidDocx: 'В DOCX нет word/document.xml.', invalidDocxXml: 'DOCX содержит некорректный XML.', emptyDocx: 'В DOCX не найден читаемый текст.', invalidFb2Xml: 'FB2/XML содержит некорректный XML.', emptyFb2: 'В FB2/XML не найден читаемый текст.', emptyHtml: 'В HTML не найден читаемый текст.', emptyMarkdown: 'В Markdown не найден читаемый текст.', emptyRtf: 'В RTF не найден читаемый текст.',
            addTextFirst: 'Сначала вставьте текст или импортируйте книгу.', notFound: 'Ничего не найдено', targetOnly: 'Цель {target} слов/мин', targetActual: 'Цель {target} · факт {actual} слов/мин', targetEstimated: 'Цель {target} · эффективно ~{actual} слов/мин', decreaseSpeedTitle: 'Уменьшить скорость на 20 ({speed})', increaseSpeedTitle: 'Увеличить скорость на 20 ({speed})', remaining: '{progress} · осталось {time}', totalTime: '{count} · всего около {time}', rsvpProgress: 'Сеанс {session}% · книга {book}% · осталось {time}', zeroMinutes: '0 мин', minutes: '{count} мин', hours: '{count} ч', hoursMinutes: '{hours} ч {minutes} мин',
            saveTextFirst: 'Сначала импортируйте или вставьте текст.', bookUpdated: 'Книга обновлена.', bookSaved: 'Книга сохранена в библиотеку.', bookNumber: 'Книга {count}', emptyLibrary: 'Библиотека пуста. Импортируйте книгу или сохраните текущий текст.', noLibraryMatches: 'По этому запросу книг не найдено.', bookMeta: '{words} · {progress}% · {bookmarks}', lastRead: 'Последнее чтение: {date}', read: 'Читать', rename: 'Переименовать', delete: 'Удалить', bookCount: '{count, plural, one {# книга} few {# книги} many {# книг} other {# книг}}', filteredBookCount: '{filtered} из {total} книг', bookNotFound: 'Книга не найдена.', confirmDeleteBook: 'Удалить «{name}» из библиотеки?', bookDeleted: 'Книга удалена.', newTitle: 'Новое название', noTextForBookmark: 'Нет текста для закладки.', bookmarkName: 'Название закладки', bookmarkAdded: 'Закладка добавлена.', noBookmarks: 'Закладок пока нет.', bookmarkMeta: '{progress}% · слово {word} · {date}', goTo: 'Перейти',
            importedBook: 'Книга «{name}» добавлена в библиотеку.', invalidLibraryExport: 'В резервной копии нет списка книг.', importedSuffix: 'импорт', importedBooks: '{count} импортировано.', importFailed: 'Ошибка импорта: {message}', draft: 'Черновик', shortBookmarks: '{count}', libraryButton: 'Библиотека ({count})', storageSummary: '{books} · {words} · {storage} · {sync}', syncDisabled: 'только локально', syncOffline: 'синхронизация офлайн', syncing: 'синхронизация…', syncPending: 'синхронизация ожидает', syncedAt: 'синхронизировано {date}', syncReady: 'синхронизация готова', unknown: 'неизвестно', online: 'Онлайн', offline: 'Офлайн', localOnly: 'Приватно · только локально',
            localLibrary: 'Библиотека · локально на этом устройстве',
            epubZipFailed: 'Не удалось загрузить встроенный обработчик EPUB.', epubOpfMissing: 'В EPUB отсутствует манифест пакета.', epubReadFailed: 'Не удалось прочитать EPUB: {message}', chapterFallback: 'Глава {count}', hardwareUnavailableIos: 'В сборке для iOS функция недоступна. Пробел работает с аппаратной клавиатурой, а кнопки громкости всегда меняют системную громкость.', hardwareEnabled: 'Внешнее media-управление включено.', hardwareDisabled: 'Внешнее media-управление выключено.', chapterPosition: '{progress}% · слово {word}'
        },
        es: {
            appName: 'HummingRead',
            appTagline: 'Lee a tu ritmo con Pico',
            heroKicker: 'Conoce a Pico · tu copiloto de lectura',
            heroTitle: 'Lecturas largas.',
            heroTitleAccent: 'Sin fricción.',
            heroHint: 'Pico convierte libros, artículos y texto pegado en un ritmo sereno que mantiene tus ojos y tu avance en movimiento.',
            nativeHeroHint: 'Pico convierte libros locales, documentos y texto pegado en un ritmo sereno que mantiene tus ojos y tu avance en movimiento.',
            heroPromise: 'Sin cuenta · los libros y el texto pegado se quedan en este dispositivo',
            heroWordBefore: 'mantén',
            heroWordFocus: 'tu',
            heroWordAfter: 'ritmo',
            picoSignature: 'PICO · PILOTO DE ENFOQUE',
            flowMapLabel: 'Cómo funciona HummingRead',
            flowBringTitle: 'Trae tu texto',
            flowBringHint: 'Pega, importa o envíalo desde Chrome.',
            nativeFlowBringHint: 'Pega texto o importa un libro o documento desde este dispositivo.',
            flowPaceTitle: 'Elige tu ritmo',
            flowPaceHint: 'Pico adapta el tiempo según las palabras y la puntuación.',
            flowReadTitle: 'Permanece en el flujo',
            flowReadHint: 'Lee, pausa, rebobina y vuelve exactamente a donde estabas.',
            dockKicker: 'Panel de lectura de Pico',
            dockTitle: '¿Qué vamos a leer?',
            dockHint: 'Suelta texto en el carril principal o usa un carril rápido para un enlace o transferencia de Chrome.',
            nativeDockHint: 'Pega texto en el carril de lectura o importa un libro o documento local.',
            pasteSourceTitle: 'Pegar o importar',
            pasteSourceHint: 'Tu texto se mantiene legible, editable y local.',
            fastLanes: 'Carriles rápidos de lectura',
            skipToContent: 'Saltar al contenido',
            homeAria: 'Inicio de HummingRead',
            bookTitleLabel: 'Título del libro',
            readingControls: 'Controles de lectura',
            checkingCache: 'Preparando modo sin conexión…',
            settings: 'Ajustes',
            textOrBook: 'Empezar a leer',
            textOrBookHint: 'Pega texto o importa un libro sin DRM. Tu lectura se queda en este dispositivo.',
            textPlaceholder: 'Pega texto aquí o importa EPUB, FB2, DOCX, TXT, HTML, Markdown o RTF…',
            tryDemoTitle: '¿No tienes un libro a mano?',
            tryDemoHint: 'Prueba el flujo de lectura con un breve texto integrado. No se añade nada a tu biblioteca.',
            tryDemo: 'Ver la demostración de 45 segundos',
            importYourBook: 'Importar tu libro',
            continueReading: 'Continuar leyendo',
            continueProgress: '{progress}% completado',
            continueProgressWithTime: '{progress}% completado · aprox. {minutes} min restantes',
            demoBookTitle: 'Una demostración de lectura serena',
            demoReplaceTitle: '¿Abrir la demostración?',
            demoReplaceMessage: 'Esto reemplaza el borrador actual no guardado. Los libros ya guardados en tu biblioteca no cambian.',
            demoLoadFailed: 'No se pudo abrir la demostración integrada.',
            chromeExtensionTitle: 'Lee localmente sin salir de Chrome',
            chromeExtensionHint: 'Las selecciones, páginas y texto pegado se abren en el lector RSVP local de la extensión. El envío rápido a esta vista previa es opcional.',
            chromeExtensionDownload: 'Versión de pruebas · ZIP',
            chromeStorePending: 'Chrome Web Store · disponible tras revisión',
            chromeExtensionInstall: 'Instalar sin empaquetar para pruebas',
            chromeExtensionStepOne: 'Descarga y extrae el archivo ZIP de la extensión.',
            chromeExtensionStepTwo: 'Abre chrome://extensions y activa el modo de desarrollador.',
            chromeExtensionStepThree: 'Selecciona “Cargar descomprimida” y elige la carpeta extraída.',
            chromeExtensionPrivacy: 'La lectura independiente es local y no requiere permisos de portapapeles, historial de navegación ni todos los sitios. El envío rápido transfiere texto solo tras una acción explícita.',
            extensionReplaceTitle: '¿Abrir la importación de Chrome?',
            extensionReplaceMessage: 'El texto entrante reemplazará el texto actual en pantalla. Los libros guardados en la biblioteca no cambian.',
            extensionOpen: 'Abrir en HummingRead',
            extensionSelectionTitle: 'Selección de Chrome',
            extensionEmptyText: 'La extensión de Chrome no envió texto legible.',
            extensionImportFailed: 'No se pudo abrir la importación de Chrome de forma segura.',
            extensionTextImported: 'Guardado y abierto “{title}” · {count}',
            articleImportTitle: 'Leer un artículo desde un enlace',
            articleImportHint: 'HummingRead envía esta URL a su servicio de artículos, elimina los elementos innecesarios de la página y almacena el texto devuelto de forma local.',
            articleUrlLabel: 'URL del artículo',
            articleUrlPlaceholder: 'https://example.com/articulo',
            importArticle: 'Importar artículo',
            articleOnlineOnly: 'Requiere conexión a internet. Es posible que las páginas con muro de pago o exclusivas de aplicaciones no se puedan leer.',
            importingArticle: 'Importando…',
            articleReplaceTitle: '¿Importar este artículo?',
            articleReplaceMessage: 'El texto actual en pantalla se reemplazará. Los elementos guardados en tu biblioteca permanecerán sin cambios.',
            articleImported: 'Guardado “{title}” · {count}',
            articleInvalidUrl: 'Introduce un enlace público completo al artículo.',
            articlePrivateAddress: 'Las direcciones de redes locales o privadas no se pueden importar.',
            articleTooLarge: 'Esta página es demasiado grande para importarla de forma segura.',
            articleNotPage: 'Este enlace no apunta a una página web legible.',
            articleUnreadable: 'No se encontró texto de artículo legible. Intenta pegar el texto manualmente.',
            articleTimeout: 'El sitio web tardó demasiado en responder.',
            articleRateLimited: 'Demasiadas importaciones de artículos. Espera unos minutos e inténtalo de nuevo.',
            articleDraftChanged: 'El texto cambió mientras se cargaba el artículo, por lo que no se modificó. Importa el enlace de nuevo cuando estés listo.',
            articleImportFailed: 'No se pudo importar el artículo. Es posible que el sitio bloquee la lectura automatizada; intenta pegar el texto en su lugar.',
            bookNamePlaceholder: 'Título del libro (opcional)',
            importBook: 'Importar libro',
            productStoryKicker: 'UN PUNTO FIJO · UN RITMO MÁS RÁPIDO',
            productStoryTitle: 'Un lector que no interfiere en tu lectura',
            productStoryHint: 'Elige un ritmo cómodo, pausa para recuperar la frase que te rodea y vuelve a la palabra exacta guardada.',
            benefitBooksTitle: 'Libros reales',
            benefitBooksText: 'EPUB, FB2, DOCX, TXT, HTML, Markdown y RTF, sin necesidad de cuenta.',
            benefitContextTitle: 'Contexto en pausa',
            benefitContextText: 'El pasaje circundante reaparece con la palabra actual fijada de forma visible.',
            benefitPrivateTitle: 'Privacidad específica para cada superficie',
            benefitPrivateText: 'Los libros, el texto pegado y el progreso se quedan en local. El importador web opcional de artículos envía solo la URL al servicio de artículos.',
            nativeBenefitPrivateTitle: 'Privado en este dispositivo',
            nativeBenefitPrivateText: 'Los libros, documentos, texto pegado, marcadores y progreso de lectura permanecen en el almacenamiento local de la aplicación.',
            appStorePending: 'App Store · pendiente de firma del propietario y revisión',
            faqQuestion: '¿HummingRead garantiza una comprensión más rápida?',
            faqAnswer: 'No. Controla el ritmo de presentación; la comprensión varía según el lector, el material, el idioma y la velocidad elegida.',
            startReading: 'Abrir lector',
            saveBook: 'Guardar en la biblioteca',
            myLibrary: 'Biblioteca',
            libraryTitle: 'Tu biblioteca',
            searchLibrary: 'Buscar en tu biblioteca',
            export: 'Exportar',
            import: 'Importar',
            back: 'Volver',
            findInBook: 'Buscar en el libro',
            previousResult: 'Resultado anterior',
            nextResult: 'Resultado siguiente',
            bookmark: 'Marcador',
            bookmarks: 'Marcadores',
            contents: 'Índice',
            startRsvp: 'Iniciar modo enfoque',
            decreaseSpeed: 'Disminuir la velocidad en 20 palabras por minuto',
            increaseSpeed: 'Aumentar la velocidad en 20 palabras por minuto',
            addBookmark: 'Añadir marcador',
            stopFocusMode: 'Cerrar modo enfoque',
            pause: 'Pausar',
            continue: 'Continuar',
            sessionProgress: 'Sesión 0% · libro 0% · 0 min restantes',
            targetWpmShort: 'Objetivo 350 ppm',
            readingPosition: 'Posición de lectura',
            readingSpeed: 'Velocidad de lectura',
            rewindTenWords: 'Rebobinar 10 palabras',
            readingPositionValue: '{progress}% · palabra {current} de {total}',
            appearance: 'Apariencia',
            language: 'Idioma',
            languageHint: 'La aplicación sigue el idioma de tu sistema cuando es español o ruso; puedes cambiar de idioma aquí en cualquier momento.',
            english: 'English',
            russian: 'Русский',
            spanish: 'Español',
            theme: 'Tema',
            night: 'Noche',
            day: 'Día',
            readingRhythm: 'Ritmo de lectura',
            speedWpm: 'Velocidad objetivo (ppm)',
            recommendedSpeed: 'Un rango inicial cómodo es de 250–400 ppm.',
            focusColour: 'Color de la letra de enfoque',
            fontSize: 'Tamaño de fuente de enfoque preferido (px)',
            adaptiveFontHint: 'Las palabras largas se reducen automáticamente para que nunca se corten.',
            focusOptions: 'Opciones de enfoque',
            orpAlignment: 'Alinear por punto óptimo de reconocimiento (ORP)',
            orpAlignmentHint: 'Mantiene la letra de enfoque de color en un eje visual fijo.',
            lengthScaling: 'Dar más tiempo a las palabras largas',
            lengthScalingHint: 'Las palabras cortas avanzan más rápido; las palabras más largas permanecen visibles más tiempo.',
            shortPairs: 'Emparejar dos palabras cortas',
            shortPairsHint: 'A 350+ ppm, empareja palabras si cada una tiene 5 letras o menos.',
            balancedPairs: 'Pares flexibles de hasta 10 letras en total',
            balancedPairsHint: 'Permite combinaciones como 7 + 3 letras. La puntuación sigue finalizando cada fotograma.',
            speedRamp: 'Aceleración gradual durante 3 segundos',
            speedRampHint: 'Empieza al 70% y alcanza el ritmo seleccionado tras comenzar la lectura.',
            orpMarkers: 'Mostrar guías del eje de enfoque',
            orpMarkersHint: 'Añade guías sutiles por encima y por debajo del punto de enfoque.',
            punctuationPauses: 'Pausas por puntuación',
            commaPause: 'Multiplicador de coma',
            periodPause: 'Multiplicador de punto final',
            semicolonPause: 'Multiplicador de punto y coma y dos puntos',
            controls: 'Controles',
            hardwareControls: 'Controles multimedia externos',
            hardwareControlsHint: 'Utiliza eventos de Reproducir/Pausar en plataformas web compatibles. La barra espaciadora siempre funciona en el lector. iOS mantiene sus botones de volumen sin cambios.',
            yourData: 'Tus datos',
            yourDataHint: 'Los libros y el progreso de lectura se quedan en este dispositivo. Exporta una copia de seguridad o elimina permanentemente los datos locales.',
            aboutPrivacy: 'Acerca de y privacidad',
            aboutPrivacyHint: 'Consulta cómo se gestionan los datos locales, obtén soporte y comprueba la versión instalada.',
            privacyPolicy: 'Política de privacidad',
            acknowledgements: 'Agradecimientos y licencias',
            support: 'Soporte',
            versionLabel: 'Versión 1.0',
            exportBackup: 'Exportar copia de seguridad',
            deleteAllData: 'Eliminar todos los datos locales',
            confirmDeleteAllData: '¿Eliminar permanentemente todos los libros locales, marcadores, posiciones de lectura y ajustes de HummingRead?',
            deleteAllTitle: '¿Eliminar todos los datos locales?',
            deleteBookTitle: '¿Eliminar libro?',
            renameBookTitle: 'Renombrar libro',
            bookmarkDialogTitle: 'Añadir marcador',
            cancel: 'Cancelar',
            confirm: 'Confirmar',
            save: 'Guardar',
            allDataDeleted: 'Se eliminaron todos los datos locales de HummingRead.',
            deleteAllFailed: 'No se pudieron eliminar los datos locales de forma segura. No se ha limpiado nada; inténtalo de nuevo o reinstala la aplicación.',
            deleteBookFailed: 'No se pudo eliminar este libro de forma segura. No se ha limpiado nada; inténtalo de nuevo o reinstala la aplicación.',
            resetSettings: 'Restaurar valores predeterminados',
            addCurrentBookmark: 'Añadir posición actual',
            noChapters: 'No se encontraron marcas de capítulos. Aún puedes buscar en todo el libro.',
            close: 'Cerrar',
            search: 'Buscar',
            showEarlier: 'Mostrar texto anterior',
            showLater: 'Mostrar texto posterior',
            jumpToWord: 'Mover posición de lectura a “{word}”',
            localStorageReady: 'El almacenamiento local privado está listo.',
            skipDemo: 'Omitir guía',
            demoGuidePlayTitle: 'Observa cómo se estabiliza el ritmo',
            demoGuidePlayHint: 'Las palabras avanzan automáticamente desde un punto focal estable.',
            demoGuidePauseAction: 'Pausar ahora',
            demoGuidePauseTitle: 'La pausa restaura la frase',
            demoGuidePauseHint: 'La palabra actual permanece anclada mientras regresa el contexto circundante.',
            demoGuideRewindAction: 'Rebobinar 10 palabras',
            demoGuideRewindTitle: 'Repetir sin perder tu posición',
            demoGuideRewindHint: 'El control de rebobinado retrocede exactamente diez palabras legibles.',
            demoGuideScrubAction: 'Probar desplazamiento exacto',
            demoGuideFinishTitle: 'Listo para tu propio texto',
            demoGuideFinishHint: 'Importa un libro, pega texto o sigue explorando: la demostración nunca se añade a tu biblioteca.',
            demoGuideImportAction: 'Importar tu primer libro',
            indexedDbUnavailable: 'El almacenamiento duradero del navegador no está disponible; algunas funciones pueden estar limitadas.',
            actionFailed: 'No se pudo completar la acción.',
            indexedDbUnsupported: 'Este navegador no admite IndexedDB.',
            indexedDbOpenFailed: 'No se pudo abrir IndexedDB.',
            untitled: 'Sin título',
            position: 'Posición {index}',
            processingFile: 'Procesando {format}…',
            fileProcessed: '{format} listo · {count}',
            fileLoadFailed: 'No se pudo cargar {file}: {message}',
            unsupportedFormat: 'El formato .{format} aún no es compatible.',
            noBookInArchive: 'No se encontró ningún libro FB2 o TXT en este archivo.',
            fileReadFailed: 'No se pudo leer el archivo.',
            zipLoadFailed: 'No se pudo cargar el lector de archivos comprimidos.',
            importSafetyLimit: 'Este libro supera el límite de tamaño o complejidad seguro para este dispositivo.',
            noReadableText: 'No se encontraron palabras legibles en este libro.',
            draftSaveFailed: 'Este borrador es demasiado grande para el almacenamiento disponible. Guárdalo o impórtalo como libro antes de cerrar la aplicación.',
            invalidDocx: 'El archivo DOCX no contiene word/document.xml.',
            invalidDocxXml: 'El archivo DOCX contiene XML no válido.',
            emptyDocx: 'No se encontró texto legible en el archivo DOCX.',
            invalidFb2Xml: 'El archivo FB2/XML contiene XML no válido.',
            emptyFb2: 'No se encontró texto legible en el archivo FB2/XML.',
            emptyHtml: 'No se encontró texto legible en el archivo HTML.',
            emptyMarkdown: 'No se encontró texto legible en el archivo Markdown.',
            emptyRtf: 'No se encontró texto legible en el archivo RTF.',
            addTextFirst: 'Pega texto o importa un libro primero.',
            notFound: 'Sin coincidencias',
            targetOnly: '{target} ppm objetivo',
            targetActual: '{target} objetivo · {actual} ppm reales',
            targetEstimated: '{target} objetivo · ~{actual} ppm efectivas',
            decreaseSpeedTitle: 'Disminuir la velocidad en 20 ({speed})',
            increaseSpeedTitle: 'Aumentar la velocidad en 20 ({speed})',
            remaining: '{progress} · {time} restante',
            totalTime: '{count} · aprox. {time} en total',
            rsvpProgress: 'Sesión {session}% · libro {book}% · {time} restante',
            zeroMinutes: '0 min',
            minutes: '{count} min',
            hours: '{count} h',
            hoursMinutes: '{hours} h {minutes} min',
            saveTextFirst: 'Importa o pega texto primero.',
            bookUpdated: 'Libro actualizado.',
            bookSaved: 'Libro guardado en tu biblioteca.',
            bookNumber: 'Libro {count}',
            emptyLibrary: 'Tu biblioteca está vacía. Importa un libro o guarda el texto actual.',
            noLibraryMatches: 'Ningún libro coincide con esta búsqueda.',
            bookMeta: '{words} · {progress}% · {bookmarks}',
            lastRead: 'Última lectura: {date}',
            read: 'Leer',
            rename: 'Renombrar',
            delete: 'Eliminar',
            bookCount: '{count, plural, one {# libro} other {# libros}}',
            filteredBookCount: '{filtered} de {total} libros',
            bookNotFound: 'Libro no encontrado.',
            confirmDeleteBook: '¿Eliminar “{name}” de tu biblioteca?',
            bookDeleted: 'Libro eliminado.',
            newTitle: 'Nuevo título',
            noTextForBookmark: 'No hay texto para añadir un marcador.',
            bookmarkName: 'Nombre del marcador',
            bookmarkAdded: 'Marcador añadido.',
            noBookmarks: 'Aún no hay marcadores.',
            bookmarkMeta: '{progress}% · palabra {word} · {date}',
            goTo: 'Ir a',
            importedBook: '“{name}” añadido a tu biblioteca.',
            invalidLibraryExport: 'Esta copia de seguridad no contiene una lista de libros.',
            importedSuffix: 'importado',
            importedBooks: '{count} importados.',
            importFailed: 'Error al importar: {message}',
            draft: 'Borrador',
            shortBookmarks: '{count}',
            libraryButton: 'Biblioteca ({count})',
            storageSummary: '{books} · {words} · {storage} · {sync}',
            syncDisabled: 'solo local',
            syncOffline: 'sincronización sin conexión',
            syncing: 'sincronizando…',
            syncPending: 'sincronización pendiente',
            syncedAt: 'sincronizado {date}',
            syncReady: 'sincronización lista',
            unknown: 'desconocido',
            online: 'En línea',
            offline: 'Sin conexión',
            localOnly: 'Privado · solo local',
            localLibrary: 'Biblioteca · local en este dispositivo',
            epubZipFailed: 'No se pudo cargar el lector de archivos EPUB integrado.',
            epubOpfMissing: 'Falta el manifiesto del paquete EPUB.',
            epubReadFailed: 'No se pudo leer el EPUB: {message}',
            chapterFallback: 'Capítulo {count}',
            hardwareUnavailableIos: 'No disponible en la versión de iOS. La barra espaciadora sigue funcionando con un teclado físico; los botones de volumen siempre controlan el volumen del sistema.',
            hardwareEnabled: 'Controles multimedia externos activados.',
            hardwareDisabled: 'Controles multimedia externos desactivados.',
            chapterPosition: '{progress}% · palabra {word}'
        }
    };

    function getPluralCategory(count, locale) {
        const localeMap = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };
        const targetLocale = localeMap[locale] || 'en-US';
        try {
            return new Intl.PluralRules(targetLocale).select(count);
        } catch (e) {
            if (locale === 'ru') {
                const abs = Math.abs(count) % 100;
                const last = abs % 10;
                if (abs > 10 && abs < 20) return 'many';
                if (last > 1 && last < 5) return 'few';
                if (last === 1) return 'one';
                return 'many';
            }
            return count === 1 ? 'one' : 'other';
        }
    }

    function interpolate(template, params, locale = 'en') {
        if (typeof template !== 'string') return String(template ?? '');

        let result = '';
        let i = 0;
        while (i < template.length) {
            const start = template.indexOf('{', i);
            if (start === -1) {
                result += template.slice(i);
                break;
            }
            result += template.slice(i, start);

            let depth = 0;
            let end = -1;
            for (let j = start; j < template.length; j++) {
                if (template[j] === '{') depth++;
                else if (template[j] === '}') {
                    depth--;
                    if (depth === 0) {
                        end = j;
                        break;
                    }
                }
            }

            if (end === -1) {
                result += template.slice(start);
                break;
            }

            const block = template.slice(start + 1, end);
            const pluralMatch = block.match(/^([a-zA-Z0-9_]+)\s*,\s*plural\s*,\s*([\s\S]*)$/);
            if (pluralMatch && params) {
                const paramName = pluralMatch[1];
                const rulesStr = pluralMatch[2];
                const count = params[paramName];
                if (count !== undefined && count !== null) {
                    const num = Number(count);
                    const category = getPluralCategory(num, locale);
                    const ruleRegex = /([a-zA-Z0-9_]+)\s*\{([^}]*)\}/g;
                    const rules = {};
                    let m;
                    while ((m = ruleRegex.exec(rulesStr)) !== null) {
                        rules[m[1]] = m[2];
                    }
                    const selectedRule = rules[category] ?? rules.other ?? Object.values(rules)[0] ?? '';
                    const localeMap = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };
                    const formattedCount = new Intl.NumberFormat(localeMap[locale] || 'en-US').format(num);
                    result += selectedRule.replace(/#/g, formattedCount);
                } else {
                    result += '{' + block + '}';
                }
            } else {
                result += '{' + block + '}';
            }

            i = end + 1;
        }

        return result.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
            Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
        ));
    }

    class PaceFlowI18n {
        constructor() {
            const stored = global.localStorage ? global.localStorage.getItem('paceflow_language') : null;
            const browserLanguage = (global.navigator && global.navigator.language || 'en').toLowerCase();
            this.language = this.normalizeLanguage(stored) || this.detectBrowserLanguage(browserLanguage) || 'en';
        }

        normalizeLanguage(lang) {
            if (!lang || typeof lang !== 'string') return null;
            const clean = lang.toLowerCase().trim();
            if (clean === 'en' || clean.startsWith('en-')) return 'en';
            if (clean === 'ru' || clean.startsWith('ru-')) return 'ru';
            if (clean === 'es' || clean.startsWith('es-')) return 'es';
            return null;
        }

        detectBrowserLanguage(browserLang) {
            return this.normalizeLanguage(browserLang);
        }

        getPluralCategory(count, locale = this.language) {
            return getPluralCategory(count, locale);
        }

        pluralize(count, forms, locale = this.language) {
            const category = this.getPluralCategory(count, locale);
            if (Array.isArray(forms)) {
                if (locale === 'ru') {
                    if (category === 'one') return forms[0];
                    if (category === 'few') return forms[1] || forms[0];
                    return forms[2] || forms[1] || forms[0];
                }
                return category === 'one' ? forms[0] : (forms[1] || forms[0]);
            }
            if (forms && typeof forms === 'object') {
                return forms[category] ?? forms.other ?? Object.values(forms)[0] ?? '';
            }
            return String(forms ?? '');
        }

        t(key, params = {}) {
            const template = (messages[this.language] && messages[this.language][key])
                ?? (messages.en && messages.en[key])
                ?? key;
            return interpolate(template, params, this.language);
        }

        setLanguage(language) {
            this.language = this.normalizeLanguage(language) || 'en';
            if (global.localStorage) {
                try {
                    global.localStorage.setItem('paceflow_language', this.language);
                } catch (e) {
                    // Ignore storage quota or security error
                }
            }
            this.apply();
        }

        formatNumber(value) {
            const localeMap = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };
            return new Intl.NumberFormat(localeMap[this.language] || 'en-US').format(value);
        }

        formatDate(value, options) {
            const date = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(date.getTime())) return this.t('unknown');
            const localeMap = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };
            return new Intl.DateTimeFormat(localeMap[this.language] || 'en-US', options || {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(date);
        }

        apply(root = global.document) {
            if (!root) return;
            if (root.documentElement) {
                root.documentElement.lang = this.language;
            }
            root.querySelectorAll?.('[data-i18n]')?.forEach((element) => {
                element.textContent = this.t(element.dataset.i18n);
            });
            root.querySelectorAll?.('[data-i18n-placeholder]')?.forEach((element) => {
                element.setAttribute('placeholder', this.t(element.dataset.i18nPlaceholder));
            });
            root.querySelectorAll?.('[data-i18n-title]')?.forEach((element) => {
                element.setAttribute('title', this.t(element.dataset.i18nTitle));
            });
            root.querySelectorAll?.('[data-i18n-aria]')?.forEach((element) => {
                element.setAttribute('aria-label', this.t(element.dataset.i18nAria));
            });
            root.querySelectorAll?.('[data-language]')?.forEach((element) => {
                element.classList.toggle('active', element.dataset.language === this.language);
                element.setAttribute('aria-pressed', element.dataset.language === this.language ? 'true' : 'false');
            });
        }
    }

    global.PaceFlowI18n = PaceFlowI18n;
    global.paceflowI18n = new PaceFlowI18n();
    global.paceflowT = (key, params) => global.paceflowI18n.t(key, params);
})(window);
