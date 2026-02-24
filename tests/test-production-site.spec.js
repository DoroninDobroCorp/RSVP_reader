const { test, expect } = require('@playwright/test');

test.describe('Production Site Tests', () => {
    
    test('Should load read.ibet.team without console errors', async ({ page }) => {
        console.log('\n🌐 Testing production site: https://read.ibet.team\n');
        
        const consoleErrors = [];
        const consoleWarnings = [];
        
        // Capture console messages
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                consoleErrors.push(text);
                console.log(`   ❌ Console Error: ${text}`);
            } else if (type === 'warning') {
                consoleWarnings.push(text);
            }
        });
        
        // Capture page errors
        page.on('pageerror', error => {
            consoleErrors.push(error.message);
            console.log(`   ❌ Page Error: ${error.message}`);
        });
        
        // Navigate to production site
        console.log('   Loading https://read.ibet.team...');
        const response = await page.goto('https://read.ibet.team', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        console.log(`   ✅ Page loaded with status: ${response.status()}`);
        
        // Verify page loaded successfully
        expect(response.status()).toBe(200);
        
        // Wait for app to initialize
        await page.waitForTimeout(2000);
        
        // Check for main elements
        const title = await page.title();
        console.log(`   📄 Page title: ${title}`);
        expect(title).toContain('RSVP');
        
        // Verify main sections exist
        const textInputSection = await page.locator('#textInputSection').isVisible();
        console.log(`   📝 Text input section visible: ${textInputSection}`);
        expect(textInputSection).toBe(true);
        
        // Check for service worker registration
        const swRegistered = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });
        console.log(`   🔧 Service Worker support: ${swRegistered}`);
        
        // Report console errors
        if (consoleErrors.length > 0) {
            console.log(`\n   ⚠️  Found ${consoleErrors.length} console errors:`);
            consoleErrors.forEach((error, i) => {
                console.log(`      ${i + 1}. ${error}`);
            });
        } else {
            console.log('   ✅ No console errors detected');
        }
        
        // Assert no console errors
        expect(consoleErrors.length).toBe(0);
        
        console.log('\n✅ Production site test completed successfully\n');
    });
    
    test('Should verify all critical UI elements are present', async ({ page }) => {
        console.log('\n🔍 Verifying UI elements on production site...\n');
        
        await page.goto('https://read.ibet.team', {
            waitUntil: 'networkidle'
        });
        
        // Check for all critical buttons and inputs
        const elements = [
            { selector: '#textInput', name: 'Text Input' },
            { selector: '#loadFileBtn', name: 'Load File Button' },
            { selector: '#startReadingBtn', name: 'Start Reading Button' },
            { selector: '#addToLibraryBtn', name: 'Add to Library Button' },
            { selector: '#libraryBtn', name: 'Library Button' },
            { selector: '#settingsBtn', name: 'Settings Button' }
        ];
        
        for (const element of elements) {
            const exists = await page.locator(element.selector).count() > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${element.name}`);
            expect(exists).toBe(true);
        }
        
        console.log('\n✅ All UI elements verified\n');
    });
    
    test('Should test basic RSVP flow without errors', async ({ page }) => {
        console.log('\n🎬 Testing basic RSVP flow on production...\n');
        
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.goto('https://read.ibet.team', {
            waitUntil: 'networkidle'
        });
        
        // Enter test text
        const testText = 'First word. Second word. Third word. Fourth word. Fifth word.';
        await page.locator('#textInput').fill(testText);
        console.log('   ✅ Test text entered');
        
        // Start reading
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        console.log(`   ✅ Normal reading mode: ${normalVisible}`);
        expect(normalVisible).toBe(true);
        
        // Start RSVP
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   ✅ RSVP mode: ${rsvpVisible}`);
        expect(rsvpVisible).toBe(true);
        
        // Verify word is displayed
        const wordDisplayed = await page.locator('#rsvpWordDisplay').textContent();
        console.log(`   ✅ Word displayed: "${wordDisplayed}"`);
        expect(wordDisplayed.length).toBeGreaterThan(0);
        
        // Stop RSVP
        await page.click('#stopRSVPBtn');
        await page.waitForTimeout(500);
        
        const backToNormal = await page.locator('#normalReadingSection').isVisible();
        console.log(`   ✅ Returned to normal mode: ${backToNormal}`);
        expect(backToNormal).toBe(true);
        
        // Check for errors
        expect(consoleErrors.length).toBe(0);
        
        console.log('\n✅ Basic RSVP flow completed successfully\n');
    });
});
