import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-R2-PRIV-001 / VAL-R4-SEC-001: Zero Dangerous Runtime Permissions declared in AndroidManifest.xml', async () => {
    const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifestContent = await readFile(manifestPath, 'utf8');

    const dangerousPermissionsList = [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'READ_MEDIA_AUDIO',
        'CAMERA',
        'RECORD_AUDIO',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'READ_CONTACTS',
        'WRITE_CONTACTS',
        'GET_ACCOUNTS',
        'READ_CALL_LOG',
        'WRITE_CALL_LOG',
        'READ_PHONE_STATE',
        'CALL_PHONE',
        'POST_NOTIFICATIONS'
    ];

    for (const perm of dangerousPermissionsList) {
        assert.equal(
            manifestContent.includes(perm),
            false,
            `VAL-R2-PRIV-001 / VAL-R4-SEC-001 Failed: Manifest contains dangerous permission: ${perm}`
        );
    }
});

test('VAL-R2-PRIV-002 / VAL-R4-SEC-001: INTERNET permission omitted from AndroidManifest.xml for local-only build', async () => {
    const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifestContent = await readFile(manifestPath, 'utf8');

    assert.equal(
        manifestContent.includes('android.permission.INTERNET'),
        false,
        'VAL-R2-PRIV-002 / VAL-R4-SEC-001 Failed: android.permission.INTERNET must be omitted from AndroidManifest.xml for local-only build'
    );
});

test('VAL-R2-PRIV-003 / VAL-R4-SEC-002: Restricted App-Private Cache Scope in FileProvider Manifest (file_paths.xml)', async () => {
    const filePathsXmlPath = join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml');
    const xmlContent = await readFile(filePathsXmlPath, 'utf8');

    assert.equal(
        xmlContent.includes('external-path'),
        false,
        'VAL-R2-PRIV-003 Failed: file_paths.xml must not declare external-path elements'
    );
    assert.match(
        xmlContent,
        /<cache-path\s+name="backup_share"\s+path="backups\/"\s*\/>/,
        'VAL-R2-PRIV-003 Failed: file_paths.xml must declare <cache-path name="backup_share" path="backups/" />'
    );
});

test('VAL-R2-PRIV-004: SAF Document Picker import handles EPUB, FB2, DOCX, TXT, HTML, MD, RTF formats', async () => {
    const indexHtmlContent = await readFile(join(root, 'index.html'), 'utf8');

    const requiredFormats = ['.epub', '.fb2', '.docx', '.txt', '.html', '.md', '.rtf'];
    for (const format of requiredFormats) {
        assert.ok(
            indexHtmlContent.includes(format),
            `VAL-R2-PRIV-004 Failed: index.html document input accept attribute must include ${format}`
        );
    }
});

test('VAL-R2-PRIV-005 & VAL-R2-PRIV-006: Native Share Sheet Backup Export File Isolation & Cleanup', async () => {
    const appJsContent = await readFile(join(root, 'app.js'), 'utf8');

    assert.match(
        appJsContent,
        /backups\/hummingread-backup\.json/,
        'VAL-R2-PRIV-005 Failed: exportLibrary must write backup to backups/ subpath inside cache'
    );
    assert.match(
        appJsContent,
        /deleteFile\s*\(\s*\{\s*path:\s*fileName,\s*directory:\s*'CACHE'\s*\}\s*\)/,
        'VAL-R2-PRIV-006 Failed: exportLibrary must delete temporary export file in finally block'
    );
});
