import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = ['APP_STORE_COPY.md', 'GOOGLE_PLAY_COPY.md'];
const locales = ['English', 'Russian', 'Spanish'];

for (const file of files) {
    const filePath = join(root, 'docs', file);
    const content = await readFile(filePath, 'utf8');

    for (const locale of locales) {
        const sectionRegex = new RegExp(`## ${locale} metadata[\\s\\S]*?(?=## |$)`, 'u');
        const match = content.match(sectionRegex);
        if (!match) {
            throw new Error(`Missing ${locale} metadata section in docs/${file}`);
        }

        const sectionText = match[0];

        // Extract Name
        const nameMatch = sectionText.match(/-\s*(?:Name|Название|Nombre)[^:]*:\s*`([^`]+)`/u);
        if (!nameMatch) {
            throw new Error(`Missing Name in ${locale} section of docs/${file}`);
        }
        const name = nameMatch[1];
        if (name.length > 30) {
            throw new Error(`Name in ${locale} section of docs/${file} exceeds 30 chars: "${name}" (${name.length})`);
        }

        // Extract Subtitle
        const subtitleMatch = sectionText.match(/-\s*(?:Subtitle|Подзаголовок|Subtítulo)[^:]*:\s*`([^`]+)`/u);
        if (!subtitleMatch) {
            throw new Error(`Missing Subtitle in ${locale} section of docs/${file}`);
        }
        const subtitle = subtitleMatch[1];
        if (subtitle.length > 30) {
            throw new Error(`Subtitle in ${locale} section of docs/${file} exceeds 30 chars: "${subtitle}" (${subtitle.length})`);
        }

        // Extract Short Description if present (Google Play)
        const shortDescMatch = sectionText.match(/-\s*(?:Short description|Краткое описание (?!Chrome)|Descripción corta)[^:]*:\s*`([^`]+)`/u);
        if (shortDescMatch) {
            const shortDesc = shortDescMatch[1];
            if (shortDesc.length > 80) {
                throw new Error(`Short description in ${locale} section of docs/${file} exceeds 80 chars: "${shortDesc}" (${shortDesc.length})`);
            }
        }

        // Extract Promotional text
        const promoMatch = sectionText.match(/-\s*(?:Promotional text|Промотекст|Texto promocional)[^:]*:\s*`([^`]+)`/u);
        if (promoMatch) {
            const promo = promoMatch[1];
            if (promo.length > 170) {
                throw new Error(`Promotional text in ${locale} section of docs/${file} exceeds 170 chars: "${promo}" (${promo.length})`);
            }
        }

        // Extract Keywords
        const keywordsMatch = sectionText.match(/-\s*(?:Keywords|Ключевые слова|Palabras clave)[^:]*:\s*`([^`]+)`/u);
        if (!keywordsMatch) {
            throw new Error(`Missing Keywords in ${locale} section of docs/${file}`);
        }
        const keywords = keywordsMatch[1];
        if (keywords.length > 100) {
            throw new Error(`Keywords in ${locale} section of docs/${file} exceeds 100 chars: "${keywords}" (${keywords.length})`);
        }

        // Extract Chrome Web Store Name
        const cwsNameMatch = sectionText.match(/-\s*(?:Chrome Web Store Name|Название Chrome Web Store|Nombre Chrome Web Store)[^:]*:\s*`([^`]+)`/u);
        if (!cwsNameMatch) {
            throw new Error(`Missing Chrome Web Store Name in ${locale} section of docs/${file}`);
        }
        const cwsName = cwsNameMatch[1];
        if (cwsName.length > 45) {
            throw new Error(`Chrome Web Store Name in ${locale} section of docs/${file} exceeds 45 chars: "${cwsName}" (${cwsName.length})`);
        }

        // Extract Chrome Web Store Summary
        const cwsSummaryMatch = sectionText.match(/-\s*(?:Chrome Web Store Summary|Краткое описание Chrome Web Store|Resumen Chrome Web Store)[^:]*:\s*`([^`]+)`/u);
        if (!cwsSummaryMatch) {
            throw new Error(`Missing Chrome Web Store Summary in ${locale} section of docs/${file}`);
        }
        const cwsSummary = cwsSummaryMatch[1];
        if (cwsSummary.length > 132) {
            throw new Error(`Chrome Web Store Summary in ${locale} section of docs/${file} exceeds 132 chars: "${cwsSummary}" (${cwsSummary.length})`);
        }
    }
}

console.log('Verified store copy character limits for EN, RU, ES across APP_STORE_COPY.md & GOOGLE_PLAY_COPY.md (Name <= 30/45, Subtitle <= 30, ShortDesc <= 80, Summary <= 132, Keywords <= 100).');
