import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const rows = [];

for (const [path, metadata] of Object.entries(lock.packages || {})) {
    if (!path.startsWith('node_modules/') || metadata.dev || metadata.optional) continue;
    const name = path.slice('node_modules/'.length);
    rows.push({
        name,
        version: metadata.version || 'unknown',
        license: typeof metadata.license === 'string' ? metadata.license : 'SEE PACKAGE',
        source: metadata.resolved || `https://www.npmjs.com/package/${name}`
    });
}

rows.sort((left, right) => left.name.localeCompare(right.name));
const lines = [
    '# Third-party notices',
    '',
    'Generated from the locked production dependency graph. This inventory is a notice aid, not a replacement for the license files shipped in each npm package. HummingRead itself is MIT-licensed; copyrights for the packages below remain with their respective authors.',
    '',
    `Locked production packages: **${rows.length}**.`,
    '',
    '| Package | Version | License | Locked source |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => `| \`${row.name}\` | \`${row.version}\` | ${row.license.replaceAll('|', '\\|')} | [npm artifact](${row.source}) |`),
    '',
    '## Project artwork',
    '',
    'The editable HummingRead vector assets were authored for this repository. Earlier Pico raster explorations are retained at the owner’s direction; their repository provenance is recorded in `docs/ASSET_PROVENANCE.md`. No stock logo or remote font is bundled.',
    ''
];

await mkdir(join(root, 'docs'), { recursive: true });
await writeFile(join(root, 'docs', 'THIRD_PARTY_NOTICES.md'), lines.join('\n'));
console.log(`Generated notices for ${rows.length} locked production packages.`);
