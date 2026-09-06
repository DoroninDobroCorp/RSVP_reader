const { test, expect } = require('@playwright/test');

test('Test RSVP stop functionality', async ({ page }) => {
  console.log('\n🧪 Testing RSVP stop/pause...\n');
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const testText = 'Первое слово. Второе слово. Третье слово. Четвертое слово. Пятое слово.';
  await page.locator('#textInput').fill(testText);
  await page.click('#startReadingBtn');
  await page.waitForTimeout(300);
  console.log('✅ В режиме чтения');
  
  // Запускаем RSVP
  await page.click('#startRSVPBtn');
  await page.waitForTimeout(500);
  console.log('✅ RSVP запущен');
  
  // Получаем первое слово
  const firstWord = await page.locator('#rsvpWordDisplay').textContent();
  console.log(`   Первое слово: "${firstWord}"`);
  
  // Ждём смены слова
  await page.waitForTimeout(1000);
  const secondWord = await page.locator('#rsvpWordDisplay').textContent();
  console.log(`   Второе слово: "${secondWord}"`);
  
  // Пробуем двойной клик для остановки
  console.log('\n🖱️ Двойной клик на RSVP слове...');
  await page.dblclick('#rsvpWordDisplay');
  await page.waitForTimeout(500);
  
  // Проверяем что вернулись в normal mode
  const normalVisible = await page.locator('#normalReadingSection').isVisible();
  const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  
  console.log(`   Normal mode visible: ${normalVisible}`);
  console.log(`   RSVP mode visible: ${rsvpVisible}`);
  
  if (normalVisible && !rsvpVisible) {
    console.log('✅ RSVP остановился и вернулся в normal mode');
  } else if (!normalVisible && rsvpVisible) {
    console.log('❌ RSVP не остановился, всё ещё в RSVP режиме');
    
    // Проверим слово через секунду - меняется ли оно?
    const wordBefore = await page.locator('#rsvpWordDisplay').textContent();
    await page.waitForTimeout(1000);
    const wordAfter = await page.locator('#rsvpWordDisplay').textContent();
    
    console.log(`   Слово до: "${wordBefore}"`);
    console.log(`   Слово после: "${wordAfter}"`);
    
    if (wordBefore !== wordAfter) {
      console.log('❌ Текст продолжает проигрываться!');
    } else {
      console.log('✅ Текст на паузе (это ОК)');
    }
  }
  
  // Пробуем двойной клик на section
  console.log('\n🖱️ Двойной клик на rsvpReadingSection...');
  
  // Вернёмся в RSVP если вышли
  if (normalVisible) {
    await page.click('#startRSVPBtn');
    await page.waitForTimeout(500);
  }
  
  await page.dblclick('#rsvpReadingSection');
  await page.waitForTimeout(500);
  
  const normalVisible2 = await page.locator('#normalReadingSection').isVisible();
  console.log(`   Normal mode visible: ${normalVisible2}`);
  
  if (normalVisible2) {
    console.log('✅ Двойной клик на section работает!');
  } else {
    console.log('❌ Двойной клик на section НЕ работает!');
  }
});
