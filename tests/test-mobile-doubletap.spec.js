const { test, expect } = require('@playwright/test');

test.describe('Mobile Double-Tap Testing (iOS/Android Focus)', () => {
    
    test('iOS-style double-tap with varied timings', async ({ page }) => {
        console.log('\n🍎 Testing iOS-style double-tap...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        const testText = 'First word. Second word. Third word.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // iOS typically has slightly longer tap intervals (200-350ms)
        const timings = [150, 200, 250, 300, 350];
        
        for (const timing of timings) {
            console.log(`   Testing timing: ${timing}ms`);
            
            // Reset to normal mode first
            if (await page.locator('#rsvpReadingSection').isVisible()) {
                await page.click('#stopRSVPBtn');
                await page.waitForTimeout(300);
            }
            
            // Test double-tap with specific timing
            await page.locator('#normalTextDisplay').dispatchEvent('touchend');
            await page.waitForTimeout(timing);
            await page.locator('#normalTextDisplay').dispatchEvent('touchend');
            await page.waitForTimeout(500);
            
            const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
            console.log(`   Result (${timing}ms): ${rsvpVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
            
            if (rsvpVisible) {
                // Test stopping with same timing
                await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
                await page.waitForTimeout(timing);
                await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
                await page.waitForTimeout(500);
                
                const normalVisible = await page.locator('#normalReadingSection').isVisible();
                console.log(`   Stop result (${timing}ms): ${normalVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
            }
        }
    });
    
    test('Rapid sequential double-taps to test cooldown', async ({ page }) => {
        console.log('\n⚡ Testing rapid double-taps (cooldown test)...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Quick test. Rapid taps. Multiple attempts.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        // Perform 5 double-taps rapidly (within cooldown period)
        for (let i = 0; i < 5; i++) {
            console.log(`   Double-tap attempt ${i + 1}`);
            
            await page.locator('#normalTextDisplay').dispatchEvent('touchend');
            await page.waitForTimeout(100); // Fast tap within cooldown
            await page.locator('#normalTextDisplay').dispatchEvent('touchend');
            await page.waitForTimeout(150);
        }
        
        const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   Final result: ${rsvpVisible ? '✅ RSVP started (after cooldown)' : '❌ No response'}`);
        
        if (rsvpVisible) {
            // Now test rapid stop attempts
            for (let i = 0; i < 5; i++) {
                await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
                await page.waitForTimeout(100);
                await page.locator('#rsvpWordDisplay').dispatchEvent('touchend');
                await page.waitForTimeout(150);
            }
            
            const normalVisible = await page.locator('#normalReadingSection').isVisible();
            console.log(`   Stop result: ${normalVisible ? '✅ RSVP stopped (after cooldown)' : '❌ Still running'}`);
        }
    });
    
    test('Double-tap on different positions and elements', async ({ page }) => {
        console.log('\n🎯 Testing double-tap on various targets...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Position test. Different taps. Various elements.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        const targets = [
            { element: '#normalTextDisplay', name: 'text display' },
            { element: '#normalReadingSection', name: 'section (empty space)', x: 50, y: 50 },
            { element: '#normalReadingSection', name: 'section (different position)', x: 100, y: 100 }
        ];
        
        for (const target of targets) {
            console.log(`   Testing: ${target.name}`);
            
            // Reset if needed
            if (await page.locator('#rsvpReadingSection').isVisible()) {
                await page.click('#stopRSVPBtn');
                await page.waitForTimeout(300);
            }
            
            // Perform double-tap
            if (target.x && target.y) {
                await page.locator(target.element).dispatchEvent('touchend', { 
                    position: { x: target.x, y: target.y } 
                });
                await page.waitForTimeout(200);
                await page.locator(target.element).dispatchEvent('touchend', { 
                    position: { x: target.x, y: target.y } 
                });
            } else {
                await page.locator(target.element).dispatchEvent('touchend');
                await page.waitForTimeout(200);
                await page.locator(target.element).dispatchEvent('touchend');
            }
            
            await page.waitForTimeout(500);
            const rsvpVisible = await page.locator('#rsvpReadingSection').isVisible();
            console.log(`   ${target.name}: ${rsvpVisible ? '✅ WORKS' : '❌ FAILED'}`);
            
            if (rsvpVisible) {
                await page.click('#stopRSVPBtn');
                await page.waitForTimeout(300);
            }
        }
    });
    
    test('Double-tap should NOT trigger on buttons', async ({ page }) => {
        console.log('\n🚫 Testing button isolation (double-tap protection)...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        const testText = 'Button test. Control detection. Prevention mechanism.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        console.log('✅ RSVP started with button');
        
        const controlButtons = [
            { selector: '#playPauseBtn', name: 'play/pause' },
            { selector: '#prevWordBtn', name: 'previous' },
            { selector: '#nextWordBtn', name: 'next' }
        ];
        
        for (const button of controlButtons) {
            console.log(`   Testing double-tap on ${button.name} button`);
            
            // Double-tap on button
            await page.locator(button.selector).dispatchEvent('touchend');
            await page.waitForTimeout(200);
            await page.locator(button.selector).dispatchEvent('touchend');
            await page.waitForTimeout(500);
            
            const rsvpStillVisible = await page.locator('#rsvpReadingSection').isVisible();
            
            console.log(`   ${button.name}: ${rsvpStillVisible ? '✅ PROTECTED (RSVP stayed open)' : '❌ BUG (double-tap triggered)'}`);
            expect(rsvpStillVisible).toBe(true);
        }
        
        // Test that section still works for stopping
        console.log('   Testing section double-tap for stop (should work)');
        await page.locator('#rsvpReadingSection').dispatchEvent('touchend', { 
            position: { x: 50, y: 50 } 
        });
        await page.waitForTimeout(200);
        await page.locator('#rsvpReadingSection').dispatchEvent('touchend', { 
            position: { x: 50, y: 50 } 
        });
        await page.waitForTimeout(500);
        
        const normalVisible = await page.locator('#normalReadingSection').isVisible();
        console.log(`   Section stop: ${normalVisible ? '✅ WORKS' : '❌ FAILED'}`);
    });
});
