import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function generateSyntheticFixtures() {
    const fixtures = {};

    // 1. TXT
    fixtures['txt'] = {
        name: 'sample.txt',
        ext: 'txt',
        content: 'HummingRead TXT Import Test\n\nThis is a sample plain text document with multiple paragraphs for RSVP testing.'
    };

    // 2. HTML
    fixtures['html'] = {
        name: 'sample.html',
        ext: 'html',
        content: '<!DOCTYPE html><html><head><title>HummingRead HTML Test</title></head><body><h1>Chapter 1</h1><p>This is a sample HTML document tested in HummingRead.</p></body></html>'
    };

    // 3. MD
    fixtures['md'] = {
        name: 'sample.md',
        ext: 'md',
        content: '# Markdown Title\n\n## Section 1\n\nThis is markdown format text for speed reading test.'
    };

    // 4. RTF
    fixtures['rtf'] = {
        name: 'sample.rtf',
        ext: 'rtf',
        content: '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Courier;}}\\f0\\fs24 This is a sample Rich Text Format RTF document for speed reading test.}'
    };

    // 5. FB2
    fixtures['fb2'] = {
        name: 'sample.fb2',
        ext: 'fb2',
        content: '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>HummingRead FB2 Test</book-title></title-info></description><body><title><p>Chapter 1</p></title><section><p>This is a sample FictionBook FB2 file content for testing.</p></section></body></FictionBook>'
    };

    // 6. EPUB
    const epubZip = new JSZip();
    epubZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    epubZip.folder('META-INF').file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
    const oebps = epubZip.folder('OEBPS');
    oebps.file('content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>HummingRead EPUB Test</dc:title>
    <dc:identifier id="BookId">urn:uuid:12345</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`);
    oebps.file('chapter1.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter 1</title></head>
  <body><h1>Chapter 1</h1><p>This is a sample EPUB book for speed reading in HummingRead.</p></body>
</html>`);
    oebps.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <docTitle><text>HummingRead EPUB Test</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);
    const epubBuffer = await epubZip.generateAsync({ type: 'nodebuffer' });
    fixtures['epub'] = {
        name: 'sample.epub',
        ext: 'epub',
        base64: epubBuffer.toString('base64')
    };

    // 7. DOCX
    const docxZip = new JSZip();
    docxZip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    docxZip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    docxZip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>HummingRead DOCX Test Document. This is sample text extracted from DOCX for speed reading.</w:t></w:r></w:p>
  </w:body>
</w:document>`);
    const docxBuffer = await docxZip.generateAsync({ type: 'nodebuffer' });
    fixtures['docx'] = {
        name: 'sample.docx',
        ext: 'docx',
        base64: docxBuffer.toString('base64')
    };

    return fixtures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const f = await generateSyntheticFixtures();
    console.log(`Generated ${Object.keys(f).length} fixtures:`, Object.keys(f));
}
