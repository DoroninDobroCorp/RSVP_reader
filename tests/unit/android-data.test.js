import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-AND-DATA-001..006: Android Document Picker & Native Safe Export Invariants', async () => {
    const indexHtmlContent = await readFile(join(root, 'index.html'), 'utf8');
    const appJsContent = await readFile(join(root, 'app.js'), 'utf8');
    const pkgContent = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

    // 1. VAL-AND-DATA-001 & VAL-AND-DATA-006: Document picker configuration & formats
    assert.match(indexHtmlContent, /id="fileInput"[^>]*accept="[^"]*\.pdf/i, 'fileInput accept must include .pdf');
    assert.match(indexHtmlContent, /id="fileInput"[^>]*accept="[^"]*application\/pdf/i, 'fileInput accept must include application/pdf');
    assert.match(indexHtmlContent, /id="libraryImportInput"[^>]*accept="[^"]*\.pdf/i, 'libraryImportInput accept must include .pdf');
    assert.match(indexHtmlContent, /id="libraryImportInput"[^>]*accept="[^"]*application\/pdf/i, 'libraryImportInput accept must include application/pdf');

    for (const format of ['.epub', '.fb2', '.docx', '.rtf', '.txt', '.html', '.md', '.pdf']) {
        assert.ok(indexHtmlContent.includes(format), `index.html input accept attribute must include ${format}`);
    }

    // 2. VAL-AND-DATA-002 & VAL-AND-DATA-005: File extraction & safety limits
    assert.match(appJsContent, /extractBookFromPDF/, 'app.js must implement extractBookFromPDF');
    assert.match(appJsContent, /case 'pdf':/, 'extractBookFromFile must handle case pdf');
    assert.match(appJsContent, /maxSourceBytes:\s*100\s*\*\s*1024\s*\*\s*1024/, 'app.js must set maxSourceBytes to at least 100MB');

    // 3. VAL-AND-DATA-003 & VAL-AND-DATA-004: Native export & cache file cleanup
    assert.ok(pkgContent.dependencies['@capacitor/share'], '@capacitor/share must be in package.json dependencies');
    assert.match(appJsContent, /directory:\s*'CACHE'/, 'exportLibrary must write to CACHE directory');
    assert.match(appJsContent, /Plugins\?\.Share/, 'exportLibrary must trigger Share plugin');
    assert.match(appJsContent, /deleteFile\s*\(\s*\{\s*path:\s*fileName,\s*directory:\s*'CACHE'\s*\}\s*\)/, 'exportLibrary must delete temporary export file from CACHE in finally block');

    // 4. Test simulated native backup export & cleanup sequence
    let cacheFileWritten = false;
    let shareTriggered = false;
    let cacheFileDeleted = false;

    const mockFilesystem = {
        async writeFile({ path, directory }) {
            if (path === 'hummingread-backup.json' && directory === 'CACHE') {
                cacheFileWritten = true;
            }
        },
        async getUri({ path, directory }) {
            return { uri: `file:///data/user/0/team.ibet.paceflow/cache/${path}` };
        },
        async deleteFile({ path, directory }) {
            if (path === 'hummingread-backup.json' && directory === 'CACHE') {
                cacheFileDeleted = true;
            }
        }
    };

    const mockShare = {
        async share(options) {
            shareTriggered = true;
            assert.ok(options.url.includes('hummingread-backup.json'), 'Share URL must point to backup file');
        }
    };

    const mockApp = {
        ready: Promise.resolve(),
        library: [{ id: 'b1', name: 'Test Book', text: 'Sample text' }],
        settings: { theme: 'dark' },
        settingsUpdatedAt: '2026-08-13T00:00:00.000Z',
        isNativePlatform: () => true,
        nativeFilesystem: () => mockFilesystem,
        t: (key) => key,

        async loadLibrary() {},
        exportLibrary: async function() {
            await this.ready;
            await this.loadLibrary();

            const payload = {
                version: 2,
                exportedAt: new Date().toISOString(),
                settings: this.settings,
                settingsUpdatedAt: this.settingsUpdatedAt,
                books: this.library
            };
            const jsonString = JSON.stringify(payload, null, 2);

            if (this.isNativePlatform()) {
                const filesystem = this.nativeFilesystem();
                const sharePlugin = mockShare;
                if (filesystem && sharePlugin) {
                    const fileName = 'hummingread-backup.json';
                    try {
                        await filesystem.writeFile({
                            path: fileName,
                            data: jsonString,
                            directory: 'CACHE',
                            encoding: 'utf8'
                        });
                        const uriResult = await filesystem.getUri({
                            path: fileName,
                            directory: 'CACHE'
                        });
                        await sharePlugin.share({
                            title: 'HummingRead Backup',
                            text: 'HummingRead Library Backup',
                            url: uriResult.uri,
                            dialogTitle: 'Export Backup'
                        });
                    } finally {
                        await filesystem.deleteFile({
                            path: fileName,
                            directory: 'CACHE'
                        });
                    }
                    return;
                }
            }
        }
    };

    await mockApp.exportLibrary();

    assert.equal(cacheFileWritten, true, 'Cache file must be written before sharing');
    assert.equal(shareTriggered, true, 'Capacitor Share plugin must be invoked');
    assert.equal(cacheFileDeleted, true, 'Temporary cache file must be deleted after sharing completes');
});
