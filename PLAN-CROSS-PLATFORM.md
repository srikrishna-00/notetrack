# Implementation Plan: Remaining Advanced Features & Cross-Platform Packaging

**Initiative:** Advanced Feature Parity & Universal Cross-Platform Support  
**Target:** [`/Users/srikrishna/Desktop/appflowy-lean`](file:///Users/srikrishna/Desktop/appflowy-lean)  
**Spec Reference:** [`SPEC-CROSS-PLATFORM.md`](file:///Users/srikrishna/Desktop/appflowy-lean/SPEC-CROSS-PLATFORM.md)

---

## Phase 1: Reactive Store Advanced Capabilities (`src/store.js`)
- [x] Add Page Version History methods:
  - `createSnapshot(pageId, label)`
  - `getVersionHistory(pageId)`
  - `restoreSnapshot(pageId, snapshotId)`
- [x] Add Database Relation & Rollup calculation:
  - Support `relation` column linking row IDs from target database.
  - Support `rollup` column evaluating `count`, `sum`, `avg`, `min`, `max` from target database rows.
- [x] Add Typo-Tolerant Fuzzy Search (Levenshtein distance algorithm):
  - `fuzzySearch(query, maxDistance = 2)`

---

## Phase 2: Editor & Multi-Column Layout (`src/components/editor.js`)
- [x] Add `/columns` and `/2col`, `/3col` slash commands.
- [x] Implement `case 'columns':` rendering responsive grid columns with independent child blocks.
- [x] Implement column controls (+ Col, delete Col, add block inside column).

---

## Phase 3: Database Relation & Rollup Renderers (`src/components/database.js`)
- [x] Add `relation` column cell renderer with interactive row selector dropdown.
- [x] Add `rollup` computed cell renderer calculating aggregate values from linked records.
- [x] Add Relation/Rollup configuration controls when creating columns.

---

## Phase 4: Shell, Modals & i18n (`src/components/shell.js`, `src/components/settings.js`, `src/i18n.js`)
- [x] Create lightweight i18n dictionary `src/i18n.js` with English, Spanish, German, French, Japanese, Chinese.
- [x] Implement Version History modal (`showVersionHistoryModal(page)`) with timeline slider and "Restore Version" button.
- [x] Add language switcher dropdown in Settings modal (`src/components/settings.js`).
- [x] Add mobile responsive bottom bar in `src/components/shell.js`.

---

## Phase 5: Mobile & Desktop Packaging Setup
- [x] Configure `capacitor.config.json` for Android and iOS builds.
- [x] Create PWA Web Manifest `src/manifest.webmanifest` and Service Worker `src/sw.js`.
- [x] Add `electron-builder` configuration in `package.json` for macOS (.dmg, .app), Windows (.exe, portable), and Linux (.AppImage, .deb).
- [x] Create cross-platform build script `scripts/build-all-platforms.sh`.

---

## Phase 6: Automated Testing & Verification
- [x] Write `test/advanced-features.test.js` covering multi-column layouts, relations, rollups, version history, fuzzy search, and i18n.
- [x] Run full test suite (`node --test test/*.test.js`) verifying all 28+ tests pass.
- [x] Run smoke test (`npm run smoke`).
- [x] Reload running desktop application.
- [x] Git commit all additions.
