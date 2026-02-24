🇬🇧 [English](#-english) | 🇷🇺 [Русский](#-русский)

---

# 🇬🇧 English

# 📖 RSVP Speed Reader

> A fast reader based on the **RSVP** (Rapid Serial Visual Presentation) method — a PWA with EPUB support, offline mode, and a built-in book library.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet.svg)](#-install-on-your-phone)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-yellow.svg)](app.js)
[![Offline](https://img.shields.io/badge/Works-Offline-green.svg)](service-worker.js)

🌐 **Demo**: [read.ibet.team](https://read.ibet.team)

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📖 | **RSVP Mode** | Words displayed one at a time in the center of the screen — read faster without eye movement |
| 🎯 | **Focus Letter** | Highlights the Optimal Recognition Point (ORP) in color |
| 📚 | **EPUB Support** | Load `.epub` files — text is extracted automatically |
| 📂 | **Book Library** | Store multiple books with individual bookmarks |
| 🔍 | **Text Search** | Quickly jump to the passage you need |
| ⏸ | **Smart Pauses** | Configurable pauses on commas, periods, and other punctuation |
| 📱 | **PWA** | Installable on your phone just like a native app |
| 🔌 | **Offline** | Works without internet after the first launch |
| 💾 | **Privacy** | All data is stored **exclusively** in the browser locally |

---

## 🎮 Controls

### RSVP Mode
| Key | Action |
|---|---|
| <kbd>Space</kbd> | Pause / Play |
| <kbd>←</kbd> <kbd>→</kbd> | Previous / Next word |
| <kbd>Escape</kbd> | Exit to normal mode |
| Double tap | Toggle modes |

### Normal Mode
- **Click a word** — jump to that position
- **Double click** — start RSVP
- **▶️ button** — start RSVP

### ⚙️ Settings
- Speed: **100–1000** WPM
- Font size: **30–120px**
- Pause multipliers for `,` `.` `;` `:` `!` `?`
- Focus letter color

---

## 🚀 Run Locally

```bash
git clone https://github.com/DoroninDobroCorp/RSVP_reader.git
cd RSVP_reader

# Any HTTP server will do:
python3 -m http.server 8080
# or
npx http-server -p 8080
```

Open `http://localhost:8080`

---

## 📲 Install on Your Phone

1. Open the app in your browser
2. Tap **"Add to Home Screen"** (Chrome / Safari)
3. Done — the app works like a native one, even offline

---

## 📝 How to Use

1. **Load your text** — paste it, or upload a `.txt` or `.epub` file
2. **Click "Start Reading"** or double-click to launch RSVP
3. **Adjust** speed and pauses via ⚙️
4. **Come back later** — the app remembers your position

---

## 🏗 Tech Stack

- **Vanilla JavaScript** — no frameworks, ~40 KB
- **Service Worker** — caching and offline support
- **Web App Manifest** — PWA capabilities
- **localStorage** — local data storage
- **JSZip** (CDN) — EPUB extraction

---

## 📁 Project Structure

```
RSVP_reader/
├── index.html              # Main page
├── app.js                  # Application logic
├── style.css               # Styles (dark theme, responsive)
├── epub-parser.js          # EPUB file parser
├── service-worker.js       # Service Worker
├── manifest.json           # PWA manifest
├── sample_text.txt         # Sample text
├── playwright.config.js    # Test configuration
├── netlify.toml            # Netlify configuration
├── tests/                  # Playwright E2E tests
│   ├── test-epub.spec.js
│   ├── test-rsvp-stop.spec.js
│   └── ...
└── docs/                   # Documentation
    ├── FEATURES.md          # Full feature list
    ├── OFFLINE_EXPLAINED.md # How offline works
    └── ...
```

---

## 🧪 Tests

```bash
npm install
npx playwright install chromium
npm test
```

---

## 🤝 Contributing

Pull requests are welcome! Open an [Issue](https://github.com/DoroninDobroCorp/RSVP_reader/issues) or submit a PR.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  <i>Made with ❤️ for those who want to read faster</i>
</p>

---

# 🇷🇺 Русский

# 📖 RSVP Speed Reader

> Быстрая читалка по методу **RSVP** (Rapid Serial Visual Presentation) — PWA-приложение с поддержкой EPUB, офлайн-режимом и библиотекой книг.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet.svg)](#-установка-на-телефон)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-yellow.svg)](app.js)
[![Offline](https://img.shields.io/badge/Works-Offline-green.svg)](service-worker.js)

🌐 **Демо**: [read.ibet.team](https://read.ibet.team)

---

## ✨ Возможности

| | Функция | Описание |
|---|---|---|
| 📖 | **RSVP-режим** | Слова по одному в центре экрана — читай быстрее без движения глаз |
| 🎯 | **Фокусная буква** | Выделение оптимальной точки фокусировки (ORP) цветом |
| 📚 | **Поддержка EPUB** | Загружай `.epub` — текст извлечётся автоматически |
| 📂 | **Библиотека книг** | Храни несколько книг с отдельными закладками |
| 🔍 | **Поиск по тексту** | Быстрый переход к нужному фрагменту |
| ⏸ | **Умные паузы** | Настраиваемые паузы на запятых, точках и других знаках |
| 📱 | **PWA** | Устанавливается на телефон как нативное приложение |
| 🔌 | **Офлайн** | Работает без интернета после первого запуска |
| 💾 | **Приватность** | Все данные хранятся **только** локально в браузере |

---

## 🎮 Управление

### RSVP-режим
| Клавиша | Действие |
|---|---|
| <kbd>Пробел</kbd> | Пауза / Воспроизведение |
| <kbd>←</kbd> <kbd>→</kbd> | Предыдущее / Следующее слово |
| <kbd>Escape</kbd> | Выход в обычный режим |
| Двойной тап | Переключение режимов |

### Обычный режим
- **Клик на слово** — переход к позиции
- **Двойной клик** — запуск RSVP
- **Кнопка ▶️** — запуск RSVP

### ⚙️ Настройки
- Скорость: **100–1000** WPM
- Размер шрифта: **30–120px**
- Множители пауз на `,` `.` `;` `:` `!` `?`
- Цвет фокусной буквы

---

## 🚀 Запуск локально

```bash
git clone https://github.com/DoroninDobroCorp/RSVP_reader.git
cd RSVP_reader

# Любой HTTP-сервер:
python3 -m http.server 8080
# или
npx http-server -p 8080
```

Откройте `http://localhost:8080`

---

## 📲 Установка на телефон

1. Откройте приложение в браузере
2. Нажмите **«Добавить на главный экран»** (Chrome / Safari)
3. Готово — приложение работает как нативное, даже офлайн

---

## 📝 Как пользоваться

1. **Загрузите текст** — вставьте, загрузите `.txt` или `.epub`
2. **Нажмите «Начать чтение»** или двойной клик для RSVP
3. **Настройте** скорость и паузы через ⚙️
4. **Вернитесь позже** — приложение запомнит позицию

---

## 🏗 Технологии

- **Vanilla JavaScript** — никаких фреймворков, ~40 КБ
- **Service Worker** — кэширование и офлайн
- **Web App Manifest** — PWA-возможности
- **localStorage** — локальное хранилище данных
- **JSZip** (CDN) — распаковка EPUB

---

## 📁 Структура проекта

```
RSVP_reader/
├── index.html              # Основная страница
├── app.js                  # Логика приложения
├── style.css               # Стили (тёмная тема, адаптив)
├── epub-parser.js          # Парсер EPUB файлов
├── service-worker.js       # Service Worker
├── manifest.json           # PWA-манифест
├── sample_text.txt         # Пример текста
├── playwright.config.js    # Конфигурация тестов
├── netlify.toml            # Конфигурация Netlify
├── tests/                  # Playwright E2E тесты
│   ├── test-epub.spec.js
│   ├── test-rsvp-stop.spec.js
│   └── ...
└── docs/                   # Документация
    ├── FEATURES.md          # Полный список возможностей
    ├── OFFLINE_EXPLAINED.md # Как работает офлайн
    └── ...
```

---

## 🧪 Тесты

```bash
npm install
npx playwright install chromium
npm test
```

---

## 🤝 Вклад

Pull request'ы приветствуются! Создайте [Issue](https://github.com/DoroninDobroCorp/RSVP_reader/issues) или отправьте PR.

---

## 📄 Лицензия

[MIT](LICENSE)

---

<p align="center">
  <i>Сделано с ❤️ для тех, кто хочет читать быстрее</i>
</p>
