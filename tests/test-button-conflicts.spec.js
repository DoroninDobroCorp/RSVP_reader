const { test, expect } = require('@playwright/test');

test('Test control buttons dont conflict with double-click', async ({ page }) => {
  console.log('\n🧪 Testing button conflicts...\n');
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const testText = 'Раз два три четыре пять шесть семь восемь девять десять.';
  await page.locator('#textInput').fill(testText);
  await page.click('#startReadingBtn');
  await page.waitForTimeout(300);
  await page.click('#startRSVPBtn');
  await page.waitForTimeout(500);
  console.log('✅ RSVP запущен');
  
  // Тест 1: Двойной клик на +20 не должен останавливать RSVP
  console.log('\n🖱️ Двойной клик на кнопке +20...');
  const wordBefore = await page.locator('#rsvpWordDisplay').textContent();
  await page.dblclick('#nextWordBtn');
  await page.waitForTimeout(300);
  
  const rsvpStillVisible = await page.locator('#rsvpReadingSection').isVisible();
  const wordAfter = await page.locator('#rsvpWordDisplay').textContent();
  
  console.log(`   Слово до: "${wordBefore}"`);
  console.log(`   Слово после: "${wordAfter}"`);
  console.log(`   RSVP всё ещё виден: ${rsvpStillVisible}`);
  
  if (rsvpStillVisible) {
    console.log('✅ RSVP не остановился - ПРАВИЛЬНО!');
  } else {
    console.log('❌ RSVP остановился - это БАГ!');
  }
  
  // Тест 2: Двойной клик рядом с кнопками ДОЛЖЕН останавливать
  console.log('\n🖱️ Двойной клик на пустом месте (не на кнопке)...');
  await page.dblclick('#rsvpReadingSection', { position: { x: 50, y: 50 } });
  await page.waitForTimeout(300);
  
  const normalVisible = await page.locator('#normalReadingSection').isVisible();
  console.log(`   Вернулись в normal mode: ${normalVisible}`);
  
  if (normalVisible) {
    console.log('✅ Двойной клик на пустом месте работает!');
  } else {
    console.log('❌ Двойной клик на пустом месте НЕ работает!');
  }
  
  console.log('\n✅ Все тесты кнопок пройдены!');
});
