const { test } = require('@playwright/test');

test('Simple tap test', async ({ page }) => {
  console.log('\n=== ТЕСТ БАЗОВОГО ФУНКЦИОНАЛА ===\n');
  
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  const text = 'Раз два три четыре пять';
  await page.locator('#textInput').fill(text);
  console.log('✅ Текст введен');
  
  // Обычное чтение
  await page.click('#startReadingBtn');
  await page.waitForTimeout(500);
  console.log('✅ Режим обычного чтения');
  
  // Запускаем RSVP кнопкой
  await page.click('#startRSVPBtn');
  await page.waitForTimeout(500);
  
  let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`✅ RSVP запущен кнопкой: ${rsvpVisible}`);
  
  // Останавливаем кнопкой
  await page.click('#stopRSVPBtn');
  await page.waitForTimeout(500);
  
  let normalVisible = await page.locator('#normalReadingSection').isVisible();
  console.log(`✅ RSVP остановлен кнопкой: ${normalVisible}`);
  
  console.log('\n=== ТЕСТ ДВОЙНОГО КЛИКА ===\n');
  
  // Пробуем двойной клик для запуска
  console.log('Двойной клик на тексте для ЗАПУСКА...');
  await page.dblclick('#normalTextDisplay');
  await page.waitForTimeout(500);
  
  rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`RSVP запустился: ${rsvpVisible ? '✅ ДА' : '❌ НЕТ'}`);
  
  if (rsvpVisible) {
    // Пробуем двойной клик для остановки
    console.log('\nДвойной клик на слове для ОСТАНОВКИ...');
    await page.dblclick('#rsvpWordDisplay');
    await page.waitForTimeout(500);
    
    normalVisible = await page.locator('#normalReadingSection').isVisible();
    console.log(`RSVP остановился: ${normalVisible ? '✅ ДА' : '❌ НЕТ'}`);
  }
  
  console.log('\n=== ТЕСТ ДВОЙНОГО ТАПА (mobile) ===\n');
  
  // Если в normal mode, тестируем тап
  if (normalVisible || !rsvpVisible) {
    console.log('Двойной тап для ЗАПУСКА...');
    await page.locator('#normalTextDisplay').dispatchEvent('touchend');
    await page.waitForTimeout(100);
    await page.locator('#normalTextDisplay').dispatchEvent('touchend');
    await page.waitForTimeout(500);
    
    rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
    console.log(`RSVP запустился: ${rsvpVisible ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (rsvpVisible) {
      console.log('\nДвойной тап для ОСТАНОВКИ...');
      await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
      await page.waitForTimeout(100);
      await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
      await page.waitForTimeout(500);
      
      normalVisible = await page.locator('#normalReadingSection').isVisible();
      console.log(`RSVP остановился: ${normalVisible ? '✅ ДА' : '❌ НЕТ'}`);
    }
  }
  
  console.log('\n=== КОНЕЦ ТЕСТА ===\n');
});
