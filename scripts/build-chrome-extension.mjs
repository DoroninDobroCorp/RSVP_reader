import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import {
    assertProductionConfiguration,
    productConfig,
    siteMatchPattern
} from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(root, 'chrome-extension');

export function transformExtensionFile(archivePath, source, options = {}) {
    if (archivePath === 'manifest.json') {
        const manifest = JSON.parse(source.toString('utf8'));
        manifest.short_name = productConfig.shortName;
        manifest.version = productConfig.versions.extension;
        if (options.includePreviewBridge !== false) {
            const match = siteMatchPattern();
            manifest.host_permissions = [match];
            manifest.content_scripts = [{
                matches: [match],
                js: ['core.js', 'bridge.js'],
                run_at: 'document_idle'
            }];
        }
        return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    }
    if (archivePath === 'core.js') {
        return Buffer.from(
            source.toString('utf8').replace(
                '__HUMMINGREAD_MARKETING_SITE_URL__',
                productConfig.urls.marketingSite
            )
        );
    }
    return source;
}

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(absolute));
        else if (entry.isFile() && entry.name !== 'README.md') files.push(absolute);
    }
    return files;
}

export async function buildChromeExtension(options = {}) {
    const destination = options.destination
        || join(root, 'dist', 'downloads', 'hummingread-tester.zip');
    if (options.production) assertProductionConfiguration();
    const manifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
    if (manifest.manifest_version !== 3) throw new Error('Chrome extension must use Manifest V3.');

    const zip = new JSZip();
    const files = await listFiles(sourceDirectory);
    for (const absolute of files) {
        const info = await stat(absolute);
        if (info.size > 2 * 1024 * 1024) {
            throw new Error(`Chrome extension source file is unexpectedly large: ${absolute}`);
        }
        const archivePath = relative(sourceDirectory, absolute).split(sep).join('/');
        const source = await readFile(absolute);
        zip.file(archivePath, transformExtensionFile(archivePath, source, options), {
            createFolders: false,
            date: new Date('2026-08-11T00:00:00Z')
        });
    }

    const archive = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
        platform: 'UNIX'
    });
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, archive);
    console.log(`Built Chrome extension ${productConfig.versions.extension} at ${destination}`);
    return { archive, destination, files: files.length, version: productConfig.versions.extension };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await buildChromeExtension();
}
