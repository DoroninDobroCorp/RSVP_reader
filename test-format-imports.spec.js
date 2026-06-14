const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');

async function makeDocx(filePath, paragraphs) {
  const zip = new JSZip();
  const paragraphXml = paragraphs.map((paragraph) => `
    <w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>
  `).join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${paragraphXml}</w:body>
    </w:document>`);

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, buffer);
}

test.describe('Additional file format imports', () => {
  test('imports FB2, DOCX, HTML, Markdown and RTF offline-friendly formats', async ({ page }) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsvp-formats-'));
    const files = {
      fb2: path.join(tmpDir, 'sample.fb2'),
      docx: path.join(tmpDir, 'sample.docx'),
      html: path.join(tmpDir, 'sample.html'),
      md: path.join(tmpDir, 'sample.md'),
      rtf: path.join(tmpDir, 'sample.rtf')
    };

    fs.writeFileSync(files.fb2, `<?xml version="1.0" encoding="UTF-8"?>
      <FictionBook><body><section><title><p>FB2 Title</p></title><p>FB2 first paragraph.</p><p>FB2 second paragraph.</p></section></body></FictionBook>`);
    await makeDocx(files.docx, ['DOCX first paragraph.', 'DOCX second paragraph.']);
    fs.writeFileSync(files.html, '<html><body><h1>HTML Title</h1><p>HTML first paragraph.</p><script>bad()</script></body></html>');
    fs.writeFileSync(files.md, '# Markdown Title\n\nMarkdown **first** paragraph with [a link](https://example.com).');
    fs.writeFileSync(files.rtf, String.raw`{\rtf1\ansi RTF first paragraph.\par RTF second paragraph.}`);

    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    for (const [format, filePath] of Object.entries(files)) {
      await page.locator('#fileInput').setInputFiles(filePath);
      await page.waitForFunction(() => {
        const value = document.getElementById('textInput').value;
        return value && !value.startsWith('Загрузка');
      });

      const text = await page.locator('#textInput').inputValue();
      expect(text.toLowerCase()).toContain(format === 'md' ? 'markdown' : format);
      expect(text).not.toContain('<script>');
    }
  });
});
