import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outputPath = join(root, 'THIRD_PARTY_NOTICES.txt');

const clientPackages = new Map([
    ['jszip', 'web + iOS archive reader'],
    ['pako', 'web + iOS, embedded in the JSZip browser bundle'],
    ['lie', 'web + iOS, embedded in the JSZip browser bundle'],
    ['immediate', 'web + iOS, dependency of lie'],
    ['setimmediate', 'web + iOS, embedded in the JSZip browser bundle'],
    ['readable-stream', 'web + iOS, embedded in the JSZip browser bundle'],
    ['core-util-is', 'web + iOS, readable-stream dependency'],
    ['inherits', 'web + iOS, readable-stream dependency'],
    ['isarray', 'web + iOS, readable-stream dependency'],
    ['process-nextick-args', 'web + iOS, readable-stream dependency'],
    ['safe-buffer', 'web + iOS, readable-stream dependency'],
    ['string_decoder', 'web + iOS, readable-stream dependency'],
    ['util-deprecate', 'web + iOS, readable-stream dependency'],
    ['@capacitor-community/keep-awake', 'iOS native plugin'],
    ['@capacitor/app', 'iOS native plugin'],
    ['@capacitor/core', 'iOS runtime'],
    ['@capacitor/filesystem', 'iOS native plugin'],
    ['@capacitor/haptics', 'iOS native plugin'],
    ['@capacitor/ios', 'iOS runtime and Cordova-derived compatibility code'],
    ['@capacitor/preferences', 'iOS native plugin'],
    ['@capacitor/synapse', 'iOS native build support'],
    ['tslib', 'iOS Capacitor runtime dependency']
]);

const mitBynens = (copyright) => `${copyright}

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const saxesLicense = `The ISC License

Copyright (c) Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

The sax parser from which saxes was forked:
Copyright (c) Isaac Z. Schlueter and Contributors
Licensed under the same ISC terms above.`;

const zlibLicense = `Copyright (C) 1995-2013 Jean-loup Gailly and Mark Adler

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software.
2. Altered source versions must be plainly marked as such, and must not
   be misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.`;

function normalizeLicenseText(source) {
    return source
        .replaceAll(/\r\n?/gu, '\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim();
}

async function packageLicenseText(name) {
    const directory = join(root, 'node_modules', name);
    const entries = await readdir(directory);
    const candidate = entries
        .filter((entry) => /^(?:license|licence|copying|copyright)(?:\.|$)/iu.test(entry))
        .sort((left, right) => left.localeCompare(right))[0];
    if (candidate && (await stat(join(directory, candidate))).isFile()) {
        let source = (await readFile(join(directory, candidate), 'utf8')).trim();
        if (name === 'jszip') {
            source = source.split(/\nGPL version 3\n/u)[0].trim();
            source = `HummingRead uses JSZip under its MIT license choice.\n\n${source}`;
        }
        return source;
    }
    if (name === 'isarray') {
        const readme = await readFile(join(directory, 'README.md'), 'utf8');
        return readme.split('## License')[1].trim().replaceAll('&lt;', '<').replaceAll('&gt;', '>');
    }
    if (name === 'is-potential-custom-element-name') {
        return mitBynens('Copyright Mathias Bynens <https://mathiasbynens.be/>');
    }
    if (name === 'punycode') return mitBynens('Copyright Mathias Bynens');
    if (name === 'saxes') return saxesLicense;
    throw new Error(`No reproducible license text found for ${name}.`);
}

function packageMetadata(name) {
    const metadata = lock.packages?.[`node_modules/${name}`];
    if (!metadata?.version || !metadata?.license || !metadata?.resolved) {
        throw new Error(`Locked metadata is incomplete for ${name}.`);
    }
    return metadata;
}

async function renderPackage(name, surface) {
    const metadata = packageMetadata(name);
    const license = normalizeLicenseText(await packageLicenseText(name));
    return [
        '='.repeat(78),
        `${name}@${metadata.version}`,
        `Surface: ${surface}`,
        `SPDX: ${metadata.license}`,
        `Locked source: ${metadata.resolved}`,
        '-'.repeat(78),
        license,
        ''
    ].join('\n');
}

const productionNames = Object.entries(lock.packages || {})
    .filter(([path, metadata]) => path.startsWith('node_modules/') && !metadata.dev && !metadata.optional)
    .map(([path]) => path.slice('node_modules/'.length))
    .sort((left, right) => left.localeCompare(right));
for (const name of clientPackages.keys()) {
    if (!productionNames.includes(name)) throw new Error(`Shipped notice package is not locked: ${name}.`);
}
const serverOnlyNames = productionNames.filter((name) => !clientPackages.has(name));

const sections = [
    'HUMMINGREAD THIRD-PARTY NOTICES',
    '',
    'Generated deterministically from package-lock.json and exact license files in the',
    'locked npm artifacts. Copyright remains with each project and contributor.',
    '',
    '1. DISTRIBUTED WEB / iOS / CHROME EXTENSION SUITE',
    '',
    'The Chrome extension has no third-party runtime dependency of its own. This notice',
    'file is included in its ZIP so the distribution suite carries the web/iOS notices.',
    ''
];
for (const [name, surface] of clientPackages) sections.push(await renderPackage(name, surface));

const apacheLicense = normalizeLicenseText(await packageLicenseText('@mozilla/readability'));
sections.push(
    '='.repeat(78),
    'Apache Cordova-derived portions included by @capacitor/ios',
    'Surface: iOS native runtime',
    'SPDX: Apache-2.0',
    'Copyright: Apache Software Foundation and contributors',
    '-'.repeat(78),
    apacheLicense,
    '',
    '='.repeat(78),
    'zlib portions embedded by pako',
    'Surface: web + iOS archive reader',
    'SPDX: Zlib',
    '-'.repeat(78),
    zlibLicense,
    '',
    '2. SERVER-ONLY PRODUCTION DEPENDENCIES (NOT DISTRIBUTED IN CLIENT PACKAGES)',
    ''
);
for (const name of serverOnlyNames) sections.push(await renderPackage(name, 'server-only article service'));

sections.push('3. DEVELOPMENT-ONLY DIRECT TOOLS (NOT SHIPPED)', '');
for (const name of Object.keys(packageJson.devDependencies || {}).sort()) {
    const metadata = packageMetadata(name);
    sections.push(`${name}@${metadata.version} | SPDX: ${metadata.license} | ${metadata.resolved}`);
}
sections.push('', 'END OF THIRD-PARTY NOTICES', '');

await writeFile(outputPath, sections.join('\n'));
console.log(`Generated notices for ${clientPackages.size} client and ${serverOnlyNames.length} server packages.`);
