const { test, expect } = require('@playwright/test');

test.describe('Start/Stop Performance Tests', () => {
    
    test('Measure start performance speed', async ({ page }) => {
        console.log('\n⚡ Measuring RSVP start performance...');
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Performance test. Speed measurement. Start stop timing.';
        await page.locator('#textInput').fill(testText);
        if (await page.isVisible('#startReadingBtn')) { await page.click('#startReadingBtn'); }
        await page.waitForTimeout(500);
        
        // Measure double-click start time
        const startTime = Date.now();
        await page.dblclick('#normalTextDisplay');
        
        // Wait for RSVP to be visible
        await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 2000 });
        const endTime = Date.now();
        
        const startDuration = endTime - startTime;
        console.log(`   🖱️ Double-click start time: ${startDuration}ms`);
        
        if (startDuration < 300) {
            console.log('✅ EXCELLENT: Very fast start (<300ms)');
        } else if (startDuration < 500) {
            console.log('✅ GOOD: Acceptable start time (<500ms)');
        } else {
            console.log('⚠️  SLOW: Start time could be improved (>500ms)');
        }
        
        // Test touch start time
        await page.click('#stopRSVPBtn');
        await page.waitForTimeout(500);
        
        const touchStartTime = Date.now();
        await page.locator('#normalTextDisplay').dispatchEvent('touchend');
        await page.waitForTimeout(150);
        await page.locator('#normalTextDisplay').dispatchEvent('touchend');
        
        await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 2000 });
        const touchEndTime = Date.now();
        
        const touchStartDuration = touchEndTime - touchStartTime;
        console.log(`   📱 Touch double-tap start time: ${touchStartDuration}ms`);
        
        if (touchStartDuration < 400) {
            console.log('✅ EXCELLENT: Fast touch start (<400ms)');
        } else if (touchStartDuration < 600) {
            console.log('✅ GOOD: Acceptable touch start (<600ms)');
        } else {
            console.log('⚠️  SLOW: Touch start could be improved (>600ms)');
        }
    });
    
    test('Measure stop performance speed', async ({ page }) => {
        console.log('\n🛑 Measuring RSVP stop performance...');
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Stop test. Performance measure. Return to normal.';
        await page.locator('#textInput').fill(testText);
        if (await page.isVisible('#startReadingBtn')) { await page.click('#startReadingBtn'); }
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        // Measure double-click stop time
        const startTime = Date.now();
        await page.dblclick('#rsvpWordDisplay');
        
        // Wait for normal mode to be visible
        await page.waitForSelector('#normalReadingSection', { state: 'visible', timeout: 2000 });
        const endTime = Date.now();
        
        const stopDuration = endTime - startTime;
        console.log(`   🖱️ Double-click stop time: ${stopDuration}ms`);
        
        if (stopDuration < 300) {
            console.log('✅ EXCELLENT: Very fast stop (<300ms)');
        } else if (stopDuration < 500) {
            console.log('✅ GOOD: Acceptable stop time (<500ms)');
        } else {
            console.log('⚠️  SLOW: Stop time could be improved (>500ms)');
        }
        
        // Test button stop time
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        const buttonStartTime = Date.now();
        await page.click('#stopRSVPBtn');
        
        await page.waitForSelector('#normalReadingSection', { state: 'visible', timeout: 2000 });
        const buttonEndTime = Date.now();
        
        const buttonStopDuration = buttonEndTime - buttonStartTime;
        console.log(`   🎮 Button stop time: ${buttonStopDuration}ms`);
        
        if (buttonStopDuration < 200) {
            console.log('✅ EXCELLENT: Very fast button stop (<200ms)');
        } else if (buttonStopDuration < 400) {
            console.log('✅ GOOD: Acceptable button stop (<400ms)');
        } else {
            console.log('⚠️  SLOW: Button stop could be improved (>400ms)');
        }
    });
    
    test('Test rapid start/stop cycles', async ({ page }) => {
        console.log('\n🔄 Testing rapid start/stop cycles...');
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Rapid cycles test. Start stop repeat. Performance check.';
        await page.locator('#textInput').fill(testText);
        if (await page.isVisible('#startReadingBtn')) { await page.click('#startReadingBtn'); }
        await page.waitForTimeout(500);
        
        const cycles = 5;
        const times = [];
        
        for (let i = 0; i < cycles; i++) {
            console.log(`   Cycle ${i + 1}/${cycles}`);
            
            // Start
            const startStart = Date.now();
            await page.dblclick('#normalTextDisplay');
            await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 2000 });
            const startEnd = Date.now();
            
            // Stop
            const stopStart = Date.now();
            await page.dblclick('#rsvpWordDisplay');
            await page.waitForSelector('#normalReadingSection', { state: 'visible', timeout: 2000 });
            const stopEnd = Date.now();
            
            const cycleTime = (startEnd - startStart) + (stopEnd - stopStart);
            times.push(cycleTime);
            
            console.log(`     Start: ${startEnd - startStart}ms | Stop: ${stopEnd - stopStart}ms | Total: ${cycleTime}ms`);
            
            await page.waitForTimeout(200); // Brief pause between cycles
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        console.log(`   📊 Performance Summary:`);
        console.log(`     Average cycle time: ${avgTime.toFixed(0)}ms`);
        console.log(`     Fastest cycle: ${minTime}ms`);
        console.log(`     Slowest cycle: ${maxTime}ms`);
        
        if (avgTime < 800) {
            console.log('✅ EXCELLENT: Very responsive start/stop');
        } else if (avgTime < 1200) {
            console.log('✅ GOOD: Acceptable responsiveness');
        } else {
            console.log('⚠️  NEEDS IMPROVEMENT: Start/stop could be faster');
        }
    });
    
    test('Test memory and performance during long sessions', async ({ page }) => {
        console.log('\n🧠 Testing performance during extended session...');
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Long text for extended testing
        const longText = 'Extended session test. '.repeat(100);
        await page.locator('#textInput').fill(longText);
        if (await page.isVisible('#startReadingBtn')) { await page.click('#startReadingBtn'); }
        await page.waitForTimeout(500);
        
        const sessionStart = Date.now();
        let isResponsive = true;
        
        // Simulate user interaction during long session
        for (let i = 0; i < 10; i++) {
            console.log(`   Session minute ${i + 1}/10...`);
            
            // Start RSVP
            const startStart = Date.now();
            await page.click('#startRSVPBtn');
            await page.waitForSelector('#rsvpReadingSection', { state: 'visible', timeout: 3000 });
            const startEnd = Date.now();
            
            // Let it run briefly
            await page.waitForTimeout(2000);
            
            // Stop RSVP
            const stopStart = Date.now();
            await page.click('#stopRSVPBtn');
            await page.waitForSelector('#normalReadingSection', { state: 'visible', timeout: 3000 });
            const stopEnd = Date.now();
            
            const cycleTime = (startEnd - startStart) + (stopEnd - stopStart);
            
            if (cycleTime > 2000) {
                isResponsive = false;
                console.log(`     ⚠️  Slow response detected: ${cycleTime}ms`);
            } else {
                console.log(`     ✅ Responsive: ${cycleTime}ms`);
            }
            
            // Add some navigation
            if (await page.isVisible('#startReadingBtn')) { await page.click('#startReadingBtn'); }
            await page.waitForTimeout(300);
            await page.dblclick('#normalTextDisplay');
            await page.waitForTimeout(300);
            await page.click('#stopRSVPBtn');
            await page.waitForTimeout(300);
        }
        
        const sessionEnd = Date.now();
        const sessionDuration = sessionEnd - sessionStart;
        
        console.log(`   📊 Extended Session Results:`);
        console.log(`     Total session time: ${(sessionDuration / 1000).toFixed(1)}s`);
        console.log(`     Overall performance: ${isResponsive ? '✅ CONSISTENT' : '⚠️  DEGRADED'}`);
        
        if (isResponsive && sessionDuration < 60000) {
            console.log('✅ EXCELLENT: Consistent performance throughout session');
        } else if (isResponsive) {
            console.log('✅ GOOD: Performance maintained but could be faster');
        } else {
            console.log('❌ POOR: Performance degraded during session');
        }
    });
});
