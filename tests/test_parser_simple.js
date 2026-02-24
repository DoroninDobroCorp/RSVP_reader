const fs = require('fs');

// Прочитать HTML файл главы
const html = fs.readFileSync('/tmp/ender_epub/OPS/ch1-6.xhtml', 'utf8');

// Удалить link, meta теги
let cleaned = html
  .replace(/<link[^>]*>/gi, '')
  .replace(/<meta[^>]*>/gi, '');

// Найти все <p> теги с помощью regex
const pRegex = /<p[^>]*>(.*?)<\/p>/gs;
const paragraphs = [];
let match;

while (true) {
  match = pRegex.exec(cleaned);
  if (!match) break;
  
  const text = match[1]
    .replace(/<[^>]+>/g, '') // Удалить внутренние теги
    .trim();
  
  if (text && text.length > 5) {
    paragraphs.push(text);
  }
}

console.log('Найдено параграфов:', paragraphs.length);
console.log('\nПервые 10:\n');
paragraphs.slice(0, 10).forEach((p, i) => {
  console.log(`${i+1}. ${p.substring(0, 100)}...`);
});

console.log('\n=== ПОЛНЫЙ ТЕКСТ (первые 1000 символов) ===\n');
const result = paragraphs.join('\n\n');
console.log(result.substring(0, 1000));
console.log(`\n\nВСЕГО: ${result.length} символов, ${result.split(/\s+/).length} слов`);
