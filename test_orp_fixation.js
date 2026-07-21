
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  // Enable ORP alignment
  await page.evaluate(() => {
    window.rsvpReader.settings.orpAlignment = true;
    window.rsvpReader.settings.orpNotches = true;
    window.rsvpReader.saveSettings();
  });
  
  const words = ['а', 'это', 'слово', 'исследование', 'скорочтение', 'в', 'интерфейсе', 'автоматический', 'я'];
  const text = words.join(' ');
  
  await page.locator('#textInput').fill(text);
  await page.click('#startReadingBtn');
  await page.waitForSelector('#normalReadingSection', { state: 'visible' });
  await page.click('#startRSVPBtn');
  await page.waitForSelector('#rsvpReadingSection', { state: 'visible' });
  
  console.log('--- TESTING RED LETTER X COORDINATE FOR 9 WORDS ---');
  
  for (let i = 0; i < words.length; i++) {
    await page.evaluate((idx) => {
      window.rsvpReader.currentIndex = idx;
      window.rsvpReader.displayCurrentWord();
    }, i);
    
    await page.waitForTimeout(100);
    
    const letterRect = await page.evaluate(() => {
      const el = document.querySelector('.focus-letter');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, center: (r.left + r.right) / 2 };
    });
    
    const notchRect = await page.evaluate(() => {
      const el = document.querySelector('.orp-notch.top-notch');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { center: (r.left + r.right) / 2 };
    });
    
    console.log('Word:  + words[i] +  | Focus Letter Center X: ' + letterRect.center.toFixed(2) + 'px | Notch Center X: ' + (notchRect ? notchRect.center.toFixed(2) : 'none') + 'px');
  }
  
  await browser.close();
})();
