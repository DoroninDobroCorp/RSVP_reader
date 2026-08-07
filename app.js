// RSVP Reader Application with offline-first library storage.
class RSVPReader {
    constructor() {
        this.i18n = window.paceflowI18n || new window.PaceFlowI18n();
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
        this.currentTextSignature = '';
        this.currentChapters = [];
        this.pendingChapters = [];
        this.bookmarksModalBookId = null;
        this.lastHighlightedIndex = null;
        this.savePositionTimer = null;
        this.draftSaveTimer = null;
        this.hasUnsavedTextInput = false;
        this.hasUnsafeDraft = false;
        this.suppressTextInputChange = false;
        this.composerRevision = 0;
        this.draftRevision = 0;
        this.resumeRevision = 0;
        this.lastBottomTapTime = 0;
        this.lastBottomTapType = '';
        this.wordPaintToken = 0;
        this.wakeLock = null;
        this.renderWindowStart = 0;
        this.renderWindowEnd = 0;
        this.renderWindowSize = 4200;
        this.lastPositionPersistedAt = 0;
        // The tiny resume snapshot is mirrored frequently; cloning a full book
        // record every frame checkpoint is unnecessary and expensive on mobile.
        this.positionPersistIntervalMs = 30_000;
        this.lastNativeResumePersistedAt = 0;
        this.nativeResumePersistIntervalMs = 1400;
        this.speedFeedbackTimers = new WeakMap();
        this.activePlaybackMs = 0;
        this.activeSegmentStartedAt = null;
        this.wordsProcessedInRun = 0;
        this.rsvpRunStartIndex = 0;
        this.rampUpStartTime = null;
        this.nativeBookIndex = {};
        this.nativeResumeSnapshot = null;
        this.nativeDraftSnapshot = null;
        this.lastNativeDraftSignature = '';
        this.lastNativeDraftFileName = '';
        this.hasNativeDraft = false;
        this.isRestoringNativeBooks = false;
        this.nativeStorageAvailable = true;
        this.nativeMutationQueue = Promise.resolve();
        this.isDeletingAllData = false;
        this.activeModal = null;
        this.modalTrigger = null;
        this.pendingActionDialog = null;
        this.actionDialogParent = null;
        this.actionDialogReturnFocus = null;
        this.dataGeneration = 0;
        this.pendingNativeWrites = new Set();
        this.bookWriteGenerations = new Map();
        this.bookMutationQueues = new Map();
        this.importLimits = {
            maxSourceBytes: 100 * 1024 * 1024,
            maxArchiveEntries: 5000,
            maxArchiveUncompressedBytes: 128 * 1024 * 1024,
            maxEntryBytes: 32 * 1024 * 1024,
            maxCompressionRatio: 500,
            maxTextCharacters: 24 * 1024 * 1024,
            maxTokens: 1_000_000,
            maxReadableWords: 1_000_000,
            maxTokenCharacters: 16 * 1024
        };
        this.syncClientId = this.loadOrCreateSyncClientId();
        this.syncEndpoint = this.resolveSyncEndpoint();
        this.syncTimer = null;
        this.isSyncing = false;
        this.isApplyingRemote = false;
        this.syncRetryDelay = 5000;
        this.deletedBooks = {};
        this.settingsUpdatedAt = localStorage.getItem('rsvp_settings_updated_at') || new Date().toISOString();
        this.settingsWritePromise = Promise.resolve();

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
            settingsVersion: 8,
            wpm: 350,
            commaPause: 1.05,
            periodPause: 1.6,
            semicolonPause: 1.3,
            focusLetterColor: '#ff6b6b',
            fontSize: 42,
            orpAlignment: true,
            lengthScaling: true,
            chunkingEnabled: true,
            balancedPairsEnabled: false,
            speedRampUp: true,
            orpNotches: false,
            hardwareControls: false,
            cloudSyncEnabled: false
        };

        this.initElements();
        this.loadSettings();
        this.updateSpeedControls();
        this.attachEventListeners();
        this.updateOnlineStatus();
        this.registerServiceWorker();

        // Capacitor bridges native calls through WebKit. Starting bootstrap in
        // the constructor can therefore keep the launch view blank until the
        // first storage round-trip finishes. Give WebKit two rendering turns so
        // the usable shell is painted before recovery work begins.
        this.ready = this.afterFirstPaint().then(() => this.bootstrap()).then(() => {
            this.setupHardwareControls();
            if (this.settings.cloudSyncEnabled && !this.isNativePlatform()) this.syncSoon(800);
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
        this.tryDemoBtn = document.getElementById('tryDemoBtn');
        this.addToLibraryBtn = document.getElementById('addToLibraryBtn');
        this.libraryBtn = document.getElementById('libraryBtn');
        this.bookNameInput = document.getElementById('bookNameInput');
        this.homeBtn = document.getElementById('homeBtn');
        this.globalSearchBtn = document.getElementById('globalSearchBtn');

        this.booksList = document.getElementById('booksList');
        this.librarySummary = document.getElementById('librarySummary');
        this.librarySearchInput = document.getElementById('librarySearchInput');
        this.orpAlignmentInput = document.getElementById('orpAlignmentInput');
        this.lengthScalingInput = document.getElementById('lengthScalingInput');
        this.chunkingEnabledInput = document.getElementById('chunkingEnabledInput');
        this.balancedPairsEnabledInput = document.getElementById('balancedPairsEnabledInput');
        this.speedRampUpInput = document.getElementById('speedRampUpInput');
        this.orpNotchesInput = document.getElementById('orpNotchesInput');
        this.orpAxisLine = document.getElementById('orpAxisLine');
        this.orpNotchTop = document.getElementById('orpNotchTop');
        this.orpNotchBottom = document.getElementById('orpNotchBottom');
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
        this.tocBtn = document.getElementById('tocBtn');

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
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        this.themeNightBtn = document.getElementById('themeNightBtn');
        this.themeDayBtn = document.getElementById('themeDayBtn');
        this.rsvpTotalProgressFill = document.getElementById('rsvpTotalProgressFill');
        this.rsvpRunProgressFill = document.getElementById('rsvpRunProgressFill');
        this.rsvpProgressBar = document.getElementById('rsvpProgressFill');
        this.rsvpProgressText = document.getElementById('rsvpProgressText');
        this.rsvpWordCount = document.getElementById('rsvpWordCount');
        this.rsvpSpeedText = document.getElementById('rsvpSpeedText');
        this.rsvpScrubber = document.getElementById('rsvpScrubber');
        this.orpAlignmentInput = document.getElementById('orpAlignmentInput');
        this.lengthScalingInput = document.getElementById('lengthScalingInput');
        this.speedRampUpInput = document.getElementById('speedRampUpInput');
        this.chunkingEnabledInput = document.getElementById('chunkingEnabledInput');
        this.orpAxisLine = document.getElementById('orpAxisLine');
        this.orpNotchTop = document.getElementById('orpNotchTop');
        this.orpNotchBottom = document.getElementById('orpNotchBottom');
        this.orpNotchesInput = document.getElementById('orpNotchesInput');
        this.rsvpBottomTapZone = document.getElementById('rsvpBottomTapZone');
        this.rsvpBottomTapIcon = document.getElementById('rsvpBottomTapIcon');
        this.rsvpBottomTapLabel = document.getElementById('rsvpBottomTapLabel');
        this.rsvpTocBtn = document.getElementById('rsvpTocBtn');
        this.rsvpSearchBtn = document.getElementById('rsvpSearchBtn');
        this.rsvpBookTitle = document.getElementById('rsvpBookTitle');

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
        this.settingsExportBtn = document.getElementById('settingsExportBtn');
        this.deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
        this.hardwareControlsInput = document.getElementById('hardwareControlsInput');
        this.hardwareControlsHint = document.getElementById('hardwareControlsHint');
        this.languageEnBtn = document.getElementById('languageEnBtn');
        this.languageRuBtn = document.getElementById('languageRuBtn');

        this.bookmarksModal = document.getElementById('bookmarksModal');
        this.closeBookmarksBtn = document.getElementById('closeBookmarksBtn');
        this.saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
        this.bookmarksList = document.getElementById('bookmarksList');

        this.tocModal = document.getElementById('tocModal');
        this.closeTocBtn = document.getElementById('closeTocBtn');
        this.tocList = document.getElementById('tocList');

        this.actionDialog = document.getElementById('actionDialog');
        this.actionDialogForm = document.getElementById('actionDialogForm');
        this.actionDialogTitle = document.getElementById('actionDialogTitle');
        this.actionDialogMessage = document.getElementById('actionDialogMessage');
        this.actionDialogInputGroup = document.getElementById('actionDialogInputGroup');
        this.actionDialogInputLabel = document.getElementById('actionDialogInputLabel');
        this.actionDialogInput = document.getElementById('actionDialogInput');
        this.actionDialogCloseBtn = document.getElementById('actionDialogCloseBtn');
        this.actionDialogCancelBtn = document.getElementById('actionDialogCancelBtn');
        this.actionDialogConfirmBtn = document.getElementById('actionDialogConfirmBtn');

        this.offlineBadge = document.getElementById('offlineBadge');
        this.storageStatus = document.getElementById('storageStatus');
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        this.i18n.apply();
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
        this.tryDemoBtn.addEventListener('click', () => this.runAsync(() => this.openBuiltInDemo()));
        this.backToInputBtn.addEventListener('click', () => this.backToInput());
        this.homeBtn.addEventListener('click', () => this.backToInput());
        this.globalSearchBtn.addEventListener('click', () => this.openReaderSearch());
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        if (this.themeNightBtn) {
            this.themeNightBtn.addEventListener('click', () => this.setTheme('night'));
        }
        if (this.themeDayBtn) {
            this.themeDayBtn.addEventListener('click', () => this.setTheme('day'));
        }
        this.currentTheme = localStorage.getItem('rsvp_theme') || 'night';
        this.applyTheme(this.currentTheme);
        this.startRSVPBtn.addEventListener('click', () => this.startRSVP());
        this.tocBtn.addEventListener('click', (event) => this.openToc(event.currentTarget));
        this.rsvpTocBtn.addEventListener('click', (event) => this.openToc(event.currentTarget));
        this.rsvpSearchBtn.addEventListener('click', () => this.openReaderSearch());

        this.addBookmarkBtn.addEventListener('click', () => this.runAsync(() => this.addBookmarkAtCurrentPosition()));
        this.bookmarksBtn.addEventListener('click', (event) => {
            const trigger = event.currentTarget;
            this.runAsync(() => this.openBookmarksForCurrentBook(trigger));
        });
        this.rsvpBookmarkBtn.addEventListener('click', () => this.runAsync(() => this.addBookmarkAtCurrentPosition()));

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.rsvpBottomTapZone.addEventListener('click', (event) => this.handleBottomTap(event));
        if (window.PointerEvent) {
            this.rsvpBottomTapZone.addEventListener('pointerup', (event) => this.handleBottomTap(event));
        } else {
            this.rsvpBottomTapZone.addEventListener('touchend', (event) => this.handleBottomTap(event), { passive: false });
        }
        this.prevWordBtn.addEventListener('click', () => this.adjustSpeed(-20, this.prevWordBtn));
        this.nextWordBtn.addEventListener('click', () => this.adjustSpeed(20, this.nextWordBtn));
        this.stopRSVPBtn.addEventListener('click', () => this.stopRSVP());
        this.rsvpScrubber.addEventListener('input', () => this.seekFromScrubber());
        this.rsvpScrubber.addEventListener('change', () => this.schedulePositionSave());

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

        this.settingsBtn.addEventListener('click', (event) => this.openSettings(event.currentTarget));
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (event) => {
            if (event.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        [
            this.wpmInput,
            this.commaPauseInput,
            this.periodPauseInput,
            this.semicolonPauseInput,
            this.focusLetterColorInput,
            this.fontSizeInput,
            this.orpAlignmentInput,
            this.lengthScalingInput,
            this.chunkingEnabledInput,
            this.balancedPairsEnabledInput,
            this.speedRampUpInput,
            this.orpNotchesInput,
            this.hardwareControlsInput
        ].forEach((input) => {
            if (!input) return;
            input.addEventListener('input', () => this.updateSettings());
            input.addEventListener('change', () => this.updateSettings());
        });

        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        this.settingsExportBtn.addEventListener('click', () => this.runAsync(() => this.exportLibrary()));
        this.deleteAllDataBtn.addEventListener('click', () => this.runAsync(() => this.deleteAllLocalData()));
        this.languageEnBtn.addEventListener('click', () => this.setLanguage('en'));
        this.languageRuBtn.addEventListener('click', () => this.setLanguage('ru'));

        this.textInput.addEventListener('input', () => this.handleTextInputChanged());
        this.bookNameInput.addEventListener('input', () => {
            this.composerRevision += 1;
            this.hasUnsavedTextInput = true;
            this.saveDraftSoon();
        });

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

        this.closeTocBtn.addEventListener('click', () => this.closeToc());
        this.tocModal.addEventListener('click', (event) => {
            if (event.target === this.tocModal) this.closeToc();
        });

        this.actionDialogForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = this.actionDialogInputGroup.hidden ? true : this.actionDialogInput.value;
            this.finishActionDialog(value);
        });
        this.actionDialogCloseBtn.addEventListener('click', () => this.finishActionDialog(null));
        this.actionDialogCancelBtn.addEventListener('click', () => this.finishActionDialog(null));
        this.actionDialog.addEventListener('click', (event) => {
            if (event.target === this.actionDialog) this.finishActionDialog(null);
        });

        window.addEventListener('online', () => {
            this.updateOnlineStatus();
            this.syncSoon(0);
        });
        window.addEventListener('offline', () => this.updateOnlineStatus());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (this.isDeletingAllData) {
                    this.releaseWakeLock();
                    return;
                }
                if (this.isPlaying) this.pause();
                this.flushPendingSaves();
                this.saveResumeSnapshot(this.dataGeneration, { forceNative: true });
                this.releaseWakeLock();
            } else if (this.isPlaying) {
                this.requestWakeLock();
            }
        });
        window.addEventListener('pagehide', () => {
            if (this.isDeletingAllData) return;
            this.saveResumeSnapshot(this.dataGeneration, { forceNative: true });
            this.flushPendingSaves();
        });
        window.addEventListener('resize', () => {
            if (this.mode === 'rsvp') this.displayCurrentWord();
        });
    }

    async bootstrap() {
        let indexedDbFailed = false;
        let nativeMirrorRestored = false;
        try {
            this.db = await this.openDatabase();
            // Tombstones must be available before legacy migration. Otherwise a
            // freshly-created/evicted IndexedDB can resurrect books that were
            // already deleted and then overwrite the only deletion record.
            await this.loadSyncMetadata();
            await this.reconcilePrimaryTombstones();
            // Load the existing native index before migration can append to it;
            // otherwise the first migrated book could replace an unseen mirror.
            await this.restoreNativeBookMirror();
            nativeMirrorRestored = true;
            await this.migrateLegacyData();
        } catch (error) {
            console.error('IndexedDB unavailable, falling back to localStorage:', error);
            this.storageMode = 'localstorage';
            indexedDbFailed = true;
        }

        if (this.storageMode === 'localstorage') {
            await this.loadSyncMetadata();
            this.loadLegacyLibrary();
        }
        if (!nativeMirrorRestored) await this.restoreNativeBookMirror();
        await this.loadNativeResumeSnapshot();
        await this.loadNativeDraftSnapshot();
        await this.loadDraft();
        await this.loadLibrary();
        await this.hydrateDraftFromNativeResume();
        this.updateStorageStatus();
        await this.restoreLastSession();
        if (indexedDbFailed) {
            this.showToast(this.t('indexedDbUnavailable'), 'error');
        }
    }

    afterFirstPaint() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
    }

    runAsync(task) {
        Promise.resolve(task()).catch((error) => {
            console.error(error);
            this.showToast(error.message || this.t('actionFailed'), 'error');
        });
    }

    t(key, params = {}) {
        return this.i18n.t(key, params);
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error(this.t('indexedDbUnsupported')));
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
            request.onerror = () => reject(request.error || new Error(this.t('indexedDbOpenFailed')));
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

    async persistSettingsToDatabase(settings, updatedAt) {
        if (!this.db || this.storageMode === 'localstorage') return;
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction('kv', 'readwrite');
            const store = transaction.objectStore('kv');
            const writtenAt = Date.now();
            store.put({ key: 'settings', value: settings, updatedAt: writtenAt });
            store.put({ key: 'settingsUpdatedAt', value: updatedAt, updatedAt: writtenAt });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error(this.t('actionFailed')));
            transaction.onabort = () => reject(transaction.error || new Error(this.t('actionFailed')));
        });
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
        const parseTombstones = (value) => {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            } catch (error) {
                console.warn('Failed to load sync deletion tombstones:', error);
                return {};
            }
        };

        const localDeleted = parseTombstones(localStorage.getItem('rsvp_deleted_books'));
        const databaseDeleted = this.storageMode !== 'localstorage' && this.db
            ? parseTombstones(await this.getKV('deletedBooks'))
            : {};
        this.deletedBooks = this.mergeDeletedBooks(databaseDeleted, localDeleted);

        const localSettingsEnvelope = this.readLocalSettingsEnvelope();
        const localSettingsUpdatedAt = localSettingsEnvelope?.updatedAt
            || localStorage.getItem('rsvp_settings_updated_at');
        const databaseSettingsUpdatedAt = this.storageMode !== 'localstorage' && this.db
            ? await this.getKV('settingsUpdatedAt')
            : null;
        const databaseSettings = this.storageMode !== 'localstorage' && this.db
            ? await this.getKV('settings')
            : null;
        const localSettingsMissing = !localSettingsEnvelope?.settings
            && !localStorage.getItem('rsvp_settings');
        if (databaseSettings && typeof databaseSettings === 'object'
            && (localSettingsMissing || this.isNewer(databaseSettingsUpdatedAt, localSettingsUpdatedAt))) {
            const migrated = this.migrateSettingsDefaults(databaseSettings);
            this.settings = { ...this.settings, ...migrated.settings, cloudSyncEnabled: false };
            this.settingsUpdatedAt = databaseSettingsUpdatedAt || this.settingsUpdatedAt;
            try {
                localStorage.setItem('paceflow_settings_envelope', JSON.stringify({
                    settings: this.settings,
                    updatedAt: this.settingsUpdatedAt
                }));
                localStorage.setItem('rsvp_settings', JSON.stringify(this.settings));
                localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
            } catch (error) {
                console.warn('Could not mirror IndexedDB settings locally:', error);
            }
            this.loadSettingsToForm();
            this.updateSpeedControls();
        }
        const storedSettingsUpdatedAt = this.isNewer(databaseSettingsUpdatedAt, localSettingsUpdatedAt)
            ? databaseSettingsUpdatedAt
            : localSettingsUpdatedAt;
        if (storedSettingsUpdatedAt) {
            this.settingsUpdatedAt = storedSettingsUpdatedAt;
            try {
                localStorage.setItem('rsvp_settings_updated_at', storedSettingsUpdatedAt);
            } catch (error) {
                console.warn('Could not mirror the settings timestamp:', error);
            }
        }

        if (this.storageMode !== 'localstorage' && this.db) {
            await this.setKV('deletedBooks', this.deletedBooks);
        }
    }

    async persistSyncMetadata(options = {}) {
        let localError = null;
        try {
            localStorage.setItem('rsvp_deleted_books', JSON.stringify(this.deletedBooks));
            localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
        } catch (error) {
            localError = error;
        }

        try {
            if (this.storageMode !== 'localstorage' && this.db) {
                await Promise.all([
                    this.setKV('deletedBooks', this.deletedBooks),
                    this.setKV('settingsUpdatedAt', this.settingsUpdatedAt)
                ]);
            } else if (localError) {
                throw localError;
            }
        } catch (error) {
            if (!options.bestEffort) throw error;
            console.warn('Could not mirror sync metadata:', error);
        }
        if (localError && this.storageMode !== 'localstorage') {
            console.warn('Could not mirror sync metadata to localStorage:', localError);
        }
    }

    async getAllBooks() {
        if (!this.db) return [];
        const books = await this.requestToPromise(this.getStore('books').getAll());
        return books
            .map((book) => this.normalizeBook(book, { recalculateCounts: false, quarantineUnsafe: true }))
            .filter((book) => !this.isBookTombstoned(book))
            .sort((a, b) => {
            return new Date(b.lastRead || b.dateAdded).getTime() - new Date(a.lastRead || a.dateAdded).getTime();
        });
    }

    async getBook(bookId) {
        if (!bookId) return null;

        if (this.storageMode === 'localstorage') {
            const book = this.library.find((item) => item.id === String(bookId));
            const normalized = book ? this.normalizeBook(book, { recalculateCounts: false, quarantineUnsafe: true }) : null;
            return normalized && !this.isBookTombstoned(normalized) ? normalized : null;
        }

        if (!this.db) return null;
        const book = await this.requestToPromise(this.getStore('books').get(String(bookId)));
        const normalized = book ? this.normalizeBook(book, { recalculateCounts: false, quarantineUnsafe: true }) : null;
        return normalized && !this.isBookTombstoned(normalized) ? normalized : null;
    }

    isBookTombstoned(book) {
        const deletedAt = book?.id ? this.deletedBooks[String(book.id)] : null;
        return Boolean(deletedAt && this.isNewerOrEqual(deletedAt, book.updatedAt || book.lastRead));
    }

    async reconcilePrimaryTombstones() {
        if (!this.db || this.storageMode === 'localstorage') return;
        const records = await this.requestToPromise(this.getStore('books').getAll());
        const deletedIds = records
            .map((book) => this.normalizeBook(book, { recalculateCounts: false, quarantineUnsafe: true }))
            .filter((book) => this.isBookTombstoned(book))
            .map((book) => book.id);
        if (deletedIds.length === 0) return;
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction('books', 'readwrite');
            const store = transaction.objectStore('books');
            deletedIds.forEach((bookId) => store.delete(bookId));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error(this.t('actionFailed')));
            transaction.onabort = () => reject(transaction.error || new Error(this.t('actionFailed')));
        });
    }

    nativeFilesystem() {
        return this.nativeStorageAvailable && this.isNativePlatform()
            ? window.Capacitor?.Plugins?.Filesystem
            : null;
    }

    nativePreferences() {
        return this.isNativePlatform() ? window.Capacitor?.Plugins?.Preferences : null;
    }

    nativeBookFileName(bookId) {
        const value = String(bookId);
        let firstHash = 0x811c9dc5;
        let secondHash = 0x9e3779b9;
        for (let index = 0; index < value.length; index++) {
            const code = value.charCodeAt(index);
            firstHash = Math.imul(firstHash ^ code, 0x01000193) >>> 0;
            secondHash = Math.imul(secondHash ^ (code + index), 0x85ebca6b) >>> 0;
        }
        const readablePrefix = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 36) || 'book';
        return `${readablePrefix}-${value.length.toString(36)}-${firstHash.toString(16)}-${secondHash.toString(16)}`;
    }

    bookTextSignature(text) {
        const value = String(text || '');
        const hashes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
        const primes = [0x01000193, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f];
        for (let index = 0; index < value.length; index++) {
            const code = value.charCodeAt(index);
            hashes[0] = Math.imul(hashes[0] ^ code, primes[0]) >>> 0;
            hashes[1] = Math.imul(hashes[1] ^ (code + index), primes[1]) >>> 0;
            hashes[2] = Math.imul(hashes[2] ^ (code + (index * 17)), primes[2]) >>> 0;
            hashes[3] = Math.imul(hashes[3] ^ (code + (index * 31)), primes[3]) >>> 0;
        }
        return `${value.length}:${hashes.map((hash) => hash.toString(16).padStart(8, '0')).join('')}`;
    }

    async ensureNativeBooksDirectory() {
        const filesystem = this.nativeFilesystem();
        if (!filesystem) return;
        try {
            await filesystem.mkdir({ path: 'paceflow/books', directory: 'DATA', recursive: true });
        } catch (error) {
            if (!/exist/i.test(error.message || '')) throw error;
        }
    }

    isNativeFileMissingError(error) {
        return /not\s+exist|not\s+found|does\s+not\s+exist/i.test(error?.message || '');
    }

    async readNativeJson(path) {
        const filesystem = this.nativeFilesystem();
        if (!filesystem) throw new Error('Native filesystem is unavailable.');
        const result = await filesystem.readFile({ path, directory: 'DATA', encoding: 'utf8' });
        return JSON.parse(result.data);
    }

    async readNativeBookIndex() {
        let mainError = null;
        try {
            const index = await this.readNativeJson('paceflow/books-index.json');
            if (!index || typeof index !== 'object' || Array.isArray(index)) throw new SyntaxError('Invalid native book index.');
            return { index, needsRewrite: false };
        } catch (error) {
            mainError = error;
        }

        let backupError = null;
        try {
            const index = await this.readNativeJson('paceflow/books-index.backup.json');
            if (!index || typeof index !== 'object' || Array.isArray(index)) throw new SyntaxError('Invalid native book index backup.');
            console.warn('Recovered the native book index from its backup:', mainError);
            return { index, needsRewrite: true };
        } catch (error) {
            backupError = error;
        }

        const bothMissing = this.isNativeFileMissingError(mainError) && this.isNativeFileMissingError(backupError);
        const indexIsCorrupt = mainError instanceof SyntaxError || backupError instanceof SyntaxError;
        if (bothMissing || indexIsCorrupt) {
            if (indexIsCorrupt) console.warn('Rebuilding a corrupt native book index from primary storage.', mainError, backupError);
            return { index: {}, needsRewrite: indexIsCorrupt };
        }

        // A transient I/O/permission failure must disable this mirror for the
        // session. Treating it as an empty index could overwrite recoverable data.
        throw (this.isNativeFileMissingError(mainError) ? backupError : mainError);
    }

    trackNativeWrite(operation) {
        const promise = Promise.resolve(operation);
        this.pendingNativeWrites.add(promise);
        promise.then(
            () => this.pendingNativeWrites.delete(promise),
            () => this.pendingNativeWrites.delete(promise)
        );
        return promise;
    }

    async drainNativeWrites() {
        while (this.pendingNativeWrites.size > 0) {
            await Promise.allSettled(Array.from(this.pendingNativeWrites));
        }
    }

    queueNativeMutation(task) {
        const operation = this.nativeMutationQueue.then(task, task);
        this.nativeMutationQueue = operation.catch(() => undefined);
        return this.trackNativeWrite(operation);
    }

    disableNativeStorage(error) {
        this.nativeStorageAvailable = false;
        console.warn('Native file mirror is unavailable; IndexedDB remains active:', error);
    }

    async writeNativeBookIndex(generation = this.dataGeneration) {
        const filesystem = this.nativeFilesystem();
        if (!filesystem || this.isDeletingAllData || generation !== this.dataGeneration) return;
        const data = JSON.stringify(this.nativeBookIndex);
        // Two independently valid copies make an interrupted direct write
        // recoverable. On launch the valid copy rebuilds the damaged/missing one.
        for (const path of ['paceflow/books-index.backup.json', 'paceflow/books-index.json']) {
            if (this.isDeletingAllData || generation !== this.dataGeneration) return;
            await this.trackNativeWrite(filesystem.writeFile({
                path,
                directory: 'DATA',
                encoding: 'utf8',
                recursive: true,
                data
            }));
        }
    }

    async restoreNativeBookMirror() {
        const filesystem = this.nativeFilesystem();
        if (!filesystem) return;
        const generation = this.dataGeneration;
        const nativeRepairIds = new Set();
        const nativeDeleteIds = new Set();
        let nativeIndexChanged = false;
        try {
            await this.ensureNativeBooksDirectory();
            if (this.isDeletingAllData || generation !== this.dataGeneration) return;
            const nativeIndexResult = await this.readNativeBookIndex();
            this.nativeBookIndex = nativeIndexResult.index;
            nativeIndexChanged = nativeIndexResult.needsRewrite;
            this.isRestoringNativeBooks = true;
            try {
                for (const [bookId, metadata] of Object.entries(this.nativeBookIndex)) {
                    if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                    try {
                        const deletedAt = this.deletedBooks[bookId];
                        if (deletedAt && this.isNewerOrEqual(deletedAt, metadata.updatedAt || metadata.lastRead)) {
                            nativeDeleteIds.add(bookId);
                            continue;
                        }
                        const textResult = await filesystem.readFile({
                            path: `paceflow/books/${metadata.fileName}.txt`,
                            directory: 'DATA',
                            encoding: 'utf8'
                        });
                        if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                        const actualSignature = this.bookTextSignature(textResult.data);
                        const hasStrongExpectedSignature = /^\d+:[0-9a-f]{32}$/i.test(String(metadata.textSignature || ''));
                        if (hasStrongExpectedSignature && metadata.textSignature !== actualSignature) {
                            throw new Error('Native book text failed its integrity check.');
                        }
                        const verifiedMetadata = { ...metadata, textSignature: actualSignature };
                        if (metadata.textSignature !== actualSignature) {
                            this.nativeBookIndex[bookId] = verifiedMetadata;
                            nativeIndexChanged = true;
                        }
                        const restored = this.normalizeBook(
                            { ...verifiedMetadata, id: bookId, text: textResult.data, nativeOnlyText: false },
                            { recalculateCounts: false, quarantineUnsafe: true }
                        );
                        if (this.storageMode === 'localstorage' || !this.db) {
                            if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                            const existingIndex = this.library.findIndex((book) => book.id === bookId);
                            const existing = existingIndex >= 0 ? this.library[existingIndex] : null;
                            // In fallback mode localStorage is still the primary
                            // store. Only a strictly newer mirror may replace it;
                            // an older/equal native copy is repaired after restore.
                            if (!existing || existing.nativeOnlyText || !existing.text
                                || this.isNewer(metadata.updatedAt || metadata.lastRead, existing.updatedAt || existing.lastRead)) {
                                if (existingIndex >= 0) this.library[existingIndex] = restored;
                                else this.library.push(restored);
                            } else if (existing.textSignature !== actualSignature || existing.updatedAt !== restored.updatedAt) {
                                nativeRepairIds.add(bookId);
                            }
                        } else {
                            const existing = await this.requestToPromise(this.getStore('books').get(bookId));
                            const existingNeedsNativeText = Boolean(existing?.nativeOnlyText && !existing?.text)
                                && (!existing.textSignature || existing.textSignature === actualSignature);
                            if ((!existing || existingNeedsNativeText || this.isNewer(restored.updatedAt, existing.updatedAt))
                                && !this.isDeletingAllData && generation === this.dataGeneration) {
                                const hydrated = existingNeedsNativeText
                                    ? this.normalizeBook({
                                        ...restored,
                                        ...existing,
                                        text: restored.text,
                                        textSignature: actualSignature,
                                        nativeOnlyText: false
                                    }, { recalculateCounts: false, quarantineUnsafe: true })
                                    : restored;
                                await this.requestToPromise(this.getStore('books', 'readwrite').put(hydrated));
                            } else if (existing) {
                                const primary = this.normalizeBook(existing, { recalculateCounts: false, quarantineUnsafe: true });
                                if (primary.textSignature !== actualSignature
                                    || primary.updatedAt !== restored.updatedAt
                                    || metadata.fileName !== this.nativeBookFileName(bookId)) {
                                    nativeRepairIds.add(bookId);
                                }
                            }
                        }
                    } catch (error) {
                        const primary = this.storageMode === 'localstorage' || !this.db
                            ? this.library.find((book) => book.id === bookId)
                            : await this.requestToPromise(this.getStore('books').get(bookId));
                        const nativeIsOnlyTextCopy = Boolean(primary?.nativeOnlyText && !primary?.text);
                        if (nativeIsOnlyTextCopy) {
                            // Do not "repair" the only text copy with the empty
                            // placeholder. Keep it indexed for a later retry while
                            // quarantining the primary record from reader parsing.
                            const quarantined = { ...primary, isUnsafeText: true };
                            if (this.storageMode === 'localstorage' || !this.db) {
                                const primaryIndex = this.library.findIndex((book) => book.id === bookId);
                                if (primaryIndex >= 0) this.library[primaryIndex] = quarantined;
                            } else {
                                await this.requestToPromise(this.getStore('books', 'readwrite').put(quarantined));
                            }
                        } else {
                            this.nativeBookIndex[bookId] = { ...metadata, textSignature: '' };
                            nativeRepairIds.add(bookId);
                            nativeIndexChanged = true;
                        }
                        console.warn(`Could not restore native book ${bookId}:`, error);
                    }
                }
            } finally {
                this.isRestoringNativeBooks = false;
            }

            for (const bookId of nativeDeleteIds) {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                const metadata = this.nativeBookIndex[bookId];
                if (metadata?.fileName) {
                    try {
                        await this.trackNativeWrite(filesystem.deleteFile({
                            path: `paceflow/books/${metadata.fileName}.txt`,
                            directory: 'DATA'
                        }));
                    } catch (error) {
                        if (!this.isNativeFileMissingError(error)) {
                            console.warn(`Could not clean tombstoned native book ${bookId}:`, error);
                            continue;
                        }
                    }
                }
                delete this.nativeBookIndex[bookId];
                nativeIndexChanged = true;
            }

            // A crash may happen after the primary commit but before the native
            // index write. Reconcile every primary record so recovery coverage
            // cannot remain silently incomplete across future launches.
            const primaryBooks = this.storageMode === 'localstorage'
                ? [...this.library]
                : await this.getAllBooks();
            for (const primaryBook of primaryBooks) {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                const nativeMetadata = this.nativeBookIndex[primaryBook.id];
                if (!nativeMetadata
                    || nativeMetadata.fileName !== this.nativeBookFileName(primaryBook.id)
                    || nativeMetadata.textSignature !== primaryBook.textSignature
                    || nativeMetadata.updatedAt !== primaryBook.updatedAt) {
                    nativeRepairIds.add(primaryBook.id);
                }
            }
            const booksToRepair = [];
            for (const bookId of nativeRepairIds) {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                const primaryBook = await this.getBook(bookId);
                if (primaryBook) {
                    booksToRepair.push(primaryBook);
                } else {
                    delete this.nativeBookIndex[bookId];
                    nativeIndexChanged = true;
                }
            }
            const repairedInBatch = booksToRepair.length > 0
                ? await this.persistNativeBooksBatch(booksToRepair, generation)
                : false;
            if (nativeIndexChanged && !repairedInBatch && this.nativeStorageAvailable
                && !this.isDeletingAllData && generation === this.dataGeneration) {
                await this.writeNativeBookIndex(generation);
            }
            if (this.storageMode === 'localstorage'
                && !this.isDeletingAllData && generation === this.dataGeneration) {
                try {
                    localStorage.setItem('rsvp_library', JSON.stringify(this.library));
                } catch (error) {
                    // The native copy remains durable; do not disable it because
                    // the smaller browser fallback happened to exceed its quota.
                    console.warn('Could not persist the reconciled fallback library:', error);
                }
            }
        } catch (error) {
            this.isRestoringNativeBooks = false;
            this.nativeBookIndex = {};
            this.disableNativeStorage(error);
        }
    }

    async persistNativeBooksBatch(books, generation = this.dataGeneration, expectedBookGenerations = null) {
        const filesystem = this.nativeFilesystem();
        if (!filesystem || this.isRestoringNativeBooks || !Array.isArray(books) || books.length === 0) return false;
        const entries = books.map((book) => ({
            book,
            bookGeneration: expectedBookGenerations instanceof Map && expectedBookGenerations.has(String(book.id))
                ? expectedBookGenerations.get(String(book.id))
                : this.getBookWriteGeneration(book.id)
        }));
        let persistedCount = 0;
        try {
            await this.queueNativeMutation(async () => {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                await this.ensureNativeBooksDirectory();
                for (const { book, bookGeneration } of entries) {
                    if (!this.canPersistBook(book.id, generation, bookGeneration)) continue;
                    const fileName = this.nativeBookFileName(book.id);
                    const signature = /^\d+:[0-9a-f]{32}$/i.test(String(book.textSignature || ''))
                        ? String(book.textSignature)
                        : this.bookTextSignature(book.text);
                    const previous = this.nativeBookIndex[book.id];
                    if (!previous || previous.textSignature !== signature || previous.fileName !== fileName) {
                        await this.trackNativeWrite(filesystem.writeFile({
                            path: `paceflow/books/${fileName}.txt`,
                            directory: 'DATA',
                            encoding: 'utf8',
                            recursive: true,
                            data: book.text
                        }));
                    }

                    if (!this.canPersistBook(book.id, generation, bookGeneration)) continue;
                    const { text, ...metadata } = book;
                    this.nativeBookIndex[book.id] = { ...metadata, fileName, textSignature: signature };
                    persistedCount += 1;
                }
                if (persistedCount > 0) await this.writeNativeBookIndex(generation);
            });
            return persistedCount === entries.length;
        } catch (error) {
            this.disableNativeStorage(error);
            return false;
        }
    }

    async persistNativeBook(book, generation = this.dataGeneration, bookGeneration = this.getBookWriteGeneration(book.id)) {
        if (!this.canPersistBook(book.id, generation, bookGeneration)) return false;
        return this.persistNativeBooksBatch(
            [book],
            generation,
            new Map([[String(book.id), bookGeneration]])
        );
    }

    async removeNativeBook(bookId) {
        const filesystem = this.nativeFilesystem();
        if (!filesystem) return;
        try {
            await this.queueNativeMutation(async () => {
                const metadata = this.nativeBookIndex[String(bookId)];
                if (metadata?.fileName) {
                    try {
                        await this.trackNativeWrite(filesystem.deleteFile({ path: `paceflow/books/${metadata.fileName}.txt`, directory: 'DATA' }));
                    } catch (error) {
                        if (!/not\s+exist|not\s+found|does\s+not\s+exist/i.test(error.message || '')) throw error;
                    }
                }
                delete this.nativeBookIndex[String(bookId)];
                await this.writeNativeBookIndex();
            });
        } catch (error) {
            this.disableNativeStorage(error);
            throw error;
        }
    }

    getBookWriteGeneration(bookId) {
        return this.bookWriteGenerations.get(String(bookId)) || 0;
    }

    bumpBookWriteGeneration(bookId) {
        const key = String(bookId);
        const next = this.getBookWriteGeneration(key) + 1;
        this.bookWriteGenerations.set(key, next);
        return next;
    }

    isBookWriteCurrent(bookId, generation) {
        return this.getBookWriteGeneration(bookId) === generation;
    }

    canPersistBook(bookId, dataGeneration, bookGeneration) {
        return !this.isDeletingAllData
            && dataGeneration === this.dataGeneration
            && this.isBookWriteCurrent(bookId, bookGeneration);
    }

    queueBookMutation(bookId, task) {
        const key = String(bookId);
        const previous = this.bookMutationQueues.get(key) || Promise.resolve();
        const operation = previous.catch(() => undefined).then(task);
        let trackedOperation;
        trackedOperation = operation.finally(() => {
            if (this.bookMutationQueues.get(key) === trackedOperation) {
                this.bookMutationQueues.delete(key);
            }
        });
        this.bookMutationQueues.set(key, trackedOperation);
        return trackedOperation;
    }

    async mutateBook(bookId, mutator, options = {}) {
        const key = String(bookId || '');
        if (!key) return null;
        const generation = options.generation ?? this.dataGeneration;
        const bookGeneration = options.bookGeneration ?? this.getBookWriteGeneration(key);
        return this.queueBookMutation(key, async () => {
            if (!this.canPersistBook(key, generation, bookGeneration)) return null;
            if (this.storageMode === 'localstorage' || !this.db) {
                const latest = await this.getBook(key);
                if (!latest || !this.canPersistBook(key, generation, bookGeneration)) return null;
                const candidate = await mutator(latest);
                if (!candidate || !this.canPersistBook(key, generation, bookGeneration)) return null;
                return this.putBook({ ...candidate, id: key }, {
                    ...options,
                    generation,
                    bookGeneration,
                    previousBook: latest
                });
            }

            let savedBook = null;
            let mutationError = null;
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction('books', 'readwrite');
                const store = transaction.objectStore('books');
                const request = store.get(key);
                request.onsuccess = () => {
                    try {
                        if (!request.result || !this.canPersistBook(key, generation, bookGeneration)) return;
                        if (this.deletedBooks[key] && !options.allowRestore) return;
                        const latest = this.normalizeBook(request.result, { recalculateCounts: false, quarantineUnsafe: true });
                        const candidate = mutator(latest);
                        if (candidate && typeof candidate.then === 'function') {
                            throw new Error('Book mutations must be synchronous inside IndexedDB transactions.');
                        }
                        if (!candidate || !this.canPersistBook(key, generation, bookGeneration)) return;
                        const nextBook = { ...candidate, id: key };
                        const textChanged = String(nextBook.text || '') !== latest.text;
                        if (textChanged) delete nextBook.textSignature;
                        else nextBook.textSignature = latest.textSignature;
                        savedBook = this.normalizeBook(nextBook, { recalculateCounts: textChanged });
                        if (options.allowRestore) delete this.deletedBooks[key];
                        store.put(savedBook);
                    } catch (error) {
                        mutationError = error;
                        transaction.abort();
                    }
                };
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(mutationError || transaction.error || new Error(this.t('actionFailed')));
                transaction.onabort = () => reject(mutationError || transaction.error || new Error(this.t('actionFailed')));
            });
            if (!savedBook) return null;
            return this.completeBookPersistence(savedBook, generation, bookGeneration, options);
        });
    }

    async putBook(book, options = {}) {
        const generation = options.generation ?? this.dataGeneration;
        const sourceBook = { ...book };
        const previousBook = options.previousBook || null;
        const textChanged = previousBook ? String(sourceBook.text || '') !== previousBook.text : true;
        if (previousBook && !textChanged) sourceBook.textSignature = previousBook.textSignature;
        else delete sourceBook.textSignature;
        const normalized = this.normalizeBook(sourceBook, {
            recalculateCounts: options.recalculateCounts ?? textChanged
        });
        const bookGeneration = options.bookGeneration ?? this.getBookWriteGeneration(normalized.id);
        const allowRestore = Boolean(options.allowRestore);
        if (!this.canPersistBook(normalized.id, generation, bookGeneration)) return null;
        if (this.deletedBooks[normalized.id] && !allowRestore) return null;
        if (allowRestore) {
            delete this.deletedBooks[normalized.id];
        }

        if (this.storageMode === 'localstorage') {
            const previousLibrary = [...this.library];
            const index = this.library.findIndex((item) => item.id === normalized.id);
            if (index >= 0) {
                this.library[index] = normalized;
            } else {
                this.library.push(normalized);
            }
            const compactSnapshot = this.library.map((item) => (
                item.nativeOnlyText ? { ...item, text: '' } : item
            ));
            try {
                localStorage.setItem('rsvp_library', JSON.stringify(compactSnapshot));
            } catch (storageError) {
                const nativeSaved = await this.persistNativeBook(normalized, generation, bookGeneration);
                if (!nativeSaved) {
                    this.library = previousLibrary;
                    throw storageError;
                }
                normalized.nativeOnlyText = true;
                const currentIndex = this.library.findIndex((item) => item.id === normalized.id);
                if (currentIndex >= 0) this.library[currentIndex] = normalized;
                const nativeBackedSnapshot = this.library.map((item) => (
                    item.nativeOnlyText ? { ...item, text: '' } : item
                ));
                try {
                    localStorage.setItem('rsvp_library', JSON.stringify(nativeBackedSnapshot));
                } catch (compactError) {
                    console.warn('Native book saved, but fallback metadata exceeded localStorage:', compactError);
                }
                await this.persistSyncMetadata({ bestEffort: true });
                this.markSyncPending();
                return normalized;
            }
            return this.completeBookPersistence(normalized, generation, bookGeneration, options);
        }

        await this.requestToPromise(this.getStore('books', 'readwrite').put(normalized));
        return this.completeBookPersistence(normalized, generation, bookGeneration, options);
    }

    async persistImportedBooksAtomically(books, generation = this.dataGeneration, options = {}) {
        if (!Array.isArray(books) || (books.length === 0 && !options.settings)) return [];
        if (this.isDeletingAllData || generation !== this.dataGeneration) return [];
        let nativeBatchAlreadyStored = false;

        if (this.storageMode === 'localstorage' || !this.db) {
            const nextLibrary = [...this.library, ...books];
            // One localStorage assignment is the commit boundary: quota errors
            // leave the previous library untouched instead of importing a prefix.
            try {
                const snapshot = nextLibrary.map((book) => book.nativeOnlyText ? { ...book, text: '' } : book);
                localStorage.setItem('rsvp_library', JSON.stringify(snapshot));
            } catch (storageError) {
                nativeBatchAlreadyStored = await this.persistNativeBooksBatch(books, generation);
                if (!nativeBatchAlreadyStored) throw storageError;
                books.forEach((book) => { book.nativeOnlyText = true; });
                const compactSnapshot = nextLibrary.map((book) => book.nativeOnlyText ? { ...book, text: '' } : book);
                try {
                    localStorage.setItem('rsvp_library', JSON.stringify(compactSnapshot));
                } catch (compactError) {
                    console.warn('Imported books are native-backed; fallback metadata exceeded localStorage:', compactError);
                }
            }
            if (this.isDeletingAllData || generation !== this.dataGeneration) return [];
            this.library = nextLibrary;
        } else {
            await new Promise((resolve, reject) => {
                const storeNames = options.settings ? ['books', 'kv'] : ['books'];
                const transaction = this.db.transaction(storeNames, 'readwrite');
                const store = transaction.objectStore('books');
                try {
                    if (this.isDeletingAllData || generation !== this.dataGeneration) {
                        transaction.abort();
                        return;
                    }
                    books.forEach((book) => store.put(book));
                    if (options.settings) {
                        const kvStore = transaction.objectStore('kv');
                        const writtenAt = Date.now();
                        kvStore.put({ key: 'settings', value: options.settings, updatedAt: writtenAt });
                        kvStore.put({
                            key: 'settingsUpdatedAt',
                            value: options.settingsUpdatedAt,
                            updatedAt: writtenAt
                        });
                    }
                } catch (error) {
                    transaction.abort();
                    reject(error);
                    return;
                }
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error || new Error(this.t('actionFailed')));
                transaction.onabort = () => reject(transaction.error || new Error(this.t('actionFailed')));
            });
        }

        // Native storage is a repairable recovery mirror. Complete the atomic
        // primary commit first, then reconcile each mirror entry independently.
        if (!nativeBatchAlreadyStored) await this.persistNativeBooksBatch(books, generation);
        if (!this.isApplyingRemote) this.markSyncPending();
        return books;
    }

    async completeBookPersistence(normalized, generation, bookGeneration, options = {}) {
        if (!this.canPersistBook(normalized.id, generation, bookGeneration)) return null;
        if (!this.isApplyingRemote && !options.skipSync) {
            await this.persistSyncMetadata({ bestEffort: true });
            if (!this.canPersistBook(normalized.id, generation, bookGeneration)) return null;
            this.markSyncPending();
        }
        if (!options.skipNative) {
            await this.persistNativeBook(normalized, generation, bookGeneration);
        }
        return normalized;
    }

    async deleteBookFromStorage(bookId) {
        const key = String(bookId);
        this.bumpBookWriteGeneration(key);
        if (!this.isApplyingRemote) {
            this.deletedBooks[key] = new Date().toISOString();
        }

        if (this.storageMode === 'localstorage' || !this.db) {
            await this.persistSyncMetadata();
            this.library = this.library.filter((book) => book.id !== key);
            try {
                localStorage.setItem('rsvp_library', JSON.stringify(this.library));
            } catch (error) {
                // The durable tombstone remains authoritative even if the stale
                // fallback array cannot be compacted immediately.
                console.warn('Could not compact the fallback library after deletion:', error);
            }
        } else {
            // Book removal and its tombstone share one IndexedDB commit boundary.
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['books', 'kv'], 'readwrite');
                transaction.objectStore('books').delete(key);
                transaction.objectStore('kv').put({
                    key: 'deletedBooks',
                    value: this.deletedBooks,
                    updatedAt: Date.now()
                });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error || new Error(this.t('deleteBookFailed')));
                transaction.onabort = () => reject(transaction.error || new Error(this.t('deleteBookFailed')));
            });
            try {
                localStorage.setItem('rsvp_deleted_books', JSON.stringify(this.deletedBooks));
            } catch (error) {
                console.warn('Could not mirror the deletion tombstone locally:', error);
            }
        }

        if (!this.isApplyingRemote) this.markSyncPending();

        // Native cleanup follows the authoritative primary commit. If it fails,
        // the tombstone still prevents recovery from resurrecting the book.
        try {
            await this.removeNativeBook(key);
        } catch (error) {
            console.warn('Book deleted; native cleanup will be retried on a later launch:', error);
        }
    }

    async migrateLegacyData() {
        const migrated = await this.getKV('legacyMigrated');
        if (migrated) return;

        const savedLibrary = localStorage.getItem('rsvp_library');
        const skippedBooks = [];
        let libraryWasTraversed = true;
        if (savedLibrary) {
            try {
                const legacyBooks = JSON.parse(savedLibrary);
                if (!Array.isArray(legacyBooks)) throw new Error('Legacy library is not an array.');
                for (const legacyBook of legacyBooks) {
                    let normalized;
                    try {
                        normalized = this.normalizeBook(legacyBook);
                    } catch (error) {
                        skippedBooks.push(String(legacyBook?.id || '(unknown)'));
                        console.warn('Skipped one invalid legacy book during migration:', error);
                        continue;
                    }
                    const existing = await this.getBook(normalized.id);
                    const legacyTimestamp = legacyBook?.updatedAt || legacyBook?.lastRead || legacyBook?.dateAdded;
                    if (!existing || this.isNewer(legacyTimestamp, existing.updatedAt || existing.lastRead)) {
                        // Persistence errors intentionally escape to the outer
                        // catch so migration is retried on the next launch.
                        await this.putBook(normalized, { previousBook: existing });
                    }
                }
            } catch (error) {
                libraryWasTraversed = false;
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
                currentIndex: Number.isFinite(legacyBookmark) ? legacyBookmark : 0,
                chapters: [],
                lastMode: 'input'
            });
        }

        if (skippedBooks.length > 0) await this.setKV('legacyMigrationSkippedBooks', skippedBooks);
        if (libraryWasTraversed) await this.setKV('legacyMigrated', true);
    }

    async loadDraft() {
        if (this.hasUnsavedTextInput) return;
        const databaseDraft = this.storageMode !== 'localstorage' && this.db
            ? await this.getKV('draft')
            : null;
        const localDraft = this.readLocalDraftEnvelope();
        const nativeDraft = this.nativeDraftSnapshot;
        const resumeSnapshot = this.loadResumeSnapshot();
        const resumeBook = resumeSnapshot?.currentBookId
            ? await this.getBook(resumeSnapshot.currentBookId)
            : null;
        if (this.hasUnsavedTextInput) return;
        const resumeDraft = resumeBook && this.resumeMatchesBook(resumeSnapshot, resumeBook)
            ? {
                text: resumeBook.text,
                bookName: resumeBook.name,
                currentBookId: resumeBook.id,
                currentIndex: resumeSnapshot.currentIndex,
                chapters: resumeBook.chapters,
                lastMode: resumeSnapshot.mode,
                updatedAt: resumeSnapshot.updatedAt
            }
            : null;
        let draft = null;
        for (const candidate of [databaseDraft, localDraft, nativeDraft, resumeDraft]) {
            if (!candidate || typeof candidate.text !== 'string') continue;
            const revision = this.persistedRevision(candidate);
            this.draftRevision = Math.max(this.draftRevision, revision);
            const candidateSignature = candidate.textSignature || '';
            if (!candidate.currentBookId && candidateSignature
                && candidateSignature !== this.bookTextSignature(candidate.text)) {
                console.warn('Ignored a draft whose content signature does not match its text.');
                continue;
            }
            if (!draft || this.isPersistedSnapshotNewer(candidate, draft)) {
                draft = candidate;
            }
        }
        if (!draft) {
            this.loadLegacyText();
            return;
        }

        const draftBookId = draft.currentBookId ? String(draft.currentBookId) : null;
        const authoritativeBook = draftBookId ? await this.getBook(draftBookId) : null;
        if (this.hasUnsavedTextInput) return;
        const content = authoritativeBook
            ? {
                ...draft,
                text: authoritativeBook.text,
                bookName: authoritativeBook.name,
                currentBookId: authoritativeBook.id,
                chapters: authoritativeBook.chapters
            }
            : draft;
        const resumeMatches = resumeSnapshot?.currentBookId === content.currentBookId;
        const resumeIsCurrent = resumeMatches
            && (!authoritativeBook || this.resumeMatchesBook(resumeSnapshot, authoritativeBook));
        const draftMatchesBook = !authoritativeBook || !draft.textSignature
            || draft.textSignature === authoritativeBook.textSignature;
        const draftIndex = resumeIsCurrent
            ? resumeSnapshot.currentIndex
            : (authoritativeBook && !draftMatchesBook
                ? authoritativeBook.currentIndex
                : (authoritativeBook?.currentIndex ?? content.currentIndex));

        this.setTextInputValue(content.text);
        this.bookNameInput.value = content.bookName || '';
        this.currentBookId = content.currentBookId || null;
        this.currentBookName = content.bookName || '';
        this.currentTextSignature = authoritativeBook?.textSignature || '';
        this.currentChapters = this.normalizeChapters(content.chapters || []);
        this.lastSavedMode = content.lastMode || 'input';
        try {
            this.currentIndex = this.clampIndex(Number(draftIndex) || 0, this.parseText(content.text).length);
            this.hasUnsafeDraft = false;
        } catch (error) {
            // Keep oversized/legacy content visible and deletable in the input
            // screen without allowing it to reject the whole bootstrap promise.
            this.currentIndex = 0;
            this.lastSavedMode = 'input';
            this.hasUnsafeDraft = true;
            console.warn('Draft is outside safe reader limits and was left in input mode:', error);
        }

        // Only mirror a database draft back to localStorage when it actually won
        // newest-wins resolution. Never clobber a newer synchronous checkpoint.
        if (draft !== localDraft) {
            const redundantBookText = Boolean(content.currentBookId);
            const localContent = { ...content, text: redundantBookText ? '' : content.text };
            const textSnapshotStored = this.storeLocalDraftEnvelope(localContent);
            if (textSnapshotStored) {
                try { localStorage.removeItem('rsvp_text'); } catch (error) { /* no-op */ }
            } else {
                this.storeLegacyTextSnapshot(localContent.text);
            }
            const { text: ignoredText, ...metadata } = content;
            this.storeLocalDraftMetadata({ ...metadata, textSnapshotStored });
        }
        try {
            localStorage.setItem('rsvp_bookmark', String(this.currentIndex));
        } catch (error) {
            console.warn('Could not mirror the reading position:', error);
        }
    }

    readLocalDraftMetadata() {
        try {
            const value = JSON.parse(localStorage.getItem('paceflow_draft_meta') || 'null');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        } catch (error) {
            console.warn('Could not read fallback draft metadata:', error);
            return null;
        }
    }

    readLocalDraftEnvelope() {
        try {
            const envelope = JSON.parse(localStorage.getItem('paceflow_draft_envelope') || 'null');
            if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)
                && typeof envelope.text === 'string') {
                return envelope;
            }
        } catch (error) {
            console.warn('Could not read the atomic fallback draft:', error);
        }

        // Compatibility with pre-envelope builds.
        const metadata = this.readLocalDraftMetadata();
        if (!metadata) return null;
        const storedText = localStorage.getItem('rsvp_text');
        const hasUsableContent = Boolean(metadata.currentBookId)
            || (metadata.textSnapshotStored !== false && storedText !== null);
        if (!hasUsableContent) return null;
        return { ...metadata, text: storedText || '' };
    }

    storeLocalDraftMetadata(metadata) {
        try {
            localStorage.setItem('paceflow_draft_meta', JSON.stringify(metadata));
            return true;
        } catch (error) {
            console.warn('Could not store fallback draft metadata:', error);
            return false;
        }
    }

    storeLocalDraftEnvelope(draft) {
        try {
            localStorage.setItem('paceflow_draft_envelope', JSON.stringify(draft));
            return true;
        } catch (error) {
            console.warn('Atomic local draft exceeded localStorage capacity:', error);
            return false;
        }
    }

    loadLegacyText(metadata = null) {
        if (this.hasUnsavedTextInput) return;
        const envelope = this.readLocalDraftEnvelope();
        const saved = envelope?.text ?? localStorage.getItem('rsvp_text');
        if (saved) {
            this.setTextInputValue(saved);
        }
        const draftMetadata = metadata || envelope || this.readLocalDraftMetadata();
        const resumeSnapshot = this.loadResumeSnapshot();
        const savedIndex = draftMetadata?.currentIndex
            ?? resumeSnapshot?.currentIndex
            ?? parseInt(localStorage.getItem('rsvp_bookmark') || '0', 10);
        this.currentBookId = draftMetadata?.currentBookId ?? resumeSnapshot?.currentBookId ?? null;
        this.currentBookName = draftMetadata?.bookName || '';
        this.bookNameInput.value = draftMetadata?.bookName || '';
        this.currentChapters = this.normalizeChapters(draftMetadata?.chapters || []);
        this.lastSavedMode = draftMetadata?.lastMode || resumeSnapshot?.mode || 'input';
        try {
            this.currentIndex = this.clampIndex(Number(savedIndex) || 0, this.parseText(saved || '').length);
            this.hasUnsafeDraft = false;
        } catch (error) {
            this.currentIndex = 0;
            this.lastSavedMode = 'input';
            this.hasUnsafeDraft = true;
            console.warn('Legacy draft is outside safe reader limits and was left in input mode:', error);
        }
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
            const normalized = Array.isArray(parsed)
                ? parsed.map((book) => this.normalizeBook(book, { recalculateCounts: false, quarantineUnsafe: true }))
                : [];
            this.library = normalized.filter((book) => !this.isBookTombstoned(book));
            if (this.library.length !== normalized.length) {
                try {
                    localStorage.setItem('rsvp_library', JSON.stringify(this.library));
                } catch (writeError) {
                    console.warn('Could not compact tombstoned fallback books:', writeError);
                }
            }
        } catch (error) {
            console.error('Failed to load library:', error);
            this.library = [];
        }
    }

    storeLegacyTextSnapshot(text) {
        try {
            localStorage.setItem('rsvp_text', String(text || ''));
            return true;
        } catch (error) {
            // IndexedDB/native storage remains authoritative. Remove a stale
            // legacy copy so a future fallback never opens the wrong text.
            try { localStorage.removeItem('rsvp_text'); } catch (removeError) { /* no-op */ }
            console.warn('Legacy text snapshot exceeded localStorage capacity:', error);
            return false;
        }
    }

    saveDraftSoon() {
        clearTimeout(this.draftSaveTimer);
        this.draftSaveTimer = setTimeout(() => this.runAsync(() => this.saveDraft()), 250);
    }

    async saveDraft(options = {}) {
        const generation = options.generation ?? this.dataGeneration;
        if (this.isDeletingAllData || generation !== this.dataGeneration) return;
        const draft = {
            text: this.textInput.value,
            bookName: this.bookNameInput.value.trim(),
            currentBookId: this.currentBookId,
            currentIndex: this.currentIndex,
            chapters: this.currentChapters,
            lastMode: this.mode,
            revision: ++this.draftRevision,
            textSignature: this.bookTextSignature(this.textInput.value),
            updatedAt: new Date().toISOString()
        };

        const redundantBookText = Boolean(draft.currentBookId);
        const localDraft = { ...draft, text: redundantBookText ? '' : draft.text };
        const localEnvelopeStored = this.storeLocalDraftEnvelope(localDraft);
        if (localEnvelopeStored) {
            try { localStorage.removeItem('rsvp_text'); } catch (error) { /* no-op */ }
        } else {
            this.storeLegacyTextSnapshot(localDraft.text);
        }
        try {
            localStorage.setItem('rsvp_bookmark', String(this.currentIndex));
        } catch (error) {
            console.warn('Could not mirror the reading position:', error);
        }
        const { text: ignoredText, ...draftMetadata } = draft;
        this.storeLocalDraftMetadata({ ...draftMetadata, textSnapshotStored: localEnvelopeStored });
        this.saveResumeSnapshot(generation, { forceNative: false });

        let databaseStored = false;
        if (this.storageMode !== 'localstorage' && !this.isDeletingAllData && generation === this.dataGeneration) {
            try {
                await this.setKV('draft', redundantBookText ? { ...draft, text: '' } : draft);
                databaseStored = true;
            } catch (error) {
                console.warn('Could not persist the IndexedDB draft:', error);
            }
        }

        if (redundantBookText) await this.clearNativeDraft(generation);
        const nativeStored = redundantBookText ? false : await this.persistNativeDraft(draft, generation);
        const durable = redundantBookText || localEnvelopeStored || databaseStored || nativeStored;

        if (durable && this.textInput.value === draft.text
            && this.bookNameInput.value.trim() === draft.bookName) {
            this.hasUnsavedTextInput = false;
        }

        if (!durable && !this.isDeletingAllData && generation === this.dataGeneration) {
            throw new Error(this.t('draftSaveFailed'));
        }

        if (!this.isDeletingAllData && generation === this.dataGeneration && !options.skipSync && !this.isApplyingRemote) {
            this.markSyncPending();
        }
    }

    saveResumeSnapshot(generation = this.dataGeneration, options = {}) {
        if (this.isDeletingAllData || generation !== this.dataGeneration) return;
        const snapshot = {
            currentBookId: this.currentBookId,
            currentIndex: this.currentIndex,
            mode: this.mode === 'input' ? 'input' : 'normal',
            textSignature: this.currentBookId
                ? (this.currentTextSignature || this.library.find((book) => book.id === this.currentBookId)?.textSignature || '')
                : '',
            revision: ++this.resumeRevision,
            updatedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem('paceflow_resume', JSON.stringify(snapshot));
            localStorage.setItem('rsvp_bookmark', String(this.currentIndex));
        } catch (error) {
            // localStorage quota must not prevent the independent native mirror.
            console.warn('Could not save browser resume snapshot:', error);
        }

        const preferences = this.nativePreferences();
        const now = Date.now();
        const shouldPersistNative = options.forceNative !== false
            || (now - this.lastNativeResumePersistedAt) >= this.nativeResumePersistIntervalMs;
        if (preferences && shouldPersistNative) {
            this.lastNativeResumePersistedAt = now;
            const serializedSnapshot = JSON.stringify(snapshot);
            this.queueNativeMutation(async () => {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                await preferences.set({ key: 'paceflow_resume', value: serializedSnapshot });
            })
                .catch((error) => console.warn('Could not mirror native resume snapshot:', error));
        }
    }

    loadResumeSnapshot() {
        let localSnapshot = null;
        try {
            localSnapshot = JSON.parse(localStorage.getItem('paceflow_resume') || 'null');
        } catch (error) {
            localSnapshot = null;
        }
        this.resumeRevision = Math.max(
            this.resumeRevision,
            this.persistedRevision(localSnapshot),
            this.persistedRevision(this.nativeResumeSnapshot)
        );
        if (!localSnapshot) return this.nativeResumeSnapshot;
        if (!this.nativeResumeSnapshot) return localSnapshot;
        return this.isPersistedSnapshotNewer(this.nativeResumeSnapshot, localSnapshot)
            ? this.nativeResumeSnapshot
            : localSnapshot;
    }

    resumeMatchesBook(snapshot, book) {
        if (!snapshot || !book || snapshot.currentBookId !== book.id) return false;
        if (snapshot.textSignature && book.textSignature) {
            return snapshot.textSignature === book.textSignature;
        }
        // Timestamp fallback only applies to snapshots written by older builds
        // that did not carry a content revision.
        return this.isNewerOrEqual(snapshot.updatedAt, book.updatedAt);
    }

    async loadNativeResumeSnapshot() {
        const preferences = this.nativePreferences();
        if (!preferences) return;
        try {
            const result = await preferences.get({ key: 'paceflow_resume' });
            this.nativeResumeSnapshot = result.value ? JSON.parse(result.value) : null;
            let localSnapshot = null;
            try {
                localSnapshot = JSON.parse(localStorage.getItem('paceflow_resume') || 'null');
            } catch (error) {
                localSnapshot = null;
            }
            this.resumeRevision = Math.max(
                this.resumeRevision,
                this.persistedRevision(localSnapshot),
                this.persistedRevision(this.nativeResumeSnapshot)
            );
            if (this.nativeResumeSnapshot
                && (!localSnapshot || this.isPersistedSnapshotNewer(this.nativeResumeSnapshot, localSnapshot))) {
                try {
                    localStorage.setItem('paceflow_resume', JSON.stringify(this.nativeResumeSnapshot));
                } catch (error) {
                    console.warn('Could not mirror the native resume snapshot locally:', error);
                }
            }
        } catch (error) {
            console.warn('Could not read native resume snapshot:', error);
        }
    }

    async persistNativeDraft(draft, generation = this.dataGeneration) {
        const filesystem = this.nativeFilesystem();
        const preferences = this.nativePreferences();
        if (!filesystem || !preferences || draft.currentBookId
            || this.isDeletingAllData || generation !== this.dataGeneration) return false;
        const textSignature = this.bookTextSignature(draft.text);
        const fileName = `draft-${textSignature.replace(/[^a-z0-9]/gi, '-')}.txt`;
        let committed = false;
        try {
            await this.queueNativeMutation(async () => {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                const previousFileName = this.lastNativeDraftFileName;
                if (this.lastNativeDraftSignature !== textSignature || previousFileName !== fileName) {
                    await this.trackNativeWrite(filesystem.writeFile({
                        path: `paceflow/${fileName}`,
                        directory: 'DATA',
                        encoding: 'utf8',
                        recursive: true,
                        data: draft.text
                    }));
                }
                const { text: ignoredText, ...metadata } = draft;
                await preferences.set({
                    key: 'paceflow_draft_meta',
                    value: JSON.stringify({ ...metadata, textSignature, fileName })
                });
                this.lastNativeDraftSignature = textSignature;
                this.lastNativeDraftFileName = fileName;
                this.hasNativeDraft = true;
                this.nativeDraftSnapshot = { ...draft, textSignature, fileName };
                committed = true;
                // The pointer commit above makes the new version authoritative;
                // an interrupted cleanup can only leave an unreferenced old file.
                if (previousFileName && previousFileName !== fileName) {
                    try {
                        await this.trackNativeWrite(filesystem.deleteFile({
                            path: `paceflow/${previousFileName}`,
                            directory: 'DATA'
                        }));
                    } catch (error) {
                        if (!this.isNativeFileMissingError(error)) console.warn('Could not remove an old native draft version:', error);
                    }
                }
            });
            return committed && !this.isDeletingAllData && generation === this.dataGeneration;
        } catch (error) {
            console.warn('Could not persist the native draft mirror:', error);
            return false;
        }
    }

    async loadNativeDraftSnapshot() {
        const filesystem = this.nativeFilesystem();
        const preferences = this.nativePreferences();
        if (!filesystem || !preferences) return;
        try {
            const result = await preferences.get({ key: 'paceflow_draft_meta' });
            if (!result.value) return;
            const metadata = JSON.parse(result.value);
            if (!metadata || metadata.currentBookId) return;
            const textResult = await filesystem.readFile({
                path: `paceflow/${metadata.fileName || 'draft.txt'}`,
                directory: 'DATA',
                encoding: 'utf8'
            });
            if (metadata.textSignature !== this.bookTextSignature(textResult.data)) {
                throw new Error('Native draft text failed its integrity check.');
            }
            this.lastNativeDraftSignature = metadata.textSignature;
            this.lastNativeDraftFileName = metadata.fileName || 'draft.txt';
            this.hasNativeDraft = true;
            this.nativeDraftSnapshot = { ...metadata, text: textResult.data };
        } catch (error) {
            if (!this.isNativeFileMissingError(error)) {
                console.warn('Could not load the native draft mirror:', error);
            }
        }
    }

    async clearNativeDraft(generation = this.dataGeneration) {
        if (this.isDeletingAllData || generation !== this.dataGeneration) return;
        const filesystem = this.nativeFilesystem();
        const preferences = this.nativePreferences();
        if (!preferences) return;
        try {
            await this.queueNativeMutation(async () => {
                if (this.isDeletingAllData || generation !== this.dataGeneration) return;
                const fileName = this.lastNativeDraftFileName;
                if (typeof preferences.remove === 'function') {
                    await preferences.remove({ key: 'paceflow_draft_meta' });
                } else {
                    await preferences.set({ key: 'paceflow_draft_meta', value: '' });
                }
                this.hasNativeDraft = false;
                this.nativeDraftSnapshot = null;
                this.lastNativeDraftSignature = '';
                this.lastNativeDraftFileName = '';
                if (filesystem && fileName) {
                    try {
                        await this.trackNativeWrite(filesystem.deleteFile({ path: `paceflow/${fileName}`, directory: 'DATA' }));
                    } catch (error) {
                        if (!this.isNativeFileMissingError(error)) console.warn('Could not remove the native draft file:', error);
                    }
                }
            });
        } catch (error) {
            console.warn('Could not clear the native draft mirror:', error);
        }
    }

    async hydrateDraftFromNativeResume() {
        if (this.hasUnsavedTextInput || this.textInput.value.trim()) return;
        const snapshot = this.loadResumeSnapshot();
        const fallbackBookId = snapshot?.currentBookId || this.currentBookId;
        const fallbackBook = fallbackBookId
            ? await this.getBook(fallbackBookId)
            : this.library[0];
        if (this.hasUnsavedTextInput) return;
        if (!fallbackBook) return;
        this.setTextInputValue(fallbackBook.text);
        this.bookNameInput.value = fallbackBook.name;
        this.currentBookId = fallbackBook.id;
        this.currentBookName = fallbackBook.name;
        this.currentTextSignature = fallbackBook.textSignature;
        this.currentChapters = this.normalizeChapters(fallbackBook.chapters);
        this.hasUnsafeDraft = Boolean(fallbackBook.isUnsafeText);
        const snapshotMatches = snapshot?.currentBookId === fallbackBook.id;
        this.currentIndex = this.clampIndex(
            snapshotMatches && this.resumeMatchesBook(snapshot, fallbackBook)
                ? snapshot.currentIndex
                : fallbackBook.currentIndex,
            fallbackBook.tokenCount
        );
        await this.saveDraft({ skipSync: true });
    }

    async restoreLastSession() {
        if (this.hasUnsavedTextInput || this.hasUnsafeDraft) return;
        const snapshot = this.loadResumeSnapshot();
        const shouldRestoreReader = snapshot?.mode === 'normal' || this.lastSavedMode === 'normal';
        const book = this.currentBookId ? await this.getBook(this.currentBookId) : null;
        if (this.hasUnsavedTextInput) return;
        const text = (book?.text || this.textInput.value).trim();
        if (!text) return;
        if (!book && !shouldRestoreReader) return;
        if (this.currentBookId && !book) this.currentBookId = null;

        if (book) {
            this.setTextInputValue(book.text);
            this.bookNameInput.value = book.name;
            this.currentTextSignature = book.textSignature;
        }
        this.currentBookName = book?.name || this.bookNameInput.value.trim();
        this.currentChapters = this.normalizeChapters(book?.chapters || this.currentChapters);
        this.assertTextTokenSafety(text, { requireReadable: true });
        this.words = this.parseText(text);
        const resumeIndex = snapshot && snapshot.currentBookId === this.currentBookId
            && (!book || this.resumeMatchesBook(snapshot, book))
            ? snapshot.currentIndex
            : (book?.currentIndex ?? this.currentIndex);
        this.currentIndex = this.nearestReadableIndex(this.clampIndex(Number(resumeIndex) || 0, this.words.length));
        this.mode = 'normal';
        this.renderNormalText();
        this.updateProgress();
        this.updateCurrentBookInfo();
        this.showSection('normal');
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
            this.composerRevision += 1;
            this.currentBookId = null;
            this.currentBookName = '';
            this.currentTextSignature = '';
            this.currentChapters = [];
            this.pendingChapters = [];
            this.currentIndex = 0;
            this.hasUnsavedTextInput = true;
            this.hasUnsafeDraft = false;
        }
        this.saveDraftSoon();
    }

    normalizeBook(book, options = {}) {
        book = book && typeof book === 'object' ? book : {};
        const text = typeof book.text === 'string' ? book.text : '';
        const storedWordCount = Number(book.wordCount);
        const storedTokenCount = Number(book.tokenCount);
        const hasStoredWordCount = Number.isInteger(storedWordCount) && storedWordCount >= 0;
        const hasStoredTokenCount = Number.isInteger(storedTokenCount) && storedTokenCount >= 0;
        const storedCountsAreValid = book.textModelVersion === 2 && hasStoredWordCount && hasStoredTokenCount;
        const shouldRecalculateCounts = options.recalculateCounts !== false || !storedCountsAreValid;
        let tokens = null;
        let unsafeText = Boolean(book.isUnsafeText);
        if (shouldRecalculateCounts) {
            try {
                tokens = this.parseText(text);
                unsafeText = false;
            } catch (error) {
                if (!options.quarantineUnsafe) throw error;
                unsafeText = true;
                console.warn(`Book ${book.id || '(unknown)'} was quarantined from parsing:`, error);
            }
        }
        const rawCurrentIndex = Math.max(0, parseInt(book.currentIndex || 0, 10) || 0);
        const rawBookmarkMax = Array.isArray(book.bookmarks)
            ? book.bookmarks.reduce((maximum, bookmark) => Math.max(maximum, parseInt(bookmark?.index || 0, 10) || 0), 0)
            : 0;
        const fallbackTokenCount = Math.max(rawCurrentIndex, rawBookmarkMax) + (text ? 1 : 0);
        const wordCount = tokens ? this.countReadableWords(tokens) : (hasStoredWordCount ? storedWordCount : 0);
        const tokenCount = tokens ? tokens.length : (hasStoredTokenCount ? storedTokenCount : fallbackTokenCount);
        const now = new Date().toISOString();
        const id = String(book.id || this.createId());
        const currentIndex = this.clampIndex(rawCurrentIndex, tokenCount);
        const bookmarks = Array.isArray(book.bookmarks)
            ? book.bookmarks.map((bookmark) => this.normalizeBookmark(bookmark, tokenCount))
            : [];

        return {
            id,
            name: String(book.name || this.t('untitled')).trim() || this.t('untitled'),
            text,
            wordCount,
            tokenCount,
            textModelVersion: 2,
            isUnsafeText: unsafeText,
            nativeOnlyText: Boolean(book.nativeOnlyText),
            textSignature: /^\d+:[0-9a-f]{32}$/i.test(String(book.textSignature || ''))
                ? String(book.textSignature)
                : this.bookTextSignature(text),
            currentIndex,
            bookmarks,
            chapters: this.normalizeChapters(book.chapters || []),
            fileName: book.fileName || '',
            sourceType: book.sourceType || 'text',
            dateAdded: this.toIsoDate(book.dateAdded) || now,
            lastRead: this.toIsoDate(book.lastRead) || now,
            updatedAt: this.toIsoDate(book.updatedAt) || now
        };
    }

    normalizeBookmark(bookmark, wordCount) {
        bookmark = bookmark && typeof bookmark === 'object' ? bookmark : {};
        const index = this.clampIndex(parseInt(bookmark.index || 0, 10), wordCount);
        return {
            id: String(bookmark.id || this.createId()),
            name: String(bookmark.name || this.t('position', { index: index + 1 })).trim(),
            index,
            excerpt: bookmark.excerpt || '',
            createdAt: this.toIsoDate(bookmark.createdAt) || new Date().toISOString()
        };
    }

    normalizeChapters(chapters) {
        if (!Array.isArray(chapters)) return [];
        return chapters
            .map((chapter, position) => {
                const value = chapter && typeof chapter === 'object' ? chapter : {};
                return {
                    id: String(value.id || `chapter-${position + 1}`),
                    title: String(value.title || this.t('chapterFallback', { count: position + 1 })).trim(),
                    level: this.numberInRange(value.level || 1, 1, 6, 1),
                    wordIndex: Math.max(0, parseInt(value.wordIndex || 0, 10) || 0),
                    sourceHref: String(value.sourceHref || '')
                };
            })
            .filter((chapter, index, list) => chapter.title && (index === 0 || chapter.wordIndex !== list[index - 1].wordIndex || chapter.title !== list[index - 1].title))
            .sort((a, b) => a.wordIndex - b.wordIndex);
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
        this.assertTextTokenSafety(String(text || ''), { requireReadable: false });
        const paragraphs = text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter((p) => p.length > 0);
        const result = [];
        paragraphs.forEach((paragraphText) => {
            const rawTokens = paragraphText.split(/\s+/).filter(Boolean);
            const words = [];
            const leadingPunctuation = [];
            rawTokens.forEach((token) => {
                if (this.isLexicalToken(token)) {
                    words.push(leadingPunctuation.length > 0 ? `${leadingPunctuation.join(' ')} ${token}` : token);
                    leadingPunctuation.length = 0;
                } else if (words.length > 0) {
                    words[words.length - 1] = `${words[words.length - 1]} ${token}`;
                } else {
                    leadingPunctuation.push(token);
                }
            });
            if (words.length > 0) {
                if (result.length > 0) result.push(''); // Micro-pause at paragraph boundary.
                for (const word of words) result.push(word);
            }
        });
        return result;
    }

    assertTextTokenSafety(text, options = {}) {
        if (typeof text !== 'string' || text.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
        let readableWords = 0;
        let tokenCount = 0;
        let previousEnd = 0;
        let paragraphHasLexical = false;
        let pendingLeadingLength = 0;
        let currentOutputTokenLength = 0;
        const tokenPattern = /\S+/gu;
        let match;
        while ((match = tokenPattern.exec(text)) !== null) {
            const gap = text.slice(previousEnd, match.index);
            if (/\r?\n\s*\r?\n/.test(gap)) {
                paragraphHasLexical = false;
                pendingLeadingLength = 0;
                currentOutputTokenLength = 0;
            }
            previousEnd = match.index + match[0].length;
            tokenCount += 1;
            if (tokenCount > this.importLimits.maxTokens) {
                throw new Error(this.t('importSafetyLimit'));
            }
            if (match[0].length > this.importLimits.maxTokenCharacters) {
                throw new Error(this.t('importSafetyLimit'));
            }
            if (this.isLexicalToken(match[0])) {
                readableWords += 1;
                if (readableWords > this.importLimits.maxReadableWords) {
                    throw new Error(this.t('importSafetyLimit'));
                }
                currentOutputTokenLength = (pendingLeadingLength > 0 ? pendingLeadingLength + 1 : 0) + match[0].length;
                pendingLeadingLength = 0;
                paragraphHasLexical = true;
            } else if (paragraphHasLexical) {
                currentOutputTokenLength += (currentOutputTokenLength > 0 ? 1 : 0) + match[0].length;
            } else {
                pendingLeadingLength += (pendingLeadingLength > 0 ? 1 : 0) + match[0].length;
                currentOutputTokenLength = pendingLeadingLength;
            }
            if (currentOutputTokenLength > this.importLimits.maxTokenCharacters) {
                throw new Error(this.t('importSafetyLimit'));
            }
        }
        if (options.requireReadable !== false && readableWords === 0) {
            throw new Error(this.t('noReadableText'));
        }
        return readableWords;
    }

    isLexicalToken(token) {
        return typeof token === 'string' && /[\p{L}\p{N}]/u.test(token);
    }

    isReadableToken(token) {
        return this.isLexicalToken(token);
    }

    countReadableWords(tokens = this.words) {
        if (tokens === this.words) {
            this.ensureWordOrdinals();
            return this.cachedReadableWordCount || 0;
        }
        return tokens.reduce((count, token) => count + (this.isReadableToken(token) ? 1 : 0), 0);
    }

    wordOrdinalAtIndex(index, tokens = this.words) {
        if (!tokens.length) return 0;
        if (tokens === this.words) {
            this.ensureWordOrdinals();
            return this.wordOrdinals[Math.min(Math.max(index, 0), tokens.length - 1)] || 0;
        }
        const end = Math.min(Math.max(index, 0), tokens.length - 1);
        let count = 0;
        for (let position = 0; position <= end; position++) {
            if (this.isReadableToken(tokens[position])) count++;
        }
        return count;
    }

    tokenIndexForWordOrdinal(ordinal) {
        this.ensureWordOrdinals();
        if (!this.words.length || this.cachedReadableWordCount < 1) return 0;

        const target = Math.min(Math.max(Math.round(Number(ordinal) || 1), 1), this.cachedReadableWordCount);
        let low = 0;
        let high = this.wordOrdinals.length - 1;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if ((this.wordOrdinals[middle] || 0) < target) low = middle + 1;
            else high = middle;
        }
        return this.nearestReadableIndex(low);
    }

    ensureWordOrdinals() {
        if (this.wordOrdinalTokens === this.words && this.wordOrdinals?.length === this.words.length) return;
        this.wordOrdinalTokens = this.words;
        this.wordOrdinals = new Array(this.words.length);
        let count = 0;
        this.words.forEach((token, index) => {
            if (this.isReadableToken(token)) count++;
            this.wordOrdinals[index] = count;
        });
        this.cachedReadableWordCount = count;
    }

    nearestReadableIndex(index) {
        if (this.words.length === 0) return 0;
        const safeIndex = this.clampIndex(index, this.words.length);
        if (this.isReadableToken(this.words[safeIndex])) return safeIndex;
        for (let offset = 1; offset < this.words.length; offset++) {
            const next = safeIndex + offset;
            if (next < this.words.length && this.isReadableToken(this.words[next])) return next;
            const previous = safeIndex - offset;
            if (previous >= 0 && this.isReadableToken(this.words[previous])) return previous;
        }
        return safeIndex;
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
        const composerRevision = this.composerRevision;

        try {
            const parsedBook = await this.extractBookFromFile(file, extension);
            const readableWords = this.countReadableWords(this.parseText(parsedBook.text));
            // Treat file import as adding a book: persist it immediately so a
            // cold launch can resume without a second, easily missed save tap.
            const savedBook = await this.addParsedBookToLibrary(this.nameFromFile(file.name), parsedBook, extension, {
                silent: true,
                fileName,
                select: true,
                selectRevision: composerRevision
            });
            if (!savedBook) return;
            this.showToast(this.t('fileProcessed', { format: extension.toUpperCase(), count: this.formatWordCount(readableWords) }));
        } catch (error) {
            throw new Error(this.t('fileLoadFailed', { file: fileName, message: error.message }));
        } finally {
            event.target.value = '';
        }
    }

    async openBuiltInDemo() {
        await this.ready;

        if (this.textInput.value.trim()) {
            const confirmed = await this.showActionDialog({
                title: this.t('demoReplaceTitle'),
                message: this.t('demoReplaceMessage'),
                confirmLabel: this.t('tryDemo')
            });
            if (!confirmed) return;
        }

        try {
            const demoFile = this.i18n.language === 'ru' ? 'sample_text_ru.txt' : 'sample_text.txt';
            const response = await fetch(demoFile);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = (await response.text()).trim();
            this.assertTextTokenSafety(text, { requireReadable: true });

            this.composerRevision += 1;
            this.currentBookId = null;
            this.currentBookName = this.t('demoBookTitle');
            this.currentTextSignature = '';
            this.currentChapters = [];
            this.pendingChapters = [];
            this.currentIndex = 0;
            this.words = [];
            this.hasUnsavedTextInput = true;
            this.hasUnsafeDraft = false;
            this.setTextInputValue(text);
            this.bookNameInput.value = this.currentBookName;

            await this.startNormalReading();
            this.startRSVP();
        } catch (error) {
            console.error(error);
            this.showToast(this.t('demoLoadFailed'), 'error');
        }
    }

    getFileExtension(fileName) {
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.fb2.zip')) return 'fb2.zip';
        const match = lower.match(/\.([a-z0-9]+)$/);
        return match ? match[1] : 'txt';
    }

    readTextWithEncoding(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        const unicodeEncoding = this.detectUnicodeTextEncoding(bytes);
        if (unicodeEncoding) {
            const payload = bytes.subarray(unicodeEncoding.bomBytes);
            return new TextDecoder(unicodeEncoding.encoding).decode(payload).replace(/^\uFEFF/, '');
        }

        const declaredEncoding = this.normalizeTextEncodingLabel(this.sniffDeclaredTextEncoding(bytes));
        if (declaredEncoding) {
            try {
                return new TextDecoder(declaredEncoding).decode(bytes).replace(/^\uFEFF/, '');
            } catch (error) {
                console.warn(`TextDecoder for ${declaredEncoding} failed:`, error);
            }
        }

        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
        } catch (error) {
            // Invalid UTF-8 without a declaration is normally a legacy 8-bit file.
        }

        let windows1251 = '';
        let windows1252 = '';
        try {
            windows1251 = new TextDecoder('windows-1251').decode(bytes);
        } catch (error) {
            console.warn('Windows-1251 decoding failed:', error);
        }
        try {
            windows1252 = new TextDecoder('windows-1252').decode(bytes);
        } catch (error) {
            console.warn('Windows-1252 decoding failed:', error);
        }

        if (windows1251 && this.shouldPreferWindows1251(windows1251, windows1252)) {
            return windows1251.replace(/^\uFEFF/, '');
        }
        return (windows1252 || windows1251 || new TextDecoder('utf-8').decode(bytes)).replace(/^\uFEFF/, '');
    }

    detectUnicodeTextEncoding(bytes) {
        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
            return { encoding: 'utf-8', bomBytes: 3 };
        }
        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
            return { encoding: 'utf-16le', bomBytes: 2 };
        }
        if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
            return { encoding: 'utf-16be', bomBytes: 2 };
        }

        const pairCount = Math.min(Math.floor(bytes.length / 2), 256);
        if (pairCount < 4) return null;
        let zeroEven = 0;
        let zeroOdd = 0;
        for (let pair = 0; pair < pairCount; pair++) {
            if (bytes[pair * 2] === 0) zeroEven++;
            if (bytes[pair * 2 + 1] === 0) zeroOdd++;
        }
        if (zeroOdd / pairCount >= 0.35 && zeroEven / pairCount <= 0.05) {
            return { encoding: 'utf-16le', bomBytes: 0 };
        }
        if (zeroEven / pairCount >= 0.35 && zeroOdd / pairCount <= 0.05) {
            return { encoding: 'utf-16be', bomBytes: 0 };
        }
        return null;
    }

    sniffDeclaredTextEncoding(bytes) {
        let header = '';
        const headerLimit = Math.min(bytes.length, 4096);
        for (let index = 0; index < headerLimit; index++) {
            header += String.fromCharCode(bytes[index]);
        }
        const xmlDeclaration = header.match(/<\?xml\b[^>]*\bencoding\s*=\s*["']\s*([^"']+?)\s*["']/i);
        if (xmlDeclaration) return xmlDeclaration[1];
        const metaCharset = header.match(/<meta\b[^>]*\bcharset\s*=\s*["']?\s*([^\s"'/>;]+)/i);
        if (metaCharset) return metaCharset[1];
        const metaContent = header.match(/<meta\b[^>]*\bcontent\s*=\s*["'][^"']*?\bcharset\s*=\s*([^\s"';>]+)/i);
        return metaContent ? metaContent[1] : null;
    }

    normalizeTextEncodingLabel(label) {
        if (!label) return null;
        const value = String(label).trim().toLowerCase().replace(/_/g, '-');
        const aliases = {
            utf8: 'utf-8',
            'utf-16': 'utf-16le',
            utf16: 'utf-16le',
            utf16le: 'utf-16le',
            utf16be: 'utf-16be',
            'win-1251': 'windows-1251',
            windows1251: 'windows-1251',
            cp1251: 'windows-1251',
            'win-1252': 'windows-1252',
            windows1252: 'windows-1252',
            cp1252: 'windows-1252',
            latin1: 'windows-1252',
            'iso-8859-1': 'windows-1252'
        };
        const normalized = aliases[value] || value;
        return /^[a-z0-9][a-z0-9._-]{0,39}$/.test(normalized) ? normalized : null;
    }

    shouldPreferWindows1251(windows1251, windows1252) {
        const cyrillicLetters = windows1251.match(/\p{Script=Cyrillic}/gu) || [];
        const latinLetters = windows1251.match(/\p{Script=Latin}/gu) || [];
        const cyrillicWords = windows1251.match(/\p{Script=Cyrillic}{2,}/gu) || [];
        const letterCount = cyrillicLetters.length + latinLetters.length;
        const cyrillicRatio = cyrillicLetters.length / Math.max(1, letterCount);
        const commonCyrillicPairs = windows1251.toLocaleLowerCase().match(/ст|но|то|на|ен|ов|ни|ра|во|ко|пр|по|ро|го|ер|ос|ть|ли|ре|не|ал|ла|ет|те|ес|ри|ив|ве|ки|ий|ый|ая|ое|ие|ся|же|чт|де|ка|ва|ин|ог|ло|ме|ит|за|от|до|из/gu) || [];
        const westernLetters = windows1252.match(/\p{Script=Latin}/gu) || [];
        const extendedWesternLetters = windows1252.match(/[\u00C0-\u024F]/gu) || [];
        const mojibakeRatio = extendedWesternLetters.length / Math.max(1, westernLetters.length);

        return cyrillicLetters.length >= 4
            && cyrillicRatio >= 0.45
            && (cyrillicWords.length >= 2 || cyrillicLetters.length >= 12 || commonCyrillicPairs.length >= 2)
            && (commonCyrillicPairs.length >= 1 || mojibakeRatio >= 0.35);
    }

    async extractTextFromFile(file, extension) {
        const parsedBook = await this.extractBookFromFile(file, extension);
        return parsedBook.text;
    }

    async extractBookFromFile(file, extension) {
        this.assertSourceFileSafe(file);
        this.assertSourceFormatSafe(file, extension);
        let text;
        let chapters = [];
        switch (extension) {
            case 'epub': {
                const parsed = await new EPUBParser().parseDetailed(file);
                return this.validateParsedBook({
                    text: parsed.text,
                    chapters: this.chaptersFromCharacterOffsets(parsed.text, parsed.chapters)
                });
            }
            case 'docx':
                return this.validateParsedBook(await this.extractBookFromDocx(file));
            case 'fb2':
            case 'xml': {
                const buffer = await this.readArrayBuffer(file);
                return this.validateParsedBook(this.extractBookFromFB2(this.readTextWithEncoding(buffer)));
            }
            case 'zip':
            case 'fb2.zip':
                return this.validateParsedBook(await this.extractBookFromZip(file));
            case 'html':
            case 'htm': {
                const buffer = await this.readArrayBuffer(file);
                return this.validateParsedBook(this.extractBookFromHTMLDocument(this.readTextWithEncoding(buffer)));
            }
            case 'md':
            case 'markdown': {
                const buffer = await this.readArrayBuffer(file);
                const markdown = this.readTextWithEncoding(buffer);
                text = this.extractTextFromMarkdown(markdown);
                chapters = this.detectMarkdownChapters(markdown, text);
                break;
            }
            case 'rtf':
                text = this.extractTextFromRTF(await this.readArrayBuffer(file));
                break;
            case 'txt': {
                const buffer = await this.readArrayBuffer(file);
                text = this.readTextWithEncoding(buffer);
                break;
            }
            default: {
                const buffer = await this.readArrayBuffer(file);
                const uint8 = new Uint8Array(buffer);
                if (uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B && uint8[2] === 0x03 && uint8[3] === 0x04) {
                    return this.validateParsedBook(await this.extractBookFromZip(file));
                }
                throw new Error(this.t('unsupportedFormat', { format: extension }));
            }
        }

        if (chapters.length === 0) chapters = this.detectChaptersFromText(text);
        return this.validateParsedBook({ text, chapters });
    }

    async extractTextFromZip(file) {
        const parsedBook = await this.extractBookFromZip(file);
        return parsedBook.text;
    }

    async extractBookFromZip(file) {
        const JSZip = await this.loadZipLibrary();
        const zip = await JSZip.loadAsync(file);
        this.assertArchiveSafe(zip);

        const candidates = [];
        zip.forEach((relativePath, zipEntry) => {
            const lower = relativePath.toLowerCase();
            if (zipEntry.dir || lower.startsWith('__macosx/')) return;
            if (lower.endsWith('.fb2') || lower.endsWith('.xml') || lower.endsWith('.txt')) {
                candidates.push(zipEntry);
            }
        });
        const priority = (entry) => {
            const lower = entry.name.toLowerCase();
            if (lower.endsWith('.fb2')) return 0;
            if (lower.endsWith('.xml')) return 1;
            return 2;
        };
        candidates.sort((left, right) => priority(left) - priority(right) || left.name.length - right.name.length);

        if (candidates.length === 0) {
            throw new Error(this.t('noBookInArchive'));
        }

        for (const entry of candidates) {
            this.assertArchiveEntrySafe(entry);
            const arrayBuffer = await entry.async('arraybuffer');
            if (!this.isLikelyTextPayload(arrayBuffer)) continue;

            const text = this.readTextWithEncoding(arrayBuffer);
            if (!this.isLikelyTextPayload(arrayBuffer, text)) continue;
            if (text.length > this.importLimits.maxTextCharacters) {
                throw new Error(this.t('importSafetyLimit'));
            }

            const lower = entry.name.toLowerCase();
            if (lower.endsWith('.fb2') || lower.endsWith('.xml')) {
                try {
                    return this.validateParsedBook(this.extractBookFromFB2(text));
                } catch (error) {
                    if (error.message === this.t('importSafetyLimit')) throw error;
                    const skippableMessages = new Set([
                        this.t('invalidFb2Xml'),
                        this.t('emptyFb2'),
                        this.t('noReadableText')
                    ]);
                    if (skippableMessages.has(error.message)) continue;
                    throw error;
                }
            }

            if (/[\p{L}\p{N}]/u.test(text)) {
                return this.validateParsedBook({ text, chapters: this.detectChaptersFromText(text) });
            }
        }

        throw new Error(this.t('noBookInArchive'));
    }

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(reader.error || new Error(this.t('fileReadFailed')));
            reader.readAsText(file);
        });
    }

    readArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(reader.error || new Error(this.t('fileReadFailed')));
            reader.readAsArrayBuffer(file);
        });
    }

    async loadZipLibrary() {
        if (window.JSZip) return window.JSZip;

        await new EPUBParser().loadJSZip();
        if (!window.JSZip) {
            throw new Error(this.t('zipLoadFailed'));
        }
        return window.JSZip;
    }

    assertSourceFileSafe(file) {
        if (Number.isFinite(file?.size) && file.size > this.importLimits.maxSourceBytes) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    assertSourceFormatSafe(file, extension) {
        const directlyParsedFormats = new Set(['fb2', 'xml', 'html', 'htm', 'txt', 'md', 'markdown', 'rtf']);
        if (directlyParsedFormats.has(String(extension || '').toLowerCase())
            && Number.isFinite(file?.size)
            && file.size > this.importLimits.maxEntryBytes) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    assertMarkupSourceSafe(source) {
        if (typeof source !== 'string' || source.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    assertArchiveSafe(zip) {
        const entries = Object.values(zip?.files || {});
        if (entries.length > this.importLimits.maxArchiveEntries) {
            throw new Error(this.t('importSafetyLimit'));
        }
        const totalUncompressedBytes = entries.reduce((total, entry) => (
            total + (entry?.dir ? 0 : Math.max(0, Number(entry?._data?.uncompressedSize || 0)))
        ), 0);
        if (totalUncompressedBytes > this.importLimits.maxArchiveUncompressedBytes) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    assertArchiveEntrySafe(entry) {
        const uncompressedSize = Number(entry?._data?.uncompressedSize || 0);
        const compressedSize = Number(entry?._data?.compressedSize || 0);
        const compressionRatio = uncompressedSize > 0 ? uncompressedSize / Math.max(1, compressedSize) : 1;
        if (uncompressedSize > this.importLimits.maxEntryBytes
            || (uncompressedSize >= 1024 * 1024 && compressionRatio > this.importLimits.maxCompressionRatio)) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    isLikelyTextPayload(arrayBuffer, decodedText = null) {
        const bytes = new Uint8Array(arrayBuffer);
        const startsWith = (...signature) => signature.every((value, index) => bytes[index] === value);
        const knownBinary = startsWith(0x89, 0x50, 0x4E, 0x47)
            || startsWith(0xFF, 0xD8, 0xFF)
            || startsWith(0x47, 0x49, 0x46, 0x38)
            || startsWith(0x25, 0x50, 0x44, 0x46)
            || startsWith(0x50, 0x4B, 0x03, 0x04)
            || startsWith(0x1F, 0x8B)
            || startsWith(0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C)
            || startsWith(0x52, 0x61, 0x72, 0x21)
            || startsWith(0x7F, 0x45, 0x4C, 0x46)
            || startsWith(0x4D, 0x5A)
            || startsWith(0xD0, 0xCF, 0x11, 0xE0);
        if (knownBinary) return false;

        const unicodeEncoding = this.detectUnicodeTextEncoding(bytes);
        if (!unicodeEncoding) {
            let lowControlBytes = 0;
            let nullBytes = 0;
            const sampleLength = Math.min(bytes.length, 65536);
            for (let index = 0; index < sampleLength; index++) {
                const value = bytes[index];
                if (value === 0) nullBytes++;
                if (value < 0x20 && value !== 0x09 && value !== 0x0A && value !== 0x0C && value !== 0x0D) {
                    lowControlBytes++;
                }
            }
            if (nullBytes > 0 || lowControlBytes > Math.max(2, sampleLength * 0.01)) return false;
        }

        if (typeof decodedText !== 'string') return true;
        if (!decodedText || decodedText.includes('\u0000')) return false;
        const replacementCount = (decodedText.match(/\uFFFD/g) || []).length;
        const controlCount = (decodedText.match(/[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F]/g) || []).length;
        if (replacementCount > Math.max(2, decodedText.length * 0.01)
            || controlCount > Math.max(2, decodedText.length * 0.01)) {
            return false;
        }
        return /[\p{L}\p{N}]/u.test(decodedText);
    }

    validateParsedBook(parsedBook) {
        if (!parsedBook || typeof parsedBook.text !== 'string'
            || parsedBook.text.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
        if (!parsedBook.text.trim() || !/[\p{L}\p{N}]/u.test(parsedBook.text)) {
            throw new Error(this.t('noReadableText'));
        }
        this.assertTextTokenSafety(parsedBook.text, { requireReadable: true });
        return parsedBook;
    }

    async extractTextFromDocx(file) {
        const parsedBook = await this.extractBookFromDocx(file);
        return parsedBook.text;
    }

    async extractBookFromDocx(file) {
        const JSZip = await this.loadZipLibrary();
        const zip = await JSZip.loadAsync(file);
        this.assertArchiveSafe(zip);
        const documentFile = zip.file('word/document.xml');

        if (!documentFile) {
            throw new Error(this.t('invalidDocx'));
        }

        this.assertArchiveEntrySafe(documentFile);
        const xml = await documentFile.async('string');
        this.assertMarkupSourceSafe(xml);
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error(this.t('invalidDocxXml'));
        }

        const rawChapters = [];
        const paragraphs = [];
        let characterOffset = 0;
        const attributeByLocalName = (element, localName) => Array.from(element?.attributes || [])
            .find((attribute) => attribute.localName === localName)?.value || '';
        Array.from(doc.getElementsByTagName('*')).filter((element) => element.localName === 'p').forEach((paragraph) => {
            const value = this.extractDocxParagraphText(paragraph).replace(/\s+/g, ' ').trim();
            if (!value) return;
            const blockStart = characterOffset + (paragraphs.length > 0 ? 2 : 0);
            const styleElement = Array.from(paragraph.getElementsByTagName('*'))
                .find((element) => element.localName === 'pStyle');
            const outlineElement = Array.from(paragraph.getElementsByTagName('*'))
                .find((element) => element.localName === 'outlineLvl');
            const styleName = attributeByLocalName(styleElement, 'val');
            const headingMatch = styleName.match(/(?:heading|заголовок)\s*([1-6])/i);
            const outlineAttribute = attributeByLocalName(outlineElement, 'val');
            const outlineValue = outlineAttribute === '' ? Number.NaN : Number(outlineAttribute);
            const level = headingMatch
                ? Number(headingMatch[1])
                : (Number.isInteger(outlineValue) && outlineValue >= 0 && outlineValue <= 5 ? outlineValue + 1 : 0);
            if (level > 0) {
                rawChapters.push({
                    id: `docx-${rawChapters.length + 1}`,
                    title: value.slice(0, 160),
                    level,
                    charOffset: blockStart
                });
            }
            if (paragraphs.length > 0) characterOffset += 2;
            paragraphs.push(value);
            characterOffset += value.length;
        });

        if (paragraphs.length === 0) {
            throw new Error(this.t('emptyDocx'));
        }

        const text = paragraphs.join('\n\n');
        const chapters = rawChapters.length > 0
            ? this.chaptersFromCharacterOffsets(text, rawChapters)
            : this.detectChaptersFromText(text);
        return { text, chapters };
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
        return this.extractBookFromFB2(xmlText).text;
    }

    extractBookFromFB2(xmlText) {
        this.assertMarkupSourceSafe(xmlText);
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        if (doc.querySelector('parsererror') || doc.documentElement?.localName?.toLowerCase() !== 'fictionbook') {
            throw new Error(this.t('invalidFb2Xml'));
        }

        doc.querySelectorAll('binary, stylesheet').forEach((element) => element.remove());

        const body = doc.querySelector('body') || doc.documentElement;
        const blocks = [];
        const rawChapters = [];
        let characterOffset = 0;

        Array.from(body.querySelectorAll('title, subtitle, p, v, text-author')).forEach((element) => {
            const localName = element.localName.toLowerCase();
            if (localName === 'p' && element.parentElement?.localName?.toLowerCase() === 'title') return;
            const value = element.textContent.replace(/\s+/g, ' ').trim();
            if (!value) return;

            const blockStartOffset = characterOffset + (blocks.length > 0 ? 2 : 0);

            if (localName === 'title') {
                rawChapters.push({
                    id: `fb2-${rawChapters.length + 1}`,
                    title: value.slice(0, 160),
                    level: Math.min(6, (element.closest('section') ? this.elementDepthWithinSections(element.closest('section')) : 1)),
                    charOffset: blockStartOffset
                });
            }

            if (blocks.length > 0) characterOffset += 2;
            blocks.push(value);
            characterOffset += value.length;
        });

        if (blocks.length === 0) {
            throw new Error(this.t('emptyFb2'));
        }

        const text = blocks.join('\n\n');
        return { text, chapters: this.chaptersFromCharacterOffsets(text, rawChapters) };
    }

    elementDepthWithinSections(section) {
        let depth = 1;
        let current = section?.parentElement;
        while (current) {
            if (current.localName?.toLowerCase() === 'section') depth++;
            current = current.parentElement;
        }
        return depth;
    }

    extractTextFromHTMLDocument(htmlText) {
        return this.extractBookFromHTMLDocument(htmlText).text;
    }

    extractBookFromHTMLDocument(htmlText) {
        this.assertMarkupSourceSafe(htmlText);
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        doc.querySelectorAll('script, style, noscript, template, svg, canvas').forEach((element) => element.remove());

        const body = doc.body || doc.documentElement;
        const { text, chapters: rawChapters } = this.extractStructuredHTMLContent(body);

        if (!text) {
            throw new Error(this.t('emptyHtml'));
        }

        return { text, chapters: this.chaptersFromCharacterOffsets(text, rawChapters) };
    }

    extractStructuredHTMLContent(root) {
        const blockTags = new Set([
            'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'DD',
            'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            'HEADER', 'HGROUP', 'HR', 'LI', 'MAIN', 'MENU', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY',
            'TABLE', 'TR', 'UL'
        ]);
        const cellTags = new Set(['TD', 'TH']);
        const chapters = [];
        const anchorOffsets = {};
        const pendingAnchors = [];
        let text = '';
        let pendingBreak = 0; // 1 = space, 2 = line, 3 = paragraph

        const queueSpace = () => {
            pendingBreak = Math.max(pendingBreak, 1);
        };
        const queueLine = () => {
            pendingBreak = pendingBreak >= 2 ? 3 : 2;
        };
        const queueParagraph = () => {
            pendingBreak = 3;
        };
        const flushPending = () => {
            if (!text) {
                pendingBreak = 0;
                return;
            }
            if (pendingBreak === 3) {
                text = text.replace(/[\s\u00A0]+$/u, '');
                text += '\n\n';
            } else if (pendingBreak === 2) {
                text = text.replace(/[\t \u00A0]+$/u, '');
                if (!text.endsWith('\n')) text += '\n';
            } else if (pendingBreak === 1 && !/[\s\u00A0]$/u.test(text)) {
                text += ' ';
            }
            pendingBreak = 0;
        };
        const appendText = (rawValue) => {
            if (!rawValue) return;
            const hasLeadingSpace = /^[\s\u00A0]/u.test(rawValue);
            const hasTrailingSpace = /[\s\u00A0]$/u.test(rawValue);
            const value = rawValue.replace(/[\s\u00A0]+/gu, ' ').trim();
            if (!value) {
                queueSpace();
                return;
            }
            if (hasLeadingSpace) queueSpace();
            flushPending();
            pendingAnchors.splice(0).forEach((element) => rememberAnchor(element, text.length));
            text += value;
            if (hasTrailingSpace) queueSpace();
        };
        const rememberAnchor = (element, offset) => {
            const identifiers = [element.getAttribute('id')];
            if (element.tagName === 'A') identifiers.push(element.getAttribute('name'));
            identifiers.filter(Boolean).forEach((identifier) => {
                const aliases = [identifier];
                try {
                    aliases.push(decodeURIComponent(identifier));
                } catch (error) {
                    // A malformed percent escape is still a valid literal HTML id.
                }
                aliases.forEach((alias) => {
                    if (alias && !Object.prototype.hasOwnProperty.call(anchorOffsets, alias)) {
                        anchorOffsets[alias] = offset;
                    }
                });
            });
        };
        const walk = (node) => {
            if (node.nodeType === 3) {
                appendText(node.nodeValue || '');
                return;
            }
            if (node.nodeType !== 1) return;

            const element = node;
            const tagName = element.tagName;
            if (tagName === 'BR') {
                queueLine();
                return;
            }

            const isBlock = blockTags.has(tagName);
            const isCell = cellTags.has(tagName);
            const hasAnchor = element.hasAttribute('id') || (tagName === 'A' && element.hasAttribute('name'));
            if (isBlock) queueParagraph();
            else if (isCell) queueSpace();
            if (isBlock || isCell || hasAnchor) flushPending();

            const elementOffset = text.length;
            if (hasAnchor) {
                if ((element.textContent || '').trim()) rememberAnchor(element, elementOffset);
                else pendingAnchors.push(element);
            }
            if (/^H[1-6]$/.test(tagName)) {
                const title = (element.textContent || '').replace(/[\s\u00A0]+/gu, ' ').trim();
                if (title) {
                    chapters.push({
                        id: `html-${chapters.length + 1}`,
                        title: title.slice(0, 160),
                        level: Number(tagName.slice(1)),
                        charOffset: elementOffset
                    });
                }
            }

            Array.from(element.childNodes).forEach(walk);
            if (isBlock) queueParagraph();
            else if (isCell) queueSpace();
        };

        Array.from(root.childNodes).forEach(walk);
        text = text.trimEnd();
        pendingAnchors.splice(0).forEach((element) => rememberAnchor(element, text.length));
        Object.keys(anchorOffsets).forEach((identifier) => {
            anchorOffsets[identifier] = Math.min(anchorOffsets[identifier], text.length);
        });
        return { text, chapters, anchorOffsets };
    }

    extractOwnBlockText(element, blockSelector) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll(blockSelector).forEach((nestedBlock) => nestedBlock.remove());
        return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    chaptersFromCharacterOffsets(text, chapters) {
        if (typeof text !== 'string' || text.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
        if (!Array.isArray(chapters) || chapters.length === 0) return [];
        if (chapters.length > this.importLimits.maxTokens) {
            throw new Error(this.t('importSafetyLimit'));
        }

        const chapterOffsets = new Array(chapters.length);
        let chaptersAreOrdered = true;
        for (let index = 0; index < chapters.length; index++) {
            chapterOffsets[index] = Math.min(text.length, Math.max(0, Number(chapters[index]?.charOffset) || 0));
            if (index > 0 && chapterOffsets[index] < chapterOffsets[index - 1]) chaptersAreOrdered = false;
        }
        const chapterOrder = chaptersAreOrdered
            ? null
            : chapters.map((chapter, index) => index).sort((left, right) => chapterOffsets[left] - chapterOffsets[right]);
        const chapterWordIndexes = new Array(chapters.length).fill(0);
        const chapterIndexAt = (position) => chapterOrder ? chapterOrder[position] : position;

        const tokenPattern = /\S+/g;
        let tokenMatch;
        let previousTokenEnd = 0;
        let tokenIndex = 0;
        let rawTokenCount = 0;
        let readableTokenCount = 0;
        let hasReadableToken = false;
        let paragraphNeedsSeparator = false;
        let nextChapterPosition = 0;
        let lastReadableWordIndex = 0;
        while ((tokenMatch = tokenPattern.exec(text)) !== null) {
            rawTokenCount += 1;
            if (rawTokenCount > this.importLimits.maxTokens
                || tokenMatch[0].length > this.importLimits.maxTokenCharacters) {
                throw new Error(this.t('importSafetyLimit'));
            }
            const gap = text.slice(previousTokenEnd, tokenMatch.index);
            if (/\r?\n\s*\r?\n/.test(gap)) paragraphNeedsSeparator = hasReadableToken;
            const token = tokenMatch[0];
            if (this.isLexicalToken(token)) {
                readableTokenCount += 1;
                if (readableTokenCount > this.importLimits.maxReadableWords) {
                    throw new Error(this.t('importSafetyLimit'));
                }
                if (paragraphNeedsSeparator) {
                    tokenIndex += 1;
                    paragraphNeedsSeparator = false;
                }
                const tokenEnd = tokenMatch.index + token.length;
                while (nextChapterPosition < chapters.length) {
                    const chapterIndex = chapterIndexAt(nextChapterPosition);
                    if (chapterOffsets[chapterIndex] >= tokenEnd) break;
                    chapterWordIndexes[chapterIndex] = tokenIndex;
                    nextChapterPosition += 1;
                }
                lastReadableWordIndex = tokenIndex;
                tokenIndex += 1;
                hasReadableToken = true;
            }
            previousTokenEnd = tokenMatch.index + token.length;
        }
        while (nextChapterPosition < chapters.length) {
            chapterWordIndexes[chapterIndexAt(nextChapterPosition)] = lastReadableWordIndex;
            nextChapterPosition += 1;
        }

        return chapters.map((chapter, index) => {
            return {
                id: chapter.id || `chapter-${index + 1}`,
                title: chapter.title || this.t('chapterFallback', { count: index + 1 }),
                level: chapter.level || 1,
                wordIndex: chapterWordIndexes[index],
                sourceHref: chapter.sourceHref || ''
            };
        });
    }

    detectMarkdownChapters(markdown, cleanText) {
        if (typeof cleanText !== 'string' || cleanText.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
        const rawChapters = [];
        let searchFrom = 0;
        for (const match of markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
            const title = match[2].replace(/[*_~`]+/g, '').trim();
            const charOffset = cleanText.indexOf(title, searchFrom);
            if (charOffset < 0) continue;
            rawChapters.push({
                id: `markdown-${rawChapters.length + 1}`,
                title,
                level: match[1].length,
                charOffset
            });
            searchFrom = charOffset + title.length;
        }
        return this.chaptersFromCharacterOffsets(cleanText, rawChapters);
    }

    detectChaptersFromText(text) {
        if (typeof text !== 'string' || text.length > this.importLimits.maxTextCharacters) {
            throw new Error(this.t('importSafetyLimit'));
        }
        const rawChapters = [];
        const linePattern = /([^\r\n]*)(?:\r\n|\n|\r|$)/g;
        let lineMatch;
        while ((lineMatch = linePattern.exec(text)) !== null && lineMatch[0].length > 0) {
            const line = lineMatch[1];
            const title = line.trim();
            const isNamedChapter = /^(chapter|part|book|section|глава|часть|книга|раздел)\s+[\divxlcа-яё]+(?:\b|[.:—-])/iu.test(title);
            const isNumberedHeading = /^\d{1,3}[.)]\s+\S/u.test(title) && title.length <= 120;
            const letters = title.replace(/[^\p{L}]/gu, '');
            const isUpperHeading = title.length >= 4 && title.length <= 80 && letters.length >= 3 && letters === letters.toLocaleUpperCase();
            if (isNamedChapter || isNumberedHeading || isUpperHeading) {
                rawChapters.push({
                    id: `auto-${rawChapters.length + 1}`,
                    title: title.slice(0, 160),
                    level: 1,
                    charOffset: lineMatch.index + Math.max(0, line.indexOf(title))
                });
            }
        }
        return this.chaptersFromCharacterOffsets(text, rawChapters);
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
            throw new Error(this.t('emptyMarkdown'));
        }

        return text;
    }

    extractTextFromRTF(arrayBuffer) {
        const source = new TextDecoder('latin1').decode(arrayBuffer);
        let text = '';
        let skipGroupDepth = 0;
        let groupDepth = 0;
        let unicodeFallbackLength = 1;
        let ansiDecoder = new TextDecoder('windows-1252');
        const stateStack = [];
        const skippedDestinations = /^(?:fonttbl|colortbl|stylesheet|info|pict|object|header|headerl|headerr|headerf|footer|footerl|footerr|footerf|filetbl|listtable|listoverridetable|revtbl|generator|xmlnstbl)$/i;

        const skipUnicodeFallback = (startIndex, count) => {
            let cursor = startIndex;
            for (let skipped = 0; skipped < count && cursor < source.length; skipped++) {
                if (source[cursor] === '\\' && source[cursor + 1] === "'") cursor += 4;
                else if (source[cursor] === '\\' && cursor + 1 < source.length) cursor += 2;
                else cursor += 1;
            }
            return cursor;
        };

        for (let index = 0; index < source.length; index++) {
            const char = source[index];

            if (char === '{') {
                stateStack.push({ unicodeFallbackLength, ansiDecoder });
                groupDepth++;
                const groupControl = source.slice(index + 1).match(/^\\(?:\*\\)?([a-zA-Z]+)/);
                if (!skipGroupDepth && (source[index + 1] === '\\' && source[index + 2] === '*'
                    || skippedDestinations.test(groupControl?.[1] || ''))) {
                    skipGroupDepth = groupDepth;
                }
                continue;
            }

            if (char === '}') {
                if (skipGroupDepth === groupDepth) {
                    skipGroupDepth = 0;
                }
                const previousState = stateStack.pop();
                if (previousState) {
                    unicodeFallbackLength = previousState.unicodeFallbackLength;
                    ansiDecoder = previousState.ansiDecoder;
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
                        text += ansiDecoder.decode(new Uint8Array([byte]));
                        index += 3;
                    }
                    continue;
                }

                const match = source.slice(index + 1).match(/^([a-zA-Z]+)(-?\d+)? ?/);
                if (match) {
                    const control = match[1];
                    const parameter = match[2] === undefined ? null : Number(match[2]);
                    if (['par', 'line'].includes(control)) text += '\n\n';
                    if (control === 'tab') text += '\t';
                    if (control === 'uc' && Number.isFinite(parameter)) {
                        unicodeFallbackLength = Math.max(0, parameter);
                    }
                    if (control === 'ansicpg' && Number.isFinite(parameter)) {
                        try {
                            ansiDecoder = new TextDecoder(`windows-${parameter}`);
                        } catch (error) {
                            ansiDecoder = new TextDecoder('windows-1252');
                        }
                    }
                    if (control === 'u' && Number.isFinite(parameter)) {
                        const codeUnit = parameter < 0 ? parameter + 65536 : parameter;
                        text += String.fromCharCode(codeUnit & 0xffff);
                        const controlEnd = index + 1 + match[0].length;
                        index = skipUnicodeFallback(controlEnd, unicodeFallbackLength) - 1;
                        continue;
                    }
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
            throw new Error(this.t('emptyRtf'));
        }

        return cleaned;
    }

    nameFromFile(fileName) {
        return fileName.replace(/\.(txt|epub|fb2|fb2\.zip|zip|xml|docx|html|htm|md|markdown|rtf)$/i, '').replace(/[_-]+/g, ' ').trim();
    }

    async startNormalReading() {
        await this.ready;

        const text = this.textInput.value.trim();
        if (!text) {
            this.showToast(this.t('addTextFirst'), 'error');
            return;
        }

        this.assertTextTokenSafety(text, { requireReadable: true });
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

        if (this.hasUnsavedTextInput) return this.clampIndex(this.currentIndex, this.words.length);

        const draft = this.storageMode === 'localstorage' ? null : await this.getKV('draft');
        const storedIndex = draft ? draft.currentIndex : localStorage.getItem('rsvp_bookmark');
        return this.clampIndex(parseInt(storedIndex || this.currentIndex || 0, 10), this.words.length);
    }

    renderNormalText(options = {}) {
        const anchorIndex = this.clampIndex(options.anchorIndex ?? this.currentIndex, this.words.length);
        const before = Math.floor(this.renderWindowSize * 0.38);
        const start = Math.max(0, anchorIndex - before);
        const end = Math.min(this.words.length, start + this.renderWindowSize);
        this.renderWindowStart = Math.max(0, end === this.words.length ? end - this.renderWindowSize : start);
        this.renderWindowEnd = end;

        this.normalTextDisplay.replaceChildren();
        this.wordSpans = new Array(this.words.length);
        this.lastHighlightedIndex = null;
        const fragment = document.createDocumentFragment();

        if (this.renderWindowStart > 0) {
            const earlierButton = document.createElement('button');
            earlierButton.type = 'button';
            earlierButton.className = 'text-window-button window-before';
            earlierButton.textContent = this.t('showEarlier');
            earlierButton.addEventListener('click', () => {
                const nextAnchor = Math.max(0, this.renderWindowStart - Math.floor(this.renderWindowSize / 2));
                this.renderNormalText({ anchorIndex: nextAnchor, scrollTo: 'end' });
            });
            fragment.appendChild(earlierButton);
        }

        let paragraph = document.createElement('p');
        paragraph.className = 'paragraph';
        let paragraphHasWords = false;

        const appendParagraph = () => {
            if (!paragraphHasWords) return;
            fragment.appendChild(paragraph);
            paragraph = document.createElement('p');
            paragraph.className = 'paragraph';
            paragraphHasWords = false;
        };

        for (let wordIndex = this.renderWindowStart; wordIndex < this.renderWindowEnd; wordIndex++) {
            const word = this.words[wordIndex];
            if (!this.isReadableToken(word)) {
                appendParagraph();
                continue;
            }

            const span = document.createElement('span');
            span.textContent = `${word} `;
            span.dataset.index = String(wordIndex);
            span.setAttribute('role', 'button');
            span.setAttribute('aria-label', this.t('jumpToWord', { word }));
            span.tabIndex = wordIndex === this.currentIndex ? 0 : -1;

            if (wordIndex === this.currentIndex) {
                span.classList.add('current-word');
                span.setAttribute('aria-current', 'location');
                this.lastHighlightedIndex = wordIndex;
            }

            span.addEventListener('click', () => this.setCurrentWordIndex(wordIndex));
            span.addEventListener('keydown', (event) => this.handleNormalWordKeydown(event, wordIndex));
            paragraph.appendChild(span);
            paragraphHasWords = true;
            this.wordSpans[wordIndex] = span;
        }
        appendParagraph();

        if (this.renderWindowEnd < this.words.length) {
            const laterButton = document.createElement('button');
            laterButton.type = 'button';
            laterButton.className = 'text-window-button window-after';
            laterButton.textContent = this.t('showLater');
            laterButton.addEventListener('click', () => {
                const nextAnchor = Math.min(this.words.length - 1, this.renderWindowEnd + Math.floor(this.renderWindowSize / 2));
                this.renderNormalText({ anchorIndex: nextAnchor, scrollTo: 'start' });
            });
            fragment.appendChild(laterButton);
        }

        this.normalTextDisplay.appendChild(fragment);
        this.highlightMatches();

        requestAnimationFrame(() => {
            if (options.scrollTo === 'end') {
                this.normalTextDisplay.scrollTop = this.normalTextDisplay.scrollHeight;
            } else if (options.scrollTo === 'start') {
                this.normalTextDisplay.scrollTop = 0;
            } else {
                this.scrollCurrentWordIntoView(false);
            }
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim().toLowerCase();

        this.clearSearchHighlights();
        this.searchMatches = [];
        this.currentMatchIndex = -1;

        if (query.length < 1) {
            this.searchResults.textContent = '';
            this.searchPrevBtn.disabled = true;
            this.searchNextBtn.disabled = true;
            return;
        }

        const locale = this.i18n.language === 'ru' ? 'ru-RU' : 'en-US';
        const normalizedQuery = query.toLocaleLowerCase(locale).replace(/\s+/g, ' ');
        const queryParts = normalizedQuery.split(' ');

        if (queryParts.length === 1) {
            this.words.forEach((word, index) => {
                if (this.isReadableToken(word) && word.toLocaleLowerCase(locale).includes(normalizedQuery)) {
                    this.searchMatches.push(index);
                }
            });
        } else {
            for (let index = 0; index < this.words.length; index++) {
                if (!this.isReadableToken(this.words[index])) continue;
                const candidate = [];
                let cursor = index;
                while (cursor < this.words.length && candidate.length < queryParts.length) {
                    if (this.isReadableToken(this.words[cursor])) candidate.push(this.words[cursor].toLocaleLowerCase(locale));
                    cursor++;
                }
                if (candidate.join(' ').includes(normalizedQuery)) this.searchMatches.push(index);
            }
        }

        if (this.searchMatches.length > 0) {
            this.currentMatchIndex = 0;
            this.highlightMatches();
            this.goToMatch(0);
            this.searchPrevBtn.disabled = false;
            this.searchNextBtn.disabled = false;
        } else {
            this.searchResults.textContent = this.t('notFound');
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
        this.clearSearchHighlights();
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
        if (!span) {
            this.renderNormalText({ anchorIndex: wordIndex });
        }

        const visibleSpan = this.wordSpans[wordIndex];
        if (visibleSpan) {
            visibleSpan.classList.add('search-current');
            this.scrollWordWithinReader(visibleSpan, true);
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

    handleNormalWordKeydown(event, wordIndex) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            this.setCurrentWordIndex(wordIndex);
            return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        let nextIndex = wordIndex;
        if (event.key === 'Home') nextIndex = this.nearestReadableIndex(this.renderWindowStart);
        else if (event.key === 'End') nextIndex = this.nearestReadableIndex(this.renderWindowEnd - 1, -1);
        else {
            const direction = event.key === 'ArrowLeft' ? -1 : 1;
            do {
                nextIndex += direction;
            } while (nextIndex >= this.renderWindowStart && nextIndex < this.renderWindowEnd
                && !this.isReadableToken(this.words[nextIndex]));
            if (nextIndex < this.renderWindowStart || nextIndex >= this.renderWindowEnd) return;
        }
        this.setCurrentWordIndex(nextIndex);
        this.wordSpans[nextIndex]?.focus({ preventScroll: true });
    }

    updateCurrentWordHighlight() {
        if (this.lastHighlightedIndex !== null) {
            const previous = this.wordSpans[this.lastHighlightedIndex];
            if (previous) {
                previous.classList.remove('current-word');
                previous.removeAttribute('aria-current');
                previous.tabIndex = -1;
            }
        }

        const current = this.wordSpans[this.currentIndex];
        if (current) {
            current.classList.add('current-word');
            current.setAttribute('aria-current', 'location');
            current.tabIndex = 0;
        }
        this.lastHighlightedIndex = this.currentIndex;
    }

    scrollCurrentWordIntoView(smooth = true) {
        const current = this.wordSpans[this.currentIndex];
        if (current) this.scrollWordWithinReader(current, smooth);
    }

    scrollWordWithinReader(element, smooth = true) {
        const container = this.normalTextDisplay;
        const targetTop = element.offsetTop - (container.clientHeight / 2) + (element.offsetHeight / 2);
        container.scrollTo({ top: Math.max(0, targetTop), behavior: smooth ? 'smooth' : 'auto' });
    }

    openReaderSearch() {
        if (this.mode === 'rsvp') this.stopRSVP();
        if (this.mode !== 'normal') return;
        requestAnimationFrame(() => {
            this.searchInput.focus({ preventScroll: true });
            this.searchInput.select();
        });
    }

    startRSVP() {
        this.rsvpRunStartIndex = this.currentIndex;
        this.rampUpStartTime = null;
        this.activePlaybackMs = 0;
        this.activeSegmentStartedAt = null;
        this.wordsProcessedInRun = 0;
        if (this.words.length === 0) {
            const text = this.textInput.value.trim();
            if (!text) {
                this.showToast(this.t('addTextFirst'), 'error');
                return;
            }
            this.words = this.parseText(text);
            this.currentIndex = this.clampIndex(this.currentIndex, this.words.length);
        }
        this.currentIndex = this.nearestReadableIndex(this.currentIndex);

        this.mode = "rsvp";
        this.showSection("rsvp");
        this.isPlaying = false;
        this.rsvpBookTitle.textContent = this.currentBookName || this.bookNameInput.value.trim() || this.t('draft');
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
        const now = performance.now();
        this.activeSegmentStartedAt = now;
        this.rampUpStartTime = now;
        this.updatePlaybackControls();
        this.updateMediaSessionState('playing');
        this.triggerHaptic('light');
        this.requestWakeLock();
        if (this.words.length > 0 && !this.rsvpWordDisplay.firstChild) {
            this.displayCurrentWord();
        }
        this.scheduleNextWord();
    }

    pause() {
        if (this.isPlaying && this.activeSegmentStartedAt !== null) {
            this.activePlaybackMs += Math.max(0, performance.now() - this.activeSegmentStartedAt);
        }
        this.activeSegmentStartedAt = null;
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.clearTimer) {
            clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }
        if (this.mode === 'rsvp' && this.words.length > 0) {
            if (!this.isReadableToken(this.words[this.currentIndex])) {
                this.currentIndex = this.nearestReadableIndex(this.currentIndex);
                this.displayCurrentWord();
            } else if (!this.rsvpWordDisplay.firstChild) {
                this.displayCurrentWord();
            }
        }
        this.updatePlaybackControls();
        this.updateMediaSessionState('paused');
        this.triggerHaptic('light');
        this.runAsync(() => this.persistReadingPosition());
        this.releaseWakeLock();
    }

    updatePlaybackControls() {
        const icon = this.isPlaying ? '⏸' : '▶';
        const label = this.isPlaying ? this.t('pause') : this.t('continue');

        this.playPauseBtn.textContent = icon;
        this.playPauseBtn.setAttribute('aria-label', label);
        this.rsvpReadingSection.classList.toggle('is-paused', !this.isPlaying);

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

        const wordsBefore = 48;
        const wordsAfter = 12;
        const readableIndexes = [];
        for (let index = 0; index < this.words.length; index++) {
            if (this.isReadableToken(this.words[index])) readableIndexes.push(index);
        }
        const readablePosition = Math.max(0, readableIndexes.findIndex((index) => index >= this.currentIndex));
        const startPosition = Math.max(0, readablePosition - wordsBefore);
        const endPosition = Math.min(readableIndexes.length, readablePosition + wordsAfter + 1);
        const beforeIndexes = readableIndexes.slice(startPosition, readablePosition);
        const currentIndex = readableIndexes[readablePosition];
        const afterIndexes = readableIndexes.slice(readablePosition + 1, endPosition);
        const visibleIndexes = [...beforeIndexes, currentIndex, ...afterIndexes].filter(Number.isInteger);

        const beforePanel = document.createElement('div');
        beforePanel.className = 'pause-context-before';
        const afterPanel = document.createElement('div');
        afterPanel.className = 'pause-context-after';

        if (startPosition > 0) {
            beforePanel.appendChild(this.createPauseContextToken('...', 'pause-context-edge'));
        }

        beforeIndexes.forEach((index) => beforePanel.appendChild(this.createPauseContextToken(this.words[index])));
        const currentToken = this.createPauseContextToken(this.words[currentIndex], 'pause-context-current');
        afterIndexes.forEach((index) => afterPanel.appendChild(this.createPauseContextToken(this.words[index])));

        if (endPosition < readableIndexes.length) {
            afterPanel.appendChild(this.createPauseContextToken('...', 'pause-context-edge'));
        }

        this.rsvpPauseContext.append(beforePanel, currentToken, afterPanel);
        this.rsvpPauseContext.setAttribute('aria-label', visibleIndexes.map((index) => this.words[index]).join(' '));
        requestAnimationFrame(() => { beforePanel.scrollTop = beforePanel.scrollHeight; });
    }

    createPauseContextToken(text, className = '') {
        const token = document.createElement('span');
        // Keep the break opportunity inside the token. Adjacent inline elements
        // without a literal space can become one unbreakable line in WebKit.
        token.textContent = `${text} `;
        if (className) token.className = className;
        return token;
    }

    adjustSpeed(delta, sourceButton = null) {
        if (sourceButton) this.flashSpeedButton(sourceButton);
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
        this.triggerHaptic('selection');
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

    flashSpeedButton(button) {
        if (!button) return;
        const existingTimer = this.speedFeedbackTimers.get(button);
        if (existingTimer) clearTimeout(existingTimer);
        button.classList.remove('is-pressed');
        void button.offsetWidth;
        button.classList.add('is-pressed');
        const timer = setTimeout(() => {
            button.classList.remove('is-pressed');
            this.speedFeedbackTimers.delete(button);
        }, 2000);
        this.speedFeedbackTimers.set(button, timer);
    }

    updateSpeedControls() {
        const targetWpm = Math.round(this.settings.wpm);
        let wpmText = this.t('targetOnly', { target: targetWpm });
        const activeMinutes = this.getActivePlaybackMinutes();
        if (this.wordsProcessedInRun >= 3 && activeMinutes >= (1 / 120)) {
            const actualWpm = Math.max(1, Math.round(this.wordsProcessedInRun / activeMinutes));
            wpmText = this.t('targetActual', { target: targetWpm, actual: actualWpm });
        } else if (this.words.length > 0) {
            const estimatedWpm = this.estimateEffectiveWpm(this.currentIndex, 120);
            if (estimatedWpm > 0) wpmText = this.t('targetEstimated', { target: targetWpm, actual: estimatedWpm });
        }

        if (this.rsvpSpeedText) {
            this.rsvpSpeedText.textContent = wpmText;
        }

        if (this.prevWordBtn) {
            this.prevWordBtn.disabled = this.settings.wpm <= 100;
            this.prevWordBtn.title = this.t('decreaseSpeedTitle', { speed: wpmText });
        }

        if (this.nextWordBtn) {
            this.nextWordBtn.disabled = this.settings.wpm >= 1000;
            this.nextWordBtn.title = this.t('increaseSpeedTitle', { speed: wpmText });
        }
    }

    getFrameAt(index) {
        index = this.clampIndex(index, this.words.length);
        if (this.words.length === 0 || index >= this.words.length) {
            return { text: '', advanceCount: 0, lexicalWordCount: 0, focusIndex: 0, sourceWords: [], punctuationMultiplier: 1, isPauseToken: true };
        }

        const firstWord = this.words[index];

        if (firstWord === '') {
            return { text: '', advanceCount: 1, lexicalWordCount: 0, focusIndex: 0, sourceWords: [''], punctuationMultiplier: 1, isPauseToken: true };
        }

        let advanceCount = 1;
        let lexicalWordCount = this.isReadableToken(firstWord) ? 1 : 0;
        let combinedText = firstWord;
        const sourceWords = [firstWord];

        const pairModeEnabled = lexicalWordCount > 0
            && (this.settings.chunkingEnabled || this.settings.balancedPairsEnabled)
            && this.settings.wpm >= 350
            && index < this.words.length - 1;
        if (pairModeEnabled) {
            const secondWord = this.words[index + 1];
            if (!this.terminalPunctuation(firstWord) && this.isReadableToken(secondWord)) {
                const firstLength = this.readableCharacterCount(firstWord);
                const secondLength = this.readableCharacterCount(secondWord);
                const strictPair = this.settings.chunkingEnabled && firstLength <= 5 && secondLength <= 5;
                const balancedPair = this.settings.balancedPairsEnabled && (firstLength + secondLength) <= 10;
                if (strictPair || balancedPair) {
                    advanceCount = 2;
                    lexicalWordCount = 2;
                    combinedText = `${firstWord} ${secondWord}`;
                    sourceWords.push(secondWord);
                }
            }
        }

        const focusIndex = this.calculateFocusPoint(combinedText);

        let punctuationMultiplier = 1.0;
        const lastWord = sourceWords[sourceWords.length - 1];
        if (lastWord && lastWord.length > 0) {
            const punctuation = this.terminalPunctuation(lastWord);
            if (punctuation === '...' || punctuation === '…') {
                punctuationMultiplier = this.settings.periodPause;
            } else if (['.', '!', '?'].includes(punctuation)) {
                punctuationMultiplier = this.settings.periodPause;
            } else if (punctuation === ',') {
                punctuationMultiplier = this.settings.commaPause;
            } else if ([';', ':'].includes(punctuation)) {
                punctuationMultiplier = this.settings.semicolonPause;
            }
        }

        return {
            text: combinedText,
            advanceCount,
            lexicalWordCount,
            wordCount: lexicalWordCount,
            focusIndex: focusIndex,
            sourceWords: sourceWords,
            punctuationMultiplier: punctuationMultiplier,
            isPauseToken: lexicalWordCount === 0
        };
    }

    terminalPunctuation(word) {
        if (!word) return '';
        const stripped = word.replace(/["'”’»）)\]]+$/u, '');
        if (stripped.endsWith('...')) return '...';
        const match = stripped.match(/([,.!?;:…])$/u);
        return match ? match[1] : '';
    }

    readableCharacterCount(word) {
        if (!word) return 0;
        return Array.from(word.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')).length;
    }

    getActivePlaybackMinutes() {
        let totalMs = this.activePlaybackMs;
        if (this.isPlaying && this.activeSegmentStartedAt !== null) {
            totalMs += Math.max(0, performance.now() - this.activeSegmentStartedAt);
        }
        return totalMs / 60000;
    }

    computeFrameDelay(frame, options = {}) {
        const baseDelay = 60000 / this.settings.wpm;
        let delay = baseDelay * Math.max(frame.lexicalWordCount || 0, 1) * (frame.punctuationMultiplier || 1);

        if (frame.isPauseToken) {
            delay = baseDelay * 0.72;
        } else if (this.settings.lengthScaling && frame.text.length > 0) {
            const averageLength = Math.max(1, Array.from(frame.text.replace(/\s+/g, '')).length / Math.max(frame.lexicalWordCount, 1));
            let scale = 1;
            if (averageLength <= 3) scale = 0.75;
            else if (averageLength >= 8 && averageLength <= 10) scale = 1.25;
            else if (averageLength >= 11) scale = 1.45;
            delay *= scale;
        }

        if (options.includeRamp !== false && this.settings.speedRampUp && this.rampUpStartTime !== null) {
            const elapsed = performance.now() - this.rampUpStartTime;
            if (elapsed < 3000) {
                const speedFactor = 0.7 + (0.3 * Math.max(0, elapsed) / 3000);
                delay /= speedFactor;
            }
        }
        return delay;
    }

    estimateEffectiveWpm(startIndex = 0, maximumWords = 120) {
        if (!this.words.length) return 0;
        let cursor = this.clampIndex(startIndex, this.words.length);
        let lexicalWords = 0;
        let totalDelayMs = 0;
        let guard = 0;
        while (cursor < this.words.length && lexicalWords < maximumWords && guard < maximumWords * 3) {
            const frame = this.getFrameAt(cursor);
            if (!frame.advanceCount) break;
            totalDelayMs += this.computeFrameDelay(frame, { includeRamp: false });
            lexicalWords += frame.lexicalWordCount;
            cursor += frame.advanceCount;
            guard++;
        }
        return lexicalWords > 0 && totalDelayMs > 0 ? Math.round(lexicalWords / (totalDelayMs / 60000)) : 0;
    }

    displayCurrentWord() {
        this.currentIndex = this.clampIndex(this.currentIndex, this.words.length);
        const frame = this.getFrameAt(this.currentIndex);
        const wordFrame = document.createElement('span');
        wordFrame.setAttribute('aria-label', frame.text);
        wordFrame.dataset.paintToken = String(this.wordPaintToken + 1);

        if (this.settings.orpAlignment && !frame.isPauseToken) {
            wordFrame.className = 'rsvp-word-frame orp-grid-mode';

            const leftText = frame.text.slice(0, frame.focusIndex);
            const focusText = this.segmentGraphemes(frame.text).find((item) => item.index === frame.focusIndex)?.segment || '';
            const rightText = frame.text.slice(frame.focusIndex + focusText.length);

            const leftSpan = document.createElement('span');
            leftSpan.className = 'orp-left';
            leftSpan.textContent = leftText;

            const focusSpan = document.createElement('span');
            focusSpan.className = 'rsvp-letter focus-letter orp-center';
            focusSpan.textContent = focusText;
            focusSpan.style.color = this.settings.focusLetterColor;

            const rightSpan = document.createElement('span');
            rightSpan.className = 'orp-right';
            rightSpan.textContent = rightText;

            wordFrame.append(leftSpan, focusSpan, rightSpan);
        } else {
            wordFrame.className = 'rsvp-word-frame';
            for (const grapheme of this.segmentGraphemes(frame.text)) {
                const letter = document.createElement('span');
                letter.className = 'rsvp-letter';
                letter.textContent = grapheme.segment;

                if (grapheme.index === frame.focusIndex && !frame.isPauseToken) {
                    letter.classList.add('focus-letter');
                    letter.style.color = this.settings.focusLetterColor;
                }

                wordFrame.appendChild(letter);
            }
        }

        this.wordPaintToken++;
        this.rsvpWordDisplay.classList.remove('is-clearing');
        this.rsvpWordDisplay.replaceChildren(wordFrame);
        this.fitCurrentFrame(frame, wordFrame);

        const showNotches = Boolean(this.settings.orpNotches);
        if (this.orpNotchTop) this.orpNotchTop.style.display = showNotches ? 'block' : 'none';
        if (this.orpNotchBottom) this.orpNotchBottom.style.display = showNotches ? 'block' : 'none';
        if (this.orpAxisLine) this.orpAxisLine.style.display = showNotches ? 'block' : 'none';

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
        const graphemes = this.segmentGraphemes(word);
        if (graphemes.length === 0) return 0;
        let target = graphemes.length <= 2 ? 0 : (graphemes.length === 3 ? 1 : Math.floor(graphemes.length * 0.35));
        target = Math.min(target, graphemes.length - 1);
        if (!/^\s$/u.test(graphemes[target].segment)) return graphemes[target].index;

        for (let offset = 1; offset < graphemes.length; offset++) {
            const right = target + offset;
            if (right < graphemes.length && !/^\s$/u.test(graphemes[right].segment)) return graphemes[right].index;
            const left = target - offset;
            if (left >= 0 && !/^\s$/u.test(graphemes[left].segment)) return graphemes[left].index;
        }
        return 0;
    }

    segmentGraphemes(text) {
        if (typeof Intl.Segmenter === 'function') {
            return Array.from(new Intl.Segmenter(this.i18n.language, { granularity: 'grapheme' }).segment(text));
        }
        let offset = 0;
        return Array.from(text).map((segment) => {
            const item = { segment, index: offset };
            offset += segment.length;
            return item;
        });
    }

    fitCurrentFrame(frame, wordFrame) {
        const preferredSize = this.settings.fontSize;
        const displayStyle = getComputedStyle(this.rsvpWordDisplay);
        const availableWidth = Math.max(40, this.rsvpWordDisplay.clientWidth
            - parseFloat(displayStyle.paddingLeft || 0)
            - parseFloat(displayStyle.paddingRight || 0));
        const canvas = this.measureCanvas || (this.measureCanvas = document.createElement('canvas'));
        const context = canvas.getContext('2d');
        const fontFamily = displayStyle.fontFamily;
        const fontWeight = displayStyle.fontWeight;
        context.font = `${fontWeight} ${preferredSize}px ${fontFamily}`;

        let fitRatio = 1;
        if (this.settings.orpAlignment && !frame.isPauseToken) {
            const leftText = frame.text.slice(0, frame.focusIndex);
            const focusText = this.segmentGraphemes(frame.text).find((item) => item.index === frame.focusIndex)?.segment
                || frame.text.slice(frame.focusIndex, frame.focusIndex + 1);
            const rightText = frame.text.slice(frame.focusIndex + focusText.length);
            const focusWidth = context.measureText(focusText).width;
            const leftWidth = context.measureText(leftText).width;
            const rightWidth = context.measureText(rightText).width;
            const leftAvailable = Math.max(8, (availableWidth * 0.4) - (focusWidth / 2) - 3);
            const rightAvailable = Math.max(8, (availableWidth * 0.6) - (focusWidth / 2) - 3);
            if (leftWidth > 0) fitRatio = Math.min(fitRatio, leftAvailable / leftWidth);
            if (rightWidth > 0) fitRatio = Math.min(fitRatio, rightAvailable / rightWidth);
        } else {
            const measuredWidth = context.measureText(frame.text).width;
            if (measuredWidth > 0) fitRatio = Math.min(1, availableWidth / measuredWidth);
        }

        let fittedSize = fitRatio < 0.995
            ? Math.max(1, Math.min(preferredSize, preferredSize * fitRatio * 0.98))
            : preferredSize;
        this.rsvpWordDisplay.style.fontSize = `${fittedSize}px`;

        // Canvas and WebKit can choose slightly different fallback-font metrics.
        // Verify the final DOM against the real padded viewport, then refine.
        // The same check also covers the transformed layout shown on pause.
        for (let attempt = 0; fitRatio < 0.995 && attempt < 3; attempt++) {
            void wordFrame.offsetWidth;
            const displayRect = this.rsvpWordDisplay.getBoundingClientRect();
            const contentLeft = displayRect.left + parseFloat(displayStyle.paddingLeft || 0);
            const contentRight = displayRect.right - parseFloat(displayStyle.paddingRight || 0);
            const partRects = Array.from(wordFrame.children).map((element) => element.getBoundingClientRect());
            const frameRect = wordFrame.getBoundingClientRect();
            const glyphLeft = partRects.length > 0 ? Math.min(...partRects.map((rect) => rect.left)) : frameRect.left;
            const glyphRight = partRects.length > 0 ? Math.max(...partRects.map((rect) => rect.right)) : frameRect.right;
            if (glyphLeft >= contentLeft - 0.5 && glyphRight <= contentRight + 0.5) break;

            const axisRatio = this.settings.orpAlignment && !frame.isPauseToken ? 0.4 : 0.5;
            const axis = contentLeft + ((contentRight - contentLeft) * axisRatio);
            const leftUsed = Math.max(1, axis - glyphLeft);
            const rightUsed = Math.max(1, glyphRight - axis);
            const leftRoom = Math.max(1, axis - contentLeft);
            const rightRoom = Math.max(1, contentRight - axis);
            const domRatio = Math.min(1, leftRoom / leftUsed, rightRoom / rightUsed);
            fittedSize = Math.max(1, fittedSize * domRatio * 0.96);
            this.rsvpWordDisplay.style.fontSize = `${fittedSize}px`;
        }

        fittedSize = Math.round(fittedSize * 100) / 100;
        this.rsvpWordDisplay.style.fontSize = `${fittedSize}px`;
        wordFrame.dataset.preferredFontSize = String(preferredSize);
        wordFrame.dataset.fittedFontSize = String(fittedSize);
        wordFrame.classList.toggle('is-font-fitted', fittedSize < preferredSize);
    }

    scheduleNextWord() {
        if (!this.isPlaying || this.words.length === 0) return;

        if (this.timer) clearTimeout(this.timer);
        if (this.clearTimer) clearTimeout(this.clearTimer);

        if (this.currentIndex >= this.words.length) {
            this.pause();
            return;
        }

        const frame = this.getFrameAt(this.currentIndex);
        const delay = this.computeFrameDelay(frame);

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

            const advanceCount = frame.advanceCount || 1;
            this.wordsProcessedInRun += frame.lexicalWordCount || 0;
            const nextIndex = this.currentIndex + advanceCount;

            if (nextIndex >= this.words.length) {
                this.currentIndex = Math.max(0, this.words.length - 1);
                this.savePositionCheckpoint(true);
                this.pause();
                this.updateProgress();
            } else {
                this.currentIndex = nextIndex;
                this.displayCurrentWord();
                this.savePositionCheckpoint(false);
                this.scheduleNextWord();
                this.updateProgress();
            }
        }, delay);
    }

    previousWord() {
        if (this.currentIndex > 0) {
            this.currentIndex = Math.max(0, this.currentIndex - 1);
            this.displayCurrentWord();
            this.schedulePositionSave();
            if (this.isPlaying) this.scheduleNextWord();
        }
    }

    nextWord() {
        const frame = this.getFrameAt(this.currentIndex);
        const step = frame.advanceCount || 1;
        if (this.currentIndex + step < this.words.length) {
            this.currentIndex += step;
        } else {
            this.currentIndex = Math.max(0, this.words.length - 1);
        }
        this.displayCurrentWord();
        this.schedulePositionSave();
        if (this.isPlaying) this.scheduleNextWord();
    }

    seekFromScrubber() {
        if (this.words.length === 0) return;
        if (this.isPlaying) this.pause();

        const totalWords = this.countReadableWords();
        if (totalWords < 1) return;
        const ratio = this.numberInRange(Number(this.rsvpScrubber.value) / 1000, 0, 1, 0);
        const targetOrdinal = totalWords === 1 ? 1 : 1 + Math.round(ratio * (totalWords - 1));
        this.currentIndex = this.tokenIndexForWordOrdinal(targetOrdinal);
        this.displayCurrentWord();
        this.updateProgress();
    }

    savePositionCheckpoint(force = false) {
        this.saveResumeSnapshot(this.dataGeneration, { forceNative: force });
        const now = performance.now();
        if (!force && (now - this.lastPositionPersistedAt) < this.positionPersistIntervalMs) return;
        this.lastPositionPersistedAt = now;
        this.runAsync(() => this.persistReadingPosition());
    }

    updateProgress() {
        const totalWords = this.countReadableWords();
        const currentWordNumber = totalWords > 0 ? Math.max(1, this.wordOrdinalAtIndex(this.currentIndex)) : 0;
        const percentage = totalWords > 0
            ? Math.round((currentWordNumber / totalWords) * 100)
            : 0;

        const wordCountText = totalWords > 0
            ? `${this.i18n.formatNumber(currentWordNumber)} / ${this.i18n.formatNumber(totalWords)}`
            : '0 / 0';
        const percentageText = `${percentage}%`;
        const wordsRemaining = Math.max(totalWords - currentWordNumber, 0);
        const effectiveWpm = this.estimateEffectiveWpm(this.currentIndex, 160) || this.settings.wpm;
        const timeRemaining = this.calculateReadingTime(wordsRemaining, effectiveWpm);
        const totalTime = this.calculateReadingTime(totalWords, this.estimateEffectiveWpm(0, 200) || this.settings.wpm);

        if (this.progressText) {
            this.progressText.textContent = this.t('remaining', { progress: percentageText, time: timeRemaining });
        }
        if (this.wordCount) {
            this.wordCount.textContent = this.t('totalTime', { count: wordCountText, time: totalTime });
        }

        const runStartWord = this.wordOrdinalAtIndex(this.rsvpRunStartIndex || 0);
        const runTotalWords = Math.max(totalWords - runStartWord + 1, 1);
        const runCurrentWords = Math.max(currentWordNumber - runStartWord + 1, 0);
        const rsvpRunPercentage = totalWords > 0 ? Math.min(100, Math.max(0, Math.round((runCurrentWords / runTotalWords) * 100))) : 0;

        if (this.rsvpTotalProgressFill) {
            this.rsvpTotalProgressFill.style.width = `${percentage}%`;
        }
        if (this.rsvpRunProgressFill) {
            this.rsvpRunProgressFill.style.width = `${rsvpRunPercentage}%`;
        }
        if (this.rsvpProgressBar) {
            this.rsvpProgressBar.style.width = `${percentage}%`;
        }
        if (this.rsvpScrubber) {
            const scrubberProgress = totalWords > 1
                ? Math.round(((currentWordNumber - 1) / (totalWords - 1)) * 1000)
                : 0;
            this.rsvpScrubber.value = String(scrubberProgress);
            this.rsvpScrubber.disabled = totalWords < 2;
            this.rsvpScrubber.setAttribute('aria-valuetext', this.t('readingPositionValue', {
                progress: percentage,
                current: this.i18n.formatNumber(currentWordNumber),
                total: this.i18n.formatNumber(totalWords)
            }));
        }

        this.updateSpeedControls();
        if (this.rsvpProgressText) {
            this.rsvpProgressText.textContent = this.t('rsvpProgress', { session: rsvpRunPercentage, book: percentage, time: timeRemaining });
        }
        if (this.rsvpWordCount) {
            this.rsvpWordCount.textContent = this.t('totalTime', { count: wordCountText, time: totalTime });
        }
    }

    calculateReadingTime(wordCount, effectiveWpm = this.settings.wpm) {
        if (wordCount <= 0) return this.t('zeroMinutes');

        const minutes = Math.ceil(wordCount / Math.max(1, effectiveWpm));
        if (minutes < 60) return this.t('minutes', { count: minutes });

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins === 0 ? this.t('hours', { count: hours }) : this.t('hoursMinutes', { hours, minutes: mins });
    }

    handleKeyboard(event) {
        if (this.activeModal) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeActiveModal();
            } else if (event.key === 'Tab') {
                this.trapModalFocus(event);
            }
            return;
        }

        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && ['normal', 'rsvp'].includes(this.mode)) {
            event.preventDefault();
            this.openReaderSearch();
            return;
        }

        if (this.settings.hardwareControls && ['AudioVolumeUp', 'AudioVolumeDown', 'MediaPlayPause'].includes(event.code)) {
            if (this.getPlatform() !== 'ios' && this.mode === 'rsvp') {
                event.preventDefault();
                this.togglePlayPause();
            }
            return;
        }

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
                this.adjustSpeed(-20, this.prevWordBtn);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.adjustSpeed(20, this.nextWordBtn);
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
        const sections = {
            input: this.textInputSection,
            normal: this.normalReadingSection,
            rsvp: this.rsvpReadingSection,
            library: this.librarySection
        };
        Object.entries(sections).forEach(([name, element]) => {
            element.hidden = name !== section;
            element.style.display = '';
        });
        this.globalSearchBtn.hidden = !['normal', 'rsvp'].includes(section);
    }

    backToInput() {
        this.pause();
        this.mode = 'input';
        this.showSection('input');
        this.flushPendingSaves();
        this.saveDraftSoon();
    }

    openSettings(trigger = null) {
        this.pauseForOverlay();
        this.loadSettingsToForm();
        this.openModal(this.settingsModal, this.closeSettingsBtn, trigger);
    }

    closeSettings() {
        this.closeModal(this.settingsModal);
    }

    loadSettingsToForm() {
        if (this.wpmInput) this.wpmInput.value = this.settings.wpm;
        if (this.commaPauseInput) this.commaPauseInput.value = this.settings.commaPause;
        if (this.periodPauseInput) this.periodPauseInput.value = this.settings.periodPause;
        if (this.semicolonPauseInput) this.semicolonPauseInput.value = this.settings.semicolonPause;
        if (this.focusLetterColorInput) this.focusLetterColorInput.value = this.settings.focusLetterColor;
        if (this.fontSizeInput) this.fontSizeInput.value = this.settings.fontSize;
        if (this.orpAlignmentInput) this.orpAlignmentInput.checked = Boolean(this.settings.orpAlignment);
        if (this.lengthScalingInput) this.lengthScalingInput.checked = Boolean(this.settings.lengthScaling);
        if (this.chunkingEnabledInput) this.chunkingEnabledInput.checked = Boolean(this.settings.chunkingEnabled);
        if (this.balancedPairsEnabledInput) this.balancedPairsEnabledInput.checked = Boolean(this.settings.balancedPairsEnabled);
        if (this.speedRampUpInput) this.speedRampUpInput.checked = Boolean(this.settings.speedRampUp);
        if (this.orpNotchesInput) this.orpNotchesInput.checked = Boolean(this.settings.orpNotches);
        if (this.hardwareControlsInput) this.hardwareControlsInput.checked = Boolean(this.settings.hardwareControls);
        this.updatePlatformControlAvailability();
    }

    updateSettings() {
        this.settings.wpm = this.numberInRange(this.wpmInput ? this.wpmInput.value : 250, 100, 1000, 250);
        this.settings.commaPause = this.numberInRange(this.commaPauseInput ? this.commaPauseInput.value : 1.05, 1, 5, 1.05);
        this.settings.periodPause = this.numberInRange(this.periodPauseInput ? this.periodPauseInput.value : 1.6, 1, 5, 1.6);
        this.settings.semicolonPause = this.numberInRange(this.semicolonPauseInput ? this.semicolonPauseInput.value : 1.3, 1, 5, 1.3);
        if (this.focusLetterColorInput) this.settings.focusLetterColor = this.focusLetterColorInput.value;
        if (this.fontSizeInput) this.settings.fontSize = this.numberInRange(this.fontSizeInput.value, 24, 120, 42);
        if (this.orpAlignmentInput) this.settings.orpAlignment = this.orpAlignmentInput.checked;
        if (this.lengthScalingInput) this.settings.lengthScaling = this.lengthScalingInput.checked;
        if (this.chunkingEnabledInput) this.settings.chunkingEnabled = this.chunkingEnabledInput.checked;
        if (this.balancedPairsEnabledInput) this.settings.balancedPairsEnabled = this.balancedPairsEnabledInput.checked;
        if (this.speedRampUpInput) this.settings.speedRampUp = this.speedRampUpInput.checked;
        if (this.orpNotchesInput) this.settings.orpNotches = this.orpNotchesInput.checked;
        if (this.hardwareControlsInput && !this.hardwareControlsInput.disabled) {
            this.settings.hardwareControls = this.hardwareControlsInput.checked;
        }

        this.saveSettings();
        this.updateSpeedControls();
        this.setupHardwareControls();

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
            settingsVersion: 8,
            wpm: 350,
            commaPause: 1.05,
            periodPause: 1.6,
            semicolonPause: 1.3,
            focusLetterColor: '#ff6b6b',
            fontSize: 42,
            orpAlignment: true,
            lengthScaling: true,
            chunkingEnabled: true,
            balancedPairsEnabled: false,
            speedRampUp: true,
            orpNotches: false,
            hardwareControls: false,
            cloudSyncEnabled: false
        };
        this.loadSettingsToForm();
        this.saveSettings();
        this.updateSpeedControls();
        this.setupHardwareControls();

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

        const settingsSnapshot = { ...this.settings };
        let localError = null;
        try {
            // This envelope is the browser-side commit boundary. The legacy keys
            // remain mirrors for older builds, but can never expose a mismatched pair.
            localStorage.setItem('paceflow_settings_envelope', JSON.stringify({
                settings: settingsSnapshot,
                updatedAt: this.settingsUpdatedAt
            }));
            localStorage.setItem('rsvp_settings', JSON.stringify(settingsSnapshot));
            localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
        } catch (error) {
            localError = error;
            console.warn('Failed to mirror settings to localStorage:', error);
        }
        if (this.storageMode !== 'localstorage' && this.db) {
            this.settingsWritePromise = this.persistSettingsToDatabase(settingsSnapshot, this.settingsUpdatedAt)
                .catch((error) => console.warn('Failed to save settings atomically to IndexedDB:', error));
        } else if (localError) {
            throw localError;
        }

        if (!options.skipSync && !this.isApplyingRemote) {
            this.markSyncPending();
        }
        return this.settingsWritePromise;
    }

    readLocalSettingsEnvelope() {
        try {
            const envelope = JSON.parse(localStorage.getItem('paceflow_settings_envelope') || 'null');
            if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)
                && envelope.settings && typeof envelope.settings === 'object' && !Array.isArray(envelope.settings)
                && typeof envelope.updatedAt === 'string') {
                return envelope;
            }
        } catch (error) {
            console.warn('Failed to load the atomic settings envelope:', error);
        }
        return null;
    }

    loadSettings() {
        let saved = localStorage.getItem('rsvp_settings');
        let savedUpdatedAt = localStorage.getItem('rsvp_settings_updated_at');
        const envelope = this.readLocalSettingsEnvelope();
        if (envelope) {
            saved = JSON.stringify(envelope.settings);
            savedUpdatedAt = envelope.updatedAt;
        }
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const migrated = this.migrateSettingsDefaults(parsed);
                this.settings = { ...this.settings, ...migrated.settings };
                if (migrated.changed) {
                    this.settingsUpdatedAt = new Date().toISOString();
                    savedUpdatedAt = this.settingsUpdatedAt;
                    localStorage.setItem('paceflow_settings_envelope', JSON.stringify({
                        settings: this.settings,
                        updatedAt: this.settingsUpdatedAt
                    }));
                    localStorage.setItem('rsvp_settings', JSON.stringify(this.settings));
                    localStorage.setItem('rsvp_settings_updated_at', this.settingsUpdatedAt);
                    localStorage.setItem('rsvp_sync_pending', '0');
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }

        if (savedUpdatedAt) {
            this.settingsUpdatedAt = savedUpdatedAt;
        }

        this.loadSettingsToForm();
    }

    migrateSettingsDefaults(settings) {
        const migrated = { ...(settings || {}) };
        let changed = false;

        if (migrated.settingsVersion !== 8) {
            if (migrated.wpm === undefined || migrated.wpm === 250 || migrated.wpm === 300) {
                migrated.wpm = 350;
                changed = true;
            }
            if (migrated.periodPause === undefined || migrated.periodPause === 1.75 || migrated.periodPause === 2.5) {
                migrated.periodPause = 1.6;
                changed = true;
            }
            if (migrated.semicolonPause === undefined || migrated.semicolonPause === 1.4 || migrated.semicolonPause === 2.0) {
                migrated.semicolonPause = 1.3;
                changed = true;
            }
            if (migrated.fontSize === undefined || migrated.fontSize === 60) {
                migrated.fontSize = 42;
                changed = true;
            }
            if (typeof migrated.orpAlignment !== 'boolean') {
                migrated.orpAlignment = true;
                changed = true;
            }
            if (typeof migrated.lengthScaling !== 'boolean') {
                migrated.lengthScaling = true;
                changed = true;
            }
            if (typeof migrated.chunkingEnabled !== 'boolean') {
                migrated.chunkingEnabled = true;
                changed = true;
            }
            if (typeof migrated.balancedPairsEnabled !== 'boolean') {
                migrated.balancedPairsEnabled = false;
                changed = true;
            }
            if (typeof migrated.speedRampUp !== 'boolean') {
                migrated.speedRampUp = true;
                changed = true;
            }
            if (typeof migrated.orpNotches !== 'boolean') {
                migrated.orpNotches = false;
                changed = true;
            }
            if (typeof migrated.hardwareControls !== 'boolean') {
                migrated.hardwareControls = false;
                changed = true;
            }
            if (typeof migrated.cloudSyncEnabled !== 'boolean') {
                migrated.cloudSyncEnabled = false;
                changed = true;
            }
            migrated.settingsVersion = 8;
            changed = true;
        }

        return { settings: migrated, changed };
    }

    markSyncPending() {
        if (!this.settings.cloudSyncEnabled || this.isNativePlatform()) {
            try {
                localStorage.setItem('rsvp_sync_pending', '0');
            } catch (error) {
                console.warn('Could not mirror sync state:', error);
            }
            this.updateOnlineStatus();
            return;
        }
        try {
            localStorage.setItem('rsvp_sync_pending', '1');
        } catch (error) {
            console.warn('Could not mirror sync state:', error);
        }
        this.updateOnlineStatus();
        this.syncSoon();
    }

    syncSoon(delay = 1200) {
        if (!this.settings.cloudSyncEnabled || this.isNativePlatform()) return;
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.runAsync(() => this.syncNow());
        }, delay);
    }

    async syncNow() {
        await this.ready;
        if (!this.settings.cloudSyncEnabled || this.isNativePlatform() || this.isSyncing || !navigator.onLine) return;

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
                    await this.putBook(normalized, { allowRestore: true });
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

        this.storeLegacyTextSnapshot(remoteDraft.currentBookId ? '' : remoteDraft.text);
        localStorage.setItem('rsvp_bookmark', String(remoteDraft.currentIndex || 0));

        if (this.storageMode !== 'localstorage') {
            await this.setKV('draft', remoteDraft);
        }

        if (this.mode === 'input') {
            this.setTextInputValue(remoteDraft.text);
            this.bookNameInput.value = remoteDraft.bookName || '';
            this.currentBookId = remoteDraft.currentBookId || null;
            this.currentBookName = remoteDraft.bookName || '';
            this.currentTextSignature = '';
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

    persistedRevision(snapshot) {
        const revision = Number(snapshot?.revision);
        return Number.isSafeInteger(revision) && revision > 0 ? revision : 0;
    }

    isPersistedSnapshotNewer(candidate, current) {
        if (!current) return Boolean(candidate);
        if (!candidate) return false;
        const candidateRevision = this.persistedRevision(candidate);
        const currentRevision = this.persistedRevision(current);
        if (candidateRevision !== currentRevision && (candidateRevision > 0 || currentRevision > 0)) {
            return candidateRevision > currentRevision;
        }
        return this.isNewer(candidate.updatedAt, current.updatedAt);
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

        const snapshot = {
            currentBookId: this.currentBookId,
            text: this.textInput.value.trim(),
            name: this.bookNameInput.value.trim(),
            composerRevision: this.composerRevision,
            currentIndex: this.currentIndex,
            chapters: this.normalizeChapters(this.currentChapters)
        };
        const text = snapshot.text;
        if (!text) {
            if (!options.silent) {
                this.showToast(this.t('saveTextFirst'), 'error');
            }
            return null;
        }

        const bookGeneration = snapshot.currentBookId ? this.getBookWriteGeneration(snapshot.currentBookId) : 0;
        const existing = snapshot.currentBookId ? await this.getBook(snapshot.currentBookId) : null;
        if (snapshot.composerRevision !== this.composerRevision) return null;
        if (snapshot.currentBookId && !this.isBookWriteCurrent(snapshot.currentBookId, bookGeneration)) return null;
        const name = snapshot.name || existing?.name || this.makeDefaultBookName(text);
        const now = new Date().toISOString();
        this.assertTextTokenSafety(text, { requireReadable: true });
        const tokens = this.parseText(text);
        const chapters = this.normalizeChapters(snapshot.chapters.length > 0 ? snapshot.chapters : (existing?.chapters || []));

        const book = {
            ...(existing || {}),
            id: existing?.id || this.createId(),
            name,
            text,
            wordCount: this.countReadableWords(tokens),
            tokenCount: tokens.length,
            currentIndex: this.clampIndex(snapshot.currentIndex, tokens.length),
            bookmarks: existing?.bookmarks || [],
            chapters,
            sourceType: existing?.sourceType || options.sourceType || 'text',
            fileName: existing?.fileName || options.fileName || '',
            dateAdded: existing?.dateAdded || now,
            lastRead: now,
            updatedAt: now
        };

        const savedBook = existing
            ? await this.mutateBook(existing.id, (latest) => ({
                ...latest,
                ...book,
                name: snapshot.name || latest.name,
                bookmarks: latest.bookmarks,
                chapters: this.normalizeChapters(snapshot.chapters.length > 0 ? snapshot.chapters : latest.chapters),
                sourceType: latest.sourceType || options.sourceType || 'text',
                fileName: latest.fileName || options.fileName || '',
                dateAdded: latest.dateAdded
            }), { bookGeneration })
            : await this.putBook(book);
        if (!savedBook) return null;
        if (snapshot.composerRevision !== this.composerRevision
            || this.textInput.value.trim() !== snapshot.text
            || this.bookNameInput.value.trim() !== snapshot.name) {
            // The snapshot may have completed safely as its own book, but input
            // typed during the async write remains a separate unsaved draft.
            this.currentBookId = null;
            this.currentBookName = '';
            this.currentTextSignature = '';
            this.hasUnsavedTextInput = true;
            await this.saveDraft({ skipSync: true });
            await this.loadLibrary();
            this.updateCurrentBookInfo();
            return savedBook;
        }
        this.currentBookId = savedBook.id;
        this.currentBookName = savedBook.name;
        this.currentTextSignature = savedBook.textSignature;
        this.currentChapters = savedBook.chapters;
        this.bookNameInput.value = savedBook.name;
        await this.saveDraft();
        await this.loadLibrary();
        this.updateCurrentBookInfo();

        if (!options.silent) {
            this.showToast(existing ? this.t('bookUpdated') : this.t('bookSaved'));
        }

        return savedBook;
    }

    makeDefaultBookName(text) {
        const firstWords = this.parseText(text).filter((word) => this.isReadableToken(word)).slice(0, 5).join(' ');
        return firstWords ? firstWords.slice(0, 60) : this.t('bookNumber', { count: this.library.length + 1 });
    }

    async showLibrary() {
        await this.ready;
        await this.loadLibrary();
        this.renderLibrary();
        this.mode = 'library';
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
                ? this.t('emptyLibrary')
                : this.t('noLibraryMatches');
            this.booksList.appendChild(empty);
            return;
        }

        filteredBooks.forEach((book) => {
            const item = document.createElement('li');
            item.className = 'library-item';

            const bookTokens = book.isUnsafeText ? [] : this.parseText(book.text);
            const currentWordNumber = book.isUnsafeText
                ? Math.min(book.wordCount, Math.max(0, Number(book.currentIndex) || 0))
                : this.wordOrdinalAtIndex(book.currentIndex, bookTokens);
            const progress = book.wordCount > 0 ? Math.round((currentWordNumber / book.wordCount) * 100) : 0;

            const info = document.createElement('div');
            info.className = 'book-info';

            const title = document.createElement('div');
            title.className = 'book-title';
            title.textContent = book.name;

            const meta = document.createElement('div');
            meta.className = 'book-meta';
            meta.textContent = this.t('bookMeta', {
                words: this.formatWordCount(book.wordCount),
                progress,
                bookmarks: this.formatBookmarkCount(book.bookmarks.length)
            });

            const progressBar = document.createElement('div');
            progressBar.className = 'book-progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'book-progress-fill';
            progressFill.style.width = `${progress}%`;
            progressBar.appendChild(progressFill);

            const date = document.createElement('div');
            date.className = 'book-date';
            date.textContent = this.t('lastRead', { date: this.formatDate(book.lastRead) });

            info.append(title, meta, progressBar, date);

            const actions = document.createElement('div');
            actions.className = 'book-actions';

            const readBtn = this.createActionButton('▶', this.t('read'), () => this.runAsync(() => this.loadBook(book.id, { start: true })));
            const bookmarksBtn = this.createActionButton('★', this.t('bookmarks'), (event) => {
                const trigger = event.currentTarget;
                this.runAsync(() => this.openBookmarksForBook(book.id, trigger));
            });
            const renameBtn = this.createActionButton('✎', this.t('rename'), () => this.runAsync(() => this.renameBook(book.id)));
            const deleteBtn = this.createActionButton('×', this.t('delete'), () => this.runAsync(() => this.deleteBook(book.id)));

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
        button.setAttribute('aria-label', title);
        button.textContent = text;
        button.addEventListener('click', handler);
        return button;
    }

    formatLibrarySummary(filteredCount, totalCount) {
        if (filteredCount === totalCount) {
            if (this.i18n.language === 'ru') {
                return `${totalCount} ${this.pluralize(totalCount, ['книга', 'книги', 'книг'])}`;
            }
            return `${totalCount} ${totalCount === 1 ? 'book' : 'books'}`;
        }
        return this.t('filteredBookCount', { filtered: filteredCount, total: totalCount });
    }

    pluralize(value, forms) {
        const abs = Math.abs(value) % 100;
        const last = abs % 10;
        if (abs > 10 && abs < 20) return forms[2];
        if (last > 1 && last < 5) return forms[1];
        if (last === 1) return forms[0];
        return forms[2];
    }

    formatCount(value, englishForms, russianForms) {
        const formatted = this.i18n.formatNumber(value);
        if (this.i18n.language === 'ru') {
            return `${formatted} ${this.pluralize(value, russianForms)}`;
        }
        return `${formatted} ${value === 1 ? englishForms[0] : englishForms[1]}`;
    }

    formatWordCount(value) {
        return this.formatCount(value, ['word', 'words'], ['слово', 'слова', 'слов']);
    }

    formatBookmarkCount(value) {
        return this.formatCount(value, ['bookmark', 'bookmarks'], ['закладка', 'закладки', 'закладок']);
    }

    formatBookCount(value) {
        return this.formatCount(value, ['book', 'books'], ['книга', 'книги', 'книг']);
    }

    async loadBook(bookId, options = {}) {
        await this.ready;
        const composerRevision = this.composerRevision;

        const bookGeneration = this.getBookWriteGeneration(bookId);
        const book = await this.getBook(bookId);
        if (composerRevision !== this.composerRevision) return null;
        if (!book) {
            this.showToast(this.t('bookNotFound'), 'error');
            return;
        }
        if (book.isUnsafeText || book.nativeOnlyText || !book.text) {
            this.showToast(this.t('importSafetyLimit'), 'error');
            return null;
        }

        const now = new Date().toISOString();
        const savedBook = await this.mutateBook(bookId, (latest) => ({ ...latest, lastRead: now }), { bookGeneration });
        if (!savedBook) return null;
        await this.loadLibrary();
        if (composerRevision !== this.composerRevision) return savedBook;

        this.currentBookId = savedBook.id;
        this.currentBookName = savedBook.name;
        this.currentTextSignature = savedBook.textSignature;
        this.currentChapters = this.normalizeChapters(savedBook.chapters);
        this.words = this.parseText(savedBook.text);
        this.currentIndex = this.nearestReadableIndex(this.clampIndex(savedBook.currentIndex, this.words.length));
        this.setTextInputValue(savedBook.text);
        this.bookNameInput.value = savedBook.name;
        await this.saveDraft();

        if (options.start) {
            this.mode = 'normal';
            this.renderNormalText();
            this.updateProgress();
            this.updateCurrentBookInfo();
            this.showSection('normal');
        } else {
            this.showSection('input');
        }
        return savedBook;
    }

    async deleteBook(bookId) {
        const book = await this.getBook(bookId);
        if (!book) return;

        const confirmed = await this.showActionDialog({
            title: this.t('deleteBookTitle'),
            message: this.t('confirmDeleteBook', { name: book.name }),
            confirmLabel: this.t('delete'),
            danger: true
        });
        if (!confirmed) return;

        await this.deleteBookFromStorage(bookId);
        if (this.currentBookId === String(bookId)) {
            this.currentBookId = null;
            this.currentBookName = '';
            this.currentTextSignature = '';
            this.currentChapters = [];
            this.currentIndex = 0;
            await this.saveDraft();
        }
        await this.loadLibrary();
        this.renderLibrary();
        this.showToast(this.t('bookDeleted'));
    }

    async renameBook(bookId) {
        const bookGeneration = this.getBookWriteGeneration(bookId);
        const book = await this.getBook(bookId);
        if (!book) return;

        const newName = await this.showActionDialog({
            title: this.t('renameBookTitle'),
            inputLabel: this.t('newTitle'),
            value: book.name,
            confirmLabel: this.t('save')
        });
        if (newName === null || !String(newName).trim()) return;

        const savedBook = await this.mutateBook(bookId, (latest) => ({
            ...latest,
            name: String(newName).trim(),
            updatedAt: new Date().toISOString()
        }), { bookGeneration });
        if (!savedBook) return;

        if (this.currentBookId === savedBook.id) {
            this.currentBookName = savedBook.name;
            this.bookNameInput.value = savedBook.name;
            await this.saveDraft();
            this.updateCurrentBookInfo();
        }

        await this.loadLibrary();
        this.renderLibrary();
    }

    async persistReadingPosition() {
        const generation = this.dataGeneration;
        if (this.isDeletingAllData) return;
        const bookId = this.currentBookId;
        const bookGeneration = bookId ? this.getBookWriteGeneration(bookId) : 0;
        const currentIndex = this.currentIndex;
        try {
            localStorage.setItem('rsvp_bookmark', String(currentIndex));
        } catch (error) {
            console.warn('Could not mirror the reading position:', error);
        }
        const now = new Date().toISOString();

        if (bookId) {
            const savedBook = await this.mutateBook(bookId, (latest) => ({
                ...latest,
                currentIndex: this.clampIndex(currentIndex, latest.tokenCount ?? this.parseText(latest.text).length),
                lastRead: now,
                updatedAt: now
            }), { generation, bookGeneration, skipNative: true, skipSync: true });
            if (savedBook && !this.isDeletingAllData && generation === this.dataGeneration) {
                this.updateBookInMemory(savedBook);
            }
        }

        if (!this.isDeletingAllData && generation === this.dataGeneration) {
            await this.saveDraft({ generation, skipSync: true });
        }
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
            this.library[index] = this.normalizeBook(updatedBook, { recalculateCounts: false, quarantineUnsafe: true });
        }
    }

    async addBookmarkAtCurrentPosition() {
        await this.ready;

        if (this.words.length === 0) {
            const text = this.textInput.value.trim();
            if (!text) {
                this.showToast(this.t('noTextForBookmark'), 'error');
                return;
            }
            this.words = this.parseText(text);
        }

        const book = await this.ensureCurrentBook();
        if (!book) return;
        const bookGeneration = this.getBookWriteGeneration(book.id);

        const excerpt = this.makeExcerpt(this.currentIndex);
        const currentWordNumber = this.wordOrdinalAtIndex(this.currentIndex);
        const defaultName = `${Math.round((currentWordNumber / Math.max(this.countReadableWords(), 1)) * 100)}% — ${excerpt.slice(0, 32)}`;
        const requestedName = await this.showActionDialog({
            title: this.t('bookmarkDialogTitle'),
            inputLabel: this.t('bookmarkName'),
            value: defaultName,
            confirmLabel: this.t('save')
        });
        if (requestedName === null) return;
        const name = String(requestedName).trim() || defaultName;

        const bookmark = {
            id: this.createId(),
            name,
            index: this.clampIndex(this.currentIndex, book.tokenCount || this.words.length),
            excerpt,
            createdAt: new Date().toISOString()
        };

        const savedBook = await this.mutateBook(book.id, (latest) => ({
            ...latest,
            currentIndex: this.currentIndex,
            bookmarks: [...latest.bookmarks, bookmark],
            lastRead: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }), { bookGeneration });
        if (!savedBook) return;
        await this.loadLibrary();
        this.bookmarksModalBookId = savedBook.id;
        this.renderBookmarks(savedBook);
        this.updateCurrentBookInfo();
        this.showToast(this.t('bookmarkAdded'));
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
        return this.words.slice(start, end).filter((word) => this.isReadableToken(word)).join(' ');
    }

    async openBookmarksForCurrentBook(trigger = null) {
        await this.ready;

        if (!this.currentBookId) {
            const savedBook = await this.ensureCurrentBook();
            if (!savedBook) return;
        }

        await this.openBookmarksForBook(this.currentBookId, trigger);
    }

    async openBookmarksForBook(bookId, trigger = null) {
        this.pauseForOverlay();
        const book = await this.getBook(bookId);
        if (!book) {
            this.showToast(this.t('bookNotFound'), 'error');
            return;
        }

        this.bookmarksModalBookId = book.id;
        this.saveBookmarkBtn.hidden = book.id !== this.currentBookId;
        this.renderBookmarks(book);
        this.openModal(this.bookmarksModal, this.closeBookmarksBtn, trigger);
    }

    closeBookmarks() {
        this.closeModal(this.bookmarksModal);
    }

    openToc(trigger = null) {
        this.pauseForOverlay();
        this.renderToc();
        this.openModal(this.tocModal, this.closeTocBtn, trigger);
        requestAnimationFrame(() => {
            this.tocList.querySelector('[aria-current="location"]')?.scrollIntoView({ block: 'center' });
        });
    }

    pauseForOverlay() {
        if (this.mode === 'rsvp' && this.isPlaying) this.pause();
    }

    closeToc() {
        this.closeModal(this.tocModal);
    }

    openModal(modal, preferredFocus, trigger = null) {
        if (!modal) return;
        if (this.activeModal && this.activeModal !== modal) this.closeModal(this.activeModal, false);
        const activeElement = document.activeElement;
        const activeTrigger = activeElement instanceof HTMLElement
            && activeElement !== document.body
            && activeElement !== document.documentElement
            ? activeElement
            : null;
        this.modalTrigger = trigger instanceof HTMLElement ? trigger : activeTrigger;
        this.activeModal = modal;
        modal.classList.add('active');
        [document.querySelector('.app-header'), document.getElementById('mainContainer')]
            .filter(Boolean)
            .forEach((element) => {
                element.inert = true;
                element.setAttribute('aria-hidden', 'true');
            });
        requestAnimationFrame(() => (preferredFocus || this.getModalFocusables(modal)[0])?.focus({ preventScroll: true }));
    }

    closeModal(modal, restoreFocus = true) {
        if (!modal) return;
        modal.classList.remove('active');
        if (this.activeModal !== modal) return;
        this.activeModal = null;
        [document.querySelector('.app-header'), document.getElementById('mainContainer')]
            .filter(Boolean)
            .forEach((element) => {
                element.inert = false;
                element.removeAttribute('inert');
                element.removeAttribute('aria-hidden');
            });
        const trigger = this.modalTrigger;
        this.modalTrigger = null;
        if (restoreFocus && trigger?.isConnected) {
            const restoreTriggerFocus = () => {
                if (trigger.isConnected) trigger.focus({ preventScroll: true });
            };
            // WebKit can defer the removal of an inert focus boundary until the
            // next rendering turn. Try immediately for responsive keyboards,
            // then retry once after layout for Safari and embedded WKWebView.
            restoreTriggerFocus();
            if (document.activeElement !== trigger) requestAnimationFrame(restoreTriggerFocus);
        }
    }

    closeActiveModal() {
        if (this.activeModal === this.settingsModal) this.closeSettings();
        else if (this.activeModal === this.bookmarksModal) this.closeBookmarks();
        else if (this.activeModal === this.tocModal) this.closeToc();
        else if (this.activeModal === this.actionDialog) this.finishActionDialog(null);
    }

    showActionDialog({ title, message = '', inputLabel = '', value = '', confirmLabel, danger = false }) {
        if (this.pendingActionDialog) this.finishActionDialog(null);

        this.actionDialogParent = this.activeModal && this.activeModal !== this.actionDialog
            ? this.activeModal
            : null;
        this.actionDialogReturnFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        if (this.actionDialogParent) {
            this.actionDialogParent.inert = true;
            this.actionDialogParent.setAttribute('aria-hidden', 'true');
        } else {
            [document.querySelector('.app-header'), document.getElementById('mainContainer')]
                .filter(Boolean)
                .forEach((element) => {
                    element.inert = true;
                    element.setAttribute('aria-hidden', 'true');
                });
        }

        this.actionDialogTitle.textContent = title;
        this.actionDialogMessage.textContent = message;
        this.actionDialogInputGroup.hidden = !inputLabel;
        this.actionDialogInputLabel.textContent = inputLabel;
        this.actionDialogInput.value = value;
        this.actionDialogConfirmBtn.textContent = confirmLabel || this.t('confirm');
        this.actionDialogConfirmBtn.classList.toggle('danger-btn', danger);
        this.actionDialogConfirmBtn.classList.toggle('primary-btn', !danger);
        this.activeModal = this.actionDialog;
        this.actionDialog.classList.add('active');

        requestAnimationFrame(() => {
            const focusTarget = inputLabel ? this.actionDialogInput : this.actionDialogCancelBtn;
            focusTarget.focus({ preventScroll: true });
            if (inputLabel) this.actionDialogInput.select();
        });

        return new Promise((resolve) => {
            this.pendingActionDialog = resolve;
        });
    }

    finishActionDialog(value) {
        if (!this.pendingActionDialog && !this.actionDialog?.classList.contains('active')) return;
        this.actionDialog.classList.remove('active');

        const parent = this.actionDialogParent;
        const returnFocus = this.actionDialogReturnFocus;
        this.actionDialogParent = null;
        this.actionDialogReturnFocus = null;
        this.activeModal = parent;

        if (parent) {
            parent.inert = false;
            parent.removeAttribute('inert');
            parent.removeAttribute('aria-hidden');
        } else {
            [document.querySelector('.app-header'), document.getElementById('mainContainer')]
                .filter(Boolean)
                .forEach((element) => {
                    element.inert = false;
                    element.removeAttribute('inert');
                    element.removeAttribute('aria-hidden');
                });
        }

        const resolve = this.pendingActionDialog;
        this.pendingActionDialog = null;
        if (returnFocus?.isConnected) requestAnimationFrame(() => returnFocus.focus({ preventScroll: true }));
        if (resolve) resolve(value);
    }

    getModalFocusables(modal) {
        return Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
            .filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
    }

    trapModalFocus(event) {
        const focusable = this.getModalFocusables(this.activeModal);
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    renderToc() {
        this.tocList.replaceChildren();
        const chapters = this.normalizeChapters(this.currentChapters);
        if (chapters.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = this.t('noChapters');
            this.tocList.appendChild(empty);
            return;
        }

        let currentChapterIndex = 0;
        chapters.forEach((chapter, index) => {
            if (chapter.wordIndex <= this.currentIndex) currentChapterIndex = index;
        });

        chapters.forEach((chapter, chapterIndex) => {
            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'toc-button';
            button.classList.toggle('current', chapterIndex === currentChapterIndex);
            if (chapterIndex === currentChapterIndex) button.setAttribute('aria-current', 'location');
            button.style.paddingLeft = `${6 + ((chapter.level - 1) * 14)}px`;

            const title = document.createElement('span');
            title.textContent = chapter.title;
            const meta = document.createElement('small');
            const wordNumber = this.wordOrdinalAtIndex(chapter.wordIndex);
            const progress = this.countReadableWords() > 0 ? Math.round((wordNumber / this.countReadableWords()) * 100) : 0;
            meta.textContent = this.t('chapterPosition', { progress, word: this.i18n.formatNumber(Math.max(1, wordNumber)) });
            button.append(title, meta);
            button.addEventListener('click', () => this.goToChapter(chapter));
            item.appendChild(button);
            this.tocList.appendChild(item);
        });
    }

    goToChapter(chapter) {
        const chapterIndex = this.nearestReadableIndex(this.clampIndex(chapter.wordIndex, this.words.length));
        this.currentIndex = chapterIndex;
        this.savePositionCheckpoint(true);
        if (this.mode === 'rsvp') {
            this.pause();
            this.displayCurrentWord();
        } else {
            this.renderNormalText({ anchorIndex: chapterIndex });
            this.updateProgress();
        }
        this.closeToc();
    }

    renderBookmarks(book) {
        this.bookmarksList.innerHTML = '';

        if (!book || book.bookmarks.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = this.t('noBookmarks');
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
            const tokens = this.parseText(book.text);
            const wordNumber = this.wordOrdinalAtIndex(bookmark.index, tokens);
            const progress = book.wordCount > 0 ? Math.round((wordNumber / book.wordCount) * 100) : 0;
            meta.textContent = this.t('bookmarkMeta', { progress, word: Math.max(1, wordNumber), date: this.formatDate(bookmark.createdAt) });

            const excerpt = document.createElement('div');
            excerpt.className = 'bookmark-excerpt';
            excerpt.textContent = bookmark.excerpt;

            info.append(title, meta, excerpt);

            const actions = document.createElement('div');
            actions.className = 'bookmark-actions';
            const goBtn = this.createBookmarkButton(this.t('goTo'), () => this.runAsync(() => this.goToBookmark(book.id, bookmark.id)));
            const deleteBtn = this.createBookmarkButton(this.t('delete'), () => this.runAsync(() => this.deleteBookmark(book.id, bookmark.id)));
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

        const loadedBook = await this.loadBook(bookId, { start: true });
        if (!loadedBook) return;
        this.setCurrentWordIndex(this.clampIndex(bookmark.index, this.words.length));
        this.closeBookmarks();
    }

    async deleteBookmark(bookId, bookmarkId) {
        const bookGeneration = this.getBookWriteGeneration(bookId);
        const book = await this.getBook(bookId);
        if (!book) return;

        const savedBook = await this.mutateBook(bookId, (latest) => ({
            ...latest,
            bookmarks: latest.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
            updatedAt: new Date().toISOString()
        }), { bookGeneration });
        if (!savedBook) return;
        await this.loadLibrary();
        this.renderBookmarks(savedBook);
        this.updateCurrentBookInfo();
    }

    async exportLibrary() {
        await this.ready;
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
        link.download = `paceflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async deleteAllLocalData() {
        await this.ready;
        const confirmed = await this.showActionDialog({
            title: this.t('deleteAllTitle'),
            message: this.t('confirmDeleteAllData'),
            confirmLabel: this.t('deleteAllData'),
            danger: true
        });
        if (!confirmed) return;

        this.isDeletingAllData = true;
        this.dataGeneration += 1;
        this.isPlaying = false;
        clearTimeout(this.timer);
        clearTimeout(this.clearTimer);
        clearTimeout(this.draftSaveTimer);
        clearTimeout(this.savePositionTimer);
        clearTimeout(this.syncTimer);
        this.timer = null;
        this.clearTimer = null;
        this.draftSaveTimer = null;
        this.savePositionTimer = null;
        this.syncTimer = null;
        this.releaseWakeLock();
        await this.drainNativeWrites();

        const preferences = this.nativePreferences();
        if (preferences) {
            try {
                await preferences.clear();
            } catch (error) {
                this.isDeletingAllData = false;
                throw new Error(this.t('deleteAllFailed'));
            }
        }

        // Remove the native mirror first. If native storage refuses deletion,
        // keep the primary database intact and report failure instead of
        // allowing old files to repopulate an apparently cleared library.
        if (this.isNativePlatform() && !this.nativeFilesystem()) {
            this.isDeletingAllData = false;
            throw new Error(this.t('deleteAllFailed'));
        }
        const filesystem = this.nativeFilesystem();
        if (filesystem) {
            try {
                await filesystem.rmdir({ path: 'paceflow', directory: 'DATA', recursive: true });
            } catch (error) {
                if (!/not\s+exist|not\s+found|does\s+not\s+exist/i.test(error.message || '')) {
                    this.isDeletingAllData = false;
                    throw new Error(this.t('deleteAllFailed'));
                }
            }
        }

        if (this.db) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['books', 'kv'], 'readwrite');
                transaction.objectStore('books').clear();
                transaction.objectStore('kv').clear();
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error || new Error(this.t('actionFailed')));
                transaction.onabort = () => reject(transaction.error || new Error(this.t('actionFailed')));
            });
        }

        Object.keys(localStorage)
            .filter((key) => key.startsWith('rsvp_') || key.startsWith('paceflow_'))
            .forEach((key) => localStorage.removeItem(key));

        this.library = [];
        this.words = [];
        this.currentBookId = null;
        this.currentBookName = '';
        this.currentTextSignature = '';
        this.currentChapters = [];
        this.currentIndex = 0;
        this.nativeBookIndex = {};
        this.showToast(this.t('allDataDeleted'));
        setTimeout(() => window.location.reload(), 450);
    }

    async importLibrary(event) {
        await this.ready;
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.assertSourceFileSafe(file);
            const extension = this.getFileExtension(file.name);
            if (extension !== 'json') {
                const parsedBook = await this.extractBookFromFile(file, extension);
                await this.addParsedBookToLibrary(this.nameFromFile(file.name), parsedBook, extension);
                return;
            }

            const buffer = await this.readArrayBuffer(file);
            const text = this.readTextWithEncoding(buffer);
            const payload = JSON.parse(text);
            const importedBooks = Array.isArray(payload) ? payload : payload?.books;
            if (!Array.isArray(importedBooks)) throw new Error(this.t('invalidLibraryExport'));
            if (importedBooks.length > this.importLimits.maxArchiveEntries) {
                throw new Error(this.t('importSafetyLimit'));
            }
            if (!Array.isArray(payload) && payload.settings !== undefined
                && (!payload.settings || typeof payload.settings !== 'object' || Array.isArray(payload.settings))) {
                throw new Error(this.t('invalidLibraryExport'));
            }

            // Validate and normalize the complete backup before the first write.
            // This also makes duplicate-ID resolution deterministic within one import.
            const existingBooks = this.storageMode === 'localstorage' ? this.library : await this.getAllBooks();
            const reservedIds = new Set([
                ...existingBooks.map((book) => book.id),
                ...Object.keys(this.deletedBooks)
            ]);
            let totalTextCharacters = 0;
            const stagedBooks = importedBooks.map((imported) => {
                if (!imported || typeof imported !== 'object' || Array.isArray(imported)
                    || typeof imported.text !== 'string'
                    || imported.text.length > this.importLimits.maxTextCharacters) {
                    throw new Error(this.t('invalidLibraryExport'));
                }
                totalTextCharacters += imported.text.length;
                if (totalTextCharacters > this.importLimits.maxArchiveUncompressedBytes) {
                    throw new Error(this.t('importSafetyLimit'));
                }
                this.assertTextTokenSafety(imported.text, { requireReadable: true });
                const book = this.normalizeBook(imported, { recalculateCounts: true });
                if (reservedIds.has(book.id)) {
                    book.id = this.createId();
                    book.name = `${book.name} (${this.t('importedSuffix')})`;
                }
                while (reservedIds.has(book.id)) book.id = this.createId();
                reservedIds.add(book.id);
                return book;
            });

            let stagedSettings = null;
            let stagedSettingsUpdatedAt = null;
            if (payload.settings) {
                const migrated = this.migrateSettingsDefaults(payload.settings);
                stagedSettings = { ...this.settings, ...migrated.settings, cloudSyncEnabled: false };
                stagedSettingsUpdatedAt = this.toIsoDate(payload.settingsUpdatedAt) || new Date().toISOString();
            }

            const savedBooks = await this.persistImportedBooksAtomically(stagedBooks, this.dataGeneration, {
                settings: stagedSettings,
                settingsUpdatedAt: stagedSettingsUpdatedAt
            });
            const count = savedBooks.length;

            if (stagedSettings) {
                this.settings = stagedSettings;
                this.settingsUpdatedAt = stagedSettingsUpdatedAt;
                try {
                    await this.saveSettings({ preserveTimestamp: true });
                } catch (error) {
                    console.warn('Books were imported, but settings could not be stored:', error);
                }
                this.loadSettingsToForm();
            }

            await this.loadLibrary();
            this.renderLibrary();
            this.showToast(this.t('importedBooks', { count: this.formatBookCount(count) }));
        } catch (error) {
            this.showToast(this.t('importFailed', { message: error.message }), 'error');
        } finally {
            event.target.value = '';
        }
    }

    async addParsedBookToLibrary(name, parsedBook, sourceType, options = {}) {
        const now = new Date().toISOString();
        const text = parsedBook.text.trim();
        this.assertTextTokenSafety(text, { requireReadable: true });
        const tokens = this.parseText(text);
        const book = {
            id: this.createId(),
            name,
            text,
            wordCount: this.countReadableWords(tokens),
            tokenCount: tokens.length,
            currentIndex: 0,
            bookmarks: [],
            chapters: this.normalizeChapters(parsedBook.chapters),
            sourceType,
            fileName: options.fileName || '',
            dateAdded: now,
            lastRead: now,
            updatedAt: now
        };
        const savedBook = await this.putBook(book);
        if (!savedBook) return null;
        if (options.select
            && (options.selectRevision === undefined || options.selectRevision === this.composerRevision)) {
            this.currentBookId = savedBook.id;
            this.currentBookName = savedBook.name;
            this.currentTextSignature = savedBook.textSignature;
            this.currentChapters = savedBook.chapters;
            this.pendingChapters = savedBook.chapters;
            this.currentIndex = savedBook.currentIndex;
            this.setTextInputValue(savedBook.text);
            this.bookNameInput.value = savedBook.name;
            await this.saveDraft();
        }
        await this.loadLibrary();
        if (this.mode === 'library') this.renderLibrary();
        this.updateCurrentBookInfo();
        if (!options.silent) this.showToast(this.t('importedBook', { name }));
        return savedBook;
    }

    updateCurrentBookInfo() {
        const parts = [];
        if (this.currentBookName) {
            parts.push(this.currentBookName);
        } else if (this.bookNameInput.value.trim()) {
            parts.push(this.bookNameInput.value.trim());
        } else {
            parts.push(this.t('draft'));
        }

        const book = this.library.find((item) => item.id === this.currentBookId);
        if (book) {
            parts.push(this.t('shortBookmarks', { count: this.formatBookmarkCount(book.bookmarks.length) }));
        }

        this.currentBookInfo.textContent = parts.join(' • ');
        this.rsvpBookTitle.textContent = parts[0] || '';
    }

    updateLibraryButton() {
        this.libraryBtn.textContent = this.t('libraryButton', { count: this.library.length });
    }

    updateStorageStatus() {
        const totalWords = this.library.reduce((sum, book) => sum + book.wordCount, 0);
        const mode = this.isNativePlatform() ? 'app storage' : (this.storageMode === 'indexeddb' ? 'IndexedDB' : 'localStorage');
        const syncText = this.formatSyncStatus();
        const bookLabel = this.formatBookCount(this.library.length);
        this.storageStatus.textContent = this.t('storageSummary', {
            books: bookLabel,
            words: this.formatWordCount(totalWords),
            storage: mode,
            sync: syncText
        });
        this.updateLibraryButton();
    }

    formatSyncStatus() {
        if (!this.settings.cloudSyncEnabled || this.isNativePlatform()) return this.t('syncDisabled');
        if (!navigator.onLine) return this.t('syncOffline');
        if (this.isSyncing) return this.t('syncing');
        if (localStorage.getItem('rsvp_sync_pending') === '1') return this.t('syncPending');

        const lastSyncAt = localStorage.getItem('rsvp_last_sync_at');
        return lastSyncAt ? this.t('syncedAt', { date: this.formatDate(lastSyncAt) }) : this.t('syncReady');
    }

    formatDate(value) {
        return this.i18n.formatDate(value);
    }

    updateOnlineStatus() {
        const online = navigator.onLine;
        const pending = localStorage.getItem('rsvp_sync_pending') === '1';
        this.offlineBadge.textContent = (!this.settings.cloudSyncEnabled || this.isNativePlatform())
            ? this.t('localOnly')
            : (online ? (pending ? `${this.t('online')} · ${this.t('syncPending')}` : this.t('online')) : this.t('offline'));
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
        if (this.isNativePlatform() || !('serviceWorker' in navigator)) return;

        try {
            let refreshing = false;
            const hadControllerAtRegistration = Boolean(navigator.serviceWorker.controller);
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // A first install may claim the open page. Reload only when an
                // already controlled app receives an actual worker update.
                if (!hadControllerAtRegistration) return;
                if (refreshing) return;
                refreshing = true;

                window.location.reload();
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

    toggleTheme() {
        const nextTheme = this.currentTheme === 'day' ? 'night' : 'day';
        this.setTheme(nextTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('rsvp_theme', theme);
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (this.themeToggleBtn) {
            this.themeToggleBtn.textContent = theme === 'day' ? this.t('day') : this.t('night');
        }
        if (this.themeNightBtn) {
            this.themeNightBtn.classList.toggle('active', theme === 'night');
            this.themeNightBtn.setAttribute('aria-pressed', theme === 'night' ? 'true' : 'false');
        }
        if (this.themeDayBtn) {
            this.themeDayBtn.classList.toggle('active', theme === 'day');
            this.themeDayBtn.setAttribute('aria-pressed', theme === 'day' ? 'true' : 'false');
        }
    }

    setLanguage(language) {
        this.i18n.setLanguage(language);
        this.loadSettingsToForm();
        this.updatePlaybackControls();
        this.updateSpeedControls();
        this.updateStorageStatus();
        this.updateCurrentBookInfo();
        if (this.mode === 'library') this.renderLibrary();
        if (this.mode === 'normal') {
            this.renderNormalText();
            if (this.searchInput.value) this.handleSearch();
        }
        if (this.mode === 'normal' || this.mode === 'rsvp') this.updateProgress();
        if (this.tocModal.classList.contains('active')) this.renderToc();
    }

    getPlatform() {
        try {
            return window.Capacitor?.getPlatform?.() || 'web';
        } catch (error) {
            return 'web';
        }
    }

    isNativePlatform() {
        try {
            return Boolean(window.Capacitor?.isNativePlatform?.());
        } catch (error) {
            return false;
        }
    }

    updatePlatformControlAvailability() {
        if (!this.hardwareControlsInput) return;
        const isIos = this.getPlatform() === 'ios';
        this.hardwareControlsInput.disabled = isIos;
        if (isIos) {
            this.hardwareControlsInput.checked = false;
            this.settings.hardwareControls = false;
            this.hardwareControlsHint.textContent = this.t('hardwareUnavailableIos');
        } else {
            this.hardwareControlsHint.textContent = this.t('hardwareControlsHint');
        }
    }

    setupHardwareControls() {
        this.updatePlatformControlAvailability();
        if (!('mediaSession' in navigator)) return;

        const enabled = Boolean(this.settings.hardwareControls);
        const handlers = {
            play: () => {
                if (this.mode === 'normal') this.startRSVP();
                if (this.mode === 'rsvp' && !this.isPlaying) this.play();
            },
            pause: () => {
                if (this.mode === 'rsvp' && this.isPlaying) this.pause();
            },
            stop: () => {
                if (this.mode === 'rsvp') this.stopRSVP();
            }
        };

        Object.entries(handlers).forEach(([action, handler]) => {
            try {
                navigator.mediaSession.setActionHandler(action, enabled ? handler : null);
            } catch (error) {
                console.debug(`Media Session action ${action} is unavailable`, error);
            }
        });
    }

    updateMediaSessionState(state) {
        if (!this.settings.hardwareControls || !('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.playbackState = state;
            if ('MediaMetadata' in window) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: this.currentBookName || this.bookNameInput.value.trim() || this.t('draft'),
                    artist: this.t('appName'),
                    artwork: [
                        { src: 'assets/icons/app-icon-192.png', sizes: '192x192', type: 'image/png' },
                        { src: 'assets/icons/app-icon-512.png', sizes: '512x512', type: 'image/png' }
                    ]
                });
            }
        } catch (error) {
            console.debug('Media Session state is unavailable', error);
        }
    }

    triggerHaptic(kind = 'light') {
        const haptics = window.Capacitor?.Plugins?.Haptics;
        if (haptics) {
            const promise = kind === 'selection'
                ? haptics.selectionChanged()
                : haptics.impact({ style: 'LIGHT' });
            Promise.resolve(promise).catch(() => {});
            return;
        }
        if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(8);
    }
}

async function resetRuntimeCacheIfRequested() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('reset-cache')) return false;

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration('./');
            if (registration) await registration.unregister();
        }

        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames
                .filter((cacheName) => cacheName.startsWith('paceflow-reader-'))
                .map((cacheName) => caches.delete(cacheName)));
        }

        sessionStorage.removeItem('rsvp-reader-reloaded-v20');
        sessionStorage.removeItem('rsvp-reader-reloaded-v21');
        sessionStorage.removeItem('rsvp-reader-reloaded-v23');
        sessionStorage.removeItem('rsvp-reader-reloaded-v24');
    } finally {
        url.searchParams.delete('reset-cache');
        url.searchParams.set('v', '45');
        window.location.replace(url.toString());
    }

    return true;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (await resetRuntimeCacheIfRequested()) return;
    window.rsvpReader = new RSVPReader();
});
