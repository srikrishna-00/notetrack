# Specification: Evernote Feature Integration for AppFlowy Lean

**Status:** APPROVED  
**Author:** Pair Programming Assistant  
**Date:** 2026-10-24  
**Target:** [`/Users/srikrishna/Desktop/appflowy-lean`](file:///Users/srikrishna/Desktop/appflowy-lean)

---

## 1. Executive Summary

AppFlowy Lean successfully integrates 100% of AppFlowy's core features (block editor, 6-in-1 database views, AI prompts) and Notion's signature capabilities (markdown shortcuts, formulas, synced blocks, backlinks, typography).

This specification defines the integration of **Evernote's defining signature features** into AppFlowy Lean without adding bloat, maintaining the single-language ESM architecture and zero external dynamic dependencies:
1. **Global Tagging System & Tags Manager** (first-class workspace-wide tags, note counts, tag filter view)
2. **Quick Scratchpad & Instant Capture** (persistent scratchpad with "Convert to Note" action)
3. **Note Reminders with Due Dates** (set reminder, list active/overdue reminders)
4. **Audio Voice Memo Block (`/audio`)** (record audio memos via MediaRecorder and play back inline)
5. **Web Clipper / Quick Capture Modal** (grab URL, title, snippet, and save as clipped note)
6. **Evernote ENEX Import & Export** (standard XML `.enex` format for complete interoperability)
7. **Note Info / Metadata Inspector** (detailed notebook location, dates, size, word/char counts)

---

## 2. Capability Map & Modules

| Module ID | Responsibility | Dependencies |
|---|---|---|
| `evernote-store` | Global tags index, reminders index, scratchpad persistence in reactive store | None |
| `evernote-io` | Export to `.enex` (XML) and import from `.enex` files | `evernote-store` |
| `evernote-editor` | Audio recording block (`/audio`), Web clip block (`/clip`) | `evernote-store` |
| `evernote-shell` | Tags sidebar list, Reminders panel, Scratchpad popup, Note Info modal, Tag chips in note header | `evernote-store`, `evernote-editor` |

---

## 3. Data Model Extensions (`src/store.js`)

### Page Object Extensions:
```javascript
{
  id: "page-123",
  title: "Meeting Notes",
  tags: ["#work", "#roadmap", "#q4"], // Array of lowercase tag strings
  reminderDate: "2026-10-25T10:00:00.000Z", // Optional ISO timestamp
  reminderDone: false, // Boolean
  sourceUrl: "https://example.com/article", // For clipped notes
  ...
}
```

### Workspace Store Extensions:
```javascript
{
  scratchpad: "Fleeting ideas, quick thoughts, or phone numbers...",
  ...
}
```

### Store Methods:
- `getAllTags()`: Returns `{ tag: string, count: number }[]` sorted alphabetically.
- `getPagesByTag(tag)`: Returns array of active pages tagged with `tag`.
- `addTagToPage(pageId, tag)` / `removeTagFromPage(pageId, tag)`.
- `getReminders()`: Returns `{ upcoming: Page[], overdue: Page[], completed: Page[] }`.
- `setReminder(pageId, dateStr)` / `toggleReminderDone(pageId)`.
- `getScratchpad()` / `setScratchpad(text)`.
- `convertScratchpadToNote(spaceId)`: Creates a new note containing the scratchpad content and resets scratchpad.

---

## 4. Evernote Block Types (`src/components/editor.js`)

1. **Audio Voice Memo Block (`audio`)**:
   - Visual: Play/pause button, time elapsed/total, recording button, status badge.
   - Interactive: Click "Record Voice Memo" to record from microphone via browser `MediaRecorder`, stop recording to generate inline base64 audio source and playback immediately.
2. **Web Clip Block (`clip`)**:
   - Visual: Article container with source badge, original URL link, date clipped, and quotation card.

---

## 5. Evernote Interoperability (`src/components/io.js`)

### Export to ENEX:
Converts pages into valid standard Evernote `.enex` XML format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20261024T060000Z" application="AppFlowy Lean" version="1.0">
  <note>
    <title>Page Title</title>
    <content>
      <![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>...text...</en-note>]]>
    </content>
    <created>20261024T050000Z</created>
    <tag>work</tag>
    <tag>urgent</tag>
  </note>
</en-export>
```

### Import from ENEX:
Parses `.enex` XML files, extracts `<note>` tags, `<title>`, `<content>` (cleans ENML tags), `<tag>` elements, and instantiates native pages in the selected space.

---

## 6. UI & Shell Enhancements (`src/components/shell.js` & `src/styles.css`)

1. **Sidebar Tags Section**:
   - Collapsible `# TAGS` section in sidebar listing all workspace tags with badge counters.
   - Clicking a tag filters the active workspace view to show all matching notes.
2. **Note Header Tag Pills**:
   - Below page title: clickable tag chips with `+ Add Tag` quick-input.
3. **Scratchpad Button & Drawer (`Cmd+Shift+N`)**:
   - Floating quick-capture scratchpad accessible from any view.
   - One-click "Convert to Note" button.
4. **Reminders Section**:
   - Reminders bell icon in header with badge count.
   - Slide-out or filter view showing overdue and upcoming note deadlines.
5. **Web Clipper Modal (`Cmd+Shift+C`)**:
   - Dialog to paste URL and snippet, creating an instant clipped note with metadata.
6. **Note Info / Metadata Modal**:
   - Detailed inspector dialog showing note size, created/updated dates, word count, character count, and parent space.

---

## 7. Verification Criteria

1. **Unit Tests**:
   - `test/evernote.test.js`: Tag indexing, tag filtering, reminders classification, scratchpad conversion, ENEX export XML validity, ENEX import parsing.
2. **Regression Verification**:
   - All 18 existing AppFlowy & Notion unit tests continue to pass.
   - Headless smoke test passes with 0 errors.
3. **Live Desktop Verification**:
   - Window reflects tags, scratchpad, reminders, and audio block.
