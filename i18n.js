// Lightweight, dependency-free localisation for the web and native bundles.
(function initialisePaceFlowI18n(global) {
    const messages = {
        en: {
            appName: 'PaceFlow Reader',
            appTagline: 'Focused reading, at your rhythm',
            skipToContent: 'Skip to content',
            homeAria: 'PaceFlow Reader home',
            bookTitleLabel: 'Book title',
            readingControls: 'Reading controls',
            checkingCache: 'Preparing offline mode…',
            settings: 'Settings',
            textOrBook: 'Start reading',
            textOrBookHint: 'Paste text or import a DRM-free book. Your reading stays on this device.',
            textPlaceholder: 'Paste text here, or import EPUB, FB2, DOCX, TXT, HTML, Markdown or RTF…',
            tryDemoTitle: 'No book ready?',
            tryDemoHint: 'Try the reading flow with a short built-in text. Nothing is added to your library.',
            tryDemo: 'Try the 45-second demo',
            demoBookTitle: 'A quiet reading demo',
            demoReplaceTitle: 'Open the demo?',
            demoReplaceMessage: 'This replaces the current unsaved draft. Books already saved in your library are not changed.',
            demoLoadFailed: 'The built-in demo could not be opened.',
            bookNamePlaceholder: 'Book title (optional)',
            importBook: 'Import book',
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
            readingPositionValue: '{progress}% · word {current} of {total}',
            appearance: 'Appearance',
            language: 'Language',
            languageHint: 'The app follows your system language when it is Russian; you can switch languages here at any time.',
            english: 'English',
            russian: 'Русский',
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
            support: 'Support',
            versionLabel: 'Version 1.0',
            exportBackup: 'Export backup',
            deleteAllData: 'Delete all local data',
            confirmDeleteAllData: 'Permanently delete every local book, bookmark, reading position and setting from PaceFlow Reader?',
            deleteAllTitle: 'Delete all local data?',
            deleteBookTitle: 'Delete book?',
            renameBookTitle: 'Rename book',
            bookmarkDialogTitle: 'Add bookmark',
            cancel: 'Cancel',
            confirm: 'Confirm',
            save: 'Save',
            allDataDeleted: 'All local PaceFlow Reader data was deleted.',
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
            appName: 'PaceFlow Reader', appTagline: 'Сосредоточенное чтение в вашем ритме', skipToContent: 'Перейти к содержимому', homeAria: 'На главную PaceFlow Reader', bookTitleLabel: 'Название книги', readingControls: 'Управление чтением', checkingCache: 'Подготовка офлайн-режима…',
            settings: 'Настройки', textOrBook: 'Начать чтение', textOrBookHint: 'Вставьте текст или импортируйте книгу без DRM. Всё чтение остаётся на устройстве.',
            textPlaceholder: 'Вставьте текст или импортируйте EPUB, FB2, DOCX, TXT, HTML, Markdown или RTF…', tryDemoTitle: 'Нет книги под рукой?', tryDemoHint: 'Попробуйте чтение на коротком встроенном тексте. Он не добавится в библиотеку.', tryDemo: 'Запустить демо на 45 секунд', demoBookTitle: 'Небольшое демо чтения', demoReplaceTitle: 'Открыть демо?', demoReplaceMessage: 'Текущий несохранённый черновик будет заменён. Книги в библиотеке не изменятся.', demoLoadFailed: 'Не удалось открыть встроенное демо.', bookNamePlaceholder: 'Название книги (необязательно)',
            importBook: 'Импортировать книгу', startReading: 'Открыть читалку', saveBook: 'Сохранить в библиотеку', myLibrary: 'Библиотека', libraryTitle: 'Ваша библиотека',
            searchLibrary: 'Поиск по библиотеке', export: 'Экспорт', import: 'Импорт', back: 'Назад', findInBook: 'Найти в книге', previousResult: 'Предыдущий результат', nextResult: 'Следующий результат',
            bookmark: 'Закладка', bookmarks: 'Закладки', contents: 'Оглавление', startRsvp: 'Включить фокус-режим', decreaseSpeed: 'Уменьшить скорость на 20 слов в минуту', increaseSpeed: 'Увеличить скорость на 20 слов в минуту',
            addBookmark: 'Добавить закладку', stopFocusMode: 'Закрыть фокус-режим', pause: 'Пауза', continue: 'Продолжить', sessionProgress: 'Сеанс 0% · книга 0% · осталось 0 мин', targetWpmShort: 'Цель 350 слов/мин', readingPosition: 'Позиция чтения', readingPositionValue: '{progress}% · слово {current} из {total}',
            appearance: 'Оформление', language: 'Язык', languageHint: 'Если язык системы русский, приложение выберет его автоматически; здесь язык всегда можно сменить.', english: 'English', russian: 'Русский', theme: 'Тема', night: 'Ночная', day: 'Дневная',
            readingRhythm: 'Ритм чтения', speedWpm: 'Целевая скорость (слов/мин)', recommendedSpeed: 'Комфортная стартовая скорость — 250–400 слов/мин.', focusColour: 'Цвет фокусной буквы', fontSize: 'Предпочтительный размер фокусного шрифта (px)', adaptiveFontHint: 'Длинные слова автоматически уменьшаются и не обрезаются.',
            focusOptions: 'Фокус-режим', orpAlignment: 'Центрировать по оптимальной точке распознавания (ORP)', orpAlignmentHint: 'Цветная фокусная буква остаётся на постоянной зрительной оси.', lengthScaling: 'Давать длинным словам больше времени', lengthScalingHint: 'Короткие слова сменяются быстрее, длинные видны дольше.',
            shortPairs: 'Объединять два коротких слова', shortPairsHint: 'При скорости от 350 слов/мин объединяет слова, если каждое не длиннее 5 букв.', balancedPairs: 'Гибкие пары до 10 букв в сумме', balancedPairsHint: 'Разрешает сочетания вроде 7 + 3 букв. Пунктуация всё равно завершает кадр.',
            speedRamp: 'Плавный разгон за 3 секунды', speedRampHint: 'После запуска начинает с 70% и выходит на выбранный ритм.', orpMarkers: 'Показывать метки фокусной оси', orpMarkersHint: 'Добавляет деликатные направляющие над и под точкой фокуса.',
            punctuationPauses: 'Паузы на пунктуации', commaPause: 'Множитель запятой', periodPause: 'Множитель конца предложения', semicolonPause: 'Множитель точки с запятой и двоеточия', controls: 'Управление', hardwareControls: 'Внешнее медиауправление', hardwareControlsHint: 'Использует события Play/Pause на совместимых веб-платформах. Пробел в читалке работает всегда. На iOS кнопки громкости не переназначаются.', yourData: 'Ваши данные', yourDataHint: 'Книги и прогресс чтения остаются на этом устройстве. Можно экспортировать резервную копию или навсегда стереть локальные данные приложения.', aboutPrivacy: 'О приложении и приватности', aboutPrivacyHint: 'Узнайте, как обрабатываются локальные данные, обратитесь в поддержку и проверьте версию.', privacyPolicy: 'Политика конфиденциальности', support: 'Поддержка', versionLabel: 'Версия 1.0', exportBackup: 'Экспортировать копию', deleteAllData: 'Удалить все локальные данные', confirmDeleteAllData: 'Навсегда удалить из PaceFlow Reader все локальные книги, закладки, позиции чтения и настройки?', deleteAllTitle: 'Удалить все локальные данные?', deleteBookTitle: 'Удалить книгу?', renameBookTitle: 'Переименовать книгу', bookmarkDialogTitle: 'Добавить закладку', cancel: 'Отмена', confirm: 'Подтвердить', save: 'Сохранить', allDataDeleted: 'Все локальные данные PaceFlow Reader удалены.', deleteAllFailed: 'Не удалось безопасно удалить локальные данные. Ничего не очищено; повторите попытку или переустановите приложение.', deleteBookFailed: 'Не удалось безопасно удалить книгу. Ничего не очищено; повторите попытку или переустановите приложение.', resetSettings: 'Вернуть настройки по умолчанию',
            addCurrentBookmark: 'Добавить текущую позицию', noChapters: 'Метки глав не найдены. Поиск по всей книге всё равно доступен.', close: 'Закрыть', search: 'Поиск', showEarlier: 'Показать предыдущий текст', showLater: 'Показать следующий текст', jumpToWord: 'Переместить позицию чтения на «{word}»',
            localStorageReady: 'Приватное локальное хранилище готово.', indexedDbUnavailable: 'Надёжное хранилище браузера недоступно; часть функций может быть ограничена.', actionFailed: 'Не удалось выполнить действие.', indexedDbUnsupported: 'Этот браузер не поддерживает IndexedDB.', indexedDbOpenFailed: 'Не удалось открыть IndexedDB.', untitled: 'Без названия', position: 'Позиция {index}',
            processingFile: 'Обработка {format}…', fileProcessed: '{format} готов · {count}', fileLoadFailed: 'Не удалось загрузить {file}: {message}', unsupportedFormat: 'Формат .{format} пока не поддерживается.', noBookInArchive: 'В архиве не найдена книга FB2 или TXT.', fileReadFailed: 'Не удалось прочитать файл.', zipLoadFailed: 'Не удалось загрузить обработчик архивов.', importSafetyLimit: 'Книга превышает безопасный для устройства предел размера или сложности.', noReadableText: 'В книге не найдено читаемых слов.', draftSaveFailed: 'Черновик слишком велик для доступного хранилища. Сохраните или импортируйте его как книгу до закрытия приложения.', invalidDocx: 'В DOCX нет word/document.xml.', invalidDocxXml: 'DOCX содержит некорректный XML.', emptyDocx: 'В DOCX не найден читаемый текст.', invalidFb2Xml: 'FB2/XML содержит некорректный XML.', emptyFb2: 'В FB2/XML не найден читаемый текст.', emptyHtml: 'В HTML не найден читаемый текст.', emptyMarkdown: 'В Markdown не найден читаемый текст.', emptyRtf: 'В RTF не найден читаемый текст.',
            addTextFirst: 'Сначала вставьте текст или импортируйте книгу.', notFound: 'Ничего не найдено', targetOnly: 'Цель {target} слов/мин', targetActual: 'Цель {target} · факт {actual} слов/мин', targetEstimated: 'Цель {target} · эффективно ~{actual} слов/мин', decreaseSpeedTitle: 'Уменьшить скорость на 20 ({speed})', increaseSpeedTitle: 'Увеличить скорость на 20 ({speed})', remaining: '{progress} · осталось {time}', totalTime: '{count} · всего около {time}', rsvpProgress: 'Сеанс {session}% · книга {book}% · осталось {time}', zeroMinutes: '0 мин', minutes: '{count} мин', hours: '{count} ч', hoursMinutes: '{hours} ч {minutes} мин',
            saveTextFirst: 'Сначала импортируйте или вставьте текст.', bookUpdated: 'Книга обновлена.', bookSaved: 'Книга сохранена в библиотеку.', bookNumber: 'Книга {count}', emptyLibrary: 'Библиотека пуста. Импортируйте книгу или сохраните текущий текст.', noLibraryMatches: 'По этому запросу книг не найдено.', bookMeta: '{words} · {progress}% · {bookmarks}', lastRead: 'Последнее чтение: {date}', read: 'Читать', rename: 'Переименовать', delete: 'Удалить', bookCount: '{count} книг', filteredBookCount: '{filtered} из {total} книг', bookNotFound: 'Книга не найдена.', confirmDeleteBook: 'Удалить «{name}» из библиотеки?', bookDeleted: 'Книга удалена.', newTitle: 'Новое название', noTextForBookmark: 'Нет текста для закладки.', bookmarkName: 'Название закладки', bookmarkAdded: 'Закладка добавлена.', noBookmarks: 'Закладок пока нет.', bookmarkMeta: '{progress}% · слово {word} · {date}', goTo: 'Перейти',
            importedBook: 'Книга «{name}» добавлена в библиотеку.', invalidLibraryExport: 'В резервной копии нет списка книг.', importedSuffix: 'импорт', importedBooks: 'Импортировано: {count}.', importFailed: 'Ошибка импорта: {message}', draft: 'Черновик', shortBookmarks: '{count}', libraryButton: 'Библиотека ({count})', storageSummary: '{books} · {words} · {storage} · {sync}', syncDisabled: 'только локально', syncOffline: 'синхронизация офлайн', syncing: 'синхронизация…', syncPending: 'синхронизация ожидает', syncedAt: 'синхронизировано {date}', syncReady: 'синхронизация готова', unknown: 'неизвестно', online: 'Онлайн', offline: 'Офлайн', localOnly: 'Приватно · только локально',
            epubZipFailed: 'Не удалось загрузить встроенный обработчик EPUB.', epubOpfMissing: 'В EPUB отсутствует манифест пакета.', epubReadFailed: 'Не удалось прочитать EPUB: {message}', chapterFallback: 'Глава {count}', hardwareUnavailableIos: 'В сборке для iOS функция недоступна. Пробел работает с аппаратной клавиатурой, а кнопки громкости всегда меняют системную громкость.', hardwareEnabled: 'Внешнее media-управление включено.', hardwareDisabled: 'Внешнее media-управление выключено.', chapterPosition: '{progress}% · слово {word}'
        }
    };

    function interpolate(template, params) {
        return String(template).replace(/\{([a-zA-Z]+)\}/g, (match, key) => (
            Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
        ));
    }

    class PaceFlowI18n {
        constructor() {
            const stored = global.localStorage ? global.localStorage.getItem('paceflow_language') : null;
            const browserLanguage = (global.navigator && global.navigator.language || 'en').toLowerCase();
            this.language = stored === 'ru' || stored === 'en' ? stored : (browserLanguage.startsWith('ru') ? 'ru' : 'en');
        }

        t(key, params = {}) {
            const template = messages[this.language][key] ?? messages.en[key] ?? key;
            return interpolate(template, params);
        }

        setLanguage(language) {
            this.language = language === 'ru' ? 'ru' : 'en';
            global.localStorage?.setItem('paceflow_language', this.language);
            this.apply();
        }

        formatNumber(value) {
            return new Intl.NumberFormat(this.language === 'ru' ? 'ru-RU' : 'en-US').format(value);
        }

        formatDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return this.t('unknown');
            return new Intl.DateTimeFormat(this.language === 'ru' ? 'ru-RU' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(date);
        }

        apply(root = global.document) {
            if (!root) return;
            root.documentElement.lang = this.language;
            root.querySelectorAll('[data-i18n]').forEach((element) => {
                element.textContent = this.t(element.dataset.i18n);
            });
            root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
                element.setAttribute('placeholder', this.t(element.dataset.i18nPlaceholder));
            });
            root.querySelectorAll('[data-i18n-title]').forEach((element) => {
                element.setAttribute('title', this.t(element.dataset.i18nTitle));
            });
            root.querySelectorAll('[data-i18n-aria]').forEach((element) => {
                element.setAttribute('aria-label', this.t(element.dataset.i18nAria));
            });
            root.querySelectorAll('[data-language]').forEach((element) => {
                element.classList.toggle('active', element.dataset.language === this.language);
                element.setAttribute('aria-pressed', element.dataset.language === this.language ? 'true' : 'false');
            });
        }
    }

    global.PaceFlowI18n = PaceFlowI18n;
    global.paceflowI18n = new PaceFlowI18n();
    global.paceflowT = (key, params) => global.paceflowI18n.t(key, params);
})(window);
