import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const i18nSource = await readFile(join(root, 'i18n.js'), 'utf8');

const match = i18nSource.match(/const messages = (\{[\s\S]*?\n    \});/);
if (!match) throw new Error('Could not find messages in i18n.js');

const messages = vm.runInNewContext('(' + match[1] + ')');

const localesDir = join(root, 'i18n', 'locales');
await mkdir(localesDir, { recursive: true });

for (const [locale, catalog] of Object.entries(messages)) {
    const filePath = join(localesDir, `${locale}.json`);
    await writeFile(filePath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${filePath} (${Object.keys(catalog).length} keys)`);
}
