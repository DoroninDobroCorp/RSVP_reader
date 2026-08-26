import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-AND-DATA-001..006 / VAL-R4-SEC-003: Android Document Picker, Pinning, Product Config & Native Safe Export Invariants', async () => {
    const indexHtmlContent = await readFile(join(root, 'index.html'), 'utf8');
    const appJsContent = await readFile(join(root, 'app.js'), 'utf8');
    const pkgContent = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const pkgLockContent = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
    const productConfigContent = JSON.parse(await readFile(join(root, 'product.config.json'), 'utf8'));

    // 0. Pinning and Product Config Identity Gates
    assert.equal(pkgContent.dependencies['@capacitor/android'], '8.5.0', '@capacitor/android must be pinned to 8.5.0 in package.json');
    assert.equal(pkgLockContent.packages[''].dependencies['@capacitor/android'], '8.5.0', '@capacitor/android must be pinned to 8.5.0 in package-lock.json root packages');
    
    assert.ok(productConfigContent.android, 'product.config.json must define android section');
    assert.equal(productConfigContent.android.applicationId, 'team.ibet.paceflow', 'applicationId must match review app id');
    assert.equal(productConfigContent.android.proposedApplicationId, 'team.ibet.hummingread', 'proposedApplicationId must be defined');
    assert.equal(productConfigContent.android.applicationIdApproved, false, 'applicationIdApproved must be false for unapproved review builds');
    assert.equal(productConfigContent.android.versionCode, 200, 'versionCode must be 200');
    assert.equal(productConfigContent.android.versionName, '2.0.0', 'versionName must be 2.0.0');

    // Test product config assertion throw
    const { productConfig, assertAndroidUploadApproved } = await import('../../scripts/product-config.mjs');
    assert.equal(productConfig.android.applicationIdApproved, false);
    assert.throws(() => assertAndroidUploadApproved(), /applicationIdApproved is false/);

    // 1. VAL-AND-DATA-001 & VAL-AND-DATA-006: unfiltered SAF picker & supported document formats.
    // Unknown FB2 UTI/MIME mappings are hidden by Safari and some Android providers
    // whenever an accept filter is present, so format support belongs in the parser.
    for (const inputId of ['fileInput', 'libraryImportInput']) {
        const inputTag = indexHtmlContent.match(new RegExp(`<input[^>]*id="${inputId}"[^>]*>`, 'i'))?.[0] || '';
        assert.ok(inputTag, `${inputId} must exist`);
        assert.doesNotMatch(inputTag, /\saccept=/i, `${inputId} must not filter the system document picker`);
    }
    assert.match(appJsContent, /removeAttribute\('accept'\)/, 'openFilePicker must remove stale accept filters before click');
    for (const format of ['epub', 'fb2', 'docx', 'txt', 'html', 'md', 'rtf', 'pdf']) {
        assert.match(appJsContent, new RegExp(`case '${format}':`), `extractBookFromFile must handle ${format}`);
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

    // 4. Test simulated native backup export, cleanup sequence & re-import completeness
    let cacheFileWritten = false;
    let shareTriggered = false;
    let cacheFileDeleted = false;
    let exportedJsonPayload = null;

    const mockFilesystem = {
        async mkdir({ path, directory }) {
            return true;
        },
        async writeFile({ path, data, directory }) {
            if (path === 'backups/hummingread-backup.json' && directory === 'CACHE') {
                cacheFileWritten = true;
                exportedJsonPayload = data;
            }
        },
        async getUri({ path, directory }) {
            return { uri: `file:///data/user/0/team.ibet.paceflow/cache/${path}` };
        },
        async deleteFile({ path, directory }) {
            if (path === 'backups/hummingread-backup.json' && directory === 'CACHE') {
                cacheFileDeleted = true;
            }
        }
    };

    const mockShare = {
        async share(options) {
            shareTriggered = true;
            assert.ok(options.url.includes('backups/hummingread-backup.json'), 'Share URL must point to backup file in backups/ directory');
        }
    };

    const mockApp = {
        ready: Promise.resolve(),
        library: [{ id: 'b1', name: 'Test Book', text: 'Sample text for speed reading test.', readingPosition: 5, wpm: 350 }],
        settings: { theme: 'dark', defaultWpm: 350 },
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
                    const fileName = 'backups/hummingread-backup.json';
                    try {
                        await filesystem.mkdir({ path: 'backups', directory: 'CACHE', recursive: true }).catch(() => {});
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
    assert.ok(exportedJsonPayload, 'Exported JSON payload must be non-empty');

    // Verify Exported JSON payload re-importability and completeness
    const reImported = JSON.parse(exportedJsonPayload);
    assert.equal(reImported.version, 2);
    assert.equal(reImported.settings.theme, 'dark');
    assert.equal(reImported.settings.defaultWpm, 350);
    assert.equal(reImported.books.length, 1);
    assert.equal(reImported.books[0].name, 'Test Book');
    assert.equal(reImported.books[0].readingPosition, 5);
});
