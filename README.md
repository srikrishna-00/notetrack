# NoteTrack

> An ultra-fast, local-first, privacy-focused all-in-one workspace for notes, docs, and multi-view databases. Combining the best of **AppFlowy**, **Notion**, and **Evernote** into a unified, ultra-lean codebase (< 7,000 LOC JS).
>
> **Platforms:** macOS, Windows, Linux, Android (Google Play Store), iOS (App Store), and Web/PWA.
> **Android Package Identifier:** `com.notetrack.app`

---

## 1. Feature Parity Matrix

NoteTrack provides comprehensive feature parity across docs, databases, and note-taking superpowers:

| Feature Area | NoteTrack Capability | Status |
|---|---|---|
| **Spaces & Hierarchy** | Multi-space selector (`Personal`, `Work`, `Private`), infinite nested sub-pages | Verified (`test/store.test.js`) |
| **Favorites & Trash** | ⭐ Favorites section, 🗑️ Trash bin with recursive restore & permanent purge | Verified (`test/store.test.js`) |
| **Granular Deletions** | Dedicated separate deletion for voice memos, images, and document pages | Verified (`test/advanced-features.test.js`) |
| **Multi-Tab Interface** | Browser-style tabs with close (`✕`), switch, and open actions | Verified (Smoke test) |
| **Page Header & Covers** | Emoji icon picker, gradient/custom covers, 🔒 Page Locking | Verified |
| **Block Document Editor** | Full block editor with 13 block types (H1-H3, Todo, Callout, Quote, Code, Math, Voice Memo, Image, Divider) | Verified (`test/io.test.js`) |
| **Slash Command Menu** | Floating `/` menu with arrow-key navigation and instant block conversion | Verified |
| **Database: 6-in-1 Views**| Grid, Kanban Board, Calendar, Gallery, Gantt Timeline, Distribution Chart | Verified (`test/database.test.js`) |
| **Database Formulas & Rollups**| Math/logic formulas, relation links, and aggregated rollups | Verified (`test/notion.test.js`) |
| **Evernote Superpowers**| Global Tags, Reminders & Deadlines, Quick Scratchpad, Voice Memos, .enex Import/Export | Verified (`test/evernote.test.js`) |
| **Multi-Language i18n** | English, Español, Deutsch, Français, 简体中文, 日本語 | Verified (`test/advanced-features.test.js`) |
| **AI Assistant** | 10 Built-in productivity templates + offline context assistant | Verified (`test/ai.test.js`) |
| **Fuzzy Search (Cmd+K)** | Typo-tolerant Levenshtein search across titles and blocks | Verified (`test/advanced-features.test.js`) |
| **Version History** | Snapshot revision timeline with one-click restore | Verified (`test/advanced-features.test.js`) |

---

## 2. Google Play Store Release (Android)

NoteTrack is built with Capacitor native bridge under the package namespace `com.notetrack.app`.

### Option A: Open & Build in Android Studio
1. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
2. In Android Studio, wait for Gradle sync to complete.
3. Select menu: **Build > Generate Signed Bundle / APK...**
4. Select **Android App Bundle (.aab)** -> Click **Next**.
5. Choose your upload keystore file (or create new).
6. Select build variant **release** -> Click **Create**.
7. The signed `.aab` will be generated in `android/app/release/app-release.aab`.

### Option B: Build via CLI
```bash
./scripts/build-android-bundle.sh
```

### Option C: Automated GitHub Actions CI
Push the repository to GitHub; the pre-configured `.github/workflows/android-playstore.yml` will automatically build the signed `.aab` in Ubuntu with JDK 21 and export it as a downloadable release artifact ready to upload to Google Play Console.

---

## 3. Quick Start & Verification

### A. Run Desktop Application
```bash
npm start
```

### B. Run Automated Smoke Test
```bash
npm run smoke
```

### C. Run Full Test Suite
```bash
npm test
```

### D. Run Web Preview Server
```bash
npm run web
# Open http://localhost:3030/src/index.html
```

---

## 4. Project Directory Map

```
/Users/srikrishna/Desktop/appflowy-lean/
├── android/                  # Native Android platform (Capacitor)
│   └── app/
│       ├── build.gradle      # Package com.notetrack.app, release signing
│       └── src/main/assets/  # Bundled NoteTrack web assets
├── capacitor.config.json     # App ID: com.notetrack.app, Name: NoteTrack
├── src/
│   ├── main.js               # Electron main process & smoke test runner
│   ├── preload.js            # Secure context bridge
│   ├── index.html            # Main window document
│   ├── renderer.js           # Frontend orchestrator
│   ├── store.js              # Reactive data store & persistence
│   ├── styles.css            # Dark/light theme styles
│   └── components/
│       ├── editor.js         # Block document editor & media deletion
│       ├── database.js       # 6-in-1 Database views & Row-as-Document
│       ├── ai.js             # 10 prompt templates
│       ├── palette.js        # Cmd+K command palette & fuzzy search
│       ├── settings.js       # Settings & diagnostics modal
│       ├── shell.js          # Sidebar, tabs, breadcrumbs, media cleanup
│       └── io.js             # Markdown, CSV, and ENEX import/export
├── test/                     # 29 Automated unit & integration tests
└── scripts/
    ├── build-android-bundle.sh # Play Store .aab bundle generator
    ├── build-all-platforms.sh  # Universal cross-platform packaging
    └── serve.js                # Zero-dependency local web server
```
