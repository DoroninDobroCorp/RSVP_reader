const { test, expect } = require('@playwright/test');

test.describe('Last Word Stopping Tests', () => {
    
    test('Should pause at last word of short text', async ({ page }) => {
        console.log('\n🏁 Testing pause at last word (short text)...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        // Very short text
        const testText = 'First. Second. Last.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        console.log('✅ RSVP started with 3 words');
        
        // Track word progression
        for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(800); // Wait for word changes
            const currentWord = await page.locator('#rsvpWordDisplay').textContent();
            const currentIndex = await page.locator('#rsvpWordCount').textContent();
            const isPlaying = await page.locator('#playPauseBtn').textContent();
            
            console.log(`   Word ${i + 1}: "${currentWord}" | ${currentIndex} | ${isPlaying}`);
            
            // Check if we're at the last word and playing
            if (currentWord.includes('Last.') || currentIndex.includes('3/3')) {
                await page.waitForTimeout(1500); // Extra time to see if it pauses
                const stillPlaying = await page.locator('#playPauseBtn').textContent();
                const finalWord = await page.locator('#rsvpWordDisplay').textContent();
                
                console.log(`   At last word - Status: ${stillPlaying} | "${finalWord}"`);
                
                if (stillPlaying === '⏸️' || stillPlaying.includes('⏸')) {
                    console.log('✅ CORRECT: Paused at last word');
                } else if (stillPlaying === '▶️') {
                    console.log('❌ BUG: Still playing at/after last word');
                }
                break;
            }
        }
    });
    
    test('Should pause at last word of longer text', async ({ page }) => {
        console.log('\n📚 Testing pause at last word (longer text)...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        // Longer text
        const testText = 'First sentence. Second sentence. Third sentence. Fourth sentence. Final sentence.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        console.log('✅ RSVP started with longer text');
        
        // Wait until we reach the end
        let lastWordSeen = false;
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(400);
            const currentWord = await page.locator('#rsvpWordDisplay').textContent();
            const progressText = await page.locator('#rsvpProgressText').textContent();
            const isPlaying = await page.locator('#playPauseBtn').textContent();
            
            if (currentWord.includes('Final.') || progressText.includes('100%')) {
                lastWordSeen = true;
                console.log(`   Reached final word: "${currentWord}" | ${progressText} | ${isPlaying}`);
                
                // Wait a bit longer to check pause behavior
                await page.waitForTimeout(1500);
                const stillPlaying = await page.locator('#playPauseBtn').textContent();
                const finalProgress = await page.locator('#rsvpProgressText').textContent();
                
                if (stillPlaying === '⏸️' || stillPlaying.includes('⏸')) {
                    console.log('✅ CORRECT: Paused at last word');
                } else if (stillPlaying === '▶️') {
                    console.log('❌ BUG: Still playing at last word');
                }
                
                console.log(`   Final status: ${stillPlaying} | ${finalProgress}`);
                break;
            }
            
            if (i === 14 && !lastWordSeen) {
                console.log('❌ BUG: Never reached last word in time');
            }
        }
    });
    
    test('Should handle single word text correctly', async ({ page }) => {
        console.log('\n🔤 Testing single word text...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        // Single word
        const testText = 'SingleWord.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        console.log('✅ RSVP started with single word');
        
        await page.waitForTimeout(1500);
        const currentWord = await page.locator('#rsvpWordDisplay').textContent();
        const isPlaying = await page.locator('#playPauseBtn').textContent();
        const progress = await page.locator('#rsvpWordCount').textContent();
        
        console.log(`   Single word result: "${currentWord}" | ${isPlaying} | ${progress}`);
        
        if (isPlaying === '⏸️' || isPlaying.includes('⏸')) {
            console.log('✅ CORRECT: Single word paused correctly');
        } else {
            console.log('❌ BUG: Single word handling issue');
        }
    });
    
    test('Should preserve progress after pausing at end', async ({ page }) => {
        console.log('\n💾 Testing progress preservation after end pause...');
        
        await page.goto('http://localhost:8081');
        await page.waitForLoadState('networkidle');
        
        const testText = 'One. Two. Three. Four. Five.';
        await page.locator('#textInput').fill(testText);
        await page.click('#startReadingBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        // Wait until it reaches the end and pauses
        await page.waitForTimeout(5000);
        
        const finalProgress = await page.locator('#rsvpProgressText').textContent();
        const finalWordCount = await page.locator('#rsvpWordCount').textContent();
        const finalWord = await page.locator('#rsvpWordDisplay').textContent();
        
        console.log(`   End state: ${finalProgress} | ${finalWordCount} | "${finalWord}"`);
        
        // Stop and restart to test bookmark
        await page.click('#stopRSVPBtn');
        await page.waitForTimeout(500);
        await page.click('#startRSVPBtn');
        await page.waitForTimeout(500);
        
        const restartWord = await page.locator('#rsvpWordDisplay').textContent();
        const restartProgress = await page.locator('#rsvpWordCount').textContent();
        
        console.log(`   Restart state: ${restartProgress} | "${restartWord}"`);
        
        if (finalWord === restartWord && finalProgress === restartProgress) {
            console.log('✅ CORRECT: Progress preserved after end');
        } else {
            console.log('❌ BUG: Progress not preserved correctly');
        }
    });
});
