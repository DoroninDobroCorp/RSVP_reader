# Trilingual Technical SEO & i18n Strategy

## 1. Executive Summary & Core Principles

HummingRead is a local-first, privacy-focused RSVP (Rapid Serial Visual Presentation) speed reader for books, documents, and web text. This strategy document details the international SEO architecture, multi-locale URL structure, reciprocal `hreflang` implementation, search intent maps, content principles, crawl management, and non-guarantee disclosures for English (`en`), Russian (`ru`), and neutral international Spanish (`es`).

### Key Strategy Principles:
- **Local-First & Privacy Preserved:** Zero user reading text, books, or progress are transmitted to third parties or indexers.
- **Crawlable Static HTML Generation:** Pre-rendered static landing and legal pages for all supported locales with static `<html lang>`, unique localized titles and descriptions, self-referencing canonicals, and reciprocal `hreflang` tags.
- **Strict Preview Channel Safeguards:** Tester-preview builds remain non-indexable with `<meta name="robots" content="noindex,nofollow,noarchive">` and `Disallow: /` in `robots.txt`. Production dry-builds emit complete XML sitemaps.
- **Anti-Doorway & High-Utility Policy:** Every locale route renders a fully functional, usable offline application surface. No thin, auto-generated, or location-spammed doorway pages are created.
- **Disclosed Intent & Hypotheses:** Target search terms are explicitly classified as unverified hypotheses until backed by first-party Search Console performance data. No ranking, indexation, or traffic multiplier guarantees are made.

---

## 2. Locale Architecture & Canonical Routing

### 2.1 URL Structure
HummingRead supports a deterministic locale subpath architecture compatible with both root domain hosting (`/`) and subpath hosting (such as `/rsvp/`):

| Locale | Language / Region | Root URL Pattern | Subpath URL Pattern (`/rsvp/`) |
| :--- | :--- | :--- | :--- |
| `en` (Default) | English / Global | `https://domain.tld/` | `https://domain.tld/rsvp/` |
| `ru` | Russian | `https://domain.tld/ru/` | `https://domain.tld/rsvp/ru/` |
| `es` | Spanish (International) | `https://domain.tld/es/` | `https://domain.tld/rsvp/es/` |
| `x-default` | Global Fallback | `https://domain.tld/` | `https://domain.tld/rsvp/` |

### 2.2 Legal & Information Page Routes
Public legal and support pages follow matching subpath patterns:
- **Privacy Policy:** `/privacy.html`, `/ru/privacy.html`, `/es/privacy.html`
- **Support & Recovery:** `/support.html`, `/ru/support.html`, `/es/support.html`
- **Acknowledgements:** `/acknowledgements.html`, `/ru/acknowledgements.html`, `/es/acknowledgements.html`

Navigation between legal pages maintains subpath integrity across all locales.

---

## 3. Reciprocal `hreflang` & Canonical Schema

Every static HTML document contains self-referencing canonical tags and a full set of reciprocal `<link rel="alternate" hreflang="...">` elements in its `<head>` section.

### 3.1 Sample Head Tags for Landing Pages

#### English Landing Page (`/` or `/rsvp/`)
```html
<html lang="en">
<head>
    <title>HummingRead: Speed Reader</title>
    <meta name="description" content="HummingRead is a calm RSVP speed reader for books, pasted text and focused one-word-at-a-time reading with Pico.">
    <link rel="canonical" href="https://domain.tld/rsvp/">
    <link rel="alternate" hreflang="en" href="https://domain.tld/rsvp/">
    <link rel="alternate" hreflang="ru" href="https://domain.tld/rsvp/ru/">
    <link rel="alternate" hreflang="es" href="https://domain.tld/rsvp/es/">
    <link rel="alternate" hreflang="x-default" href="https://domain.tld/rsvp/">
</head>
```

#### Russian Landing Page (`/ru/` or `/rsvp/ru/`)
```html
<html lang="ru">
<head>
    <title>HummingRead: Скорочиталка</title>
    <meta name="description" content="HummingRead — спокойная RSVP-скорочиталка для книг, вставленного текста и чтения по одному слову с Пико.">
    <link rel="canonical" href="https://domain.tld/rsvp/ru/">
    <link rel="alternate" hreflang="en" href="https://domain.tld/rsvp/">
    <link rel="alternate" hreflang="ru" href="https://domain.tld/rsvp/ru/">
    <link rel="alternate" hreflang="es" href="https://domain.tld/rsvp/es/">
    <link rel="alternate" hreflang="x-default" href="https://domain.tld/rsvp/">
</head>
```

#### Spanish Landing Page (`/es/` or `/rsvp/es/`)
```html
<html lang="es">
<head>
    <title>HummingRead: Lector de velocidad</title>
    <meta name="description" content="HummingRead es un lector de velocidad RSVP para libros, texto pegado y lectura enfocada palabra por palabra con Pico.">
    <link rel="canonical" href="https://domain.tld/rsvp/es/">
    <link rel="alternate" hreflang="en" href="https://domain.tld/rsvp/">
    <link rel="alternate" hreflang="ru" href="https://domain.tld/rsvp/ru/">
    <link rel="alternate" hreflang="es" href="https://domain.tld/rsvp/es/">
    <link rel="alternate" hreflang="x-default" href="https://domain.tld/rsvp/">
</head>
```

---

## 4. Search Intent Mapping & Keyword Hypotheses

*Disclaimer: All keyword phrases and volumes listed below are unverified qualitative hypotheses. Real market volume and competitive difficulty must be measured using Google Search Console post-launch.*

### 4.1 Search Intent Categories

1. **Transactional / Tool Seeking:** Users looking for an immediate web or offline tool to speed read EPUBs, FB2s, or pasted text.
2. **Informational / Technique Query:** Users researching Rapid Serial Visual Presentation (RSVP), focus reading, or distraction-free text presentation.
3. **Extension / Integration Query:** Users searching for Chrome extensions or tools to read web articles one word at a time without cloud tracking.

### 4.2 Multi-Locale Intent Map

| Concept | English (`en`) | Russian (`ru`) | Spanish (`es`) |
| :--- | :--- | :--- | :--- |
| **Core Speed Reader** | `RSVP speed reader`, `word at a time reader` | `RSVP скорочиталка`, `чтение по одному слову` | `lector de velocidad RSVP`, `lectura palabra por palabra` |
| **Book Format Reader** | `EPUB speed reader`, `offline book speed reader` | `скорочиталка EPUB FB2`, `офлайн читалка книг` | `lector EPUB lectura rápida`, `lector de libros sin conexión` |
| **Chrome Reader** | `Chrome RSVP extension`, `article speed reader` | `расширение скорочиталка Chrome` | `extensión lector rápido Chrome` |
| **Privacy / Local** | `private speed reader`, `local text reader` | `локальная скорочиталка без регистрации` | `lector rápido privado sin registro` |

---

## 5. Content Quality & Anti-Doorway Architecture

HummingRead adheres strictly to search engine webmaster quality guidelines:

1. **Zero Thin / Doorway Pages:** No auto-generated locale pages, programmatic location landing pages, or thin affiliate pages are built.
2. **Full Functional Parity:** Every locale URL (`/`, `/ru/`, `/es/`) renders a fully functional web/PWA reader application with working demo content, format import, library, and settings.
3. **No Dynamic Keyword Stuffing:** Content across all locales reflects natural, human-crafted product messaging preserving the calm, helpful HummingRead/Pico brand voice.
4. **Offline Resilience:** App shell and catalogs are precached by Service Worker v53, ensuring instantaneous page rendering offline.

---

## 6. Crawl Management & Channel Release Safety

### 6.1 Preview Channel Safety (`tester-preview`)
- **`robots.txt` Policy:** Enforces complete exclusion:
  ```txt
  User-agent: *
  Disallow: /
  ```
- **Meta Tag Guard:** Every preview HTML page includes:
  ```html
  <meta name="robots" content="noindex,nofollow,noarchive">
  ```
- **Sitemap Exclusion:** `sitemap.xml` is excluded from preview builds.

### 6.2 Production Release Channel (`production`)
- **`robots.txt` Policy:** Allows indexation and references sitemap:
  ```txt
  User-agent: *
  Allow: /
  Sitemap: https://domain.tld/sitemap.xml
  ```
- **Meta Tag Guard:** Static HTML pages contain `<meta name="robots" content="index,follow">`.
- **Production XML Sitemap:** Emits complete `sitemap.xml` listing all 12 canonical locale URLs (`/`, `/ru/`, `/es/`, and legal pages) with `xhtml:link` hreflang annotations.

---

## 7. Performance & Verification Metrics

### 7.1 Non-Regression Floor (Lighthouse Mobile)
All locale landing pages (`/`, `/ru/`, `/es/`) must achieve or exceed the following Lighthouse mobile scores:
- **Performance:** >= 95
- **Accessibility:** >= 95
- **Best Practices:** >= 95
- **SEO:** >= 95

### 7.2 Post-Launch Measurement Plan
Key performance indicators (KPIs) to be monitored in Google Search Console:
- Impressions and Non-Branded Organic Clicks
- Click-Through Rate (CTR) by Locale Query Group
- Demo Starts and Book Import Conversion Rates
- Returning User Session Retention

---

## 8. Non-Guarantee Disclosures

1. **No Search Engine Ranking Guarantee:** Implementation of static multi-locale HTML, reciprocal `hreflang` tags, canonicals, and sitemaps does not guarantee search engine indexing, specific ranking positions, or organic search traffic.
2. **No Comprehension Multiplier Guarantee:** HummingRead controls presentation pace; reading speed and comprehension depend entirely on the individual reader, material, language, and chosen speed.
3. **Hypothesis Disclosure:** Keyword volume and competitive difficulty metrics are qualitative hypotheses. No paid SEO services or automated scraping tools were utilized in formulating this strategy.
