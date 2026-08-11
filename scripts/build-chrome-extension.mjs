import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(root, 'chrome-extension');

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(absolute));
        else if (entry.isFile()) files.push(absolute);
    }
    return files;
}

export async function buildChromeExtension(options = {}) {
    const destination = options.destination
        || join(root, 'dist', 'downloads', 'paceflow-quick-send.zip');
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
        zip.file(archivePath, await readFile(absolute), { date: new Date('2026-08-10T00:00:00Z') });
    }

    const archive = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
        platform: 'UNIX'
    });
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, archive);
    console.log(`Built Chrome extension ${manifest.version} at ${destination}`);
    return { archive, destination, files: files.length, version: manifest.version };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await buildChromeExtension();
}
