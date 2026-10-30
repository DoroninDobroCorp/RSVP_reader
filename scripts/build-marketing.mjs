import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productConfig } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogs = JSON.parse(await readFile(join(root, 'website/locales.json'), 'utf8'));
const destination = join(root, 'dist/about');
const base = new URL(productConfig.website.baseUrl).href;
const appBase = productConfig.urls.marketingSite;
const source = productConfig.website.sourceUrl;
const email = productConfig.supportEmail;
const escape = (v) => String(v).replace(/[&<>"']/gu, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const value of [base, appBase, source]) {
  if (new URL(value).protocol !== 'https:') throw new Error('Marketing links must use HTTPS.');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new Error('A public support email is required.');
const donation = productConfig.website.donationUrl;
if (donation && new URL(donation).protocol !== 'https:') throw new Error('Donation links must use HTTPS.');
await mkdir(destination, {recursive:true});
for (const file of ['marketing.css','marketing.js']) await cp(join(root,'website',file),join(destination,file));
for (const [locale,c] of Object.entries(catalogs)) {
  const prefix = locale === 'en' ? '' : locale + '/';
  const up = locale === 'en' ? './' : '../';
  const target = join(destination,prefix);
  await mkdir(target,{recursive:true});
  const appHref = appBase + 'lite.html?lang=' + locale;
  const legalBase = appBase + prefix;
  const url = base + prefix;
  const alternates = Object.keys(catalogs).map(lang => '<link rel="alternate" hreflang="'+lang+'" href="'+base+(lang === 'en' ? '' : lang+'/')+'">').join('\n');
  const langs = Object.keys(catalogs).map(lang => '<a href="'+(lang === 'en' ? up : up+lang+'/')+'" lang="'+lang+'" hreflang="'+lang+'"'+(locale===lang?' aria-current="page"':'')+'>'+lang.toUpperCase()+'</a>').join('');
  const appStoreAvailable = /^https:\/\/apps\.apple\.com\//u.test(productConfig.urls.appStore);
  const schema = JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'HummingRead',url:base,inLanguage:['en','ru','es'],description:c.intro}).replaceAll('<','\\u003c');
  const title = 'HummingRead — '+c.title.replace('\n',' ');
  const html = '<!doctype html>\n'+
  '<html lang="'+locale+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="theme-color" content="#f5eedf"><title>'+escape(title)+'</title><meta name="description" content="'+escape(c.intro)+'">'+
  '<meta name="robots" content="'+(productConfig.website.indexable?'index,follow':'noindex,nofollow')+'">'+
  '<link rel="canonical" href="'+url+'">'+alternates+'<link rel="alternate" hreflang="x-default" href="'+base+'">'+
  '<meta property="og:type" content="website"><meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(c.intro)+'">'+
  '<meta property="og:url" content="'+url+'"><meta property="og:image" content="'+appBase+'assets/brand/hummingread-og.png">'+
  '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+escape(title)+'"><meta name="twitter:description" content="'+escape(c.intro)+'">'+
  '<meta name="twitter:image" content="'+appBase+'assets/brand/hummingread-og.png">'+
  '<link rel="icon" href="'+appBase+'assets/icons/app-icon-32.png"><link rel="stylesheet" href="'+up+'marketing.css">'+
  '<script type="application/ld+json">'+schema+'</script><script src="'+up+'marketing.js" defer></script></head><body>'+
  '<a class="skip" href="#main">'+escape(c.try)+'</a><div class="wrap"><header>'+
  '<a class="brand" href="'+up+'"><img src="'+appBase+'assets/icons/app-icon-64.png" width="40" height="40" alt="">HummingRead</a>'+
  '<nav aria-label="'+escape(c.nav.join(', '))+'"><a href="#how">'+escape(c.nav[0])+'</a><a href="#files">'+escape(c.nav[1])+'</a><a href="#source">'+escape(c.nav[2])+'</a></nav>'+
  '<div class="langs" aria-label="Language">'+langs+'</div></header>'+
  '<main id="main"><section class="hero"><div><p class="eyebrow">'+escape(c.eyebrow)+'</p><h1>'+escape(c.title)+'<em>'+escape(c.accent)+'</em></h1>'+
  '<p class="intro">'+escape(c.intro)+'</p><div class="actions"><a class="btn primary" href="'+appHref+'">'+escape(c.try)+' &rarr;</a><a class="btn" href="'+source+'">'+escape(c.source)+'</a></div>'+
  '<p class="availability">'+(appStoreAvailable?'<a href="'+escape(productConfig.urls.appStore)+'">App Store &rarr;</a>':escape(c.soon))+'</p></div>'+
  '<div class="hero-art"><span class="orbit" aria-hidden="true"></span><img src="'+appBase+'assets/brand/pico-hero-640.webp" width="640" height="704" alt="'+escape(c.illustration)+'" fetchpriority="high">'+
  '<span class="edition" aria-hidden="true">ONE WORD.<br>YOUR WORLD.</span></div></section>'+
  '<div class="formats" aria-label="File formats">'+['EPUB','FB2','DOCX','TXT','HTML','MD','RTF'].map(x=>'<span>'+x+'</span>').join('')+'</div>'+
  '<section id="how" class="section split"><div><p class="eyebrow">RSVP / 01</p><h2>'+escape(c.demoTitle)+'</h2><p>'+escape(c.demoText)+'</p></div>'+
  '<div class="rsvp-example" data-rsvp-demo data-text="'+escape(c.sample)+'" role="group" aria-label="'+escape(c.demoLabel)+'">'+
  '<div class="example-top"><span>HUMMINGREAD</span><span>RSVP · DEMO</span></div><div class="focus-word" data-word>'+escape(c.word)+'</div>'+
  '<div class="example-controls"><button type="button" data-play="'+escape(c.play)+'" data-pause="'+escape(c.pause)+'" aria-pressed="false">'+escape(c.play)+'</button>'+
  '<button type="button" data-reset>'+escape(c.restart)+'</button></div><label class="pace">'+escape(c.speed)+' <input type="range" min="100" max="450" step="10" value="220" aria-label="'+escape(c.speed)+'"><output data-pace>220</output></label></div></section>'+
  '<section id="files" class="section"><p class="eyebrow">EPUB / FB2 / DOCX / TXT / HTML / MD / RTF</p><h2>'+escape(c.formatsTitle)+'</h2><p>'+escape(c.formatsText)+'</p>'+
  '<div class="steps">'+c.steps.map(([n,t,p])=>'<article><span class="step-num">'+n+'</span><h3>'+escape(t)+'</h3><p>'+escape(p)+'</p></article>').join('')+'</div></section>'+
  '<section class="section split"><div class="privacy"><p class="eyebrow">LOCAL / OFFLINE</p><h2>'+escape(c.privacyTitle)+'</h2><p>'+escape(c.privacyText)+'</p><p>'+escape(c.privacyNote)+'</p></div>'+
  '<div id="source" class="source-panel"><span class="pill">MIT LICENSE</span><h2>'+escape(c.openTitle)+'</h2><p>'+escape(c.openText)+'</p>'+
  '<div class="source-links"><a class="btn" href="'+source+'">'+escape(c.source)+' &nearr;</a><a href="https://github.com/DoroninDobroCorp/RSVP_reader/blob/mission/android-r5-recovery-20260814/LICENSE">'+escape(c.openLink)+'</a></div></div></section>'+
  '<section class="section"><div class="faq"><h2>'+escape(c.faqTitle)+'</h2>'+c.faqs.map(([q,a])=>'<details><summary>'+escape(q)+'</summary><p>'+escape(a)+'</p></details>').join('')+'</div>'+
  '<div class="support"><h2>'+escape(c.supportTitle)+'</h2><p>'+escape(c.supportText)+'</p><a class="btn primary" href="mailto:'+email+'?subject=HummingRead">'+escape(c.supportAction)+' &rarr;</a>'+
  (donation?'<a class="btn" rel="noopener noreferrer" href="'+escape(donation)+'">'+escape(c.donate)+'</a><p class="donation-note">'+escape(c.donateNote)+'</p>':'')+'</div></section></main>'+
  '<footer class="footer"><span>'+escape(c.footerLine)+'</span><div class="footer-links">'+['privacy.html','support.html','acknowledgements.html'].map((f,i)=>'<a href="'+legalBase+f+'">'+escape(c.footer[i])+'</a>').join('')+'</div></footer></div></body></html>\n';
  await writeFile(join(target,'index.html'),html);
}
await writeFile(join(destination,'robots.txt'),productConfig.website.indexable?'User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n':'User-agent: *\nDisallow: /\n');
await writeFile(join(destination,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(catalogs).map(lang=>'<url><loc>'+base+(lang==='en'?'':lang+'/')+'</loc></url>').join('')+'</urlset>\n');
console.log('Built EN/RU/ES marketing website, optional support link, sitemap and social metadata.');
