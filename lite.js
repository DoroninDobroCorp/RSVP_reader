// Lite owns its presentation; storage, file safety and reading timing use the existing reader.
(function () {
'use strict';
const copy = {
 en: {nativePrivacy:'Books and progress stay on this device.',nativeFull:'All tools',nativePreview:'HummingRead',skip:'Skip to reading',eyebrow:'A little space for reading',homeTitle:'Just you.\nAnd a good book.',homeTitleReturning:'Time for a few pages.',homeHint:'Open a book. Find your rhythm.',continue:'Pick up where you left off',openBook:'Open a book',paste:'Paste text',formats:'EPUB, FB2, DOCX, TXT, HTML, MD, RTF · no DRM',books:'Your books',empty:'Your next chapter starts here.',demo:'Try a short read →',privacy:'Books and progress stay in this browser.',full:'Full version ↗',preview:'Optional preview',back:'Back to books',bookText:'Book text',backText:'Back to text',focus:'One word at a time',play:'Read',pause:'Pause',resume:'Continue',settings:'Make it yours',speed:'Reading speed',speedHint:'Words per minute · start at a comfortable pace',size:'Text size',font:'Typeface',serif:'Book',sans:'Simple',light:'Light',dark:'Dark',backup:'Download a backup',title:'Title (optional)',text:'Your text',start:'Read',loading:'Opening your book…',more:'Options for {name}',remove:'Remove book',rename:'Rename',progress:'{progress}% read',draftTitle:'Keep your unsaved text?',draftHint:'There is unsaved text from the full reader. Download a backup or save it there before opening another book. Continue only if you no longer need that draft.',openAnyway:'Open anyway',done:'Done',offline:'Offline · your saved books are here',failed:'Could not open the reader. Reload to try again.'},
 ru: {nativePrivacy:'Книги и прогресс сохраняются на этом устройстве.',nativeFull:'Все инструменты',nativePreview:'HummingRead',skip:'К чтению',eyebrow:'Немного времени для себя',homeTitle:'Только ты.\nИ хорошая книга.',homeTitleReturning:'Время для пары страниц.',homeHint:'Открой книгу. Найди свой ритм.',continue:'Продолжить с того же места',openBook:'Открыть книгу',paste:'Вставить текст',formats:'EPUB, FB2, DOCX, TXT, HTML, MD, RTF · без DRM',books:'Твои книги',empty:'Здесь начнётся следующая глава.',demo:'Попробовать на примере →',privacy:'Книги и прогресс остаются в этом браузере.',full:'Полная версия ↗',preview:'Пробный вариант',back:'К книгам',bookText:'Текст книги',backText:'К тексту',focus:'По одному слову',play:'Читать',pause:'Пауза',resume:'Продолжить',settings:'Как тебе удобно',speed:'Скорость чтения',speedHint:'Слов в минуту · начни с комфортного темпа',size:'Размер текста',font:'Шрифт',serif:'Книжный',sans:'Простой',light:'Светлая',dark:'Тёмная',backup:'Скачать резервную копию',title:'Название (необязательно)',text:'Твой текст',start:'Читать',loading:'Открываем книгу…',more:'Действия с книгой «{name}»',remove:'Убрать книгу',rename:'Переименовать',progress:'Прочитано {progress}%',draftTitle:'Сохранить вставленный текст?',draftHint:'В полной версии остался несохранённый текст. Скачай резервную копию или сохрани его там перед открытием другой книги. Продолжай, только если этот черновик больше не нужен.',openAnyway:'Всё равно открыть',done:'Готово',offline:'Без сети · сохранённые книги доступны',failed:'Не удалось открыть читалку. Обнови страницу и попробуй ещё раз.'},
 es: {nativePrivacy:'Los libros y tu progreso quedan en este dispositivo.',nativeFull:'Todas las herramientas',nativePreview:'HummingRead',skip:'Ir a la lectura',eyebrow:'Un momento para leer',homeTitle:'Solo tú.\nY un buen libro.',homeTitleReturning:'Unas páginas para ti.',homeHint:'Abre un libro. Encuentra tu ritmo.',continue:'Sigue donde lo dejaste',openBook:'Abrir un libro',paste:'Pegar texto',formats:'EPUB, FB2, DOCX, TXT, HTML, MD, RTF · sin DRM',books:'Tus libros',empty:'Tu próximo capítulo empieza aquí.',demo:'Prueba una lectura breve →',privacy:'Los libros y tu progreso quedan en este navegador.',full:'Versión completa ↗',preview:'Vista previa opcional',back:'Volver a los libros',bookText:'Texto del libro',backText:'Volver al texto',focus:'Palabra por palabra',play:'Leer',pause:'Pausa',resume:'Continuar',settings:'A tu gusto',speed:'Velocidad de lectura',speedHint:'Palabras por minuto · empieza a un ritmo cómodo',size:'Tamaño del texto',font:'Tipografía',serif:'Libro',sans:'Sencilla',light:'Clara',dark:'Oscura',backup:'Descargar copia de seguridad',title:'Título (opcional)',text:'Tu texto',start:'Leer',loading:'Abriendo tu libro…',more:'Opciones de {name}',remove:'Quitar libro',rename:'Cambiar título',progress:'{progress}% leído',draftTitle:'¿Conservar el texto sin guardar?',draftHint:'Hay un texto sin guardar en la versión completa. Descarga una copia o guárdalo allí antes de abrir otro libro. Continúa solo si ya no necesitas ese borrador.',openAnyway:'Abrir de todos modos',done:'Listo',offline:'Sin conexión · tus libros guardados están aquí',failed:'No se pudo abrir el lector. Recarga la página para intentarlo de nuevo.'}
};
const queryLanguage = new URL(location.href).searchParams.get('lang');
if (['en','ru','es'].includes(queryLanguage)) window.paceflowI18n.setLanguage(queryLanguage);

window.HummingReadLite = class HummingReadLite extends RSVPReader {
 constructor() {
  super();
  this.ready = this.ready.then(() => {
   this.renderLibrary();
   this.localizeLite();
   document.body.dataset.ready = 'true';
  }).catch((error) => {
   console.error(error);
   this.showToast(this.lt('failed'), 'error');
   document.body.dataset.ready = 'error';
   throw error;
  });
 }
 el(id) { return document.getElementById(id); }
 lt(key, values = {}) {
  const text = copy[this.i18n.language]?.[key] || copy.en[key] || key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
 }
 loadSettings() {
  const hadSettings = Boolean(localStorage.getItem('rsvp_settings') || localStorage.getItem('paceflow_settings_envelope'));
  super.loadSettings();
  if (!hadSettings) { this.settings.fontFamily = 'serif'; this.loadSettingsToForm(); }
 }
 attachEventListeners() {
  const on = (id, event, fn) => this.el(id)?.addEventListener(event, fn);
  this.currentTheme = localStorage.getItem('rsvp_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
  this.applyTheme(this.currentTheme);
  this.localizeLite();
  on('loadFileBtn','click',() => this.openFilePicker(this.fileInput));
  on('fileInput','change',(event) => this.runAsync(() => this.handleFileUpload(event)));
  on('continueReadingCard','click',() => this.runAsync(() => this.openBookLite(this.continueReadingCard.dataset.bookId)));
  on('tryDemoBtn','click',() => this.runAsync(() => this.openBuiltInDemo()));
  on('backToInputBtn','click',() => this.runAsync(() => this.backToInput()));
  on('startRSVPBtn','click',() => { this.captureScrollPosition(); this.startRSVP(); this.play(); });
  on('stopRSVPBtn','click',() => this.stopRSVP());
  on('playPauseBtn','click',() => this.togglePlayPause());
  on('rewindWordsBtn','click',() => this.rewindReadableWords(10));
  on('prevWordBtn','click',() => this.adjustSpeed(-20,this.prevWordBtn));
  on('nextWordBtn','click',() => this.adjustSpeed(20,this.nextWordBtn));
  on('rsvpScrubber','input',() => this.seekFromScrubber());
  on('rsvpScrubber','change',() => this.schedulePositionSave());
  ['settingsBtn','liteTextSettings','liteFocusSettings'].forEach(id => on(id,'click',event => this.openSettings(event.currentTarget)));
  on('closeSettingsBtn','click',() => this.closeSettings());
  on('themeDayBtn','click',() => this.setTheme('day'));
  on('themeNightBtn','click',() => this.setTheme('night'));
  this.fontButtons.forEach(button => button.addEventListener('click',() => this.setFontFamily(button.dataset.font)));
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click',() => this.setLanguage(button.dataset.language)));
  on('wpmInput','input',() => {
   this.settings.wpm = this.numberInRange(this.wpmInput.value,100,1000,350);
   this.saveSettings(); this.updateSpeedControls();
   if (this.isPlaying) this.scheduleNextWord();
  });
  on('fontSizeInput','input',() => {
   this.settings.fontSize = Math.round(this.numberInRange(this.fontSizeInput.value,18,30,20) * 2.1);
   this.saveSettings(); this.loadSettingsToForm();
   if (this.mode === 'rsvp') this.displayCurrentWord();
  });
  on('litePasteBtn','click',event => this.openModal(this.el('litePasteModal'),this.el('litePasteText'),event.currentTarget));
  on('litePasteClose','click',() => this.closeModal(this.el('litePasteModal')));
  on('litePasteForm','submit',event => { event.preventDefault(); this.runAsync(() => this.savePastedText()); });
  on('settingsExportBtn','click',() => this.runAsync(() => this.exportLibrary()));
  on('liteTocBtn','click',event => this.openToc(event.currentTarget));
  on('closeTocBtn','click',() => this.closeToc());
  on('liteBookClose','click',() => this.closeModal(this.el('liteBookModal')));
  on('liteBookRename','click',() => this.runAsync(async () => {
   const id = this.liteMenuBook; this.closeModal(this.el('liteBookModal')); await this.renameBook(id); this.renderLibrary();
  }));
  on('liteBookRemove','click',() => this.runAsync(async () => {
   const id = this.liteMenuBook, selected = this.currentBookId === id;
   const previous = await this.getBook(id);
   this.closeModal(this.el('liteBookModal')); await this.deleteBook(id);
   if (selected && previous && !await this.getBook(id) && !this.currentBookId && this.textInput.value === previous.text) {
    this.setTextInputValue(''); this.bookNameInput.value = ''; this.words = []; this.currentIndex = 0;
    this.currentChapters = []; this.hasUnsavedTextInput = false; await this.saveDraft();
   }
   this.renderLibrary(); this.updateContinueCard();
  }));
  on('actionDialogForm','submit',event => {
   event.preventDefault();
   this.finishActionDialog(this.actionDialogInputGroup.hidden ? true : this.actionDialogInput.value);
  });
  on('actionDialogCloseBtn','click',() => this.finishActionDialog(null));
  on('actionDialogCancelBtn','click',() => this.finishActionDialog(null));
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click',event => {
   if (event.target !== modal) return;
   if (modal === this.actionDialog) this.finishActionDialog(null); else this.closeModal(modal);
  }));
  document.addEventListener('keydown',event => {
   if (event.key === 'Escape' || event.key === 'Tab') { super.handleKeyboard(event); return; }
   if (this.activeModal || event.target.closest('input,textarea,button,select,a,[contenteditable]')) return;
   if (event.code === 'Space' && this.mode === 'rsvp') { event.preventDefault(); this.togglePlayPause(); }
  });
  document.addEventListener('visibilitychange',() => {
   if (document.visibilityState === 'hidden') this.handleAppPause();
  });
  window.addEventListener('pagehide',() => this.handleAppPause());
  window.addEventListener('resize',() => { if (this.mode === 'rsvp') this.displayCurrentWord(); });
  ['wheel','touchmove'].forEach(type => this.normalTextDisplay.addEventListener(type,() => { this.liteUserScrolling = true; },{passive:true}));
  this.normalTextDisplay.addEventListener('scroll',() => {
   if (!this.liteUserScrolling) return;
   clearTimeout(this.liteScrollTimer); this.liteScrollTimer = setTimeout(() => this.captureScrollPosition(),160);
  },{passive:true});
  window.addEventListener('online',() => this.updateOnlineStatus());
  window.addEventListener('offline',() => this.updateOnlineStatus());
 }
 runAsync(task) { Promise.resolve().then(task).catch(error => { console.error(error); this.showToast(error.message || this.t('actionFailed'),'error'); }); }
 localizeLite() {
  document.documentElement.lang = this.i18n.language;
  document.querySelectorAll('[data-lite]').forEach(el => el.textContent = this.lt(el.dataset.lite));
  document.querySelectorAll('[data-lite-aria]').forEach(el => el.setAttribute('aria-label',this.lt(el.dataset.liteAria)));
  this.i18n.apply();
  const base = window.getAppBaseUrl();
  const locale = this.i18n.language === 'en' ? '' : this.i18n.language + '/';
  document.querySelectorAll('.full-version').forEach(el => el.href = this.isNativePlatform() ? base + '/full.html' : base + '/' + locale);
  this.updateLegalLinks(this.i18n.language);
  this.el('litePrivacy').textContent = this.lt(navigator.onLine ? (this.isNativePlatform() ? 'nativePrivacy' : 'privacy') : 'offline');
  if (this.library.length) this.el('textInputSection').querySelector('h1').textContent = this.lt('homeTitleReturning');
  this.updatePlaybackControls();
 }
 setLanguage(language) {
  this.i18n.setLanguage(language);
  const url = new URL(location.href); url.searchParams.set('lang',this.i18n.language); history.replaceState(null,'',url);
  this.localizeLite(); this.renderLibrary(); this.updateContinueCard();
 }
 applyTheme(theme) {
  super.applyTheme(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme === 'night' ? '#1c221f' : '#f8f7f2');
 }
 loadSettingsToForm() {
  if (this.wpmInput) this.wpmInput.value = this.settings.wpm;
  const textSize = Math.max(18, Math.min(30, Math.round(this.settings.fontSize / 2.1)));
  if (this.fontSizeInput) this.fontSizeInput.value = textSize;
  document.documentElement.style.setProperty('--text-size',textSize + 'px');
  this.applyReadingFont(); this.updateSpeedControls();
 }
 updateSpeedControls() {
  const wpm = Math.round(this.settings.wpm);
  if (this.rsvpWpmLabel) this.rsvpWpmLabel.textContent = wpm + ' ' + ({en:'WPM',ru:'сл/мин',es:'ppm'}[this.i18n.language] || 'WPM');
  if (this.el('liteSpeedValue')) this.el('liteSpeedValue').textContent = wpm;
  if (this.wpmInput) this.wpmInput.value = wpm;
  if (this.prevWordBtn) this.prevWordBtn.disabled = wpm <= 100;
  if (this.nextWordBtn) this.nextWordBtn.disabled = wpm >= 1000;
 }
 getFrameAt(index) { return super.getFrameAt(index,{singleWord:true}); }
 updatePlaybackControls() {
  if (!this.playPauseBtn) return;
  super.updatePlaybackControls();
  this.playPauseBtn.textContent = this.lt(this.isPlaying ? 'pause' : (this.wordsProcessedInRun ? 'resume' : 'play'));
  this.playPauseBtn.setAttribute('aria-label',this.playPauseBtn.textContent);
 }
 renderNormalText(options = {}) {
  this.liteUserScrolling = false; clearTimeout(this.liteScrollTimer);
  super.renderNormalText(options);
  // A book should be read as prose by assistive technology, not as hundreds of buttons.
  this.normalTextDisplay.querySelectorAll('[data-index]').forEach(span => {
   span.removeAttribute('role'); span.removeAttribute('aria-label'); span.removeAttribute('tabindex');
  });
 }
 setCurrentWordIndex(index, options = {}) {
  this.liteUserScrolling = false; clearTimeout(this.liteScrollTimer);
  super.setCurrentWordIndex(index,options);
 }
 captureScrollPosition() {
  if (!this.liteUserScrolling || this.mode !== 'normal') return;
  const spans = this.normalTextDisplay.querySelectorAll('[data-index]');
  if (!spans.length) return;
  const boundary = this.normalTextDisplay.getBoundingClientRect().top + 24;
  let low = 0, high = spans.length - 1;
  while (low < high) {
   const mid = Math.floor((low + high) / 2);
   if (spans[mid].getBoundingClientRect().bottom < boundary) low = mid + 1; else high = mid;
  }
  super.setCurrentWordIndex(Number(spans[low].dataset.index),{scroll:false});
  this.liteUserScrolling = false;
 }
 handleAppPause() { this.captureScrollPosition(); super.handleAppPause(); }
 updatePauseContext() {
  if (!this.rsvpPauseContext) return;
  const show = this.mode === 'rsvp' && !this.isPlaying && this.words.length > 0;
  this.rsvpPauseContext.setAttribute('aria-hidden',show ? 'false' : 'true');
  this.rsvpPauseContext.replaceChildren();
  if (!show) return;
  const start = Math.max(0,this.currentIndex - 8), end = Math.min(this.words.length,this.currentIndex + 10);
  if (start > 0) this.rsvpPauseContext.append('… ');
  for (let index = start; index < end; index++) {
   if (!this.isReadableToken(this.words[index])) continue;
   if (index === this.currentIndex) {
    const current = document.createElement('strong'); current.className = 'pause-current'; current.textContent = this.words[index] + ' ';
    this.rsvpPauseContext.append(current);
   } else this.rsvpPauseContext.append(this.words[index] + ' ');
  }
  if (end < this.words.length) this.rsvpPauseContext.append('…');
 }
 updateProgress() {
  const total = this.countReadableWords();
  const current = total ? this.wordOrdinalAtIndex(this.currentIndex) : 0;
  const progress = total > 1 ? Math.round(100 * Math.max(0,current - 1) / (total - 1)) : 0;
  this.progressText.textContent = progress + '%';
  this.el('liteFocusProgress').textContent = progress + '%';
  this.rsvpScrubber.value = total > 1 ? Math.round(1000 * Math.max(0,current - 1) / (total - 1)) : 0;
  this.rsvpScrubber.disabled = total < 2;
  this.rsvpScrubber.setAttribute('aria-valuetext',this.t('readingPositionValue',{progress,current,total}));
  this.updateSpeedControls();
 }
 updateCurrentBookInfo() {
  const name = this.currentBookName || this.bookNameInput.value.trim() || this.t('draft');
  this.currentBookInfo.textContent = name; this.rsvpBookTitle.textContent = name;
  this.el('liteTocBtn').hidden = !this.currentChapters.length;
 }
 updateStorageStatus() { /* Storage details belong in the full reader, not the reading surface. */ }
 updateLibraryButton() {}
 updateOnlineStatus() {
  if (this.el('litePrivacy')) this.el('litePrivacy').textContent = this.lt(navigator.onLine ? (this.isNativePlatform() ? 'nativePrivacy' : 'privacy') : 'offline');
  this.updateContinueCard();
 }
 async loadLibrary() { await super.loadLibrary(); this.renderLibrary(); }
 renderLibrary() {
  if (!this.booksList) return;
  this.booksList.replaceChildren();
  const books = [...this.library].sort((a,b) => new Date(b.lastRead || b.updatedAt || 0) - new Date(a.lastRead || a.updatedAt || 0));
  books.forEach(book => {
   const row = document.createElement('li'); row.className = 'book-row';
   const open = document.createElement('button'); open.type = 'button'; open.className = 'book-open'; open.dataset.bookId = book.id;
   const cover = document.createElement('span'); cover.className = 'book-spine'; cover.setAttribute('aria-hidden','true'); cover.textContent = Array.from(book.name || '?')[0];
   const text = document.createElement('span'); text.className = 'book-copy';
   const title = document.createElement('strong'); title.textContent = book.name;
   const progress = document.createElement('small');
   progress.textContent = this.lt('progress',{progress:Math.round(100 * this.clampIndex(Number(book.currentIndex) || 0,book.tokenCount || 1) / Math.max(1,(book.tokenCount || 1) - 1))});
   text.append(title,progress); open.append(cover,text);
   open.addEventListener('click',() => this.runAsync(() => this.openBookLite(book.id)));
   const more = document.createElement('button'); more.type = 'button'; more.className = 'book-more'; more.textContent = '···'; more.setAttribute('aria-label',this.lt('more',{name:book.name}));
   more.addEventListener('click',() => {
    this.liteMenuBook = book.id; this.el('liteBookTitle').textContent = book.name;
    this.openModal(this.el('liteBookModal'),this.el('liteBookClose'),more);
   });
   row.append(open,more); this.booksList.append(row);
  });
  this.el('liteBookCount').textContent = books.length ? this.formatBookCount(books.length) : '';
  this.el('liteEmpty').hidden = books.length > 0;
  this.textInputSection.classList.toggle('has-books',books.length > 0);
  this.textInputSection.querySelector('h1').textContent = this.lt(books.length ? 'homeTitleReturning' : 'homeTitle');
 }
 showSection(section) {
  if (section === 'library') section = 'input';
  const views = {input:this.textInputSection,normal:this.normalReadingSection,rsvp:this.rsvpReadingSection};
  Object.entries(views).forEach(([key,view]) => { view.hidden = key !== section; view.style.display = ''; });
  document.body.dataset.screen = section;
  if (section !== 'input') window.scrollTo(0,0);
 }
 async restoreLastSession() {
  await super.restoreLastSession();
  this.mode = 'input'; this.showSection('input');
 }
 async backToInput() {
  this.captureScrollPosition(); this.pause();
  if (this.words.length) await this.persistReadingPosition();
  this.mode = 'input'; this.showSection('input');
  await this.saveDraft(); await this.loadLibrary();
 }
 async allowDraftReplacement() {
  if (this.currentBookId || !this.textInput.value.trim()) return true;
  return Boolean(await this.showActionDialog({title:this.lt('draftTitle'),message:this.lt('draftHint'),confirmLabel:this.lt('openAnyway')}));
 }
 async openBookLite(id) {
  await this.ready;
  if (!id || !await this.allowDraftReplacement()) return;
  if (this.words.length) await this.persistReadingPosition();
  const book = await this.loadBook(id,{start:true});
  if (book) this.normalTextDisplay.focus({preventScroll:true});
 }
 async addAndRead(name,parsed,type,options = {}) {
  if (this.words.length) await this.persistReadingPosition();
  const book = await this.addParsedBookToLibrary(name,parsed,type,{...options,select:true,silent:true});
  if (book) await this.loadBook(book.id,{start:true});
  return book;
 }
 async handleFileUpload(event) {
  await this.ready;
  const file = event.target.files?.[0]; if (!file) return;
  this.loadFileBtn.disabled = true; this.el('litePrivacy').textContent = this.lt('loading');
  try {
   if (!await this.allowDraftReplacement()) return;
   const extension = this.getFileExtension(file.name,file.type);
   const parsed = await this.extractBookFromFile(file,extension);
   await this.addAndRead(this.nameFromFile(file.name),parsed,extension,{fileName:file.name});
  } finally { event.target.value = ''; this.loadFileBtn.disabled = false; this.updateOnlineStatus(); }
 }
 async exportLibrary() {
  await this.ready;
  this.captureScrollPosition();
  if (this.words.length) await this.persistReadingPosition();
  return super.exportLibrary();
 }
 async savePastedText() {
  await this.ready;
  const text = this.el('litePasteText').value.trim(); if (!text) return;
  this.assertTextTokenSafety(text,{requireReadable:true});
  // Close before a possible draft confirmation so focus/inert state stays correct.
  this.closeModal(this.el('litePasteModal'));
  if (!await this.allowDraftReplacement()) return;
  const name = this.el('litePasteTitle').value.trim() || this.makeDefaultBookName(text);
  this.el('litePasteSubmit').disabled = true;
  try {
   await this.addAndRead(name,{text,chapters:[]},'text');
   this.el('litePasteText').value = ''; this.el('litePasteTitle').value = '';
  } finally { this.el('litePasteSubmit').disabled = false; }
 }
 async openBuiltInDemo() {
  await this.ready;
  const existing = this.library.find(book => book.sourceType === 'demo');
  if (existing) { await this.openBookLite(existing.id); return; }
  if (!await this.allowDraftReplacement()) return;
  const sample = {en:'sample_text.txt',ru:'sample_text_ru.txt',es:'sample_text_es.txt'}[this.i18n.language];
  const response = await fetch(window.resolveAppPath(sample)); if (!response.ok) throw new Error(this.t('demoLoadFailed'));
  await this.addAndRead(this.t('demoBookTitle'),{text:await response.text(),chapters:[]},'demo');
 }
};
})();
