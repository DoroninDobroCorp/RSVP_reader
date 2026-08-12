import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const filePath = join(root, 'docs', 'APP_STORE_COPY.md');
const content = await readFile(filePath, 'utf8');

const locales = ['English', 'Russian', 'Spanish'];

for (const locale of locales) {
    const sectionRegex = new RegExp(`## ${locale} metadata[\\s\\S]*?(?=## |$)`, 'u');
    const match = content.match(sectionRegex);
    if (!match) {
        throw new Error(`Missing ${locale} metadata section in docs/APP_STORE_COPY.md`);
    }

    const sectionText = match[0];

    // Extract App Store Name
    const nameMatch = sectionText.match(/-\s*(?:Name|Название|Nombre)[^:]*:\s*`([^`]+)`/u);
    if (!nameMatch) {
        throw new Error(`Missing App Store Name in ${locale} section`);
    }
    const name = nameMatch[1];
    if (name.length > 30) {
        throw new Error(`App Store Name in ${locale} exceeds 30 chars: "${name}" (${name.length})`);
    }

    // Extract App Store Subtitle
    const subtitleMatch = sectionText.match(/-\s*(?:Subtitle|Подзаголовок|Subtítulo)[^:]*:\s*`([^`]+)`/u);
    if (!subtitleMatch) {
        throw new Error(`Missing App Store Subtitle in ${locale} section`);
    }
    const subtitle = subtitleMatch[1];
    if (subtitle.length > 30) {
        throw new Error(`App Store Subtitle in ${locale} exceeds 30 chars: "${subtitle}" (${subtitle.length})`);
    }

    // Extract App Store Promotional text
    const promoMatch = sectionText.match(/-\s*(?:Promotional text|Промотекст|Texto promocional)[^:]*:\s*`([^`]+)`/u);
    if (promoMatch) {
        const promo = promoMatch[1];
        if (promo.length > 170) {
            throw new Error(`App Store Promotional text in ${locale} exceeds 170 chars: "${promo}" (${promo.length})`);
        }
    }

    // Extract App Store Keywords
    const keywordsMatch = sectionText.match(/-\s*(?:Keywords|Ключевые слова|Palabras clave)[^:]*:\s*`([^`]+)`/u);
    if (!keywordsMatch) {
        throw new Error(`Missing App Store Keywords in ${locale} section`);
    }
    const keywords = keywordsMatch[1];
    if (keywords.length > 100) {
        throw new Error(`App Store Keywords in ${locale} exceeds 100 chars: "${keywords}" (${keywords.length})`);
    }

    // Extract Chrome Web Store Name
    const cwsNameMatch = sectionText.match(/-\s*(?:Chrome Web Store Name|Название Chrome Web Store|Nombre Chrome Web Store)[^:]*:\s*`([^`]+)`/u);
    if (!cwsNameMatch) {
        throw new Error(`Missing Chrome Web Store Name in ${locale} section`);
    }
    const cwsName = cwsNameMatch[1];
    if (cwsName.length > 45) {
        throw new Error(`Chrome Web Store Name in ${locale} exceeds 45 chars: "${cwsName}" (${cwsName.length})`);
    }

    // Extract Chrome Web Store Summary
    const cwsSummaryMatch = sectionText.match(/-\s*(?:Chrome Web Store Summary|Краткое описание Chrome Web Store|Resumen Chrome Web Store)[^:]*:\s*`([^`]+)`/u);
    if (!cwsSummaryMatch) {
        throw new Error(`Missing Chrome Web Store Summary in ${locale} section`);
    }
    const cwsSummary = cwsSummaryMatch[1];
    if (cwsSummary.length > 132) {
        throw new Error(`Chrome Web Store Summary in ${locale} exceeds 132 chars: "${cwsSummary}" (${cwsSummary.length})`);
    }
}

console.log('Verified store copy character limits for EN, RU, ES (Name <= 30/45, Subtitle <= 30, Summary <= 132, Keywords <= 100).');
