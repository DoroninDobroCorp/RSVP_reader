// EPUB Parser - extracts text from EPUB files
// EPUB is essentially a ZIP archive containing HTML/XHTML files

class EPUBParser {
    constructor() {
        this.JSZip = null;
    }

    // Load local JSZip library. The app shell caches this file for offline EPUB parsing.
    async loadJSZip() {
        if (this.JSZip) return;
        if (window.JSZip) {
            this.JSZip = window.JSZip;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('vendor/jszip.min.js', document.baseURI).href;
            script.async = true;
            script.onload = () => {
                this.JSZip = window.JSZip;
                resolve();
            };
            script.onerror = () => reject(new Error('Не удалось загрузить локальный JSZip'));
            document.head.appendChild(script);
        });
    }

    // Parse EPUB file
    async parse(file) {
        try {
            await this.loadJSZip();
            
            const zip = new this.JSZip();
            const contents = await zip.loadAsync(file);
            
            // Find content.opf file to get reading order
            const opfFile = await this.findOPFFile(contents);
            if (!opfFile) {
                throw new Error('Не удалось найти файл content.opf в EPUB');
            }
            
            const opfContent = await contents.file(opfFile).async('string');
            const manifest = this.parseOPF(opfContent);
            
            // Extract text from content files in order
            const textParts = [];
            for (const item of manifest) {
                const filePath = this.resolveFilePath(opfFile, item.href);
                const file = contents.file(filePath);
                
                if (file && (item.mediaType.includes('html') || item.mediaType.includes('xhtml'))) {
                    // Skip common non-content files
                    const fileName = filePath.toLowerCase();
                    if (this.shouldSkipFile(fileName)) {
                        continue;
                    }
                    
                    const content = await file.async('string');
                    const text = this.extractTextFromHTML(content, fileName);
                    if (text.trim()) {
                        textParts.push(text);
                    }
                }
            }
            
            // Join with better spacing between chapters
            return textParts.join('\n\n---\n\n');
        } catch (error) {
            console.error('EPUB parsing error:', error);
            throw new Error('Ошибка при чтении EPUB файла: ' + error.message);
        }
    }

    // Find the OPF file in the EPUB
    async findOPFFile(zip) {
        // Check container.xml first
        const containerFile = zip.file('META-INF/container.xml');
        if (containerFile) {
            const containerXML = await containerFile.async('string');
            const match = containerXML.match(/full-path="([^"]+)"/);
            if (match) return match[1];
        }
        
        // Fallback: search for .opf files
        const opfFiles = Object.keys(zip.files).filter(name => name.endsWith('.opf'));
        return opfFiles[0] || null;
    }

    // Parse OPF file to get reading order
    parseOPF(opfContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(opfContent, 'text/xml');
        
        // Get manifest items
        const manifestItems = {};
        const manifestNodes = doc.querySelectorAll('manifest > item');
        manifestNodes.forEach(item => {
            const id = item.getAttribute('id');
            manifestItems[id] = {
                href: item.getAttribute('href'),
                mediaType: item.getAttribute('media-type') || ''
            };
        });
        
        // Get spine (reading order)
        const spine = [];
        const spineNodes = doc.querySelectorAll('spine > itemref');
        spineNodes.forEach(itemref => {
            const idref = itemref.getAttribute('idref');
            if (manifestItems[idref]) {
                spine.push(manifestItems[idref]);
            }
        });
        
        return spine.length > 0 ? spine : Object.values(manifestItems);
    }

    // Check if file should be skipped (cover, title, copyright, etc)
    shouldSkipFile(fileName) {
        const skipPatterns = [
            'cover', 'coverpage', 'titlepage', 'title_page',
            'copyright', 'toc', 'nav', 'frontmatter'
        ];
        
        return skipPatterns.some(pattern => fileName.includes(pattern));
    }

    // Resolve relative file paths
    resolveFilePath(basePath, href) {
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        
        // Remove any URL fragments
        href = href.split('#')[0];
        
        // Handle absolute paths
        if (href.startsWith('/')) {
            return href.substring(1);
        }
        
        // Resolve relative paths
        let resolved = baseDir + href;
        
        // Clean up .. in path
        const parts = resolved.split('/');
        const clean = [];
        for (const part of parts) {
            if (part === '..') {
                clean.pop();
            } else if (part !== '.') {
                clean.push(part);
            }
        }
        
        return clean.join('/');
    }

    // Extract text from HTML/XHTML content
    extractTextFromHTML(html, fileName = '') {
        // Extract only body content
        const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
        if (bodyMatch) {
            html = bodyMatch[1];
        }
        
        // Clean HTML string BEFORE parsing to prevent tags from being in textContent
        html = html
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/<meta[^>]*>/gi, '');
        
        // Create temporary DOM element
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove unwanted elements that might still be there
        temp.querySelectorAll('svg, img, image').forEach(el => el.remove());
        
        // Remove navigation and footnotes sections  
        temp.querySelectorAll('nav, [role="doc-endnotes"], .footnotes, [epub\\:type="footnotes"]').forEach(el => el.remove());
        
        // Check if this looks like a cover or title page (very little text)
        const bodyText = temp.textContent || '';
        const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount < 30) {
            // Probably a cover/title page with just a few words
            return '';
        }
        
        // Process paragraphs to maintain structure
        const paragraphs = [];
        
        // Get all p elements (most common in EPUB)
        const elements = temp.querySelectorAll('p');
        elements.forEach(el => {
            const text = el.textContent.trim();
            // Skip empty paragraphs and very short ones (like page numbers)
            if (text && text.length > 2) {
                paragraphs.push(text);
            }
        });
        
        // If no paragraphs found, try other selectors
        if (paragraphs.length === 0) {
            const altElements = temp.querySelectorAll('div.p, div.p1, div[class*="para"]');
            altElements.forEach(el => {
                const text = el.textContent.trim();
                if (text && text.length > 2) {
                    paragraphs.push(text);
                }
            });
        }
        
        // If still nothing, fall back to full text
        if (paragraphs.length === 0) {
            let text = temp.textContent || temp.innerText || '';
            text = text.replace(/\s+/g, ' ').trim();
            return text;
        }
        
        // Join paragraphs with double newline
        const chapterText = paragraphs.join('\n\n');
        
        // Clean up excessive whitespace
        return chapterText
            .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
            .replace(/[ \t]+/g, ' ')     // Multiple spaces to single  
            .trim();
    }
    
    // Extract chapter title from common heading structures
    extractChapterTitle(element) {
        // Try to find chapter heading
        const headings = element.querySelectorAll('h1, h2, .title, .title1, .chapter-title');
        if (headings.length > 0) {
            const title = headings[0].textContent.trim();
            // Only return if it looks like a chapter title (not too long)
            if (title.length < 100 && title.length > 0) {
                return title;
            }
        }
        return null;
    }
}

// Export for use in main app
window.EPUBParser = EPUBParser;
