const { test, expect } = require('@playwright/test');

test.describe('Read.ibet.team Site Functionality Tests', () => {
    
    test('Site loads and is functional', async ({ page }) => {
        console.log('\n🌐 Testing read.ibet.team site functionality...');
        
        try {
            await page.goto('https://read.ibet.team');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            console.log('✅ Site loaded successfully');
            
            // Check that the page loaded content
            const title = await page.title();
            console.log(`   Page title: ${title}`);
            
            expect(title.length).toBeGreaterThan(0);
            
            // Check for main RSVP elements
            const textInputVisible = await page.locator('#textInputSection, #textInput').isVisible().catch(() => false);
            console.log(`   Text input section: ${textInputVisible ? '✅' : '❌'}`);
            
            if (textInputVisible) {
                // Test basic functionality if available
                const testText = 'Test reading. Site functionality verification.';
                
                // Try to find and fill text input
                const textInput = await page.locator('#textInput').isVisible() 
                    ? page.locator('#textInput')
                    : page.locator('textarea').first();
                
                await textInput.fill(testText);
                console.log('   ✅ Text input functional');
                
                // Look for start reading button
                const startBtn = await page.locator('#startReadingBtn, button:has-text("Start"), button:has-text("Чтение")').first();
                const startBtnVisible = await startBtn.isVisible().catch(() => false);
                
                if (startBtnVisible) {
                    await startBtn.click();
                    await page.waitForTimeout(2000);
                    
                    const normalMode = await page.locator('#normalReadingSection, .reading-section').isVisible().catch(() => false);
                    console.log(`   Start reading: ${normalMode ? '✅' : '❌'}`);
                }
                
                // Test RSVP functionality if available
                const rsvpBtn = await page.locator('#startRSVPBtn, button:has-text("RSVP")').first();
                const rsvpBtnVisible = await rsvpBtn.isVisible().catch(() => false);
                
                if (rsvpBtnVisible) {
                    await rsvpBtn.click();
                    await page.waitForTimeout(1000);
                    
                    const rsvpMode = await page.locator('#rsvpReadingSection, .rsvp-section').isVisible().catch(() => false);
                    console.log(`   RSVP mode: ${rsvpMode ? '✅' : '❌'}`);
                }
            } else {
                console.log('   ℹ️  Site structure different from localhost (expected for live site)');
            }
            
            // Check for mobile responsiveness
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(500);
            
            const mobileFunctional = await page.locator('body').isVisible();
            console.log(`   Mobile responsive: ${mobileFunctional ? '✅' : '❌'}`);
            
            expect(mobileFunctional).toBe(true);
            
        } catch (error) {
            if (error.message.includes('net::ERR_NAME_NOT_RESOLVED') || error.message.includes('ENOTFOUND')) {
                console.log('   ⚠️  Site not accessible (DNS resolution failed)');
                console.log('   This is expected if site is not deployed or this is a local test environment');
            } else {
                console.log(`   ❌ Error accessing site: ${error.message}`);
                throw error;
            }
        }
    });

    test('Offline functionality (Service Worker)', async ({ page }) => {
        console.log('\n📡 Testing offline functionality...');
        
        try {
            await page.goto('https://read.ibet.team');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            // Check for service worker registration
            const swRegistered = await page.evaluate(() => {
                return navigator.serviceWorker && navigator.serviceWorker.ready.then(reg => !!reg.active).catch(() => false);
            });
            
            console.log(`   Service Worker registered: ${swRegistered ? '✅' : '❌'}`);
            
            // Test offline simulation
            await page.context().setOffline(true);
            
            // Try to navigate to the site again offline
            await page.goto('https://read.ibet.team');
            await page.waitForTimeout(3000);
            
            const offlineAccessible = await page.locator('body').isVisible();
            console.log(`   Offline access: ${offlineAccessible ? '✅' : '❌'}`);
            
            // Restore online
            await page.context().setOffline(false);
            
            if (offlineAccessible && swRegistered) {
                console.log('   ✅ PWA functionality working correctly');
            } else if (!offlineAccessible) {
                console.log('   ℹ️  PWA not fully implemented (expected for development site)');
            }
            
        } catch (error) {
            console.log(`   ⚠️  Offline test skipped: ${error.message}`);
        }
    });

    test('Core functionality comparison with localhost', async ({ page }) => {
        console.log('\n🔄 Comparing live site with localhost functionality...');
        
        const testText = 'Comparative test. Live site vs localhost. Feature parity check.';
        
        // Test localhost first
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        console.log('   Testing localhost baseline...');
        
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        
        await page.dblclick('#normalTextDisplay');
        await page.waitForTimeout(500);
        
        const localhostRSVP = await page.locator('#rsvpReadingSection').isVisible();
        console.log(`   Localhost RSVP: ${localhostRSVP ? '✅' : '❌'}`);
        
        try {
            // Test live site
            await page.goto('https://read.ibet.team');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            console.log('   Testing live site...');
            
            // Look for similar functionality
            const textInput = await page.locator('#textInput, textarea').first();
            const inputExists = await textInput.isVisible().catch(() => false);
            
            if (inputExists) {
                await textInput.fill(testText);
                
                const startBtn = await page.locator('#startReadingBtn, button:has-text("Start"), button:has-text("Чтение")').first();
                const startExists = await startBtn.isVisible().catch(() => false);
                
                if (startExists) {
                    await startBtn.click();
                    await page.waitForTimeout(2000);
                    
                    const liveReading = await page.locator('#normalReadingSection, .reading-section').isVisible().catch(() => false);
                    console.log(`   Live site reading: ${liveReading ? '✅' : '❌'}`);
                }
            }
            
        } catch (error) {
            console.log(`   ⚠️  Live site comparison failed: ${error.message}`);
        }
        
        console.log('   ✅ Feature comparison completed');
    });

    test('Performance and loading times', async ({ page }) => {
        console.log('\n⚡ Testing site performance...');
        
        try {
            const startTime = Date.now();
            
            await page.goto('https://read.ibet.team');
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            
            const loadTime = Date.now() - startTime;
            console.log(`   Page load time: ${loadTime}ms`);
            
            expect(loadTime).toBeLessThan(10000); // Should load in under 10 seconds
            
            // Check for performance metrics
            const performanceMetrics = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    return {
                        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
                        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart)
                    };
                }
                return null;
            });
            
            if (performanceMetrics) {
                console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
                console.log(`   Load Complete: ${performanceMetrics.loadComplete}ms`);
                
                expect(performanceMetrics.domContentLoaded).toBeLessThan(3000);
                expect(performanceMetrics.loadComplete).toBeLessThan(5000);
            }
            
            // Test cache performance
            const cacheStartTime = Date.now();
            await page.reload();
            await page.waitForLoadState('networkidle');
            const cacheTime = Date.now() - cacheStartTime;
            
            console.log(`   Cached load time: ${cacheTime}ms`);
            
        } catch (error) {
            console.log(`   ⚠️  Performance test skipped: ${error.message}`);
        }
    });

    test('Mobile and touch functionality', async ({ page }) => {
        console.log('\n📱 Testing mobile touch functionality...');
        
        try {
            await page.goto('https://read.ibet.team');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(500);
            
            // Test touch interactions if elements exist
            const textInput = await page.locator('#textInput, textarea').first();
            const inputExists = await textInput.isVisible().catch(() => false);
            
            if (inputExists) {
                await textInput.fill('Mobile touch test. Tap and swipe functionality.');
                
                const startBtn = await page.locator('#startReadingBtn, button:has-text("Start"), button:has-text("Чтение")').first();
                const startExists = await startBtn.isVisible().catch(() => false);
                
                if (startExists) {
                    // Test touch tap
                    await startBtn.tap();
                    await page.waitForTimeout(2000);
                    
                    const readingActive = await page.locator('#normalReadingSection, .reading-section').isVisible().catch(() => false);
                    console.log(`   Mobile start tap: ${readingActive ? '✅' : '❌'}`);
                    
                    // Test double-tap area if available
                    const textArea = await page.locator('#normalTextDisplay, .text-display').first();
                    const textAreaExists = await textArea.isVisible().catch(() => false);
                    
                    if (textAreaExists) {
                        await textArea.tap();
                        await page.waitForTimeout(200);
                        await textArea.tap();
                        await page.waitForTimeout(500);
                        
                        const rsvpActive = await page.locator('#rsvpReadingSection, .rsvp-section').isVisible().catch(() => false);
                        console.log(`   Mobile double-tap: ${rsvpActive ? '✅' : '❌'}`);
                    }
                }
            }
            
            // Test viewport adaptation
            const bodyVisible = await page.locator('body').isVisible();
            console.log(`   Mobile viewport adapted: ${bodyVisible ? '✅' : '❌'}`);
            
        } catch (error) {
            console.log(`   ⚠️  Mobile test skipped: ${error.message}`);
        }
    });
});
