const { test, expect } = require('@playwright/test');

test('Проверка работы read.ibet.team', async ({ page }) => {
    console.log('🔍 Открываю https://read.ibet.team...');
    
    // Переходим на сайт
    const response = await page.goto('https://read.ibet.team', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });
    
    console.log(`📊 Статус ответа: ${response.status()}`);
    console.log(`📊 URL: ${response.url()}`);
    
    // Проверяем статус
    expect(response.status()).toBe(200);
    
    // Делаем скриншот
    await page.screenshot({ path: '/tmp/read-ibet-team.png', fullPage: true });
    console.log('📸 Скриншот сохранен: /tmp/read-ibet-team.png');
    
    // Проверяем заголовок
    const title = await page.title();
    console.log(`📄 Заголовок страницы: ${title}`);
    
    // Проверяем что есть основные элементы
    const h1 = await page.$('h1');
    if (h1) {
        const h1Text = await h1.textContent();
        console.log(`✅ Найден H1: ${h1Text}`);
    }
    
    // Проверяем есть ли кнопка библиотеки
    const libraryBtn = await page.$('#libraryBtn');
    if (libraryBtn) {
        const btnText = await libraryBtn.textContent();
        console.log(`✅ Найдена кнопка библиотеки: ${btnText}`);
    }
    
    // Проверяем консоль на ошибки
    const consoleMessages = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleMessages.push(`❌ Console error: ${msg.text()}`);
        }
    });
    
    // Проверяем сетевые ошибки
    page.on('requestfailed', request => {
        console.log(`❌ Network failed: ${request.url()} - ${request.failure().errorText}`);
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
        console.log('\n🔴 Ошибки в консоли:');
        consoleMessages.forEach(msg => console.log(msg));
    } else {
        console.log('\n✅ Ошибок в консоли нет!');
    }
    
    console.log('\n✅ Сайт загружается успешно!');
});
