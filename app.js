// RSVP Reader Application
class RSVPReader {
    constructor() {
        // State
        this.words = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.timer = null;
        this.mode = 'input'; // 'input', 'normal', 'rsvp'
        
        // Settings with defaults
        this.settings = {
            wpm: 300,
            commaPause: 1.5,
            periodPause: 2.5,
            semicolonPause: 2,
            focusLetterColor: '#ff6b6b',
            fontSize: 60
        };
        
        // Initialize
        this.initElements();
        this.loadSettings();
        this.loadText();
        this.attachEventListeners();
        this.registerServiceWorker();
    }
    
    initElements() {
        // Sections
        this.textInputSection = document.getElementById('textInputSection');
        this.normalReadingSection = document.getElementById('normalReadingSection');
        this.rsvpReadingSection = document.getElementById('rsvpReadingSection');
        
        // Input elements
        this.textInput = document.getElementById('textInput');
        this.fileInput = document.getElementById('fileInput');
        this.loadFileBtn = document.getElementById('loadFileBtn');
        this.startReadingBtn = document.getElementById('startReadingBtn');
        
        // Normal reading elements
        this.normalTextDisplay = document.getElementById('normalTextDisplay');
        this.backToInputBtn = document.getElementById('backToInputBtn');
        this.startRSVPBtn = document.getElementById('startRSVPBtn');
        this.progressText = document.getElementById('progressText');
        this.wordCount = document.getElementById('wordCount');
        
        // RSVP elements
        this.rsvpWordDisplay = document.getElementById('rsvpWordDisplay');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevWordBtn = document.getElementById('prevWordBtn');
        this.nextWordBtn = document.getElementById('nextWordBtn');
        this.stopRSVPBtn = document.getElementById('stopRSVPBtn');
        this.rsvpProgressBar = document.getElementById('rsvpProgressFill');
        this.rsvpProgressText = document.getElementById('rsvpProgressText');
        this.rsvpWordCount = document.getElementById('rsvpWordCount');
        
        // Settings modal
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.wpmInput = document.getElementById('wpmInput');
        this.commaPauseInput = document.getElementById('commaPause');
        this.periodPauseInput = document.getElementById('periodPause');
        this.semicolonPauseInput = document.getElementById('semicolonPause');
        this.focusLetterColorInput = document.getElementById('focusLetterColor');
        this.fontSizeInput = document.getElementById('fontSizeInput');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    }
    
    attachEventListeners() {
        // File loading
        this.loadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Navigation
        this.startReadingBtn.addEventListener('click', () => this.startNormalReading());
        this.backToInputBtn.addEventListener('click', () => this.backToInput());
        this.startRSVPBtn.addEventListener('click', () => this.startRSVP());
        
        // RSVP controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevWordBtn.addEventListener('click', () => this.previousWord());
        this.nextWordBtn.addEventListener('click', () => this.nextWord());
        this.stopRSVPBtn.addEventListener('click', () => this.stopRSVP());
        
        // Double click/tap to start/stop RSVP
        this.normalTextDisplay.addEventListener('dblclick', () => this.startRSVP());
        this.rsvpWordDisplay.addEventListener('dblclick', () => this.stopRSVP());
        
        // Mobile double-tap support
        this.setupDoubleTap(this.normalTextDisplay, () => this.startRSVP());
        this.setupDoubleTap(this.rsvpWordDisplay, () => this.stopRSVP());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });
        
        this.wpmInput.addEventListener('change', () => this.updateSettings());
        this.commaPauseInput.addEventListener('change', () => this.updateSettings());
        this.periodPauseInput.addEventListener('change', () => this.updateSettings());
        this.semicolonPauseInput.addEventListener('change', () => this.updateSettings());
        this.focusLetterColorInput.addEventListener('change', () => this.updateSettings());
        this.fontSizeInput.addEventListener('change', () => this.updateSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Auto-save text on input
        this.textInput.addEventListener('input', () => this.saveText());
    }
    
    setupDoubleTap(element, callback) {
        let lastTap = 0;
        let tapTimeout = null;
        
        element.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            clearTimeout(tapTimeout);
            
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                callback();
                lastTap = 0;
            } else {
                // Single tap - wait to see if another tap comes
                lastTap = currentTime;
            }
        });
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        
        // Check if it's an EPUB file
        if (fileName.endsWith('.epub')) {
            try {
                // Show loading indicator
                this.textInput.value = '⏳ Загрузка и обработка EPUB файла...\nЭто может занять несколько секунд.';
                
                // Parse EPUB
                const epubParser = new EPUBParser();
                const text = await epubParser.parse(file);
                
                // Update textarea with extracted text
                this.textInput.value = text;
                this.saveText();
                
                // Log success
                const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
                console.log(`✅ EPUB успешно загружен! ${wordCount} слов, ${text.length} символов`);
            } catch (error) {
                alert('Ошибка при загрузке EPUB: ' + error.message);
                this.textInput.value = '';
            }
        } else {
            // Handle regular text files
            const reader = new FileReader();
            reader.onload = (e) => {
                this.textInput.value = e.target.result;
                this.saveText();
            };
            reader.readAsText(file);
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    parseText(text) {
        // Split by whitespace and filter empty strings
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }
    
    startNormalReading() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert('Пожалуйста, введите текст для чтения');
            return;
        }
        
        this.words = this.parseText(text);
        this.currentIndex = parseInt(localStorage.getItem('rsvp_bookmark') || '0');
        
        // Ensure index is within bounds
        if (this.currentIndex >= this.words.length) {
            this.currentIndex = 0;
        }
        
        this.mode = 'normal';
        this.renderNormalText();
        this.showSection('normal');
    }
    
    renderNormalText() {
        this.normalTextDisplay.innerHTML = '';
        
        this.words.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.dataset.index = index;
            
            if (index === this.currentIndex) {
                span.classList.add('current-word');
                // Scroll to current word
                setTimeout(() => {
                    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            
            span.addEventListener('click', () => {
                this.currentIndex = index;
                this.renderNormalText();
                this.updateProgress();
            });
            
            this.normalTextDisplay.appendChild(span);
        });
        
        this.updateProgress();
    }
    
    startRSVP() {
        if (this.words.length === 0) return;
        
        this.mode = 'rsvp';
        this.showSection('rsvp');
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️';
        this.displayCurrentWord();
        this.scheduleNextWord();
    }
    
    stopRSVP() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.mode = 'normal';
        this.renderNormalText();
        this.showSection('normal');
        this.saveBookmark();
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️';
        this.scheduleNextWord();
    }
    
    pause() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️';
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    
    displayCurrentWord() {
        if (this.currentIndex >= this.words.length) {
            this.currentIndex = 0;
        }
        
        const word = this.words[this.currentIndex];
        const focusIndex = this.calculateFocusPoint(word);
        
        // Create word with focus letter
        let html = '';
        for (let i = 0; i < word.length; i++) {
            if (i === focusIndex) {
                html += `<span class="focus-letter">${word[i]}</span>`;
            } else {
                html += word[i];
            }
        }
        
        this.rsvpWordDisplay.innerHTML = html;
        this.rsvpWordDisplay.style.fontSize = `${this.settings.fontSize}px`;
        
        // Update focus letter color
        const focusLetter = this.rsvpWordDisplay.querySelector('.focus-letter');
        if (focusLetter) {
            focusLetter.style.color = this.settings.focusLetterColor;
        }
        
        this.updateProgress();
    }
    
    calculateFocusPoint(word) {
        // Optimal Reading Point (ORP) - usually around 33% into the word
        const length = word.length;
        if (length === 1) return 0;
        if (length === 2) return 0;
        if (length === 3) return 1;
        return Math.floor(length * 0.35);
    }
    
    scheduleNextWord() {
        if (!this.isPlaying) return;
        
        const word = this.words[this.currentIndex];
        const baseDelay = 60000 / this.settings.wpm; // milliseconds per word
        let delay = baseDelay;
        
        // Check for punctuation and add pauses
        const lastChar = word[word.length - 1];
        if (lastChar === ',') {
            delay *= this.settings.commaPause;
        } else if (lastChar === '.' || lastChar === '!') {
            delay *= this.settings.periodPause;
        } else if ([';', ':', '?', '…'].includes(lastChar)) {
            delay *= this.settings.semicolonPause;
        }
        
        this.timer = setTimeout(() => {
            this.currentIndex++;
            
            if (this.currentIndex >= this.words.length) {
                // Reached end
                this.pause();
                this.currentIndex = this.words.length - 1;
                this.updateProgress();
                this.saveBookmark();
                return;
            }
            
            this.displayCurrentWord();
            this.scheduleNextWord();
        }, delay);
    }
    
    previousWord() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayCurrentWord();
        }
    }
    
    nextWord() {
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.displayCurrentWord();
        }
    }
    
    updateProgress() {
        const percentage = this.words.length > 0 
            ? Math.round((this.currentIndex / this.words.length) * 100) 
            : 0;
        
        const wordCountText = `${this.currentIndex + 1} / ${this.words.length}`;
        const percentageText = `${percentage}%`;
        
        // Calculate time remaining
        const wordsRemaining = this.words.length - this.currentIndex - 1;
        const timeRemaining = this.calculateReadingTime(wordsRemaining);
        const totalTime = this.calculateReadingTime(this.words.length);
        
        // Update normal mode
        if (this.progressText) {
            this.progressText.textContent = `${percentageText} • ${timeRemaining}`;
        }
        if (this.wordCount) {
            this.wordCount.textContent = `${wordCountText} • ~${totalTime}`;
        }
        
        // Update RSVP mode
        if (this.rsvpProgressBar) {
            this.rsvpProgressBar.style.width = `${percentage}%`;
        }
        if (this.rsvpProgressText) {
            this.rsvpProgressText.textContent = `${percentageText} • ${timeRemaining}`;
        }
        if (this.rsvpWordCount) {
            this.rsvpWordCount.textContent = `${wordCountText} • ~${totalTime}`;
        }
        
        // Save bookmark
        if (this.mode === 'rsvp' || this.mode === 'normal') {
            this.saveBookmark();
        }
    }
    
    calculateReadingTime(wordCount) {
        if (wordCount <= 0) return '0 мин';
        
        const wpm = this.settings.wpm;
        const minutes = Math.ceil(wordCount / wpm);
        
        if (minutes < 60) {
            return `${minutes} мин`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) {
                return `${hours} ч`;
            }
            return `${hours} ч ${mins} мин`;
        }
    }
    
    handleKeyboard(event) {
        if (this.mode !== 'rsvp') return;
        
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousWord();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextWord();
                break;
            case 'Escape':
                event.preventDefault();
                this.stopRSVP();
                break;
        }
    }
    
    showSection(section) {
        this.textInputSection.style.display = 'none';
        this.normalReadingSection.style.display = 'none';
        this.rsvpReadingSection.style.display = 'none';
        
        switch(section) {
            case 'input':
                this.textInputSection.style.display = 'block';
                break;
            case 'normal':
                this.normalReadingSection.style.display = 'block';
                break;
            case 'rsvp':
                this.rsvpReadingSection.style.display = 'block';
                break;
        }
    }
    
    backToInput() {
        this.mode = 'input';
        this.showSection('input');
        this.saveBookmark();
    }
    
    // Settings Management
    openSettings() {
        this.settingsModal.classList.add('active');
        this.loadSettingsToForm();
    }
    
    closeSettings() {
        this.settingsModal.classList.remove('active');
    }
    
    loadSettingsToForm() {
        this.wpmInput.value = this.settings.wpm;
        this.commaPauseInput.value = this.settings.commaPause;
        this.periodPauseInput.value = this.settings.periodPause;
        this.semicolonPauseInput.value = this.settings.semicolonPause;
        this.focusLetterColorInput.value = this.settings.focusLetterColor;
        this.fontSizeInput.value = this.settings.fontSize;
    }
    
    updateSettings() {
        this.settings.wpm = parseInt(this.wpmInput.value);
        this.settings.commaPause = parseFloat(this.commaPauseInput.value);
        this.settings.periodPause = parseFloat(this.periodPauseInput.value);
        this.settings.semicolonPause = parseFloat(this.semicolonPauseInput.value);
        this.settings.focusLetterColor = this.focusLetterColorInput.value;
        this.settings.fontSize = parseInt(this.fontSizeInput.value);
        
        this.saveSettings();
        
        // Update display if in RSVP mode
        if (this.mode === 'rsvp') {
            this.displayCurrentWord();
        }
        
        // Update progress to recalculate time
        if (this.mode === 'rsvp' || this.mode === 'normal') {
            this.updateProgress();
        }
    }
    
    resetSettings() {
        this.settings = {
            wpm: 300,
            commaPause: 1.5,
            periodPause: 2.5,
            semicolonPause: 2,
            focusLetterColor: '#ff6b6b',
            fontSize: 60
        };
        this.loadSettingsToForm();
        this.saveSettings();
        
        if (this.mode === 'rsvp') {
            this.displayCurrentWord();
        }
        
        // Update progress to recalculate time
        if (this.mode === 'rsvp' || this.mode === 'normal') {
            this.updateProgress();
        }
    }
    
    // Local Storage Management
    saveSettings() {
        localStorage.setItem('rsvp_settings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('rsvp_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
    
    saveText() {
        localStorage.setItem('rsvp_text', this.textInput.value);
    }
    
    loadText() {
        const saved = localStorage.getItem('rsvp_text');
        if (saved) {
            this.textInput.value = saved;
        }
    }
    
    saveBookmark() {
        localStorage.setItem('rsvp_bookmark', this.currentIndex.toString());
    }
    
    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.rsvpReader = new RSVPReader();
});
