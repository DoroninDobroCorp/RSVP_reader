const { test } = require('@playwright/test');

test('Tap anywhere on screen', async ({ page }) => {
  console.log('\n=== ТЕСТ: ТАПНУТЬ МОЖНО ВЕЗДЕ ===\n');
  
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  const text = 'Раз два три четыре пять шесть семь восемь';
  await page.locator('#textInput').fill(text);
  await page.click('#startReadingBtn');
  await page.waitForTimeout(500);
  console.log('✅ В режиме обычного чтения\n');
  
  // Тест 1: Тап на тексте
  console.log('📱 Тап 1: Двойной тап НА ТЕКСТЕ');
  await page.locator('#normalTextDisplay').dispatchEvent('touchend');
  await page.waitForTimeout(150);
  await page.locator('#normalTextDisplay').dispatchEvent('touchend');
  await page.waitForTimeout(500);
  
  let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`   Результат: ${rsvpVisible ? '✅ RSVP запустился' : '❌ НЕ сработало'}\n`);
  
  if (rsvpVisible) {
    await page.click('#stopRSVPBtn');
    await page.waitForTimeout(300);
  }
  
  // Тест 2: Тап на section (пустое место)
  console.log('📱 Тап 2: Двойной тап НА ПУСТОМ МЕСТЕ (не на тексте)');
  await page.locator('#normalReadingSection').dispatchEvent('touchend', { 
    position: { x: 50, y: 50 } 
  });
  await page.waitForTimeout(150);
  await page.locator('#normalReadingSection').dispatchEvent('touchend', { 
    position: { x: 50, y: 50 } 
  });
  await page.waitForTimeout(500);
  
  rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`   Результат: ${rsvpVisible ? '✅ RSVP запустился' : '❌ НЕ сработало'}\n`);
  
  if (rsvpVisible) {
    // Тест 3: Остановка тапом на слове
    console.log('📱 Тап 3: Двойной тап НА СЛОВЕ для остановки');
    await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
    await page.waitForTimeout(150);
    await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
    await page.waitForTimeout(500);
    
    let normalVisible = await page.locator('#normalReadingSection').isVisible();
    console.log(`   Результат: ${normalVisible ? '✅ RSVP остановился' : '❌ НЕ сработало'}\n`);
    
    // Вернуться в RSVP для следующего теста
    await page.click('#startRSVPBtn');
    await page.waitForTimeout(500);
    
    // Тест 4: Остановка тапом на пустом месте
    console.log('📱 Тап 4: Двойной тап НА ПУСТОМ МЕСТЕ для остановки');
    await page.locator('#rsvpReadingSection').dispatchEvent('touchend', { 
      position: { x: 100, y: 100 } 
    });
    await page.waitForTimeout(150);
    await page.locator('#rsvpReadingSection').dispatchEvent('touchend', { 
      position: { x: 100, y: 100 } 
    });
    await page.waitForTimeout(500);
    
    normalVisible = await page.locator('#normalReadingSection').isVisible();
    console.log(`   Результат: ${normalVisible ? '✅ RSVP остановился' : '❌ НЕ сработало'}\n`);
  }
  
  // Тест 5: Кнопки не должны конфликтовать
  await page.click('#startRSVPBtn');
  await page.waitForTimeout(500);
  
  console.log('🎮 Тап 5: Двойной тап НА КНОПКЕ (не должен останавливать)');
  const wordBefore = await page.locator('#rsvpWordDisplay').textContent();
  
  await page.locator('#nextWordBtn').dispatchEvent('touchend');
  await page.waitForTimeout(150);
  await page.locator('#nextWordBtn').dispatchEvent('touchend');
  await page.waitForTimeout(500);
  
  rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  const wordAfter = await page.locator('#rsvpWordDisplay').textContent();
  
  console.log(`   До: "${wordBefore}", После: "${wordAfter}"`);
  console.log(`   Результат: ${rsvpVisible ? '✅ RSVP продолжает работать' : '❌ RSVP остановился (БАГ!)'}\n`);
  
  console.log('=== ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ ===\n');
});
