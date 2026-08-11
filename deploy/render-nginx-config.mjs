#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const BEGIN = '# HUMMINGREAD_RSVP_BEGIN';
const END = '# HUMMINGREAD_RSVP_END';

function matchingBrace(source, opening) {
    let depth = 0;
    let quote = '';
    let escaped = false;
    let comment = false;
    for (let index = opening; index < source.length; index += 1) {
        const character = source[index];
        if (comment) {
            if (character === '\n') comment = false;
            continue;
        }
        if (quote) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === quote) quote = '';
            continue;
        }
        if (character === '#') {
            comment = true;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
        if (character === '{') depth += 1;
        if (character === '}') {
            depth -= 1;
            if (depth === 0) return index + 1;
        }
    }
    throw new Error('Unbalanced nginx location block.');
}

function rsvpLocationBlocks(source) {
    const blocks = [];
    const expression = /^(\s*)location\s+([^\n{]*\/rsvp[^\n{]*)\{/gmu;
    for (const match of source.matchAll(expression)) {
        const opening = source.indexOf('{', match.index);
        blocks.push({
            start: match.index,
            end: matchingBrace(source, opening),
            header: match[2].trim()
        });
    }
    return blocks;
}

export function renderNginxConfig(source, fragment, mode) {
    if (!['ip-access', 'tls'].includes(mode)) throw new Error(`Unsupported nginx mode: ${mode}`);
    if (!fragment.includes(BEGIN) || !fragment.includes(END)) throw new Error('RSVP fragment markers are missing.');

    const markedStart = source.indexOf(BEGIN);
    const markedEnd = source.indexOf(END);
    if (markedStart !== -1 || markedEnd !== -1) {
        if (markedStart === -1 || markedEnd < markedStart) throw new Error('Live RSVP markers are incomplete.');
        const end = markedEnd + END.length;
        return `${source.slice(0, markedStart)}${fragment.trimEnd()}${source.slice(end)}`;
    }

    const blocks = rsvpLocationBlocks(source);
    const required = mode === 'tls'
        ? ['/rsvp', '/rsvp/api/sync', '/rsvp/api/article', '/rsvp/']
        : ['/rsvp', '/rsvp/api/sync', '/rsvp/'];
    for (const token of required) {
        if (!blocks.some((block) => block.header.includes(token))) {
            throw new Error(`The ${mode} live config is missing expected location ${token}.`);
        }
    }
    if (blocks.length !== required.length) {
        throw new Error(`Refusing to replace ${blocks.length} unexpected RSVP locations in ${mode} config.`);
    }
    const first = blocks[0];
    const last = blocks.at(-1);
    const between = source.slice(first.start, last.end);
    if (/^\s*location\s+/mu.test(between.replaceAll(/location\s+[^\n{]*\/rsvp[^\n{]*\{[\s\S]*?\}/gu, ''))) {
        throw new Error('An unrelated location is interleaved with the RSVP block.');
    }
    return `${source.slice(0, first.start)}${fragment.trimEnd()}${source.slice(last.end)}`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    const [, , mode, inputPath, fragmentPath, outputPath] = process.argv;
    if (!outputPath) {
        console.error('Usage: node render-nginx-config.mjs ip-access|tls INPUT FRAGMENT OUTPUT');
        process.exit(2);
    }
    const [source, fragment] = await Promise.all([
        readFile(inputPath, 'utf8'),
        readFile(fragmentPath, 'utf8')
    ]);
    await writeFile(outputPath, renderNginxConfig(source, fragment, mode));
}
