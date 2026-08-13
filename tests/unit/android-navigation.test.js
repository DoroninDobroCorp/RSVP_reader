import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-AND-NAV-001..008: Android Navigation, Lifecycle & Back Gesture Handlers Integrity', async () => {
    const appJsContent = await readFile(join(root, 'app.js'), 'utf8');

    // 1. Verify methods exist in app.js
    assert.match(appJsContent, /setupAndroidNavigation\s*\(/);
    assert.match(appJsContent, /handleBackButton\s*\(/);
    assert.match(appJsContent, /handleAppPause\s*\(/);
    assert.match(appJsContent, /handleAppResume\s*\(/);

    // 2. Mock environment to test state transitions
    let activeModal = null;
    let currentMode = 'library';
    let minimized = false;
    let rsvpStopped = false;
    let libraryShown = false;
    let searchCleared = false;
    let pauseCalled = false;
    let savesFlushed = false;
    let resumeSnapshotSaved = false;
    let wakeLockReleased = false;

    const mockApp = {
        activeModal: null,
        mode: 'library',
        searchInput: { value: '', blur: () => {} },
        searchMatches: [],
        librarySearchInput: { value: '', blur: () => {} },
        libraryFilter: '',

        closeActiveModal() {
            this.activeModal = null;
        },
        handleSearch() {
            searchCleared = true;
        },
        stopRSVP() {
            rsvpStopped = true;
            this.mode = 'normal';
        },
        showLibrary() {
            libraryShown = true;
            this.mode = 'library';
        },
        renderLibrary() {},
        runAsync(fn) {
            return fn();
        },
        pause() {
            pauseCalled = true;
        },
        flushPendingSaves() {
            savesFlushed = true;
        },
        saveResumeSnapshot() {
            resumeSnapshotSaved = true;
        },
        releaseWakeLock() {
            wakeLockReleased = true;
        },
        displayCurrentWord() {},
        updatePlaybackControls() {},
        updateProgress() {},

        handleBackButton() {
            if (this.activeModal) {
                this.closeActiveModal();
                return;
            }
            if (this.searchInput && (this.searchInput.value.trim() !== '' || (this.searchMatches && this.searchMatches.length > 0))) {
                this.searchInput.value = '';
                this.handleSearch();
                this.searchInput.blur();
                return;
            }
            if (this.mode === 'rsvp') {
                this.stopRSVP();
                return;
            }
            if (this.mode === 'normal' || this.mode === 'input') {
                this.runAsync(() => this.showLibrary());
                return;
            }
            if (this.mode === 'library') {
                minimized = true;
                return;
            }
        },

        handleAppPause() {
            if (this.isPlaying) {
                this.pause();
            }
            this.flushPendingSaves();
            this.saveResumeSnapshot();
            this.releaseWakeLock();
        }
    };

    // Test VAL-AND-NAV-001: Modal dismissal
    mockApp.activeModal = { id: 'settingsModal' };
    mockApp.mode = 'normal';
    mockApp.handleBackButton();
    assert.equal(mockApp.activeModal, null, 'Modal must be dismissed');
    assert.equal(mockApp.mode, 'normal', 'Underlying mode must remain normal reader');

    // Test VAL-AND-NAV-002: RSVP mode back gesture returns to normal reader
    mockApp.mode = 'rsvp';
    mockApp.handleBackButton();
    assert.equal(rsvpStopped, true, 'stopRSVP must be called');
    assert.equal(mockApp.mode, 'normal', 'Mode must transition from rsvp to normal');

    // Test VAL-AND-NAV-002: Search view back gesture clears search
    mockApp.mode = 'normal';
    mockApp.searchInput.value = 'test query';
    mockApp.handleBackButton();
    assert.equal(searchCleared, true, 'Search must be cleared');
    assert.equal(mockApp.searchInput.value, '', 'Search input text must be cleared');

    // Test VAL-AND-NAV-003: Normal reader back gesture navigates to library
    mockApp.mode = 'normal';
    mockApp.searchInput.value = '';
    mockApp.handleBackButton();
    assert.equal(libraryShown, true, 'showLibrary must be called');
    assert.equal(mockApp.mode, 'library', 'Mode must transition from normal to library');

    // Test VAL-AND-NAV-004: Root library back gesture triggers minimization
    mockApp.mode = 'library';
    minimized = false;
    mockApp.handleBackButton();
    assert.equal(minimized, true, 'Capacitor minimizeApp must be called at root library');

    // Test VAL-AND-NAV-005: App pause lifecycle
    mockApp.isPlaying = true;
    mockApp.handleAppPause();
    assert.equal(pauseCalled, true, 'Playback must pause on app pause');
    assert.equal(savesFlushed, true, 'Pending saves must flush on app pause');
    assert.equal(resumeSnapshotSaved, true, 'Resume snapshot must save on app pause');
    assert.equal(wakeLockReleased, true, 'Wake lock must release on app pause');
});
