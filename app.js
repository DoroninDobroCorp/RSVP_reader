// RSVP Reader Application with offline-first library storage.
class RSVPReader {
    constructor() {
        this.dbName = 'rsvp-reader-db';
        this.dbVersion = 1;
        this.db = null;
        this.storageMode = 'indexeddb';

        this.words = [];
        this.wordSpans = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.timer = null;
        this.clearTimer = null;
        this.mode = 'input';
        this.currentBookId = null;
        this.currentBookName = '';
        this.bookmarksModalBookId = null;
        this.lastHighlightedIndex = null;
        this.savePositionTimer = null;
        this.draftSaveTimer = null;
        this.suppressTextInputChange = false;
        this.lastBottomTapTime = 0;
        this.lastBottomTapType = '';
        this.wordPaintToken = 0;
        this.wakeLock = null;
        this.syncClientId = this.loadOrCreateSyncClientId();
        this.syncEndpoint = this.resolveSyncEndpoint();
        this.syncTimer = null;
        this.isSyncing = false;
        this.isApplyingRemote = false;
        this.syncRetryDelay = 5000;
        this.deletedBooks = {};
        this.settingsUpdatedAt = localStorage.getItem('rsvp_settings_updated_at') || new Date().toISOString();

        this.touchState = {
            lastTapTime: 0,
            isInCooldown: false,
            cooldownTimer: null,
            lastAction: null,
            lastActionTime: 0
        };

        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.library = [];
        this.libraryFilter = '';

        this.settings = {
            settingsVersion: 2,
            wpm: 250,
            commaPause: 1.05,
            periodPause: 1.75,
            semicolonPause: 1.4,
            focusLetterColor: '#ff6b6b',
            fontSize: 35
        };

        this.initElements();
        this.loadSettings();
        this.updateSpeedControls();
        this.attachEventListeners();
        this.updateOnlineStatus();
        this.registerServiceWorker();

        this.ready = this.bootstrap().then(() => {
            this.syncSoon(800);
        });
    }

    initElements() {
        this.textInputSection = document.getElementById('textInputSection');
        this.normalReadingSection = document.getElementById('normalReadingSection');
        this.rsvpReadingSection = document.getElementById('rsvpReadingSection');
        this.librarySection = document.getElementById('librarySection');

        this.textInput = document.getElementById('textInput');
        this.fileInput = document.getElementById('fileInput');
        this.loadFileBtn = document.getElementById('loadFileBtn');
        this.startReadingBtn = document.getElementById('startReadingBtn');
        this.addToLibraryBtn = document.getElementById('addToLibraryBtn');
        this.libraryBtn = document.getElementById('libraryBtn');
        this.bookNameInput = document.getElementById('bookNameInput');

        this.booksList = document.getElementById('booksList');
        this.librarySummary = document.getElementById('librarySummary');
        this.librarySearchInput = document.getElementById('librarySearchInput');
        this.exportLibraryBtn = document.getElementById('exportLibraryBtn');
        this.importLibraryBtn = document.getElementById('importLibraryBtn');
        this.libraryImportInput = document.getElementById('libraryImportInput');
        this.backFromLibraryBtn = document.getElementById('backFromLibraryBtn');

        this.normalTextDisplay = document.getElementById('normalTextDisplay');
        this.backToInputBtn = document.getElementById('backToInputBtn');
        this.startRSVPBtn = document.getElementById('startRSVPBtn');
        this.addBookmarkBtn = document.getElementById('addBookmarkBtn');
        this.bookmarksBtn = document.getElementById('bookmarksBtn');
        this.progressText = document.getElementById('progressText');
        this.wordCount = document.getElementById('wordCount');
        this.currentBookInfo = document.getElementById('currentBookInfo');

        this.searchInput = document.getElementById('searchInput');
        this.searchPrevBtn = document.getElementById('searchPrevBtn');
        this.searchNextBtn = document.getElementById('searchNextBtn');
        this.searchResults = document.getElementById('searchResults');

        this.rsvpWordDisplay = document.getElementById('rsvpWordDisplay');
        this.rsvpPauseContext = document.getElementById('rsvpPauseContext');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevWordBtn = document.getElementById('prevWordBtn');
        this.nextWordBtn = document.getElementById('nextWordBtn');
        this.rsvpBookmarkBtn = document.getElementById('rsvpBookmarkBtn');
        this.stopRSVPBtn = document.getElementById('stopRSVPBtn');
        this.rsvpProgressBar = document.getElementById('rsvpProgressFill');
        this.rsvpProgressText = document.getElementById('rsvpProgressText');
        this.rsvpWordCount = document.getElementById('rsvpWordCount');
        this.rsvpSpeedText = document.getElementById('rsvpSpeedText');
        this.rsvpBottomTapZone = document.getElementById('rsvpBottomTapZone');
        this.rsvpBottomTapIcon = document.getElementById('rsvpBottomTapIcon');
        this.rsvpBottomTapLabel = document.getElementById('rsvpBottomTapLabel');

        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.wpmInput = document.getElementById('wpmInput');
        this.commaPauseInput = document.getElementById('commaPause');
        this.periodPauseInput = document.getElementById('periodPause');
        this.semicolonPauseInput = document.getElementById('semicolonPause');
        this.focusLetterColorInput = document.getElementById('focusLetterColor');
        this.fontSizeInput = document.getElementById('fontSizeInput');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');

        this.bookmarksModal = document.getElementById('bookmarksModal');
        this.closeBookmarksBtn = document.getElementById('closeBookmarksBtn');
        this.saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
        this.bookmarksList = document.getElementById('bookmarksList');

        this.offlineBadge = document.getElementById('offlineBadge');
        this.storageStatus = document.getElementById('storageStatus');
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        this.loadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (event) => this.runAsync(() => this.handleFileUpload(event)));

        this.addToLibraryBtn.addEventListener('click', () => this.runAsync(() => this.saveCurrentTextAsBook()));
        this.libraryBtn.addEventListener('click', () => this.runAsync(() => this.showLibrary()));
        this.backFromLibraryBtn.addEventListener('click', () => this.backToInput());
        this.exportLibraryBtn.addEventListener('click', () => this.runAsync(() => this.exportLibrary()));
        this.importLibraryBtn.addEventListener('click', () => this.libraryImportInput.click());
        this.libraryImportInput.addEventListener('change', (event) => this.runAsync(() => this.importLibrary(event)));
        this.librarySearchInput.addEventListener('input', () => {
            this.libraryFilter = this.librarySearchInput.value.trim().toLowerCase();
            this.renderLibrary();
        });

        this.startReadingBtn.addEventListener('click', () => this.runAsync(() => this.startNormalReading()));
        this.backToInputBtn.addEventListener('click', () => this.backToInput());
        this.startRSVPBtn.addEventListener('click', () => this.startRSVP());

        this.addBookmarkBtn.addEventListener('click', () => this.runAsync(() => this.addBookmarkAtCurrentPosition()));
        this.bookmarksBtn.addEventListener('click', () => this.runAsync(() => this.openBookmarksForCurrentBook()));
        this.rsvpBookmarkBtn.addEventListener('click', () => this.runAsync(() => this.addBookmarkAtCurrentPosition()));

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.rsvpBottomTapZone.addEventListener('click', (event) => this.handleBottomTap(event));
        if (window.PointerEvent) {
            this.rsvpBottomTapZone.addEventListener('pointerup', (event) => this.handleBottomTap(event));
        } else {
            this.rsvpBottomTapZone.addEventListener('touchend', (event) => this.handleBottomTap(event), { passive: false });
        }
        this.prevWordBtn.addEventListener('click', () => this.adjustSpeed(-20));
        this.nextWordBtn.addEventListener('click', () => this.adjustSpeed(20));
        this.stopRSVPBtn.addEventListener('click', () => this.stopRSVP());

        this.normalReadingSection.addEventListener('dblclick', (event) => {
            if (!this.isButtonOrControl(event.target)) {
                this.handleDoubleTapAction('start');
            }
        });
        this.rsvpReadingSection.addEventListener('dblclick', (event) => {
            if (!this.isButtonOrControl(event.target)) {
                this.handleDoubleTapAction('stop');
            }
        });

        this.setupDoubleTap(this.normalReadingSection, 'start');
        this.setupDoubleTap(this.rsvpReadingSection, 'stop');

        const controlButtons = [
            this.playPauseBtn,
            this.rsvpBottomTapZone,
            this.prevWordBtn,
            this.nextWordBtn,
            this.rsvpBookmarkBtn,
            this.stopRSVPBtn
        ];

        controlButtons.forEach((button) => {
            button.addEventListener('dblclick', (event) => event.stopPropagation());
            button.addEventListener('touchend', (event) => event.stopPropagation(), { passive: true });
        });

        document.addEventListener('keydown', (event) => this.handleKeyboard(event));

        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (event) => {
            if (event.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        [this.wpmInput, this.commaPauseInput, this.periodPauseInput, this.semicolonPauseInput, this.focusLetterColorInput, this.fontSizeInput]
            .forEach((input) => {
                input.addEventListener('input', () => this.updateSettings());
                input.addEventListener('change', () => this.updateSettings());
            });

        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());

        this.textInput.addEventListener('input', () => this.handleTextInputChanged());
        this.bookNameInput.addEventListener('input', () => this.saveDraftSoon());

        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.searchNextBtn.addEventListener('click', () => this.goToNextMatch());
        this.searchPrevBtn.addEventListener('click', () => this.goToPrevMatch());
        this.searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.shiftKey ? this.goToPrevMatch() : this.goToNextMatch();
            }
        });

        this.closeBookmarksBtn.addEventListener('click', () => this.closeBookmarks());
        this.bookmarksModal.addEventListener('click', (event) => {
            if (event.target === this.bookmarksModal) {
                this.closeBookmarks();
            }
        });
        this.saveBookmarkBtn.addEventListener('click', () => this.runAsync(() => this.addBookmarkAtCurrentPosition()));

        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            this.syncSoon(0);
        });
        window.addEventListener('offline', () => this.updateOnlineStatus());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flushPendingSaves();
                this.releaseWakeLock();
            } else if (this.isPlaying) {
                this.requestWakeLock();
            }
        });
    }

    async bootstrap() {
        try {
            this.db = await this.openDatabase();
            await this.migrateLegacyData();
            await this.loadSyncMetadata();
            await this.loadDraft();
            await this.loadLibrary();
            this.updateStorageStatus();
        } catch (error) {
            console.error('IndexedDB unavailable, falling back to localStorage:', error);
            this.storageMode = 'localstorage';
            this.loadLegacyText();
            this.loadLegacyLibrary();
            await this.loadSyncMetadata();
            this.updateStorageStatus();
            this.showToast('IndexedDB недоступна, часть функций будет ограничена.', 'error');
        }
    }

    runAsync(task) {
        Promise.resolve(task()).catch((error) => {
            console.error(error);
            this.showToast(error.message || 'Не удалось выполнить действие.', 'error');
        });
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB не поддерживается этим браузером'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains('books')) {
                    const books = db.createObjectStore('books', { keyPath: 'id' });
                    books.createIndex('lastRead', 'lastRead');
                    books.createIndex('name', 'name');
                }

                if (!db.objectStoreNames.contains('kv')) {
                    db.createObjectStore('kv', { keyPath: 'key' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Не удалось открыть IndexedDB'));
        });
    }

    requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getStore(storeName, mode = 'readonly') {
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async getKV(key) {
        if (!this.db) return null;
        const result = await this.requestToPromise(this.getStore('kv').get(key));
        return result ? result.value : null;
    }

    async setKV(key, value) {
        if (!this.db) return;
        await this.requestToPromise(this.getStore('kv', 'readwrite').put({
            key,
            value,
            updatedAt: Date.now()
        }));
    }

    loadOrCreateSyncClientId() {
        const saved = localStorage.getItem('rsvp_sync_client_id');
        if (saved) return saved;

        const clientId = this.createId();
        localStorage.setItem('rsvp_sync_client_id', clientId);
        return clientId;
    }

    resolveSyncEndpoint() {
        const basePath = window.location.pathname.startsWith('/rsvp/') ? '/rsvp' : '';
        return `${basePath}/api/sync`;
    }

    async loadSyncMetadata() {
        const savedDeleted = this.storageMode === 'localstorage'
            ? localStorage.getItem('rsvp_deleted_books')
            : await this.getKV('deletedBooks');

        try {
            const parsed = typeof savedDeleted === 'string' ? JSON.parse(savedDeleted) : savedDeleted;
            this.deletedBooks = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            console.warn('Failed to load sync deletion tombstones:', error);
            this.deletedBooks = {};
        }

        const storedSettingsUpdatedAt = this.storageMode === 'localstorage'
            ? localStorage.getItem('rsvp_settings_updated_at')
            : await this.getKV('settingsUpdatedAt');
        if (storedSettingsUpdatedAt) {
            this.settingsUpdatedAt = storedSettingsUpdatedAt;
            localStorage.setItem('rsvp_settings_updated_at', storedSettingsUpdatedAt);
        }
    }

    async persistSyncMetadata() {
        localStorage.setItem('rsvp_deleted_books', JSON.stringify(this.deletedBooks));
        localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);

        if (this.storageMode !== 'localstorage' && this.db) {
            await this.setKV('deletedBooks', this.deletedBooks);
            await this.setKV('settingsUpdatedAt', this.settingsUpdatedAt);
        }
    }

    async getAllBooks() {
        if (!this.db) return [];
        const books = await this.requestToPromise(this.getStore('books').getAll());
        return books.map((book) => this.normalizeBook(book)).sort((a, b) => {
            return new Date(b.lastRead || b.dateAdded).getTime() - new Date(a.lastRead || a.dateAdded).getTime();
        });
    }

    async getBook(bookId) {
        if (!bookId) return null;

        if (this.storageMode === 'localstorage') {
            const book = this.library.find((item) => item.id === String(bookId));
            return book ? this.normalizeBook(book) : null;
        }

        if (!this.db) return null;
        const book = await this.requestToPromise(this.getStore('books').get(String(bookId)));
        return book ? this.normalizeBook(book) : null;
    }

    async putBook(book) {
        const normalized = this.normalizeBook(book);
        delete this.deletedBooks[normalized.id];

        if (this.storageMode === 'localstorage') {
            const index = this.library.findIndex((item) => item.id === normalized.id);
            if (index >= 0) {
                this.library[index] = normalized;
            } else {
                this.library.push(normalized);
            }
            localStorage.setItem('rsvp_library', JSON.stringify(this.library));
            if (!this.isApplyingRemote) {
                await this.persistSyncMetadata();
                this.markSyncPending();
            }
            return normalized;
        }

        await this.requestToPromise(this.getStore('books', 'readwrite').put(normalized));
        if (!this.isApplyingRemote) {
            await this.persistSyncMetadata();
            this.markSyncPending();
        }
        return normalized;
    }

    async deleteBookFromStorage(bookId) {
        if (!this.isApplyingRemote) {
            this.deletedBooks[String(bookId)] = new Date().toISOString();
            await this.persistSyncMetadata();
            this.markSyncPending();
        }

        if (this.storageMode === 'localstorage') {
            this.library = this.library.filter((book) => book.id !== String(bookId));
            localStorage.setItem('rsvp_library', JSON.stringify(this.library));
            return;
        }

        await this.requestToPromise(this.getStore('books', 'readwrite').delete(String(bookId)));
    }

    async migrateLegacyData() {
        const migrated = await this.getKV('legacyMigrated');
        if (migrated) return;

        const savedLibrary = localStorage.getItem('rsvp_library');
        if (savedLibrary) {
            try {
                const legacyBooks = JSON.parse(savedLibrary);
                if (Array.isArray(legacyBooks)) {
                    for (const legacyBook of legacyBooks) {
                        await this.putBook(this.normalizeBook(legacyBook));
                    }
                }
            } catch (error) {
                console.warn('Failed to migrate legacy library:', error);
            }
        }

        const legacyText = localStorage.getItem('rsvp_text');
        const legacyBookmark = parseInt(localStorage.getItem('rsvp_bookmark') || '0', 10);
        if (legacyText) {
            await this.setKV('draft', {
                text: legacyText,
                bookName: '',
                currentBookId: null,
                currentIndex: Number.isFinite(legacyBookmark) ? legacyBookmark : 0
            });
        }

        await this.setKV('legacyMigrated', true);
    }

    async loadDraft() {
        const draft = await this.getKV('draft');
        if (draft && typeof draft.text === 'string') {
            this.setTextInputValue(draft.text);
            this.bookNameInput.value = draft.bookName || '';
            this.currentBookId = draft.currentBookId || null;
            this.currentBookName = draft.bookName || '';
            this.currentIndex = this.clampIndex(parseInt(draft.currentIndex || 0, 10), this.parseText(draft.text).length);
            localStorage.setItem('rsvp_text', draft.text);
            localStorage.setItem('rsvp_bookmark', String(this.currentIndex));
            return;
        }

        this.loadLegacyText();
    }

    loadLegacyText() {
        const saved = localStorage.getItem('rsvp_text');
        if (saved) {
            this.setTextInputValue(saved);
        }
        const savedIndex = parseInt(localStorage.getItem('rsvp_bookmark') || '0', 10);
        this.currentIndex = Number.isFinite(savedIndex) ? savedIndex : 0;
    }

    async loadLibrary() {
        if (this.storageMode === 'localstorage') {
            this.loadLegacyLibrary();
        } else {
            this.library = await this.getAllBooks();
        }
        this.updateLibraryButton();
        this.updateStorageStatus();
    }

    loadLegacyLibrary() {
        const saved = localStorage.getItem('rsvp_library');
        if (!saved) {
            this.library = [];
            return;
        }

        try {
            const parsed = JSON.parse(saved);
            this.library = Array.isArray(parsed) ? parsed.map((book) => this.normalizeBook(book)) : [];
        } catch (error) {
            console.error('Failed to load library:', error);
            this.library = [];
        }
    }

    saveDraftSoon() {
        clearTimeout(this.draftSaveTimer);
        this.draftSaveTimer = setTimeout(() => this.runAsync(() => this.saveDraft()), 250);
    }

    async saveDraft(options = {}) {
        const draft = {
            text: this.textInput.value,
            bookName: this.bookNameInput.value.trim(),
            currentBookId: this.currentBookId,
            currentIndex: this.currentIndex,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('rsvp_text', draft.text);
        localStorage.setItem('rsvp_bookmark', String(this.currentIndex));

        if (this.storageMode !== 'localstorage') {
            await this.setKV('draft', draft);
        }

        if (!options.skipSync && !this.isApplyingRemote) {
            this.markSyncPending();
        }
    }

    flushPendingSaves() {
        if (this.draftSaveTimer) {
            clearTimeout(this.draftSaveTimer);
            this.draftSaveTimer = null;
            this.runAsync(() => this.saveDraft());
        }

        if (this.savePositionTimer) {
            clearTimeout(this.savePositionTimer);
            this.savePositionTimer = null;
            this.runAsync(() => this.persistReadingPosition());
        }
    }

    setTextInputValue(value) {
        this.suppressTextInputChange = true;
        this.textInput.value = value;
        this.suppressTextInputChange = false;
    }

    handleTextInputChanged() {
        if (!this.suppressTextInputChange) {
            this.currentBookId = null;
            this.currentBookName = '';
            this.currentIndex = 0;
        }
        this.saveDraftSoon();
    }

    normalizeBook(book) {
        const text = typeof book.text === 'string' ? book.text : '';
        const wordCount = this.parseText(text).length || parseInt(book.wordCount || 0, 10) || 0;
        const now = new Date().toISOString();
        const id = String(book.id || this.createId());
        const currentIndex = this.clampIndex(parseInt(book.currentIndex || 0, 10), wordCount);
        const bookmarks = Array.isArray(book.bookmarks)
            ? book.bookmarks.map((bookmark) => this.normalizeBookmark(bookmark, wordCount))
            : [];

        return {
            id,
            name: (book.name || 'Без названия').trim() || 'Без названия',
            text,
            wordCount,
            currentIndex,
            bookmarks,
            fileName: book.fileName || '',
            sourceType: book.sourceType || 'text',
            dateAdded: this.toIsoDate(book.dateAdded) || now,
            lastRead: this.toIsoDate(book.lastRead) || now,
            updatedAt: this.toIsoDate(book.updatedAt) || now
        };
    }

    normalizeBookmark(bookmark, wordCount) {
        const index = this.clampIndex(parseInt(bookmark.index || 0, 10), wordCount);
        return {
            id: String(bookmark.id || this.createId()),
            name: (bookmark.name || `Позиция ${index + 1}`).trim(),
            index,
            excerpt: bookmark.excerpt || '',
            createdAt: this.toIsoDate(bookmark.createdAt) || new Date().toISOString()
        };
    }

    toIsoDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    createId() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    clampIndex(index, wordCount = this.words.length) {
        if (!Number.isFinite(index) || index < 0) return 0;
        if (wordCount <= 0) return 0;
        return Math.min(index, wordCount - 1);
    }

    parseText(text) {
        return text.trim().split(/\s+/).filter((word) => word.length > 0);
    }

    isButtonOrControl(element) {
        const interactive = element.closest('button, input, textarea, select, a, .book-btn, .bookmark-btn');
        return Boolean(interactive);
    }

    setupDoubleTap(element, action) {
        let lastTapTime = 0;
        let tapResetTimer = null;
        const doubleTapWindowMs = 420;

        element.addEventListener('touchend', (event) => {
            if (this.isButtonOrControl(event.target)) return;

            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - lastTapTime;
            clearTimeout(tapResetTimer);

            if (timeSinceLastTap > 0 && timeSinceLastTap <= doubleTapWindowMs) {
                event.preventDefault();
                lastTapTime = 0;
                this.handleDoubleTapAction(action);
            } else {
                lastTapTime = currentTime;
                tapResetTimer = setTimeout(() => {
                    lastTapTime = 0;
                }, doubleTapWindowMs);
            }
        }, { passive: false });
    }

    handleDoubleTapAction(action) {
        const now = Date.now();
        if (this.touchState.lastAction === action && now - this.touchState.lastActionTime < 120) {
            return;
        }

        this.touchState.lastAction = action;
        this.touchState.lastActionTime = now;

        if (action === 'start') {
            this.startRSVP();
        } else if (action === 'stop') {
            this.stopRSVP();
        }
    }

    async handleFileUpload(event) {
        await this.ready;

        const file = event.target.files[0];
        if (!file) return;

        const fileName = file.name;
        const extension = this.getFileExtension(file.name);
        this.currentBookId = null;
        this.currentBookName = '';
        this.currentIndex = 0;
        this.bookNameInput.value = this.nameFromFile(file.name);

        try {
            this.setTextInputValue(`Загрузка и обработка ${extension.toUpperCase()} файла...`);
            const text = await this.extractTextFromFile(file, extension);
            this.setTextInputValue(text);
            this.showToast(`${extension.toUpperCase()} обработан: ${this.parseText(text).length.toLocaleString('ru-RU')} слов.`);

            await this.saveDraft();
        } catch (error) {
            this.setTextInputValue('');
            throw new Error(`Ошибка при загрузке ${fileName}: ${error.message}`);
        } finally {
            event.target.value = '';
        }
    }

    getFileExtension(fileName) {
        const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
        return match ? match[1] : 'txt';
    }

    async extractTextFromFile(file, extension) {
        switch (extension) {
            case 'epub':
                return new EPUBParser().parse(file);
            case 'docx':
                return this.extractTextFromDocx(file);
            case 'fb2':
            case 'xml':
                return this.extractTextFromFB2(await this.readTextFile(file));
            case 'html':
            case 'htm':
                return this.extractTextFromHTMLDocument(await this.readTextFile(file));
            case 'md':
            case 'markdown':
                return this.extractTextFromMarkdown(await this.readTextFile(file));
            case 'rtf':
                return this.extractTextFromRTF(await this.readArrayBuffer(file));
            case 'txt':
                return this.readTextFile(file);
            default:
                throw new Error(`Формат .${extension} пока не поддерживается`);
        }
    }

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
            reader.readAsText(file);
        });
    }

    readArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл'));
            reader.readAsArrayBuffer(file);
        });
    }

    async loadZipLibrary() {
        if (window.JSZip) return window.JSZip;

        await new EPUBParser().loadJSZip();
        if (!window.JSZip) {
            throw new Error('Не удалось загрузить JSZip');
        }
        return window.JSZip;
    }

    async extractTextFromDocx(file) {
        const JSZip = await this.loadZipLibrary();
        const zip = await JSZip.loadAsync(file);
        const documentFile = zip.file('word/document.xml');

        if (!documentFile) {
            throw new Error('В DOCX не найден word/document.xml');
        }

        const xml = await documentFile.async('string');
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error('DOCX содержит некорректный XML');
        }

        const paragraphs = Array.from(doc.getElementsByTagName('w:p'))
            .map((paragraph) => this.extractDocxParagraphText(paragraph))
            .map((text) => text.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        if (paragraphs.length === 0) {
            throw new Error('В DOCX не найден текст');
        }

        return paragraphs.join('\n\n');
    }

    extractDocxParagraphText(paragraph) {
        const parts = [];
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;

        while (node) {
            if (node.localName === 't') {
                parts.push(node.textContent || '');
            } else if (node.localName === 'tab') {
                parts.push('\t');
            } else if (node.localName === 'br' || node.localName === 'cr') {
                parts.push('\n');
            }
            node = walker.nextNode();
        }

        return parts.join('');
    }

    extractTextFromFB2(xmlText) {
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error('FB2/XML содержит некорректный XML');
        }

        doc.querySelectorAll('binary, stylesheet').forEach((element) => element.remove());

        const body = doc.querySelector('body') || doc.documentElement;
        const blocks = Array.from(body.querySelectorAll('title, subtitle, p, v, text-author'))
            .map((element) => element.textContent.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        if (blocks.length === 0) {
            throw new Error('В FB2/XML не найден текст');
        }

        return blocks.join('\n\n');
    }

    extractTextFromHTMLDocument(htmlText) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        doc.querySelectorAll('script, style, noscript, svg, img, nav, header, footer').forEach((element) => element.remove());

        const body = doc.body || doc.documentElement;
        const blocks = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre'))
            .map((element) => element.textContent.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        const text = blocks.length > 0
            ? blocks.join('\n\n')
            : body.textContent.replace(/\s+/g, ' ').trim();

        if (!text) {
            throw new Error('В HTML не найден текст');
        }

        return text;
    }

    extractTextFromMarkdown(markdownText) {
        const text = markdownText
            .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, '').replace(/```/g, ''))
            .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
            .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/^\s{0,3}[-*+]\s+/gm, '')
            .replace(/^\s{0,3}>\s?/gm, '')
            .replace(/[*_~`]+/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!text) {
            throw new Error('В Markdown не найден текст');
        }

        return text;
    }

    extractTextFromRTF(arrayBuffer) {
        const source = new TextDecoder('latin1').decode(arrayBuffer);
        let text = '';
        let skipGroupDepth = 0;
        let groupDepth = 0;

        for (let index = 0; index < source.length; index++) {
            const char = source[index];

            if (char === '{') {
                groupDepth++;
                if (source[index + 1] === '\\' && source[index + 2] === '*') {
                    skipGroupDepth = groupDepth;
                }
                continue;
            }

            if (char === '}') {
                if (skipGroupDepth === groupDepth) {
                    skipGroupDepth = 0;
                }
                groupDepth = Math.max(groupDepth - 1, 0);
                continue;
            }

            if (skipGroupDepth) continue;

            if (char === '\\') {
                const next = source[index + 1];

                if (next === "'") {
                    const hex = source.slice(index + 2, index + 4);
                    const byte = parseInt(hex, 16);
                    if (Number.isFinite(byte)) {
                        text += new TextDecoder('windows-1251').decode(new Uint8Array([byte]));
                        index += 3;
                    }
                    continue;
                }

                const match = source.slice(index + 1).match(/^([a-zA-Z]+)(-?\d+)? ?/);
                if (match) {
                    const control = match[1];
                    if (['par', 'line'].includes(control)) text += '\n\n';
                    if (control === 'tab') text += '\t';
                    index += match[0].length;
                    continue;
                }

                if (['\\', '{', '}'].includes(next)) {
                    text += next;
                    index++;
                }
                continue;
            }

            if (char !== '\r') {
                text += char;
            }
        }

        const cleaned = text
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!cleaned) {
            throw new Error('В RTF не найден текст');
        }

        return cleaned;
    }

    nameFromFile(fileName) {
        return fileName.replace(/\.(txt|epub|fb2|xml|docx|html|htm|md|markdown|rtf)$/i, '').replace(/[_-]+/g, ' ').trim();
    }

    async startNormalReading() {
        await this.ready;

        const text = this.textInput.value.trim();
        if (!text) {
            this.showToast('Сначала добавьте текст или загрузите книгу.', 'error');
            return;
        }

        this.words = this.parseText(text);
        this.currentIndex = await this.resolveStartIndex();
        this.mode = 'normal';
        this.renderNormalText();
        this.updateProgress();
        this.updateCurrentBookInfo();
        this.showSection('normal');
        await this.saveDraft();
        this.schedulePositionSave();
    }

    async resolveStartIndex() {
        if (this.currentBookId) {
            const book = await this.getBook(this.currentBookId);
            if (book) {
                this.currentBookName = book.name;
                return this.clampIndex(book.currentIndex, this.words.length);
            }
        }

        const draft = this.storageMode === 'localstorage' ? null : await this.getKV('draft');
        const storedIndex = draft ? draft.currentIndex : localStorage.getItem('rsvp_bookmark');
        return this.clampIndex(parseInt(storedIndex || this.currentIndex || 0, 10), this.words.length);
    }

    renderNormalText() {
        this.normalTextDisplay.innerHTML = '';
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.searchResults.textContent = '';
        this.searchPrevBtn.disabled = true;
        this.searchNextBtn.disabled = true;
        this.wordSpans = [];

        const fragment = document.createDocumentFragment();
        const paragraphs = this.textInput.value.split(/\n\s*\n/);
        let wordIndex = 0;

        paragraphs.forEach((pText) => {
            const trimmedP = pText.trim();
            if (!trimmedP) return;

            const pWords = trimmedP.split(/\s+/).filter((w) => w.length > 0);
            if (pWords.length === 0) return;

            const pElement = document.createElement('p');
            pElement.className = 'paragraph';

            pWords.forEach((word) => {
                const span = document.createElement('span');
                span.textContent = `${word} `;
                span.dataset.index = wordIndex;

                if (wordIndex === this.currentIndex) {
                    span.classList.add('current-word');
                    this.lastHighlightedIndex = wordIndex;
                }

                const idx = wordIndex;
                span.addEventListener('click', () => {
                    this.setCurrentWordIndex(idx);
                });

                pElement.appendChild(span);
                this.wordSpans.push(span);
                wordIndex++;
            });

            fragment.appendChild(pElement);
        });

        this.normalTextDisplay.appendChild(fragment);

        requestAnimationFrame(() => {
            this.scrollCurrentWordIntoView(false);
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim().toLowerCase();

        this.clearSearchHighlights();
        this.searchMatches = [];
        this.currentMatchIndex = -1;

        if (query.length < 2) {
            this.searchResults.textContent = '';
            this.searchPrevBtn.disabled = true;
            this.searchNextBtn.disabled = true;
            return;
        }

        this.words.forEach((word, index) => {
            if (word.toLowerCase().includes(query)) {
                this.searchMatches.push(index);
            }
        });

        if (this.searchMatches.length > 0) {
            this.currentMatchIndex = 0;
            this.highlightMatches();
            this.goToMatch(0);
            this.searchPrevBtn.disabled = false;
            this.searchNextBtn.disabled = false;
        } else {
            this.searchResults.textContent = 'Не найдено';
            this.searchPrevBtn.disabled = true;
            this.searchNextBtn.disabled = true;
        }
    }

    clearSearchHighlights() {
        this.normalTextDisplay.querySelectorAll('.search-match, .search-current').forEach((element) => {
            element.classList.remove('search-match', 'search-current');
        });
    }

    highlightMatches() {
        this.searchMatches.forEach((index) => {
            const span = this.wordSpans[index];
            if (span) {
                span.classList.add('search-match');
            }
        });
    }

    goToNextMatch() {
        if (this.searchMatches.length === 0) return;
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
        this.goToMatch(this.currentMatchIndex);
    }

    goToPrevMatch() {
        if (this.searchMatches.length === 0) return;
        this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
        this.goToMatch(this.currentMatchIndex);
    }

    goToMatch(matchIndex) {
        const wordIndex = this.searchMatches[matchIndex];

        this.normalTextDisplay.querySelectorAll('.search-current').forEach((element) => {
            element.classList.remove('search-current');
        });

        const span = this.wordSpans[wordIndex];
        if (span) {
            span.classList.add('search-current');
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        this.searchResults.textContent = `${matchIndex + 1} / ${this.searchMatches.length}`;
        this.setCurrentWordIndex(wordIndex, { scroll: false });
    }

    setCurrentWordIndex(index, options = {}) {
        if (index < 0 || index >= this.words.length) return;

        this.currentIndex = index;
        this.updateCurrentWordHighlight();
        this.updateProgress();
        this.schedulePositionSave();

        if (options.scroll !== false) {
            this.scrollCurrentWordIntoView(true);
        }
    }

    updateCurrentWordHighlight() {
        if (this.lastHighlightedIndex !== null) {
            const previous = this.wordSpans[this.lastHighlightedIndex];
            if (previous) previous.classList.remove('current-word');
        }

        const current = this.wordSpans[this.currentIndex];
        if (current) current.classList.add('current-word');
        this.lastHighlightedIndex = this.currentIndex;
    }

    scrollCurrentWordIntoView(smooth = true) {
        const current = this.wordSpans[this.currentIndex];
        if (current) {
            current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
        }
    }

    startRSVP() {
        if (this.words.length === 0) {
            const text = this.textInput.value.trim();
            if (!text) {
                this.showToast('Сначала добавьте текст.', 'error');
                return;
            }
            this.words = this.parseText(text);
            this.currentIndex = this.clampIndex(this.currentIndex, this.words.length);
        }

        this.mode = "rsvp";
        this.showSection("rsvp");
        this.isPlaying = false;
        this.displayCurrentWord();
        this.updatePlaybackControls();
        this.schedulePositionSave();
    }

    stopRSVP() {
        this.pause();
        this.mode = 'normal';
        this.renderNormalText();
        this.showSection('normal');
        this.updateCurrentBookInfo();
        this.schedulePositionSave();
    }

    togglePlayPause() {
        this.isPlaying ? this.pause() : this.play();
    }

    handleBottomTap(event) {
        event.preventDefault();
        event.stopPropagation();

        const now = Date.now();
        const elapsed = now - this.lastBottomTapTime;

        if (event.type === 'click' && this.lastBottomTapType !== 'click' && elapsed < 500) {
            return;
        }

        this.lastBottomTapTime = now;
        this.lastBottomTapType = event.type;
        this.togglePlayPause();
    }

    play() {
        if (this.currentIndex >= this.words.length - 1) {
            this.currentIndex = this.words.length > 1 ? this.currentIndex : 0;
        }

        this.isPlaying = true;
        this.updatePlaybackControls();
        this.requestWakeLock();
        if (this.words.length > 0 && !this.rsvpWordDisplay.firstChild) {
            this.displayCurrentWord();
        }
        this.scheduleNextWord();
    }

    pause() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.clearTimer) {
            clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }
        if (this.mode === 'rsvp' && this.words.length > 0 && !this.rsvpWordDisplay.firstChild) {
            this.displayCurrentWord();
        }
        this.updatePlaybackControls();
        this.runAsync(() => this.persistReadingPosition());
        this.releaseWakeLock();
    }

    updatePlaybackControls() {
        const icon = this.isPlaying ? '⏸️' : '▶️';
        const label = this.isPlaying ? 'Пауза' : 'Продолжить';

        this.playPauseBtn.textContent = icon;

        if (this.rsvpBottomTapZone) {
            this.rsvpBottomTapZone.setAttribute('aria-label', label);
            this.rsvpBottomTapIcon.textContent = icon;
            this.rsvpBottomTapLabel.textContent = label;
            this.rsvpBottomTapZone.classList.toggle('paused', !this.isPlaying);
        }

        this.updatePauseContext();
        this.updateSpeedControls();
    }

    updatePauseContext() {
        if (!this.rsvpPauseContext) return;

        const shouldShow = this.mode === 'rsvp' && !this.isPlaying && this.words.length > 0;
        this.rsvpPauseContext.classList.toggle('is-visible', shouldShow);
        this.rsvpPauseContext.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        this.rsvpPauseContext.replaceChildren();

        if (!shouldShow) return;

        const wordsBefore = 18;
        const wordsAfter = 8;
        const start = Math.max(0, this.currentIndex - wordsBefore);
        const end = Math.min(this.words.length, this.currentIndex + wordsAfter + 1);

        if (start > 0) {
            this.rsvpPauseContext.appendChild(this.createPauseContextToken('...', 'pause-context-edge'));
        }

        for (let index = start; index < end; index++) {
            const className = index === this.currentIndex ? 'pause-context-current' : '';
            this.rsvpPauseContext.appendChild(this.createPauseContextToken(this.words[index], className));
        }

        if (end < this.words.length) {
            this.rsvpPauseContext.appendChild(this.createPauseContextToken('...', 'pause-context-edge'));
        }

        this.rsvpPauseContext.setAttribute('aria-label', this.words.slice(start, end).join(' '));
    }

    createPauseContextToken(text, className = '') {
        const token = document.createElement('span');
        token.textContent = text;
        if (className) token.className = className;
        return token;
    }

    adjustSpeed(delta) {
        const nextWpm = this.numberInRange(this.settings.wpm + delta, 100, 1000, 250);
        if (nextWpm === this.settings.wpm) {
            this.updateSpeedControls();
            return;
        }

        this.settings.wpm = nextWpm;
        if (this.wpmInput) {
            this.wpmInput.value = this.settings.wpm;
        }

        this.saveSettings();
        this.updateSpeedControls();

        if (this.mode === 'rsvp') {
            if (!this.rsvpWordDisplay.firstChild) {
                this.displayCurrentWord();
            }
            if (this.isPlaying) this.scheduleNextWord();
            this.updateProgress();
        } else if (this.mode === 'normal') {
            this.updateProgress();
        }
    }

    updateSpeedControls() {
        const wpmText = `${Math.round(this.settings.wpm)} слов/мин`;

        if (this.rsvpSpeedText) {
            this.rsvpSpeedText.textContent = wpmText;
        }

        if (this.prevWordBtn) {
            this.prevWordBtn.disabled = this.settings.wpm <= 100;
            this.prevWordBtn.title = `Уменьшить скорость на 20 (${wpmText})`;
        }

        if (this.nextWordBtn) {
            this.nextWordBtn.disabled = this.settings.wpm >= 1000;
            this.nextWordBtn.title = `Увеличить скорость на 20 (${wpmText})`;
        }
    }

    displayCurrentWord() {
        this.currentIndex = this.clampIndex(this.currentIndex, this.words.length);
        const word = this.words[this.currentIndex] || '';
        const focusIndex = this.calculateFocusPoint(word);
        const wordFrame = document.createElement('span');
        wordFrame.className = 'rsvp-word-frame';
        wordFrame.setAttribute('aria-label', word);
        wordFrame.dataset.paintToken = String(this.wordPaintToken + 1);

        for (let index = 0; index < word.length; index++) {
            const letter = document.createElement('span');
            letter.className = 'rsvp-letter';
            letter.textContent = word[index];

            if (index === focusIndex) {
                letter.classList.add('focus-letter');
                letter.style.color = this.settings.focusLetterColor;
            }

            wordFrame.appendChild(letter);
        }

        this.wordPaintToken++;
        this.rsvpWordDisplay.style.fontSize = `${this.settings.fontSize}px`;
        this.rsvpWordDisplay.classList.remove('is-clearing');
        this.rsvpWordDisplay.replaceChildren(wordFrame);
        this.updatePauseContext();
        this.updateProgress();
    }

    clearWordBeforeNextPaint(callback) {
        const expectedIndex = this.currentIndex;
        const expectedToken = this.wordPaintToken;
        this.clearCurrentWordLayer(expectedIndex, expectedToken);

        requestAnimationFrame(() => {
            callback();
        });
    }

    clearCurrentWordLayer(expectedIndex, expectedToken) {
        if (expectedIndex !== undefined && this.currentIndex !== expectedIndex) return;
        if (expectedToken !== undefined && this.wordPaintToken !== expectedToken) return;

        this.wordPaintToken++;
        this.rsvpWordDisplay.classList.add('is-clearing');
        this.rsvpWordDisplay.replaceChildren();
        // Force layout after clearing so mobile browsers cannot reuse stale glyph layers.
        void this.rsvpWordDisplay.offsetWidth;
    }

    getBlankFrameDelay(delay) {
        return Math.min(28, Math.max(12, delay * 0.18));
    }

    calculateFocusPoint(word) {
        const length = word.length;
        if (length <= 2) return 0;
        if (length === 3) return 1;
        return Math.floor(length * 0.35);
    }

    scheduleNextWord() {
        if (!this.isPlaying || this.words.length === 0) return;

        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.clearTimer) {
            clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }

        const word = this.words[this.currentIndex] || '';
        const baseDelay = 60000 / this.settings.wpm;
        let delay = baseDelay;

        const lastChar = word[word.length - 1];
        if (lastChar === ',') {
            delay *= this.settings.commaPause;
        } else if (lastChar === '.' || lastChar === '!') {
            delay *= this.settings.periodPause;
        } else if ([';', ':', '?', '…'].includes(lastChar)) {
            delay *= this.settings.semicolonPause;
        }

        if (this.currentIndex >= this.words.length - 1) {
            this.timer = setTimeout(() => {
                if (!this.isPlaying) return;

                this.pause();
                this.updateProgress();
                this.schedulePositionSave();
            }, delay);
            return;
        }

        const scheduledIndex = this.currentIndex;
        const scheduledPaintToken = this.wordPaintToken;
        const blankDelay = this.getBlankFrameDelay(delay);

        this.clearTimer = setTimeout(() => {
            this.clearTimer = null;
            if (!this.isPlaying) return;
            this.clearCurrentWordLayer(scheduledIndex, scheduledPaintToken);
        }, Math.max(delay - blankDelay, 0));

        this.timer = setTimeout(() => {
            if (!this.isPlaying) return;
            if (this.currentIndex !== scheduledIndex) return;

            this.currentIndex++;
            this.displayCurrentWord();
            this.schedulePositionSave();
            this.scheduleNextWord();
        }, delay);
    }

    previousWord() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayCurrentWord();
            this.schedulePositionSave();
            if (this.isPlaying) this.scheduleNextWord();
        }
    }

    nextWord() {
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.displayCurrentWord();
            this.schedulePositionSave();
            if (this.isPlaying) this.scheduleNextWord();
        }
    }

    updateProgress() {
        const percentage = this.words.length > 0
            ? Math.round(((this.currentIndex + 1) / this.words.length) * 100)
            : 0;

        const wordCountText = this.words.length > 0 ? `${this.currentIndex + 1} / ${this.words.length}` : '0 / 0';
        const percentageText = `${percentage}%`;
        const wordsRemaining = Math.max(this.words.length - this.currentIndex - 1, 0);
        const timeRemaining = this.calculateReadingTime(wordsRemaining);
        const totalTime = this.calculateReadingTime(this.words.length);

        if (this.progressText) {
            this.progressText.textContent = `${percentageText} • осталось ${timeRemaining}`;
        }
        if (this.wordCount) {
            this.wordCount.textContent = `${wordCountText} • всего ~${totalTime}`;
        }

        if (this.rsvpProgressBar) {
            this.rsvpProgressBar.style.width = `${percentage}%`;
        }
        if (this.rsvpProgressText) {
            this.rsvpProgressText.textContent = `${percentageText} • осталось ${timeRemaining}`;
        }
        if (this.rsvpWordCount) {
            this.rsvpWordCount.textContent = `${wordCountText} • всего ~${totalTime}`;
        }
    }

    calculateReadingTime(wordCount) {
        if (wordCount <= 0) return '0 мин';

        const minutes = Math.ceil(wordCount / this.settings.wpm);
        if (minutes < 60) return `${minutes} мин`;

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} мин`;
    }

    handleKeyboard(event) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

        if (event.code === 'Space') {
            event.preventDefault();

            if (this.mode === 'normal') {
                this.startRSVP();
            } else if (this.mode === 'rsvp') {
                this.togglePlayPause();
            }
            return;
        }

        if (this.mode !== 'rsvp') return;

        switch (event.code) {
            case 'ArrowLeft':
                event.preventDefault();
                this.adjustSpeed(-20);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.adjustSpeed(20);
                break;
            case 'KeyP':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'Escape':
                event.preventDefault();
                this.stopRSVP();
                break;
            default:
                break;
        }
    }

    showSection(section) {
        this.textInputSection.style.display = 'none';
        this.normalReadingSection.style.display = 'none';
        this.rsvpReadingSection.style.display = 'none';
        this.librarySection.style.display = 'none';

        if (section === 'input') this.textInputSection.style.display = 'block';
        if (section === 'normal') this.normalReadingSection.style.display = 'block';
        if (section === 'rsvp') this.rsvpReadingSection.style.display = 'block';
        if (section === 'library') this.librarySection.style.display = 'block';
    }

    backToInput() {
        this.pause();
        this.mode = 'input';
        this.showSection('input');
        this.flushPendingSaves();
        this.saveDraftSoon();
    }

    openSettings() {
        this.settingsModal.classList.add('active');
        this.loadSettingsToForm();
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    loadSettingsToForm() {
        this.wpmInput.value = this.settings.wpm;
        this.commaPauseInput.value = this.settings.commaPause;
        this.periodPauseInput.value = this.settings.periodPause;
        this.semicolonPauseInput.value = this.settings.semicolonPause;
        this.focusLetterColorInput.value = this.settings.focusLetterColor;
        this.fontSizeInput.value = this.settings.fontSize;
    }

    updateSettings() {
        this.settings.wpm = this.numberInRange(this.wpmInput.value, 100, 1000, 250);
        this.settings.commaPause = this.numberInRange(this.commaPauseInput.value, 1, 5, 1.05);
        this.settings.periodPause = this.numberInRange(this.periodPauseInput.value, 1, 5, 1.75);
        this.settings.semicolonPause = this.numberInRange(this.semicolonPauseInput.value, 1, 5, 1.4);
        this.settings.focusLetterColor = this.focusLetterColorInput.value;
        this.settings.fontSize = this.numberInRange(this.fontSizeInput.value, 30, 120, 35);

        this.saveSettings();
        this.updateSpeedControls();

        if (this.mode === 'rsvp') {
            this.displayCurrentWord();
            if (this.isPlaying) this.scheduleNextWord();
        }
        if (this.mode === 'rsvp' || this.mode === 'normal') {
            this.updateProgress();
        }
    }

    resetSettings() {
        this.settings = {
            settingsVersion: 2,
            wpm: 250,
            commaPause: 1.05,
            periodPause: 1.75,
            semicolonPause: 1.4,
            focusLetterColor: '#ff6b6b',
            fontSize: 35
        };
        this.loadSettingsToForm();
        this.saveSettings();
        this.updateSpeedControls();

        if (this.mode === 'rsvp') {
            this.displayCurrentWord();
        }
        if (this.mode === 'rsvp' || this.mode === 'normal') {
            this.updateProgress();
        }
    }

    numberInRange(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(Math.max(number, min), max);
    }

    saveSettings(options = {}) {
        if (!options.preserveTimestamp) {
            this.settingsUpdatedAt = new Date().toISOString();
        }

        localStorage.setItem('rsvp_settings', JSON.stringify(this.settings));
        localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
        if (this.storageMode !== 'localstorage' && this.db) {
            this.setKV('settings', this.settings).catch((error) => console.warn('Failed to save settings to IndexedDB:', error));
            this.setKV('settingsUpdatedAt', this.settingsUpdatedAt).catch((error) => console.warn('Failed to save settings timestamp:', error));
        }

        if (!options.skipSync && !this.isApplyingRemote) {
            this.markSyncPending();
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('rsvp_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const migrated = this.migrateSettingsDefaults(parsed);
                this.settings = { ...this.settings, ...migrated.settings };
                if (migrated.changed) {
                    this.settingsUpdatedAt = new Date().toISOString();
                    localStorage.setItem('rsvp_settings', JSON.stringify(this.settings));
                    localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
                    localStorage.setItem('rsvp_sync_pending', '1');
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }

        const savedUpdatedAt = localStorage.getItem('rsvp_settings_updated_at');
        if (savedUpdatedAt) {
            this.settingsUpdatedAt = savedUpdatedAt;
        }
    }

    migrateSettingsDefaults(settings) {
        const migrated = { ...(settings || {}) };
        let changed = false;

        if (migrated.settingsVersion !== 2) {
            if (migrated.wpm === undefined || migrated.wpm === 300) {
                migrated.wpm = 250;
                changed = true;
            }
            if (migrated.fontSize === undefined || migrated.fontSize === 60) {
                migrated.fontSize = 35;
                changed = true;
            }
            migrated.settingsVersion = 2;
            changed = true;
        }

        return { settings: migrated, changed };
    }

    markSyncPending() {
        localStorage.setItem('rsvp_sync_pending', '1');
        this.updateOnlineStatus();
        this.syncSoon();
    }

    syncSoon(delay = 1200) {
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.runAsync(() => this.syncNow());
        }, delay);
    }

    async syncNow() {
        await this.ready;
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;
        this.updateOnlineStatus();

        try {
            const payload = await this.createSyncPayload();
            const response = await fetch(this.syncEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Sync failed with HTTP ${response.status}`);
            }

            const remoteState = await response.json();
            await this.applyRemoteState(remoteState);
            localStorage.setItem('rsvp_sync_pending', '0');
            localStorage.setItem('rsvp_last_sync_at', new Date().toISOString());
            this.syncRetryDelay = 5000;
        } catch (error) {
            console.warn('Offline sync postponed:', error);
            localStorage.setItem('rsvp_sync_pending', '1');
            this.syncRetryDelay = Math.min(this.syncRetryDelay * 1.7, 60000);
            if (navigator.onLine) {
                this.syncSoon(this.syncRetryDelay);
            }
        } finally {
            this.isSyncing = false;
            this.updateOnlineStatus();
        }
    }

    async createSyncPayload() {
        const draft = this.storageMode === 'localstorage'
            ? {
                text: localStorage.getItem('rsvp_text') || '',
                bookName: this.bookNameInput.value.trim(),
                currentBookId: this.currentBookId,
                currentIndex: this.currentIndex,
                updatedAt: new Date().toISOString()
            }
            : await this.getKV('draft');

        const books = this.storageMode === 'localstorage'
            ? this.library.map((book) => this.normalizeBook(book))
            : await this.getAllBooks();

        return {
            version: 1,
            clientId: this.syncClientId,
            sentAt: new Date().toISOString(),
            settings: this.settings,
            settingsUpdatedAt: this.settingsUpdatedAt,
            draft,
            books,
            deletedBooks: this.deletedBooks
        };
    }

    async applyRemoteState(remoteState) {
        if (!remoteState || !Array.isArray(remoteState.books)) return;

        this.isApplyingRemote = true;
        try {
            this.deletedBooks = this.mergeDeletedBooks(this.deletedBooks, remoteState.deletedBooks || {});

            const localBooks = this.storageMode === 'localstorage'
                ? this.library.map((book) => this.normalizeBook(book))
                : await this.getAllBooks();
            for (const localBook of localBooks) {
                const deletedAt = this.deletedBooks[localBook.id];
                if (deletedAt && this.isNewerOrEqual(deletedAt, localBook.updatedAt || localBook.lastRead)) {
                    await this.deleteBookFromStorage(localBook.id);
                }
            }

            for (const remoteBook of remoteState.books) {
                const normalized = this.normalizeBook(remoteBook);
                const deletedAt = this.deletedBooks[normalized.id];
                if (deletedAt && this.isNewerOrEqual(deletedAt, normalized.updatedAt || normalized.lastRead)) {
                    continue;
                }

                const localBook = await this.getBook(normalized.id);
                if (!localBook || this.isNewer(normalized.updatedAt || normalized.lastRead, localBook.updatedAt || localBook.lastRead)) {
                    await this.putBook(normalized);
                }
            }

            if (remoteState.settings && this.isNewer(remoteState.settingsUpdatedAt, this.settingsUpdatedAt)) {
                this.settings = { ...this.settings, ...remoteState.settings };
                this.settingsUpdatedAt = remoteState.settingsUpdatedAt;
                this.saveSettings({ preserveTimestamp: true, skipSync: true });
                this.loadSettingsToForm();
            }

            await this.applyRemoteDraft(remoteState.draft);
            await this.persistSyncMetadata();
            await this.loadLibrary();
            if (this.mode === 'library') this.renderLibrary();
            this.updateCurrentBookInfo();
            this.updateStorageStatus();
        } finally {
            this.isApplyingRemote = false;
        }
    }

    async applyRemoteDraft(remoteDraft) {
        if (!remoteDraft || typeof remoteDraft.text !== 'string') return;

        const localDraft = this.storageMode === 'localstorage' ? null : await this.getKV('draft');
        if (localDraft && !this.isNewer(remoteDraft.updatedAt, localDraft.updatedAt)) return;

        localStorage.setItem('rsvp_text', remoteDraft.text);
        localStorage.setItem('rsvp_bookmark', String(remoteDraft.currentIndex || 0));

        if (this.storageMode !== 'localstorage') {
            await this.setKV('draft', remoteDraft);
        }

        if (this.mode === 'input') {
            this.setTextInputValue(remoteDraft.text);
            this.bookNameInput.value = remoteDraft.bookName || '';
            this.currentBookId = remoteDraft.currentBookId || null;
            this.currentBookName = remoteDraft.bookName || '';
            this.currentIndex = this.clampIndex(parseInt(remoteDraft.currentIndex || 0, 10), this.parseText(remoteDraft.text).length);
        }
    }

    mergeDeletedBooks(localDeleted, remoteDeleted) {
        const merged = { ...(localDeleted || {}) };
        Object.entries(remoteDeleted || {}).forEach(([bookId, deletedAt]) => {
            if (!merged[bookId] || this.isNewer(deletedAt, merged[bookId])) {
                merged[bookId] = deletedAt;
            }
        });
        return merged;
    }

    isNewer(candidate, current) {
        return new Date(candidate || 0).getTime() > new Date(current || 0).getTime();
    }

    isNewerOrEqual(candidate, current) {
        return new Date(candidate || 0).getTime() >= new Date(current || 0).getTime();
    }

    async requestWakeLock() {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || this.wakeLock) return;

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                this.wakeLock = null;
            });
        } catch (error) {
            console.warn('Screen Wake Lock unavailable:', error);
        }
    }

    releaseWakeLock() {
        if (!this.wakeLock) return;

        const lock = this.wakeLock;
        this.wakeLock = null;
        lock.release().catch((error) => console.warn('Failed to release wake lock:', error));
    }

    async saveCurrentTextAsBook(options = {}) {
        await this.ready;

        const text = this.textInput.value.trim();
        if (!text) {
            if (!options.silent) {
                this.showToast('Сначала загрузите или вставьте текст.', 'error');
            }
            return null;
        }

        const existing = this.currentBookId ? await this.getBook(this.currentBookId) : null;
        const name = this.bookNameInput.value.trim() || existing?.name || this.makeDefaultBookName(text);
        const now = new Date().toISOString();

        const book = {
            ...(existing || {}),
            id: existing?.id || this.createId(),
            name,
            text,
            wordCount: this.parseText(text).length,
            currentIndex: this.clampIndex(this.currentIndex, this.parseText(text).length),
            bookmarks: existing?.bookmarks || [],
            sourceType: existing?.sourceType || 'text',
            dateAdded: existing?.dateAdded || now,
            lastRead: now,
            updatedAt: now
        };

        const savedBook = await this.putBook(book);
        this.currentBookId = savedBook.id;
        this.currentBookName = savedBook.name;
        this.bookNameInput.value = savedBook.name;
        await this.saveDraft();
        await this.loadLibrary();
        this.updateCurrentBookInfo();

        if (!options.silent) {
            this.showToast(existing ? 'Книга обновлена.' : 'Книга сохранена в библиотеку.');
        }

        return savedBook;
    }

    makeDefaultBookName(text) {
        const firstWords = this.parseText(text).slice(0, 5).join(' ');
        return firstWords ? firstWords.slice(0, 60) : `Книга ${this.library.length + 1}`;
    }

    async showLibrary() {
        await this.ready;
        await this.loadLibrary();
        this.renderLibrary();
        this.showSection('library');
    }

    renderLibrary() {
        this.booksList.innerHTML = '';

        const filteredBooks = this.library.filter((book) => {
            if (!this.libraryFilter) return true;
            return `${book.name} ${book.fileName}`.toLowerCase().includes(this.libraryFilter);
        });

        this.librarySummary.textContent = this.formatLibrarySummary(filteredBooks.length, this.library.length);

        if (filteredBooks.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = this.library.length === 0
                ? 'Библиотека пуста. Сохраните текущий текст или импортируйте книги.'
                : 'По этому запросу книг не найдено.';
            this.booksList.appendChild(empty);
            return;
        }

        filteredBooks.forEach((book) => {
            const item = document.createElement('li');
            item.className = 'library-item';

            const progress = book.wordCount > 0 ? Math.round(((book.currentIndex + 1) / book.wordCount) * 100) : 0;

            const info = document.createElement('div');
            info.className = 'book-info';

            const title = document.createElement('div');
            title.className = 'book-title';
            title.textContent = book.name;

            const meta = document.createElement('div');
            meta.className = 'book-meta';
            meta.textContent = `${book.wordCount.toLocaleString('ru-RU')} слов • ${progress}% • ${book.bookmarks.length} закл.`;

            const progressBar = document.createElement('div');
            progressBar.className = 'book-progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'book-progress-fill';
            progressFill.style.width = `${progress}%`;
            progressBar.appendChild(progressFill);

            const date = document.createElement('div');
            date.className = 'book-date';
            date.textContent = `Последнее чтение: ${this.formatDate(book.lastRead)}`;

            info.append(title, meta, progressBar, date);

            const actions = document.createElement('div');
            actions.className = 'book-actions';

            const readBtn = this.createActionButton('📖', 'Читать', () => this.runAsync(() => this.loadBook(book.id, { start: true })));
            const bookmarksBtn = this.createActionButton('★', 'Закладки', () => this.runAsync(() => this.openBookmarksForBook(book.id)));
            const renameBtn = this.createActionButton('✏️', 'Переименовать', () => this.runAsync(() => this.renameBook(book.id)));
            const deleteBtn = this.createActionButton('🗑️', 'Удалить', () => this.runAsync(() => this.deleteBook(book.id)));

            actions.append(readBtn, bookmarksBtn, renameBtn, deleteBtn);
            item.append(info, actions);
            this.booksList.appendChild(item);
        });
    }

    createActionButton(text, title, handler) {
        const button = document.createElement('button');
        button.className = 'book-btn';
        button.type = 'button';
        button.title = title;
        button.textContent = text;
        button.addEventListener('click', handler);
        return button;
    }

    formatLibrarySummary(filteredCount, totalCount) {
        if (filteredCount === totalCount) {
            return `${totalCount} ${this.pluralize(totalCount, ['книга', 'книги', 'книг'])}`;
        }
        return `${filteredCount} из ${totalCount} книг`;
    }

    pluralize(value, forms) {
        const abs = Math.abs(value) % 100;
        const last = abs % 10;
        if (abs > 10 && abs < 20) return forms[2];
        if (last > 1 && last < 5) return forms[1];
        if (last === 1) return forms[0];
        return forms[2];
    }

    async loadBook(bookId, options = {}) {
        await this.ready;

        const book = await this.getBook(bookId);
        if (!book) {
            this.showToast('Книга не найдена.', 'error');
            return;
        }

        const now = new Date().toISOString();
        const updatedBook = { ...book, lastRead: now };
        await this.putBook(updatedBook);
        await this.loadLibrary();

        this.currentBookId = updatedBook.id;
        this.currentBookName = updatedBook.name;
        this.currentIndex = this.clampIndex(updatedBook.currentIndex, updatedBook.wordCount);
        this.setTextInputValue(updatedBook.text);
        this.bookNameInput.value = updatedBook.name;
        await this.saveDraft();

        if (options.start) {
            this.words = this.parseText(updatedBook.text);
            this.mode = 'normal';
            this.renderNormalText();
            this.updateProgress();
            this.updateCurrentBookInfo();
            this.showSection('normal');
        } else {
            this.showSection('input');
        }
    }

    async deleteBook(bookId) {
        const book = await this.getBook(bookId);
        if (!book) return;

        if (!confirm(`Удалить "${book.name}" из библиотеки?`)) return;

        await this.deleteBookFromStorage(bookId);
        if (this.currentBookId === String(bookId)) {
            this.currentBookId = null;
            this.currentBookName = '';
            this.currentIndex = 0;
            await this.saveDraft();
        }
        await this.loadLibrary();
        this.renderLibrary();
        this.showToast('Книга удалена.');
    }

    async renameBook(bookId) {
        const book = await this.getBook(bookId);
        if (!book) return;

        const newName = prompt('Новое название:', book.name);
        if (!newName || !newName.trim()) return;

        const updated = {
            ...book,
            name: newName.trim(),
            updatedAt: new Date().toISOString()
        };
        await this.putBook(updated);

        if (this.currentBookId === updated.id) {
            this.currentBookName = updated.name;
            this.bookNameInput.value = updated.name;
            await this.saveDraft();
            this.updateCurrentBookInfo();
        }

        await this.loadLibrary();
        this.renderLibrary();
    }

    async persistReadingPosition() {
        localStorage.setItem('rsvp_bookmark', String(this.currentIndex));
        const now = new Date().toISOString();

        if (this.currentBookId) {
            const book = await this.getBook(this.currentBookId);
            if (book) {
                const updated = {
                    ...book,
                    currentIndex: this.clampIndex(this.currentIndex, book.wordCount),
                    lastRead: now,
                    updatedAt: now
                };
                await this.putBook(updated);
                this.updateBookInMemory(updated);
            }
        }

        await this.saveDraft();
    }

    schedulePositionSave() {
        clearTimeout(this.savePositionTimer);
        this.savePositionTimer = setTimeout(() => {
            this.runAsync(() => this.persistReadingPosition());
        }, 300);
    }

    updateBookInMemory(updatedBook) {
        const index = this.library.findIndex((book) => book.id === updatedBook.id);
        if (index >= 0) {
            this.library[index] = this.normalizeBook(updatedBook);
        }
    }

    async addBookmarkAtCurrentPosition() {
        await this.ready;

        if (this.words.length === 0) {
            const text = this.textInput.value.trim();
            if (!text) {
                this.showToast('Нет текста для закладки.', 'error');
                return;
            }
            this.words = this.parseText(text);
        }

        const book = await this.ensureCurrentBook();
        if (!book) return;

        const excerpt = this.makeExcerpt(this.currentIndex);
        const defaultName = `${Math.round(((this.currentIndex + 1) / Math.max(this.words.length, 1)) * 100)}% — ${excerpt.slice(0, 32)}`;
        const name = prompt('Название закладки:', defaultName) || defaultName;
        if (!name.trim()) return;

        const bookmark = {
            id: this.createId(),
            name: name.trim(),
            index: this.clampIndex(this.currentIndex, book.wordCount),
            excerpt,
            createdAt: new Date().toISOString()
        };

        const updated = {
            ...book,
            currentIndex: this.currentIndex,
            bookmarks: [...book.bookmarks, bookmark],
            lastRead: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.putBook(updated);
        await this.loadLibrary();
        this.bookmarksModalBookId = updated.id;
        this.renderBookmarks(updated);
        this.updateCurrentBookInfo();
        this.showToast('Закладка добавлена.');
    }

    async ensureCurrentBook() {
        if (this.currentBookId) {
            const book = await this.getBook(this.currentBookId);
            if (book) return book;
        }

        return this.saveCurrentTextAsBook({ silent: true });
    }

    makeExcerpt(index) {
        const start = Math.max(index - 4, 0);
        const end = Math.min(index + 8, this.words.length);
        return this.words.slice(start, end).join(' ');
    }

    async openBookmarksForCurrentBook() {
        await this.ready;

        if (!this.currentBookId) {
            const savedBook = await this.ensureCurrentBook();
            if (!savedBook) return;
        }

        await this.openBookmarksForBook(this.currentBookId);
    }

    async openBookmarksForBook(bookId) {
        const book = await this.getBook(bookId);
        if (!book) {
            this.showToast('Книга не найдена.', 'error');
            return;
        }

        this.bookmarksModalBookId = book.id;
        this.renderBookmarks(book);
        this.bookmarksModal.classList.add('active');
    }

    closeBookmarks() {
        this.bookmarksModal.classList.remove('active');
    }

    renderBookmarks(book) {
        this.bookmarksList.innerHTML = '';

        if (!book || book.bookmarks.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = 'Закладок пока нет.';
            this.bookmarksList.appendChild(empty);
            return;
        }

        const sorted = [...book.bookmarks].sort((a, b) => a.index - b.index);
        sorted.forEach((bookmark) => {
            const item = document.createElement('li');
            item.className = 'bookmark-item';

            const info = document.createElement('div');
            info.className = 'bookmark-info';

            const title = document.createElement('div');
            title.className = 'bookmark-title';
            title.textContent = bookmark.name;

            const meta = document.createElement('div');
            meta.className = 'bookmark-meta';
            const progress = book.wordCount > 0 ? Math.round(((bookmark.index + 1) / book.wordCount) * 100) : 0;
            meta.textContent = `${progress}% • слово ${bookmark.index + 1} • ${this.formatDate(bookmark.createdAt)}`;

            const excerpt = document.createElement('div');
            excerpt.className = 'bookmark-excerpt';
            excerpt.textContent = bookmark.excerpt;

            info.append(title, meta, excerpt);

            const actions = document.createElement('div');
            actions.className = 'bookmark-actions';
            const goBtn = this.createBookmarkButton('Перейти', () => this.runAsync(() => this.goToBookmark(book.id, bookmark.id)));
            const deleteBtn = this.createBookmarkButton('Удалить', () => this.runAsync(() => this.deleteBookmark(book.id, bookmark.id)));
            actions.append(goBtn, deleteBtn);

            item.append(info, actions);
            this.bookmarksList.appendChild(item);
        });
    }

    createBookmarkButton(text, handler) {
        const button = document.createElement('button');
        button.className = 'bookmark-btn secondary-btn compact-btn';
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', handler);
        return button;
    }

    async goToBookmark(bookId, bookmarkId) {
        const book = await this.getBook(bookId);
        if (!book) return;

        const bookmark = book.bookmarks.find((item) => item.id === bookmarkId);
        if (!bookmark) return;

        await this.loadBook(bookId, { start: true });
        this.setCurrentWordIndex(this.clampIndex(bookmark.index, this.words.length));
        this.closeBookmarks();
    }

    async deleteBookmark(bookId, bookmarkId) {
        const book = await this.getBook(bookId);
        if (!book) return;

        const updated = {
            ...book,
            bookmarks: book.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
            updatedAt: new Date().toISOString()
        };

        await this.putBook(updated);
        await this.loadLibrary();
        this.renderBookmarks(updated);
        this.updateCurrentBookInfo();
    }

    async exportLibrary() {
        await this.loadLibrary();

        const payload = {
            version: 2,
            exportedAt: new Date().toISOString(),
            settings: this.settings,
            settingsUpdatedAt: this.settingsUpdatedAt,
            books: this.library
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rsvp-library-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async importLibrary(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readTextFile(file);
            const payload = JSON.parse(text);
            const importedBooks = Array.isArray(payload) ? payload : payload.books;

            if (!Array.isArray(importedBooks)) {
                throw new Error('В файле не найден список книг');
            }

            let count = 0;
            for (const imported of importedBooks) {
                const book = this.normalizeBook(imported);
                const exists = await this.getBook(book.id);
                if (exists) {
                    book.id = this.createId();
                    book.name = `${book.name} (импорт)`;
                }
                await this.putBook(book);
                count++;
            }

            if (payload.settings) {
                this.settings = { ...this.settings, ...payload.settings };
                this.saveSettings();
            }

            await this.loadLibrary();
            this.renderLibrary();
            this.showToast(`Импортировано книг: ${count}.`);
        } finally {
            event.target.value = '';
        }
    }

    updateCurrentBookInfo() {
        const parts = [];
        if (this.currentBookName) {
            parts.push(this.currentBookName);
        } else if (this.bookNameInput.value.trim()) {
            parts.push(this.bookNameInput.value.trim());
        } else {
            parts.push('Черновик');
        }

        const book = this.library.find((item) => item.id === this.currentBookId);
        if (book) {
            parts.push(`${book.bookmarks.length} закл.`);
        }

        this.currentBookInfo.textContent = parts.join(' • ');
    }

    updateLibraryButton() {
        this.libraryBtn.textContent = `📚 Моя библиотека (${this.library.length})`;
    }

    updateStorageStatus() {
        const totalWords = this.library.reduce((sum, book) => sum + book.wordCount, 0);
        const mode = this.storageMode === 'indexeddb' ? 'IndexedDB' : 'localStorage';
        const syncText = this.formatSyncStatus();
        this.storageStatus.textContent = `${this.library.length} ${this.pluralize(this.library.length, ['книга', 'книги', 'книг'])}, ${totalWords.toLocaleString('ru-RU')} слов • хранение: ${mode} • ${syncText}`;
        this.updateLibraryButton();
    }

    formatSyncStatus() {
        if (!navigator.onLine) return 'синхронизация: офлайн';
        if (this.isSyncing) return 'синхронизация...';
        if (localStorage.getItem('rsvp_sync_pending') === '1') return 'синхронизация: ожидает';

        const lastSyncAt = localStorage.getItem('rsvp_last_sync_at');
        return lastSyncAt ? `синхронизировано: ${this.formatDate(lastSyncAt)}` : 'синхронизация: готова';
    }

    formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'неизвестно';
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    updateOnlineStatus() {
        const online = navigator.onLine;
        const pending = localStorage.getItem('rsvp_sync_pending') === '1';
        this.offlineBadge.textContent = online ? (pending ? 'Онлайн • синхр.' : 'Онлайн') : 'Офлайн';
        this.offlineBadge.classList.toggle('offline', !online);
        this.updateStorageStatus();
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('leaving');
            setTimeout(() => toast.remove(), 220);
        }, 2800);
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        try {
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;

                const reloadKey = 'rsvp-reader-reloaded-v24';
                if (!sessionStorage.getItem(reloadKey)) {
                    sessionStorage.setItem(reloadKey, '1');
                    window.location.reload();
                }
            });

            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                updateViaCache: 'none'
            });

            registration.addEventListener('updatefound', () => {
                const nextWorker = registration.installing;
                if (!nextWorker) return;

                nextWorker.addEventListener('statechange', () => {
                    if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        nextWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            await registration.update();
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

async function resetRuntimeCacheIfRequested() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('reset-cache')) return false;

    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }

        sessionStorage.removeItem('rsvp-reader-reloaded-v20');
        sessionStorage.removeItem('rsvp-reader-reloaded-v21');
        sessionStorage.removeItem('rsvp-reader-reloaded-v23');
        sessionStorage.removeItem('rsvp-reader-reloaded-v24');
    } finally {
        url.searchParams.delete('reset-cache');
        url.searchParams.set('v', '22');
        window.location.replace(url.toString());
    }

    return true;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (await resetRuntimeCacheIfRequested()) return;
    window.rsvpReader = new RSVPReader();
});
