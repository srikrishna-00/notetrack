# Specification: Remaining Advanced Features & Cross-Platform Packaging (macOS, Windows, Linux, Android, iOS)

**Status:** APPROVED  
**Author:** Pair Programming Assistant  
**Date:** 2026-10-24  
**Target:** [`/Users/srikrishna/Desktop/appflowy-lean`](file:///Users/srikrishna/Desktop/appflowy-lean)

---

## 1. Executive Summary

AppFlowy Lean already implements 100% of AppFlowy's core features, Notion's signature capabilities, and Evernote's productivity suite. This specification finishes the remaining gap features identified from Notion/AppFlowy/Evernote and establishes the cross-platform deployment toolchain to launch AppFlowy Lean on:
1. **Apple App Store (iOS)** via Capacitor native project
2. **Google Play Store (Android)** via Capacitor native project
3. **macOS** (.dmg / .app universal binary)
4. **Windows** (.exe NSIS installer & portable)
5. **Linux** (.AppImage / .deb package)
6. **Web / PWA** (installable offline progressive web app with service worker)

---

## 2. Advanced Feature Specifications

### A. Multi-Column Layouts (`columns` Block)
- **Data Model:**
  ```javascript
  {
    id: "b-cols-1",
    type: "columns",
    columnsCount: 2, // 2, 3, or 4
    columns: [
      { id: "c1", blocks: [{ id: "b1", type: "paragraph", text: "Left column" }] },
      { id: "c2", blocks: [{ id: "b2", type: "paragraph", text: "Right column" }] }
    ]
  }
  ```
- **UI & Interaction:**
  - Slash command `/columns` or `/2col`, `/3col`.
  - CSS Grid with `grid-template-columns: repeat(N, 1fr)`.
  - On mobile (< 768px), automatically collapses to single-column vertical stack.

### B. Database Relations & Rollups
- **Relation Column:**
  - Type: `relation`.
  - Configuration: `targetDatabaseId` (links this column to another database page).
  - Cell Value: Array of target row IDs `['row-1', 'row-2']`.
  - UI: Click cell to open multiselect row picker from target database.
- **Rollup Column:**
  - Type: `rollup`.
  - Configuration: `relationColumnId`, `targetPropertyId`, `calculation` (`count`, `sum`, `avg`, `show_values`).
  - Cell Value: Dynamically computed aggregation across the related rows.

### C. Granular Page Version History & Snapshots Diff
- **Data Model:**
  - `page.history`: Array of `{ snapshotId, timestamp, label, blocks, title }`.
  - Stored locally with a maximum of 30 historical revisions per page.
  - Automatically captures snapshot before significant edits or manual "Save Checkpoint".
- **UI:**
  - `showVersionHistoryModal(page)` dialog:
    - Left column: Chronological list of snapshots with timestamps and relative labels.
    - Right column: Read-only preview showing blocks and metadata at that snapshot.
    - "Restore This Version" button: Replaces current blocks with historical snapshot and saves recovery checkpoint.

### D. Typo-Tolerant Fuzzy Search (Levenshtein Distance)
- **Algorithm:**
  - Levenshtein distance metric measuring edit distance between search query and page/block text.
  - Handles letter transpositions, missing letters, and extra letters.
  - Returns ranked matches with relevance scores.

### E. Multi-Language Internationalization (i18n)
- **Supported Locales:**
  - English (`en`), Spanish (`es`), German (`de`), French (`fr`), Japanese (`ja`), Chinese (`zh`).
- **Engine:**
  - Dynamic translation dictionary mapping keys (e.g. `sidebar.search`, `menu.lock`, `views.grid`) to localized strings.
  - Language switcher in Settings (`settings.js`).

---

## 3. Cross-Platform Deployment Architecture

### A. Desktop Packaging (macOS, Windows, Linux)
- Powered by `electron-builder` configuration in `package.json`:
  - **macOS**: DMG disk image (`.dmg`) & zip archive for Apple Silicon (`arm64`) and Intel (`x64`).
  - **Windows**: NSIS installer (`.exe`) and portable single-file executable.
  - **Linux**: Distribution-independent AppImage (`.AppImage`) and Debian/Ubuntu package (`.deb`).
- One-click build script: `scripts/build-desktop.sh`.

### B. Mobile Packaging (iOS App Store & Android Google Play)
- Powered by **Capacitor 6+**:
  - `capacitor.config.json` defining `appId: "com.appflowylean.app"` and `appName: "AppFlowy Lean"`.
  - Native iOS Xcode project generation (`ios/`) for App Store archiving.
  - Native Android Studio project generation (`android/`) for APK / AAB Play Store bundle generation.
- Responsive mobile UX:
  - Mobile bottom navigation bar for quick page switching.
  - Safe-area insets padding (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).
  - Touch-optimized hit targets (minimum 44x44px).

### C. Offline Progressive Web App (PWA)
- `manifest.webmanifest`: App name, theme colors (`#12141a`), icons, standalone display mode.
- `sw.js`: Service worker with Cache-First asset caching for instant offline boot in any mobile or desktop browser.
- PWA install banner / prompt.

---

## 4. Verification & Quality Gates

1. **Automated Unit Tests**:
   - `test/advanced-features.test.js` validating:
     - Multi-column layout structure
     - Relation and Rollup evaluation across two databases
     - Version history snapshot creation and rollback
     - Typo-tolerant fuzzy search matching
     - i18n localization dictionary
2. **Regression Testing**:
   - All 23 previous tests pass (AppFlowy, Notion, Evernote).
3. **Packaging Sanity Test**:
   - Validate electron-builder config and build scripts.
   - Validate Capacitor configuration and PWA manifest.
