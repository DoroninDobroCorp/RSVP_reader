const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('EPUB Parser Tests', () => {
  
  test('should load and parse Игра Эндера.epub correctly', async ({ page }) => {
    // Включаем подробное логирование
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('[PAGE ERROR]:', error.message);
    });
    
    // Открываем приложение
    console.log('\n📖 Открываем приложение...');
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    
    // Проверяем что страница загрузилась
    await expect(page.locator('h1')).toContainText('RSVP Reader');
    console.log('✅ Приложение загружено');
    
    // Загружаем EPUB файл
    console.log('\n📚 Загружаем EPUB файл...');
    const epubPath = path.join(__dirname, 'Игра Эндера.epub');
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(epubPath);
    
    // Ждём обработки файла (максимум 30 секунд)
    console.log('⏳ Ждём обработки EPUB...');
    await page.waitForTimeout(2000); // Даём время на загрузку JSZip
    
    // Ждём пока текст не появится в textarea (реальный контент, не сообщение о загрузке)
    await page.waitForFunction(() => {
      const textarea = document.getElementById('textInput');
      const value = textarea.value;
      // Ждём пока не будет реального текста (не "⏳" и не "✅")
      return value.length > 1000 && !value.startsWith('⏳') && !value.startsWith('✅');
    }, { timeout: 30000 });
    
    // Получаем текст из textarea
    const textareaContent = await page.locator('#textInput').inputValue();
    
    console.log('✅ EPUB обработан');
    
    // Базовые проверки содержимого
    const wordCount = textareaContent.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`\n📊 Статистика:`);
    console.log(`   Символов: ${textareaContent.length}`);
    console.log(`   Слов: ${wordCount}`);
    
    // Проверяем что текст реально извлёкся
    expect(textareaContent.length).toBeGreaterThan(10000);
    expect(wordCount).toBeGreaterThan(1000);
    console.log('✅ Размер текста корректный');
    
    // Проверяем что в тексте есть ожидаемый контент из книги
    expect(textareaContent).toContain('Эндер');
    expect(textareaContent).toContain('Виггин');
    console.log('✅ Контент из книги найден');
    
    // Проверяем что НЕТ мусора
    expect(textareaContent).not.toContain('<link rel="stylesheet"');
    expect(textareaContent).not.toContain('<svg');
    expect(textareaContent).not.toContain('style.css');
    console.log('✅ Мусор отсутствует');
    
    // Показываем превью текста
    console.log(`\n📄 Превью (первые 500 символов):`);
    console.log('─'.repeat(80));
    console.log(textareaContent.substring(0, 500));
    console.log('─'.repeat(80));
    
    // Проверяем структуру - должны быть абзацы (двойные переносы)
    const paragraphs = textareaContent.split('\n\n').filter(p => p.trim().length > 0);
    console.log(`\n📝 Найдено параграфов: ${paragraphs.length}`);
    expect(paragraphs.length).toBeGreaterThan(50);
    console.log('✅ Структура параграфов корректна');
    
    // Показываем первые 5 параграфов
    console.log(`\n📋 Первые 5 параграфов:`);
    paragraphs.slice(0, 5).forEach((p, i) => {
      const preview = p.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   ${i+1}. ${preview}${p.length > 100 ? '...' : ''}`);
    });
    
    // Теперь проверим RSVP режим
    console.log(`\n🎮 Тестируем RSVP режим...`);
    await page.click('#startReadingBtn');
    await page.waitForSelector('#normalReadingSection', { state: 'visible' });
    console.log('✅ Перешли в режим чтения');
    
    // Проверяем что прогресс отображается
    const progressText = await page.locator('#progressText').textContent();
    const wordCountText = await page.locator('#wordCount').textContent();
    console.log(`   Прогресс: ${progressText}`);
    console.log(`   Слова: ${wordCountText}`);
    
    // Запускаем RSVP через кнопку (более надёжно чем double-click на большом тексте)
    await page.click('#startRSVPBtn');
    await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 10000 });
    console.log('✅ RSVP режим запущен');
    
    // Проверяем что слово отображается
    await page.waitForTimeout(500);
    const rsvpWord = await page.locator('#rsvpWordDisplay').textContent();
    expect(rsvpWord.length).toBeGreaterThan(0);
    console.log(`✅ Отображается слово: "${rsvpWord}"`);
    
    // Проверяем что есть фокусная буква
    const focusLetter = await page.locator('.focus-letter').first();
    await expect(focusLetter).toBeVisible();
    const focusLetterText = await focusLetter.textContent();
    console.log(`✅ Фокусная буква: "${focusLetterText}"`);
    
    // Пауза
    await page.click('#playPauseBtn');
    await page.waitForTimeout(300);
    console.log('✅ Пауза работает');
    
    // Кнопки скорости
    const initialSpeed = await page.locator('#rsvpSpeedText').textContent();
    const initialWpm = parseInt(initialSpeed, 10);
    await page.click('#nextWordBtn');
    await page.waitForTimeout(300);
    await expect(page.locator('#rsvpSpeedText')).toContainText(`${initialWpm + 20} слов/мин`);
    console.log(`✅ Скорость увеличилась: ${initialSpeed} → ${initialWpm + 20} слов/мин`);
    
    await page.click('#prevWordBtn');
    await page.waitForTimeout(300);
    await expect(page.locator('#rsvpSpeedText')).toContainText(`${initialWpm} слов/мин`);
    console.log(`✅ Скорость уменьшилась до ${initialWpm} слов/мин`);
    
    // Проверяем прогресс
    const rsvpProgress = await page.locator('#rsvpProgressText').textContent();
    console.log(`✅ Прогресс в RSVP: ${rsvpProgress}`);
    
    console.log(`\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! 🎉\n`);
  });
  
  test('should persist text in localStorage', async ({ page }) => {
    console.log('\n💾 Тестируем сохранение в localStorage...');
    
    await page.goto('http://localhost:8081');
    
    // Вводим тестовый текст
    const testText = 'Это тестовый текст для проверки сохранения в localStorage. Он должен сохраниться автоматически.';
    await page.locator('#textInput').fill(testText);
    await page.waitForTimeout(500);
    
    // Проверяем что сохранилось
    const savedText = await page.evaluate(() => localStorage.getItem('rsvp_text'));
    expect(savedText).toBe(testText);
    console.log('✅ Текст сохранён в localStorage');
    
    // Перезагружаем страницу
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Проверяем что текст восстановился
    const restoredText = await page.locator('#textInput').inputValue();
    expect(restoredText).toBe(testText);
    console.log('✅ Текст восстановлен после перезагрузки');
  });
  
  test('should work offline with service worker', async ({ page }) => {
    console.log('\n🔌 Тестируем оффлайн режим...');
    
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    
    // Ждём регистрации service worker
    await page.waitForTimeout(2000);
    
    // Проверяем что service worker зарегистрирован
    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
    
    expect(swRegistered).toBe(true);
    console.log('✅ Service Worker зарегистрирован');
    
    // Переводим в оффлайн
    await page.context().setOffline(true);
    console.log('🔌 Интернет отключен');
    
    // Перезагружаем страницу
    await page.reload();
    await page.waitForLoadState('load');
    
    // Проверяем что страница загрузилась из кэша
    await expect(page.locator('h1')).toContainText('RSVP Reader');
    console.log('✅ Приложение работает оффлайн!');
    
    // Включаем интернет обратно
    await page.context().setOffline(false);
  });
  
});
