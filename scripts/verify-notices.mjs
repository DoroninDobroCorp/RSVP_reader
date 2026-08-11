import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const noticePath = join(root, 'THIRD_PARTY_NOTICES.txt');
const noticeBefore = await readFile(noticePath, 'utf8');
await import(`./generate-third-party-notices.mjs?verify=${Date.now()}`);
const notice = await readFile(noticePath, 'utf8');
if (notice !== noticeBefore) {
    throw new Error('THIRD_PARTY_NOTICES.txt was stale; regenerate and commit the locked notice artifact.');
}

const acknowledgements = await readFile(join(root, 'acknowledgements.html'), 'utf8');
let count = 0;

for (const [path, metadata] of Object.entries(lock.packages || {})) {
    if (!path.startsWith('node_modules/') || metadata.dev || metadata.optional) continue;
    const name = path.slice('node_modules/'.length);
    count += 1;
    if (!notice.includes(`${name}@${metadata.version}`)
        || !notice.includes(`SPDX: ${metadata.license}`)
        || !notice.includes(metadata.resolved)) {
        throw new Error(`Third-party notice is missing locked production package ${name}@${metadata.version}.`);
    }
}

for (const requiredText of [
    'Copyright (c) 2017-present Drifty Co.',
    'Copyright (c) 2019 The keep-awake developers.',
    'Copyright (c) 2009-2016 Stuart Knightley',
    'Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn',
    'Copyright (c) 2014-2018 Calvin Metcalf, Jordan Harband',
    'Copyright (c) 2012 Barnesandnoble.com',
    'Copyright: Apache Software Foundation and contributors',
    'Copyright (C) 1995-2013 Jean-loup Gailly and Mark Adler',
    'HummingRead uses JSZip under its MIT license choice.',
    'Permission is hereby granted',
    'The ISC License',
    'Apache License',
    'SPDX: Zlib',
    'SERVER-ONLY PRODUCTION DEPENDENCIES',
    'DEVELOPMENT-ONLY DIRECT TOOLS'
]) {
    if (!notice.includes(requiredText)) throw new Error(`Complete notice is missing required text: ${requiredText}`);
}

for (const required of ['Capacitor', 'Mozilla Readability', 'ipaddr.js', 'JSZip', 'jsdom']) {
    if (!acknowledgements.includes(required)) {
        throw new Error(`User-readable acknowledgements are missing ${required}.`);
    }
}
if (!acknowledgements.includes('href="THIRD_PARTY_NOTICES.txt"')) {
    throw new Error('Acknowledgements do not link to the distributed full license artifact.');
}

for (const directory of ['dist', join('ios', 'App', 'App', 'public')]) {
    const packaged = await readFile(join(root, directory, 'THIRD_PARTY_NOTICES.txt'), 'utf8');
    if (packaged !== notice) throw new Error(`Full notices differ in ${directory}.`);
}

const archive = await JSZip.loadAsync(await readFile(join(root, 'dist', 'downloads', 'hummingread-tester.zip')));
const extensionNotice = await archive.file('THIRD_PARTY_NOTICES.txt')?.async('string');
if (extensionNotice !== notice) throw new Error('Chrome ZIP does not contain the exact full notices artifact.');

console.log(`Verified exact license texts for ${count} locked production packages in web, iOS, and extension artifacts.`);
