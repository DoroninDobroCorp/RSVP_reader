import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brand = join(root, 'assets', 'brand');
const assets = [
  ['pico-hero.png', 'pico-hero-640.webp', 640],
  ['pico-quick-send.png', 'pico-quick-send-640.webp', 640]
];

for (const [source, destination, width] of assets) {
  await sharp(join(brand, source))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(join(brand, destination));
}

for (const [source, destination, width, height] of [
  ['hummingread-chrome-promo-small.svg', 'hummingread-chrome-promo-small.png', 440, 280],
  ['hummingread-chrome-marquee.svg', 'hummingread-chrome-marquee.png', 1400, 560]
]) {
  await sharp(join(brand, source), { density: 144 })
    .resize(width, height)
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(brand, destination));
}

console.log('Generated responsive WebP Pico assets and exact-size Chrome Store promo exports.');
