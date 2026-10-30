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
        // Every caller feeds this string into an XML/HTML parser or into the final
        // text aggregate. Reject it before DOMParser can duplicate a huge source.
        if (text.length > Math.min(this.limits.maxEntryBytes, this.limits.maxTextCharacters)) {
            throw new Error(this.t('importSafetyLimit'));
        }
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

    async parseDetailed(file, options = {}) {
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
            const notes = [];
            const noteDocuments = new Map();
            let characterOffset = 0;

            const spineEntries = packageInfo.spine.map((item) => {
                const requestedPath = this.resolveFilePath(opfFile, item.href);
                const located = this.findArchiveEntry(contents, requestedPath);
                const filePath = located?.path || requestedPath;
                return { item, filePath, entry: located?.entry };
            }).filter(({ item, filePath, entry }) => entry && this.isHtmlManifestItem(item, filePath)
                && !this.shouldSkipFile(filePath, item));

            // A note document can occur before its reference in the spine. Find
            // resolvable targets first, so only notes available through a popup
            // are suppressed in the prose. Unreferenced content stays readable.
            const noteTargets = new Map();
            if (!options.preserveInlineNoteBodies) {
                for (const { filePath, entry } of spineEntries) {
                    const html = await this.readEntryText(entry);
                    const prepared = await this.prepareNoteReferences(contents, filePath, html, noteDocuments);
                    for (const reference of prepared.references) {
                        if (!reference.sourceInReadingFlow) continue;
                        if (!noteTargets.has(reference.targetPath)) noteTargets.set(reference.targetPath, new Set());
                        noteTargets.get(reference.targetPath).add(reference.targetFragment);
                    }
                }
            }

            for (const { filePath, entry } of spineEntries) {
                const html = await this.readEntryText(entry);
                const prepared = await this.prepareNoteReferences(contents, filePath, html, noteDocuments);
                const navEntries = navigation.filter((candidate) => candidate.filePath === filePath);
                const chapter = this.extractChapterFromHTML(prepared.html, noteTargets.get(filePath));
                if (!chapter.text) continue;

                const partStart = characterOffset + (textParts.length > 0 ? 2 : 0);
                prepared.references.forEach((reference) => {
                    const offset = chapter.anchorOffsets[reference.anchor];
                    if (Number.isFinite(offset)) {
                        notes.push({ label: reference.label, text: reference.text, charOffset: partStart + offset });
                    }
                });
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
                notes,
                metadata: packageInfo.metadata
            };
        } catch (error) {
            console.error('EPUB parsing error:', error);
            if (error.message === this.t('epubOpfMissing') || error.message === this.t('epubZipFailed')) throw error;
            throw new Error(this.t('epubReadFailed', { message: error.message }));
        }
    }

    async findOPFFile(zip) {
        const container = this.findArchiveEntry(zip, 'META-INF/container.xml');
        if (container?.entry) {
            const containerXML = await this.readEntryText(container.entry);
            const documentNode = new DOMParser().parseFromString(containerXML, 'text/xml');
            const rootfile = Array.from(documentNode.getElementsByTagName('*'))
                .find((element) => element.localName?.toLowerCase() === 'rootfile');
            const declaredPath = rootfile?.getAttribute('full-path');
            if (declaredPath) {
                const located = this.findArchiveEntry(zip, declaredPath);
                if (located) return located.path;
            }
            const match = containerXML.match(/full-path=["']([^"']+)["']/i);
            if (match) {
                const located = this.findArchiveEntry(zip, match[1]);
                if (located) return located.path;
            }
        }
        return Object.values(zip.files)
            .find((entry) => !entry.dir && this.normalizeArchivePath(entry.name).toLowerCase().endsWith('.opf'))?.name || null;
    }

    parsePackage(opfContent) {
        const doc = new DOMParser().parseFromString(opfContent, 'text/xml');
        if (doc.querySelector('parsererror')) throw new Error(this.t('epubReadFailed', { message: 'Invalid package XML' }));
        const elements = Array.from(doc.getElementsByTagName('*'));
        const manifestItems = {};
        elements.filter((element) => (
            element.localName?.toLowerCase() === 'item'
            && element.parentElement?.localName?.toLowerCase() === 'manifest'
        )).forEach((item) => {
            const id = item.getAttribute('id');
            if (!id) return;
            manifestItems[id] = {
                id,
                href: item.getAttribute('href') || '',
                mediaType: item.getAttribute('media-type') || '',
                properties: item.getAttribute('properties') || ''
            };
        });

        const spine = elements.filter((element) => (
            element.localName?.toLowerCase() === 'itemref'
            && element.parentElement?.localName?.toLowerCase() === 'spine'
        ))
            .map((itemref) => manifestItems[itemref.getAttribute('idref')])
            .filter(Boolean);
        const titleNode = elements.find((node) => node.localName?.toLowerCase() === 'title');
        const creatorNode = elements.find((node) => node.localName?.toLowerCase() === 'creator');

        return {
            spine: spine.length > 0
                ? spine
                : Object.values(manifestItems).filter((item) => this.isHtmlManifestItem(item, item.href)),
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
            const requestedNavPath = this.resolveFilePath(opfFile, packageInfo.navItem.href);
            const locatedNav = this.findArchiveEntry(zip, requestedNavPath);
            const navPath = locatedNav?.path || requestedNavPath;
            if (locatedNav?.entry) {
                const navHtml = await this.readEntryText(locatedNav.entry);
                const doc = new DOMParser().parseFromString(navHtml, 'text/html');
                const nav = doc.querySelector('nav[epub\\:type="toc"]')
                    || doc.querySelector('nav[role="doc-toc"]')
                    || doc.querySelector('nav');
                Array.from(nav?.querySelectorAll('a[href]') || []).forEach((link) => {
                    const href = link.getAttribute('href') || '';
                    const resolved = this.resolveFilePath(navPath, href);
                    const located = this.findArchiveEntry(zip, resolved);
                    entries.push({
                        title: link.textContent.replace(/\s+/g, ' ').trim(),
                        filePath: located?.path || resolved,
                        fragment: href.includes('#') ? this.decodePathComponent(href.split('#').slice(1).join('#')) : '',
                        level: Math.min(6, link.closest('li') ? this.listDepth(link.closest('li')) : 1)
                    });
                });
            }
        }

        if (entries.length === 0 && packageInfo.ncxItem) {
            const requestedNcxPath = this.resolveFilePath(opfFile, packageInfo.ncxItem.href);
            const locatedNcx = this.findArchiveEntry(zip, requestedNcxPath);
            const ncxPath = locatedNcx?.path || requestedNcxPath;
            if (locatedNcx?.entry) {
                const xml = await this.readEntryText(locatedNcx.entry);
                const doc = new DOMParser().parseFromString(xml, 'text/xml');
                Array.from(doc.querySelectorAll('navPoint')).forEach((point) => {
                    const href = point.querySelector('content')?.getAttribute('src') || '';
                    const resolved = this.resolveFilePath(ncxPath, href);
                    const located = this.findArchiveEntry(zip, resolved);
                    entries.push({
                        title: point.querySelector('navLabel text')?.textContent?.replace(/\s+/g, ' ').trim() || '',
                        filePath: located?.path || resolved,
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

    isHtmlManifestItem(item, filePath) {
        return /(x?html)/i.test(item?.mediaType || '') || /\.(?:xhtml|html|htm)$/i.test(filePath || item?.href || '');
    }

    normalizeArchivePath(value) {
        let source = String(value || '').split('#')[0].split('?')[0].replace(/\\/g, '/').replace(/^\/+/, '');
        source = this.decodePathComponent(source);
        const clean = [];
        for (const part of source.split('/')) {
            if (!part || part === '.') continue;
            if (part === '..') clean.pop();
            else clean.push(part);
        }
        return clean.join('/').normalize('NFC');
    }

    findArchiveEntry(zip, requestedPath) {
        const normalized = this.normalizeArchivePath(requestedPath);
        if (!normalized) return null;
        const direct = zip.file(normalized);
        if (direct && !direct.dir) return { path: direct.name, entry: direct };
        const entries = Object.values(zip.files).filter((entry) => !entry.dir);
        const exact = entries.find((entry) => this.normalizeArchivePath(entry.name) === normalized);
        if (exact) return { path: exact.name, entry: exact };
        const folded = normalized.toLocaleLowerCase('en-US');
        const compatible = entries.find((entry) => (
            this.normalizeArchivePath(entry.name).toLocaleLowerCase('en-US') === folded
        ));
        return compatible ? { path: compatible.name, entry: compatible } : null;
    }

    resolveFilePath(basePath, href) {
        const rawHref = String(href || '').split('#')[0].split('?')[0];
        if (rawHref.replace(/\\/g, '/').startsWith('/')) return this.normalizeArchivePath(rawHref);
        const normalizedBase = this.normalizeArchivePath(basePath);
        const baseDir = normalizedBase.substring(0, normalizedBase.lastIndexOf('/') + 1);
        return this.normalizeArchivePath(`${baseDir}${rawHref}`);
    }

    decodePathComponent(value) {
        try {
            return decodeURIComponent(String(value || ''));
        } catch (error) {
            return String(value || '');
        }
    }

    isPopupNoteAside(element) {
        if (element?.localName?.toLowerCase() !== 'aside') return false;
        const types = [
            element.getAttribute('epub:type'),
            element.getAttributeNS?.('http://www.idpf.org/2007/ops', 'type'),
            element.getAttribute('role')
        ].filter(Boolean).join(' ').toLowerCase().split(/\s+/);
        return types.some((type) => ['footnote', 'endnote', 'doc-footnote', 'doc-endnote'].includes(type));
    }

    isReferenceInReadingFlow(element) {
        for (let candidate = element; candidate; candidate = candidate.parentElement) {
            const tag = candidate.localName?.toLowerCase() || '';
            const epubType = candidate.getAttribute('epub:type')
                || candidate.getAttributeNS?.('http://www.idpf.org/2007/ops', 'type') || '';
            if (this.isPopupNoteAside(candidate)
                || ['script', 'style', 'link', 'meta', 'svg', 'img', 'image', 'nav'].includes(tag)
                || candidate.getAttribute('role') === 'doc-endnotes'
                || candidate.classList?.contains('footnotes')
                || epubType === 'footnotes') return false;
            if (tag === 'body') return true;
        }
        return false;
    }

    // Preserve a book's original text and token positions while collecting
    // cross-file EPUB2/EPUB3 noterefs. Only local archive targets are read.
    async prepareNoteReferences(zip, sourcePath, html, documents) {
        const parse = (input) => {
            let doc = new DOMParser().parseFromString(input, 'application/xhtml+xml');
            if (Array.from(doc.getElementsByTagName('*')).some((el) => el.localName?.toLowerCase() === 'parsererror')) {
                const compatible = String(input || '').replace(/<(title|script|style|textarea)(\b[^>]*)\/>/giu, '<$1$2></$1>');
                doc = new DOMParser().parseFromString(compatible, 'text/html');
            }
            return doc;
        };
        const doc = parse(html);
        const references = [];
        const links = Array.from(doc.getElementsByTagName('*')).filter((el) => (
            el.localName?.toLowerCase() === 'a' && el.getAttribute('href')?.includes('#')
        ));
        const documentFor = async (path) => {
            if (documents.has(path)) return documents.get(path);
            const entry = this.findArchiveEntry(zip, path);
            if (!entry || !/\.(?:xhtml|html|htm)$/i.test(entry.path)) return null;
            const source = entry.path === sourcePath ? html : await this.readEntryText(entry.entry);
            const targetDoc = parse(source);
            const ids = new Map();
            Array.from(targetDoc.getElementsByTagName('*')).forEach((element) => {
                const id = element.getAttribute('id') || element.getAttribute('name');
                if (id && !ids.has(id)) ids.set(id.normalize('NFC'), element);
            });
            const result = {doc: targetDoc, ids};
            documents.set(path, result);
            return result;
        };
        for (const link of links) {
            if (references.length >= 10000) break;
            const href = link.getAttribute('href') || '';
            if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
            const hash = href.indexOf('#');
            const fragment = this.decodePathComponent(href.slice(hash + 1)).normalize('NFC');
            if (!fragment) continue;
            const part = href.slice(0, hash);
            const path = part ? this.resolveFilePath(sourcePath, part) : sourcePath;
            const located = this.findArchiveEntry(zip, path);
            const target = located && await documentFor(located.path);
            let node = target?.ids.get(fragment);
            if (!node) continue;
            const typeOf = (element) => [
                element?.getAttribute('epub:type'),
                element?.getAttributeNS?.('http://www.idpf.org/2007/ops', 'type'),
                element?.getAttribute('role'),
                element?.getAttribute('class')
            ].filter(Boolean).join(' ').toLowerCase();
            const marker = (link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) || '*';
            const refType = typeOf(link);
            const targetType = typeOf(node) + ' ' + typeOf(node.parentElement);
            const explicit = /(?:^|\s)(?:noteref|doc-noteref|footnote-ref|footnote-reference)(?:\s|$)/.test(refType);
            const looksLikeTarget = /(?:footnote|endnote|doc-footnote|doc-endnote|footnotes)/.test(targetType);
            const numberedNote = /^(?:\[?\d+\]?|\*+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.test(marker)
                && /^(?:fn|note|footnote|endnote|n)[_.:-]*\d+/i.test(fragment);
            if (!explicit && !looksLikeTarget && !numberedNote) continue;
            // A fragment may be a small marker nested within a footnote. Show
            // the complete semantic note before hiding its body from prose.
            for (let candidate = node; candidate; candidate = candidate.parentElement) {
                if (this.isPopupNoteAside(candidate)) { node = candidate; break; }
            }
            if (!node.textContent?.trim() && node.parentElement) node = node.parentElement;
            const clone = node.cloneNode(true);
            Array.from(clone.getElementsByTagName('*')).forEach((el) => {
                const tag = el.localName?.toLowerCase();
                const role = typeOf(el);
                if (['script','style','nav','img','svg'].includes(tag)
                    || (tag === 'a' && /backlink|doc-backlink/.test(role))) el.remove();
            });
            const paragraphNodes = Array.from(clone.getElementsByTagName('*')).filter((el) => (
                ['p','li'].includes(el.localName?.toLowerCase())
                && !['p','li'].includes(el.parentElement?.localName?.toLowerCase())
            ));
            const raw = paragraphNodes.length ? paragraphNodes.map((el) => el.textContent || '').join('\n\n') : clone.textContent || '';
            const noteText = raw.split(/\n\s*\n/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n').slice(0, 10000);
            if (!noteText) continue;
            const anchor = '__hummingread_note_' + references.length;
            const location = doc.createElementNS(link.namespaceURI || 'http://www.w3.org/1999/xhtml', 'span');
            location.setAttribute('id', anchor);
            link.insertBefore(location, link.firstChild);
            references.push({
                anchor, label: marker, text: noteText,
                targetPath: located.path, targetFragment: fragment,
                sourceInReadingFlow: this.isReferenceInReadingFlow(link)
            });
        }
        return { html: references.length ? new XMLSerializer().serializeToString(doc) : html, references };
    }

    extractTextFromHTML(html) {
        return this.extractChapterFromHTML(html).text;
    }

    extractChapterFromHTML(html, noteTargets = null) {
        const parser = new DOMParser();
        let doc = parser.parseFromString(html, 'application/xhtml+xml');
        const xmlFailed = Array.from(doc.getElementsByTagName('*'))
            .some((element) => element.localName?.toLowerCase() === 'parsererror');
        if (xmlFailed) {
            // HTML parsing treats `<title/>` as an opening title element and can
            // swallow the entire XHTML body. Close raw-text elements explicitly
            // before falling back for malformed, HTML-ish EPUB chapters.
            const htmlCompatible = String(html || '').replace(
                /<(title|script|style|textarea)(\b[^>]*)\/>/giu,
                '<$1$2></$1>'
            );
            doc = parser.parseFromString(htmlCompatible, 'text/html');
        }
        const elements = Array.from(doc.getElementsByTagName('*'));
        const popupAsides = new Set();
        if (noteTargets?.size) {
            const visitedTargets = new Set();
            for (const element of elements) {
                const id = (element.getAttribute('id') || element.getAttribute('name') || '').normalize('NFC');
                if (!id || !noteTargets.has(id) || visitedTargets.has(id)) continue;
                // Match the first id, just as the note document lookup does.
                visitedTargets.add(id);
                for (let candidate = element; candidate; candidate = candidate.parentElement) {
                    if (this.isPopupNoteAside(candidate)) {
                        popupAsides.add(candidate);
                        break;
                    }
                }
            }
        }
        elements.filter((element) => {
            const tagName = element.localName?.toLowerCase() || '';
            const epubType = element.getAttribute('epub:type')
                || element.getAttributeNS?.('http://www.idpf.org/2007/ops', 'type')
                || '';
            return popupAsides.has(element)
                || ['script', 'style', 'link', 'meta', 'svg', 'img', 'image', 'nav'].includes(tagName)
                || element.getAttribute('role') === 'doc-endnotes'
                || element.classList?.contains('footnotes')
                || epubType === 'footnotes';
        }).forEach((element) => element.remove());
        const body = doc.body
            || Array.from(doc.getElementsByTagName('*')).find((element) => element.localName?.toLowerCase() === 'body')
            || doc.documentElement;
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
            if ((element.localName || element.tagName || '').toUpperCase() === 'A') identifiers.push(element.getAttribute('name'));
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
            const tagName = (element.localName || element.tagName || '').toUpperCase();
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
