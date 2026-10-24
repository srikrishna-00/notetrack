# Implementation Plan: Evernote Features Integration

**Initiative:** Evernote Signature Feature Set  
**Target:** [`/Users/srikrishna/Desktop/appflowy-lean`](file:///Users/srikrishna/Desktop/appflowy-lean)  
**Spec Reference:** [`SPEC-EVERNOTE.md`](file:///Users/srikrishna/Desktop/appflowy-lean/SPEC-EVERNOTE.md)

---

## Phase 1: Core Reactive Store Extensions (`src/store.js`)
- [x] Add `tags` (array of strings), `reminderDate` (string|null), and `reminderDone` (boolean) to `createPage` and default state.
- [x] Add `scratchpad` string to root `data` object.
- [x] Implement `getAllTags()` returning unique tags with note counts.
- [x] Implement `getPagesByTag(tag)` returning pages matching the tag.
- [x] Implement `addTagToPage(pageId, tag)` and `removeTagFromPage(pageId, tag)`.
- [x] Implement `getReminders()` classifying notes into `overdue`, `upcoming`, and `completed`.
- [x] Implement `setReminder(pageId, dateStr)` and `toggleReminderDone(pageId)`.
- [x] Implement `getScratchpad()`, `setScratchpad(text)`, and `convertScratchpadToNote(spaceId)`.

---

## Phase 2: ENEX XML Import / Export (`src/components/io.js`)
- [x] Implement `exportToENEX(store, pageIds = [])`: formats valid `.enex` XML standard with ENML CDATA, title, tags, and timestamps.
- [x] Implement `importFromENEX(store, enexXmlString, targetSpaceId)`: parses `.enex` XML, extracts notes, converts ENML content to blocks, attaches tags, and instantiates pages.

---

## Phase 3: Block Editor Additions (`src/components/editor.js`)
- [x] Add `/audio` slash command option: Voice Memo / Audio Recording block.
- [x] Add `/clip` slash command option: Web Clip / Snippet block.
- [x] Implement Audio Block UI with Play/Pause button, waveform visualizer, and "Record Voice Memo" microphone action using `MediaRecorder`.
- [x] Implement Web Clip Block UI with domain pill, article title, snippet quote, and original link.

---

## Phase 4: Shell, Sidebar & Modals (`src/components/shell.js` & `src/styles.css`)
- [x] Add `# TAGS` section in sidebar with note count badges and click-to-filter capability.
- [x] Add Tag management chips under note title with inline `+ Tag` input.
- [x] Add Quick Scratchpad floating modal / panel with "Convert to Note" button (`Cmd+Shift+N`).
- [x] Add Reminders modal / dropdown showing active note deadlines.
- [x] Add Web Clipper modal (`Cmd+Shift+C`) to quickly save URL + snippet.
- [x] Add Note Details / Info modal in `⋯` Page Menu (notebook location, dates, size, word/char count).
- [x] Add CSS styling for tags, scratchpad, reminders, audio block, and clip block.

---

## Phase 5: Verification & Testing
- [x] Write `test/evernote.test.js` covering:
  - Global tag indexing and filtering
  - Reminder classification
  - Scratchpad conversion to note
  - ENEX XML export generation
  - ENEX XML import parsing
- [x] Run full test suite (`node --test test/*.test.js`) ensuring all tests pass.
- [x] Run headless smoke test (`npm run smoke`).
- [x] Reload running desktop application and focus window.
- [x] Commit changes with conventional commits.
