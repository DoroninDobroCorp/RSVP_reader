const { test, expect } = require('@playwright/test');
const productConfig = require('../product.config.json');
test.use({serviceWorkers:'block'});
for (const [lang,heading] of [['en','Your books.'],['ru','Ваши книги.'],['es','Tus libros.']]) {
  const path='/about/'+(lang==='en'?'':lang+'/');
  test('marketing '+lang+': localized page, responsive layout and working demo',async({page,request})=>{
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:850});
      await page.goto(path,{waitUntil:'domcontentloaded'});
      await expect(page.locator('html')).toHaveAttribute('lang',lang);
      await expect(page.locator('h1')).toContainText(heading);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      expect(overflow,'horizontal overflow at '+width).toBe(false);
    }
    const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('hummingread.');
    const source=page.locator('a[href*="github.com/DoroninDobroCorp/RSVP_reader/tree/"]').first();
    await expect(source).toBeVisible();
    await expect(page.locator('a[href^="mailto:vladimir_doronin@icloud.com"]').first()).toBeVisible();
    await expect(page.locator('a[href*="example.invalid"]')).toHaveCount(0);
    await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4);
    const readerLink=page.locator('.hero .actions a').first();
    await expect(readerLink).toHaveAttribute('href',productConfig.urls.marketingSite+'lite.html?lang='+lang);
    for(const [index,file] of ['privacy.html','support.html','acknowledgements.html'].entries()) {
      const href=await page.locator('.footer-links a').nth(index).getAttribute('href');
      expect(href).toBe(productConfig.urls.marketingSite+(lang==='en'?'':lang+'/')+file);
      const response=await request.get(new URL(href).pathname);
      expect(response.status(),file+' in '+lang).toBe(200);
    }
    const demo=page.locator('[data-rsvp-demo]');
    const initial=await demo.locator('[data-word]').textContent();
    await demo.locator('[data-play]').click();
    await expect(demo.locator('[data-play]')).toHaveAttribute('aria-pressed','true');
    await expect(demo.locator('[data-word]')).not.toHaveText(initial);
    await demo.locator('[data-play]').click();
    await expect(demo.locator('[data-play]')).toHaveAttribute('aria-pressed','false');
    const paused=await demo.locator('[data-word]').textContent();
    await page.waitForTimeout(400);
    await expect(demo.locator('[data-word]')).toHaveText(paused);
    await demo.locator('input').focus(); await demo.locator('input').press('ArrowRight');
    await expect(demo.locator('output')).toHaveText('230');
    await demo.locator('[data-reset]').click();
    await page.locator('summary').first().click();
    await expect(page.locator('details').first()).toHaveAttribute('open','');
    const styles=await request.get('/about/marketing.css'); expect(styles.status()).toBe(200);
    const script=await request.get('/about/marketing.js'); expect(script.status()).toBe(200);
  });
}
