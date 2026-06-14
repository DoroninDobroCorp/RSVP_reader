const { test, expect } = require('@playwright/test');

test.describe('Comprehensive RSVP Reader Functionality Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
    });

    test('Basic app initialization and navigation', async ({ page }) => {
        console.log('\n🚀 Testing basic app initialization...');
        
        // Check initial state
        const textInputVisible = await page.locator('#textInputSection').isVisible();
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        
        console.log(`   Input section: ${textInputVisible ? '✅' : '❌'}`);
        console.log(`   Normal section: ${normalVisible ? '✅' : '❌'}`);
        console.log(`   RSVP section: ${rsvpVisible ? '❌' : '✅'}`);
        
        expect(textInputVisible).toBe(true);
        expect(normalVisible).toBe(false);
        expect(rsvpVisible).toBe(false);
    });

    test('Text input and basic reading flow', async ({ page }) => {
        console.log('\n📖 Testing basic reading flow...');
        
        const testText = 'This is a test. Multiple sentences. Various punctuation marks!';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        
        // Check normal mode
        await page.waitForSelector('#normalReadingSection', { state: 'visible' });
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        const displayedText = await page.locator('#normalTextDisplay').textContent();
        
        console.log(`   Normal mode active: ${normalVisible ? '✅' : '❌'}`);
        console.log(`   Text displayed: ${displayedText.length > 0 ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(true);
        expect(displayedText).toContain('This');
        
        // Check progress
        const progressText = await page.locator('#progressText').textContent();
        const wordCount = await page.locator('#wordCount').textContent();
        
        console.log(`   Progress: ${progressText}`);
        console.log(`   Word count: ${wordCount}`);
        
        expect(progressText).toContain('%');
        expect(wordCount).toContain('/');
    });

    test('RSVP start/stop functionality', async ({ page }) => {
        console.log('\n⏯️  Testing RSVP start/stop...');
        
        const testText = 'First word. Second word. Third word. Fourth word. Fifth word.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Start RSVP with button
        await page.click('#startRSVPBtn');
        await page.waitForSelector('#rsvpReadingSection', { state: 'visible' });
        
        let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        let currentWord = await page.locator('#rsvpWordDisplay').textContent();
        
        console.log(`   RSVP started: ${rsvpVisible ? '✅' : '❌'}`);
        console.log(`   First word: "${currentWord}"`);
        
        expect(rsvpVisible).toBe(true);
        expect(currentWord.length).toBeGreaterThan(0);
        
        // Stop RSVP with button
        await page.click('#stopRSVPBtn');
        await page.waitForSelector('#normalReadingSection', { state: 'visible' });
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        
        console.log(`   Returned to normal: ${normalVisible ? '✅' : '❌'}`);
        console.log(`   RSVP hidden: ${!rsvpVisible ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(true);
        expect(rsvpVisible).toBe(false);
    });

    test('Double-click functionality (desktop)', async ({ page }) => {
        console.log('\n🖱️  Testing double-click functionality...');
        
        const testText = 'Desktop double-click test. Mouse interaction verification.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Double-click to start RSVP
        await page.dblclick('#normalTextDisplay');
        await page.waitForTimeout(500);
        
        let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   Double-click start: ${rsvpVisible ? '✅' : '❌'}`);
        
        expect(rsvpVisible).toBe(true);
        
        // Double-click to stop RSVP
        await page.dblclick('#rsvpWordDisplay');
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        
        console.log(`   Double-click stop: ${normalVisible && !rsvpVisible ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(true);
        expect(rsvpVisible).toBe(false);
    });

    test('Double-tap functionality (mobile)', async ({ page }) => {
        console.log('\n📱 Testing double-tap functionality...');
        
        const testText = 'Mobile double-tap test. Touch interaction verification.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Double-tap to start RSVP
        await page.locator('#normalTextDisplay').dispatchEvent('touchend');
        await page.waitForTimeout(200);
        await page.locator('#normalTextDisplay').dispatchEvent('touchend');
        await page.waitForTimeout(500);
        
        let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   Double-tap start: ${rsvpVisible ? '✅' : '❌'}`);
        
        expect(rsvpVisible).toBe(true);
        
        // Double-tap to stop RSVP
        await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
        await page.waitForTimeout(200);
        await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        
        console.log(`   Double-tap stop: ${normalVisible && !rsvpVisible ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(true);
        expect(rsvpVisible).toBe(false);
    });

    test('Button protection from double-tap/click', async ({ page }) => {
        console.log('\n🚫 Testing button protection...');
        
        const testText = 'Button protection test. Control buttons should not trigger start/stop.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        // Double-click on control buttons - should NOT stop RSVP
        const buttons = ['#playPauseBtn', '#prevWordBtn', '#nextWordBtn'];
        
        for (const buttonSelector of buttons) {
            await page.dblclick(buttonSelector);
            await page.waitForTimeout(300);
            
            const rsvpStillVisible = await page.locator('#rsvpReadingSection').isVisible();
            
            console.log(`   ${buttonSelector}: ${rsvpStillVisible ? '✅ PROTECTED' : '❌ BUG'}`);
            expect(rsvpStillVisible).toBe(true);
        }
        
        // Double-tap on control buttons - should NOT stop RSVP
        for (const buttonSelector of buttons) {
            await page.locator(buttonSelector).dispatchEvent('touchend');
            await page.waitForTimeout(200);
            await page.locator(buttonSelector).dispatchEvent('touchend');
            await page.waitForTimeout(300);
            
            const rsvpStillVisible = await page.locator('#rsvpReadingSection').isVisible();
            const preserved = rsvpStillVisible;
            console.log(`   ${buttonSelector} touch: ${preserved ? '✅ PROTECTED' : '❌ BUG'}`);
            expect(rsvpStillVisible).toBe(true);
        }
        
        // Test that non-control RSVP content still works for stopping
        await page.dblclick('#rsvpWordDisplay');
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        console.log(`   Word-area stop still works: ${normalVisible ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(true);
    });

    test('RSVP pauses at end of text', async ({ page }) => {
        console.log('\n🏁 Testing RSVP end behavior...');
        
        const testText = 'Short text. Just three words.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        console.log('   Waiting for text to complete...');
        
        // Wait for text to complete (should pause at end)
        await page.waitForTimeout(4000);
        
        const currentWord = await page.locator('#rsvpWordDisplay').textContent();
        const playPauseBtn = await page.locator('#playPauseBtn').textContent();
        const progress = await page.locator('#rsvpProgressText').textContent();
        
        console.log(`   Final word: "${currentWord}"`);
        console.log(`   Play/pause button: ${playPauseBtn}`);
        console.log(`   Progress: ${progress}`);
        
        expect(playPauseBtn).toContain('▶️'); // Paused state shows the play icon
        expect(progress).toContain('100%'); // Should be at 100%
    });

    test('Start/stop performance', async ({ page }) => {
        console.log('\n⚡ Testing start/stop performance...');
        
        const testText = 'Performance test. Speed measurement. Quick response check.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        const times = [];
        
        // Test multiple start/stop cycles
        for (let i = 0; i < 3; i++) {
            console.log(`   Cycle ${i + 1}/3...`);
            
            // Start
            const startStart = Date.now();
            await page.dblclick('#normalTextDisplay');
            await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 2000 });
            const startEnd = Date.now();
            
            await page.waitForTimeout(200);
            
            // Stop
            const stopStart = Date.now();
            await page.dblclick('#rsvpWordDisplay');
            await page.waitForSelector('#normalReadingSection', { state: 'visible', timeout: 2000 });
            const stopEnd = Date.now();
            
            const startTime = startEnd - startStart;
            const stopTime = stopEnd - stopStart;
            const totalTime = startTime + stopTime;
            
            times.push(totalTime);
            console.log(`     Start: ${startTime}ms | Stop: ${stopTime}ms | Total: ${totalTime}ms`);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`   Average cycle time: ${avgTime.toFixed(0)}ms`);
        
        expect(avgTime).toBeLessThan(1000); // Should complete cycle in under 1 second
    });

    test('Keyboard controls and spacebar toggle', async ({ page }) => {
        console.log('\n⌨️  Testing keyboard controls...');
        
        const testText = 'Keyboard controls test. Spacebar functionality verification.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Spacebar to start RSVP
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        
        let rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   Spacebar start: ${rsvpVisible ? '✅' : '❌'}`);
        
        expect(rsvpVisible).toBe(true);
        
        // Spacebar pauses RSVP
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        
        let normalVisible = await page.locator('#normalReadingSection').isVisible();
        rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        let playPauseText = await page.locator('#playPauseBtn').textContent();
        
        console.log(`   Spacebar pause: ${rsvpVisible && playPauseText.includes('▶️') ? '✅' : '❌'}`);
        
        expect(normalVisible).toBe(false);
        expect(rsvpVisible).toBe(true);
        expect(playPauseText).toContain('▶️');

        // Spacebar resumes RSVP
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        playPauseText = await page.locator('#playPauseBtn').textContent();
        expect(playPauseText).toContain('⏸️');

        // Escape returns to normal mode
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        normalVisible = await page.locator('#normalReadingSection').isVisible();
        rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        expect(normalVisible).toBe(true);
        expect(rsvpVisible).toBe(false);
    });

    test('Bottom tap zone pauses and resumes RSVP', async ({ page }) => {
        console.log('\n👇 Testing bottom tap zone...');

        const testText = 'Bottom zone test. Pause and resume from a stable lower area.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForSelector('#rsvpReadingSection', { state: 'visible' });

        await expect(page.locator('#rsvpBottomTapZone')).toBeVisible();
        await expect(page.locator('#playPauseBtn')).toContainText('⏸️');

        await page.click('#rsvpBottomTapZone');
        await expect(page.locator('#rsvpReadingSection')).toBeVisible();
        await expect(page.locator('#playPauseBtn')).toContainText('▶️');
        await expect(page.locator('#rsvpBottomTapLabel')).toContainText('Продолжить');

        await page.click('#rsvpBottomTapZone');
        await expect(page.locator('#rsvpReadingSection')).toBeVisible();
        await expect(page.locator('#playPauseBtn')).toContainText('⏸️');
        await expect(page.locator('#rsvpBottomTapLabel')).toContainText('Пауза');
    });

    test('Settings modal and configuration', async ({ page }) => {
        console.log('\n⚙️  Testing settings functionality...');
        
        // Open settings
        await page.click('#settingsBtn');
        await page.waitForSelector('#settingsModal', { state: 'visible' });
        
        const modalVisible = await page.locator('#settingsModal').isVisible();
        console.log(`   Settings modal opens: ${modalVisible ? '✅' : '❌'}`);
        
        expect(modalVisible).toBe(true);
        
        // Check default values are loaded
        const wpmValue = await page.locator('#wpmInput').inputValue();
        const fontSizeValue = await page.locator('#fontSizeInput').inputValue();
        
        console.log(`   WPM loaded: ${wpmValue}`);
        console.log(`   Font size loaded: ${fontSizeValue}`);
        
        expect(wpmValue).toBe('300');
        expect(fontSizeValue).toBe('60');
        
        // Change settings
        await page.fill('#wpmInput', '400');
        await page.fill('#fontSizeInput', '48');
        await page.click('#closeSettingsBtn');
        
        await page.waitForTimeout(500); // Wait for settings to save
        
        // Reopen to verify persistence
        await page.click('#settingsBtn');
        await page.waitForSelector('#settingsModal', { state: 'visible' });
        
        const newWpmValue = await page.locator('#wpmInput').inputValue();
        const newFontSizeValue = await page.locator('#fontSizeInput').inputValue();
        
        console.log(`   WPM persisted: ${newWpmValue === '400' ? '✅' : '❌'}`);
        console.log(`   Font size persisted: ${newFontSizeValue === '48' ? '✅' : '❌'}`);
        
        expect(newWpmValue).toBe('400');
        expect(newFontSizeValue).toBe('48');
        
        // Close settings
        await page.click('#closeSettingsBtn');
        await page.waitForSelector('#settingsModal', { state: 'hidden' });
        
        const modalHidden = !(await page.locator('#settingsModal').isVisible());
        console.log(`   Settings modal closes: ${modalHidden ? '✅' : '❌'}`);
        
        expect(modalHidden).toBe(true);
    });

    test('Search functionality', async ({ page }) => {
        console.log('\n🔍 Testing search functionality...');
        
        const testText = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Search for a word
        await page.fill('#searchInput', 'sentence');
        await page.waitForTimeout(300);
        
        const searchResults = await page.locator('#searchResults').textContent();
        console.log(`   Search results: ${searchResults}`);
        
        expect(searchResults).toContain('/');
        
        // Navigation buttons should be enabled
        const prevEnabled = !(await page.locator('#searchPrevBtn').isDisabled());
        const nextEnabled = !(await page.locator('#searchNextBtn').isDisabled());
        
        console.log(`   Previous button enabled: ${prevEnabled ? '✅' : '❌'}`);
        console.log(`   Next button enabled: ${nextEnabled ? '✅' : '❌'}`);
        
        expect(prevEnabled).toBe(true);
        expect(nextEnabled).toBe(true);
        
        // Test navigation
        await page.click('#searchNextBtn');
        await page.waitForTimeout(200);
        
        const newResults = await page.locator('#searchResults').textContent();
        console.log(`   After next: ${newResults}`);
        
        expect(newResults).not.toBe(searchResults); // Should change
    });

    async function checkResponsiveLayout(page, viewport) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(300);
        
        // Test that all main elements are still visible and functional
        const textInputVisible = await page.locator('#textInputSection').isVisible();
        
        // Add basic text
        await page.locator('#textInput').fill('Responsive test. Mobile desktop compatibility.');
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        
        // Test double-tap/click
        await page.dblclick('#normalTextDisplay');
        await page.waitForTimeout(500);
        
        const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        
        return {
            textInputVisible,
            normalVisible,
            rsvpVisible,
            functional: textInputVisible && normalVisible && rsvpVisible
        };
    }

    test('Responsive design across viewports', async ({ page }) => {
        console.log('\n📱 Testing responsive design...');
        
        const viewports = [
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1920, height: 1080 }
        ];
        
        for (const viewport of viewports) {
            console.log(`   Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
            
            await page.goto('http://localhost:8081');
            await page.waitForLoadState('networkidle');
            
            const result = await checkResponsiveLayout(page, viewport);
            console.log(`     Functional: ${result.functional ? '✅' : '❌'}`);
            
            expect(result.functional).toBe(true);
        }
    });
});
