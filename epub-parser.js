// Local EPUB parser. It returns both normalized text and stable chapter offsets.
class EPUBParser {
    constructor() {
        this.JSZip = null;
        this.limits = {
            maxSourceBytes: 100 * 1024 * 1024,
            maxArchiveEntries: 5000,
            maxArchiveUncompressedBytes: 128 * 1024 * 1024,
            maxEntryBytes: 32 * 1024 * 1024,
            maxCompressionRatio: 500,
            maxTextCharacters: 24 * 1024 * 1024
        };
    }

    t(key, params = {}) {
        return window.paceflowT ? window.paceflowT(key, params) : key;
    }

    assertArchiveSafe(zip) {
        const entries = Object.values(zip?.files || {});
        const totalUncompressedBytes = entries.reduce((total, entry) => (
            total + (entry?.dir ? 0 : Math.max(0, Number(entry?._data?.uncompressedSize || 0)))
        ), 0);
        if (entries.length > this.limits.maxArchiveEntries
            || totalUncompressedBytes > this.limits.maxArchiveUncompressedBytes) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    assertEntrySafe(entry) {
        if (!entry) throw new Error(this.t('importSafetyLimit'));
        const uncompressedSize = Number(entry?._data?.uncompressedSize || 0);
        const compressedSize = Number(entry?._data?.compressedSize || 0);
        const compressionRatio = uncompressedSize > 0 ? uncompressedSize / Math.max(1, compressedSize) : 1;
        if (uncompressedSize > this.limits.maxEntryBytes
            || (uncompressedSize >= 1024 * 1024 && compressionRatio > this.limits.maxCompressionRatio)) {
            throw new Error(this.t('importSafetyLimit'));
        }
    }

    async readEntryText(entry) {
        this.assertEntrySafe(entry);
        const text = await entry.async('string');
        if (text.length > this.limits.maxEntryBytes) throw new Error(this.t('importSafetyLimit'));
        return text;
    }

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
            script.onerror = () => reject(new Error(this.t('epubZipFailed')));
            document.head.appendChild(script);
        });
    }

    async parse(file) {
        const parsed = await this.parseDetailed(file);
        return parsed.text;
    }

    async parseDetailed(file) {
        try {
            if (Number.isFinite(file?.size) && file.size > this.limits.maxSourceBytes) {
                throw new Error(this.t('importSafetyLimit'));
            }
            await this.loadJSZip();
            const contents = await new this.JSZip().loadAsync(file);
            this.assertArchiveSafe(contents);
            const opfFile = await this.findOPFFile(contents);
            if (!opfFile) throw new Error(this.t('epubOpfMissing'));

            const opfContent = await this.readEntryText(contents.file(opfFile));
            const packageInfo = this.parsePackage(opfContent);
            const navigation = await this.parseNavigation(contents, opfFile, packageInfo);
            const textParts = [];
            const chapters = [];
            let characterOffset = 0;

            for (const item of packageInfo.spine) {
                const filePath = this.resolveFilePath(opfFile, item.href);
                const entry = contents.file(filePath);
                if (!entry || !/(x?html)/i.test(item.mediaType || '')) continue;
                if (this.shouldSkipFile(filePath, item)) continue;

                const html = await this.readEntryText(entry);
                const navEntries = navigation.filter((candidate) => candidate.filePath === filePath);
                const chapter = this.extractChapterFromHTML(html);
                if (!chapter.text) continue;

                const partStart = characterOffset + (textParts.length > 0 ? 2 : 0);
                const navEntry = navEntries[0];
                const fallbackTitle = chapter.title || navEntry?.title || this.titleFromPath(filePath);
                const resolvedNavigation = navEntries
                    .map((candidate) => {
                        const localOffset = candidate.fragment
                            ? chapter.anchorOffsets[candidate.fragment]
                            : 0;
                        if (candidate.fragment && !Number.isFinite(localOffset)) return null;
                        return {
                            id: `epub-${chapters.length + 1}`,
                            title: candidate.title,
                            level: candidate.level || 1,
                            charOffset: partStart + Math.max(0, localOffset || 0),
                            sourceHref: candidate.fragment ? `${filePath}#${candidate.fragment}` : filePath
                        };
                    })
                    .filter(Boolean);

                // EPUB navigation is authoritative and can point several entries
                // into one XHTML spine item. Preserve those fragment offsets even
                // when the document uses div/section anchors instead of headings.
                if (resolvedNavigation.length > 0) {
                    resolvedNavigation.forEach((candidate) => {
                        candidate.id = `epub-${chapters.length + 1}`;
                        chapters.push(candidate);
                    });
                } else if (chapter.chapters.length > 0) {
                    chapter.chapters.forEach((heading, headingIndex) => {
                        chapters.push({
                            id: `epub-${chapters.length + 1}`,
                            title: heading.title,
                            level: heading.level,
                            charOffset: partStart + heading.charOffset,
                            sourceHref: filePath
                        });
                    });
                } else if (fallbackTitle) {
                    chapters.push({
                        id: `epub-${chapters.length + 1}`,
                        title: fallbackTitle,
                        level: navEntry?.level || 1,
                        charOffset: partStart,
                        sourceHref: filePath
                    });
                }

                if (textParts.length > 0) characterOffset += 2;
                textParts.push(chapter.text);
                characterOffset += chapter.text.length;
                if (characterOffset > this.limits.maxTextCharacters) {
                    throw new Error(this.t('importSafetyLimit'));
                }
            }

            const text = textParts.join('\n\n').trim();
            return {
                text,
                chapters: this.dedupeChapters(chapters),
                metadata: packageInfo.metadata
            };
        } catch (error) {
            console.error('EPUB parsing error:', error);
            if (error.message === this.t('epubOpfMissing') || error.message === this.t('epubZipFailed')) throw error;
            throw new Error(this.t('epubReadFailed', { message: error.message }));
        }
    }

    async findOPFFile(zip) {
        const containerFile = zip.file('META-INF/container.xml');
        if (containerFile) {
            const containerXML = await this.readEntryText(containerFile);
            const documentNode = new DOMParser().parseFromString(containerXML, 'text/xml');
            const rootfile = documentNode.querySelector('rootfile');
            if (rootfile?.getAttribute('full-path')) return rootfile.getAttribute('full-path');
            const match = containerXML.match(/full-path=["']([^"']+)["']/i);
            if (match) return match[1];
        }
        return Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.opf')) || null;
    }

    parsePackage(opfContent) {
        const doc = new DOMParser().parseFromString(opfContent, 'text/xml');
        const manifestItems = {};
        Array.from(doc.querySelectorAll('manifest > item')).forEach((item) => {
            const id = item.getAttribute('id');
            manifestItems[id] = {
                id,
                href: item.getAttribute('href') || '',
                mediaType: item.getAttribute('media-type') || '',
                properties: item.getAttribute('properties') || ''
            };
        });

        const spine = Array.from(doc.querySelectorAll('spine > itemref'))
            .map((itemref) => manifestItems[itemref.getAttribute('idref')])
            .filter(Boolean);
        const titleNode = Array.from(doc.getElementsByTagName('*')).find((node) => node.localName === 'title');
        const creatorNode = Array.from(doc.getElementsByTagName('*')).find((node) => node.localName === 'creator');

        return {
            spine: spine.length > 0 ? spine : Object.values(manifestItems).filter((item) => /(x?html)/i.test(item.mediaType)),
            manifestItems,
            navItem: Object.values(manifestItems).find((item) => item.properties.split(/\s+/).includes('nav')) || null,
            ncxItem: Object.values(manifestItems).find((item) => /ncx/i.test(item.mediaType)) || null,
            metadata: {
                title: titleNode?.textContent?.trim() || '',
                creator: creatorNode?.textContent?.trim() || ''
            }
        };
    }

    // Kept for compatibility with older parser tests.
    parseOPF(opfContent) {
        return this.parsePackage(opfContent).spine;
    }

    async parseNavigation(zip, opfFile, packageInfo) {
        const entries = [];
        if (packageInfo.navItem) {
            const navPath = this.resolveFilePath(opfFile, packageInfo.navItem.href);
            const navFile = zip.file(navPath);
            if (navFile) {
                const navHtml = await this.readEntryText(navFile);
                const doc = new DOMParser().parseFromString(navHtml, 'text/html');
                const nav = doc.querySelector('nav[epub\\:type="toc"]')
                    || doc.querySelector('nav[role="doc-toc"]')
                    || doc.querySelector('nav');
                Array.from(nav?.querySelectorAll('a[href]') || []).forEach((link) => {
                    const href = link.getAttribute('href') || '';
                    const resolved = this.resolveFilePath(navPath, href);
                    entries.push({
                        title: link.textContent.replace(/\s+/g, ' ').trim(),
                        filePath: resolved.split('#')[0],
                        fragment: href.includes('#') ? this.decodePathComponent(href.split('#').slice(1).join('#')) : '',
                        level: Math.min(6, link.closest('li') ? this.listDepth(link.closest('li')) : 1)
                    });
                });
            }
        }

        if (entries.length === 0 && packageInfo.ncxItem) {
            const ncxPath = this.resolveFilePath(opfFile, packageInfo.ncxItem.href);
            const ncxFile = zip.file(ncxPath);
            if (ncxFile) {
                const xml = await this.readEntryText(ncxFile);
                const doc = new DOMParser().parseFromString(xml, 'text/xml');
                Array.from(doc.querySelectorAll('navPoint')).forEach((point) => {
                    const href = point.querySelector('content')?.getAttribute('src') || '';
                    const resolved = this.resolveFilePath(ncxPath, href);
                    entries.push({
                        title: point.querySelector('navLabel text')?.textContent?.replace(/\s+/g, ' ').trim() || '',
                        filePath: resolved.split('#')[0],
                        fragment: href.includes('#') ? this.decodePathComponent(href.split('#').slice(1).join('#')) : '',
                        level: this.navPointDepth(point)
                    });
                });
            }
        }
        return entries.filter((entry) => entry.title && entry.filePath);
    }

    listDepth(listItem) {
        let depth = 1;
        let parent = listItem.parentElement?.closest('li');
        while (parent) {
            depth++;
            parent = parent.parentElement?.closest('li');
        }
        return depth;
    }

    navPointDepth(point) {
        let depth = 1;
        let parent = point.parentElement;
        while (parent) {
            if (parent.localName === 'navPoint') depth++;
            parent = parent.parentElement;
        }
        return Math.min(6, depth);
    }

    shouldSkipFile(fileName, item = {}) {
        const lower = fileName.toLowerCase();
        if (item.properties?.split(/\s+/).includes('nav')) return true;
        return /(^|[/_.-])(cover|toc|nav)([/_.-]|$)/i.test(lower);
    }

    resolveFilePath(basePath, href) {
        const cleanHref = this.decodePathComponent(String(href || '').split('#')[0]);
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        if (cleanHref.startsWith('/')) return cleanHref.substring(1);
        const parts = `${baseDir}${cleanHref}`.split('/');
        const clean = [];
        for (const part of parts) {
            if (part === '..') clean.pop();
            else if (part && part !== '.') clean.push(part);
        }
        return clean.join('/');
    }

    decodePathComponent(value) {
        try {
            return decodeURIComponent(String(value || ''));
        } catch (error) {
            return String(value || '');
        }
    }

    extractTextFromHTML(html) {
        return this.extractChapterFromHTML(html).text;
    }

    extractChapterFromHTML(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, link, meta, svg, img, image, nav, [role="doc-endnotes"], .footnotes, [epub\\:type="footnotes"]')
            .forEach((element) => element.remove());
        const body = doc.body || doc.documentElement;
        const { text, chapters, anchorOffsets } = this.extractStructuredHTMLContent(body);
        return { text, title: chapters[0]?.title || '', chapters, anchorOffsets };
    }

    extractStructuredHTMLContent(root) {
        const blockTags = new Set([
            'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'DD',
            'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
            'HEADER', 'HGROUP', 'HR', 'LI', 'MAIN', 'MENU', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY',
            'TABLE', 'TR', 'UL'
        ]);
        const cellTags = new Set(['TD', 'TH']);
        const chapters = [];
        const anchorOffsets = {};
        const pendingAnchors = [];
        let text = '';
        let pendingBreak = 0; // 1 = space, 2 = line, 3 = paragraph

        const queueSpace = () => {
            pendingBreak = Math.max(pendingBreak, 1);
        };
        const queueLine = () => {
            pendingBreak = pendingBreak >= 2 ? 3 : 2;
        };
        const queueParagraph = () => {
            pendingBreak = 3;
        };
        const flushPending = () => {
            if (!text) {
                pendingBreak = 0;
                return;
            }
            if (pendingBreak === 3) {
                text = text.replace(/[\s\u00A0]+$/u, '');
                text += '\n\n';
            } else if (pendingBreak === 2) {
                text = text.replace(/[\t \u00A0]+$/u, '');
                if (!text.endsWith('\n')) text += '\n';
            } else if (pendingBreak === 1 && !/[\s\u00A0]$/u.test(text)) {
                text += ' ';
            }
            pendingBreak = 0;
        };
        const appendText = (rawValue) => {
            if (!rawValue) return;
            const hasLeadingSpace = /^[\s\u00A0]/u.test(rawValue);
            const hasTrailingSpace = /[\s\u00A0]$/u.test(rawValue);
            const value = rawValue.replace(/[\s\u00A0]+/gu, ' ').trim();
            if (!value) {
                queueSpace();
                return;
            }
            if (hasLeadingSpace) queueSpace();
            flushPending();
            pendingAnchors.splice(0).forEach((element) => rememberAnchor(element, text.length));
            text += value;
            if (hasTrailingSpace) queueSpace();
        };
        const rememberAnchor = (element, offset) => {
            const identifiers = [element.getAttribute('id')];
            if (element.tagName === 'A') identifiers.push(element.getAttribute('name'));
            identifiers.filter(Boolean).forEach((identifier) => {
                const aliases = [identifier];
                try {
                    aliases.push(decodeURIComponent(identifier));
                } catch (error) {
                    // A malformed percent escape is still a valid literal HTML id.
                }
                Array.from(new Set(aliases.flatMap((alias) => [alias, alias.normalize('NFC'), alias.normalize('NFD')])))
                    .forEach((alias) => {
                        if (alias && !Object.prototype.hasOwnProperty.call(anchorOffsets, alias)) {
                            anchorOffsets[alias] = offset;
                        }
                    });
            });
        };
        const walk = (node) => {
            if (node.nodeType === 3) {
                appendText(node.nodeValue || '');
                return;
            }
            if (node.nodeType !== 1) return;

            const element = node;
            const tagName = element.tagName;
            if (tagName === 'BR') {
                queueLine();
                return;
            }

            const isBlock = blockTags.has(tagName);
            const isCell = cellTags.has(tagName);
            const hasAnchor = element.hasAttribute('id') || (tagName === 'A' && element.hasAttribute('name'));
            if (isBlock) queueParagraph();
            else if (isCell) queueSpace();
            if (isBlock || isCell || hasAnchor) flushPending();

            const elementOffset = text.length;
            if (hasAnchor) {
                if ((element.textContent || '').trim()) rememberAnchor(element, elementOffset);
                else pendingAnchors.push(element);
            }
            if (/^H[1-6]$/.test(tagName)) {
                const title = (element.textContent || '').replace(/[\s\u00A0]+/gu, ' ').trim();
                if (title) {
                    chapters.push({
                        title: title.slice(0, 160),
                        level: Number(tagName.slice(1)),
                        charOffset: elementOffset
                    });
                }
            }

            Array.from(element.childNodes).forEach(walk);
            if (isBlock) queueParagraph();
            else if (isCell) queueSpace();
        };

        Array.from(root.childNodes).forEach(walk);
        text = text.trimEnd();
        pendingAnchors.splice(0).forEach((element) => rememberAnchor(element, text.length));
        Object.keys(anchorOffsets).forEach((identifier) => {
            anchorOffsets[identifier] = Math.min(anchorOffsets[identifier], text.length);
        });
        return { text, chapters, anchorOffsets };
    }

    extractChapterTitle(element) {
        const heading = element?.querySelector?.('h1, h2, .title, .title1, .chapter-title');
        const title = heading?.textContent?.replace(/\s+/g, ' ').trim() || '';
        return title.length > 0 && title.length < 160 ? title : null;
    }

    titleFromPath(filePath) {
        const value = filePath.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        return /^(chapter|part|section|book)\s*\d+/i.test(value) ? value : '';
    }

    dedupeChapters(chapters) {
        const seen = new Set();
        return chapters.filter((chapter) => {
            const key = `${chapter.charOffset}:${chapter.title.toLocaleLowerCase()}`;
            if (!chapter.title || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}

window.EPUBParser = EPUBParser;
