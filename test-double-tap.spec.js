const { test, expect } = require('@playwright/test');

test('Test double-tap functionality', async ({ page }) => {
  console.log('\n🧪 Testing double-tap on mobile...\n');
  
  // Открываем приложение
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  
  // Вводим тестовый текст
  const testText = 'Это тест двойного тапа. Проверяем работает ли переключение между режимами чтения.';
  await page.locator('#textInput').fill(testText);
  console.log('✅ Текст введён');
  
  // Переходим в режим чтения
  await page.click('#startReadingBtn');
  await page.waitForSelector('#normalReadingSection', { state: 'visible' });
  console.log('✅ Перешли в режим обычного чтения');
  
  // Пробуем двойной клик (desktop)
  console.log('\n🖱️ Тестируем double-click (desktop)...');
  await page.dblclick('#normalTextDisplay');
  await page.waitForTimeout(500);
  
  // Проверяем что перешли в RSVP
  const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`   RSVP visible after dblclick: ${rsvpVisible}`);
  
  if (rsvpVisible) {
    console.log('✅ Double-click работает!');
    
    // Пробуем выключить
    await page.dblclick('#rsvpWordDisplay');
    await page.waitForTimeout(500);
    const normalVisible = await page.locator('#normalReadingSection').isVisible();
    console.log(`   Normal mode visible after dblclick: ${normalVisible}`);
    
    if (normalVisible) {
      console.log('✅ Double-click для выключения тоже работает!');
    } else {
      console.log('❌ Double-click для выключения НЕ работает');
    }
    
    // Вернёмся в RSVP для теста тапов
    await page.dblclick('#normalTextDisplay');
    await page.waitForTimeout(500);
  } else {
    console.log('❌ Double-click НЕ работает');
  }
  
  // Теперь тестируем mobile touch
  console.log('\n📱 Тестируем double-tap (mobile touch)...');
  
  // Возвращаемся в normal mode если нужно
  if (await page.locator('#rsvpReadingSection').isVisible()) {
    await page.click('#stopRSVPBtn');
    await page.waitForTimeout(300);
  }
  
  // Симулируем двойной тап через touchend
  console.log('   Симулируем первый тап...');
  await page.locator('#normalTextDisplay').dispatchEvent('touchend');
  await page.waitForTimeout(150); // Меньше 300ms для двойного тапа
  
  console.log('   Симулируем второй тап...');
  await page.locator('#normalTextDisplay').dispatchEvent('touchend');
  await page.waitForTimeout(500);
  
  const rsvpVisibleAfterTap = await page.locator('#rsvpReadingSection').isVisible();
  console.log(`   RSVP visible after double-tap: ${rsvpVisibleAfterTap}`);
  
  if (rsvpVisibleAfterTap) {
    console.log('✅ Double-tap работает!');
  } else {
    console.log('❌ Double-tap НЕ работает');
    
    // Попробуем на section вместо display
    console.log('\n   Пробуем на section...');
    await page.locator('#normalReadingSection').dispatchEvent('touchend');
    await page.waitForTimeout(150);
    await page.locator('#normalReadingSection').dispatchEvent('touchend');
    await page.waitForTimeout(500);
    
    const rsvpVisibleSection = await page.locator('#rsvpReadingSection').isVisible();
    console.log(`   RSVP visible after section tap: ${rsvpVisibleSection}`);
    
    if (rsvpVisibleSection) {
      console.log('✅ Double-tap на section работает!');
    } else {
      console.log('❌ Double-tap на section тоже НЕ работает');
    }
  }
  
  console.log('\n📋 Итог теста:');
  console.log('════════════════════════════════════════');
});
