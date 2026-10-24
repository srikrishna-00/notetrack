# Implementation Plan: AppFlowy Lean

## Phase 1: Foundation & Scaffold
- [ ] 1.1: Initialize `package.json` with scripts (`start`, `test`, `web`, `smoke`), dependencies (`electron`), and metadata.
- [ ] 1.2: Build Electron main process `src/main.js` with IPC channels for file dialogs, system preferences, and window management.
- [ ] 1.3: Create preload script `src/preload.js` exposing secure APIs to the renderer.

## Phase 2: Reactive Data Store & Local Persistence
- [ ] 2.1: Implement `src/store.js` managing workspaces, spaces, hierarchical pages, database collections, favorites, and trash.
- [ ] 2.2: Implement local-first atomic saving (localStorage fallback + file persistence).
- [ ] 2.3: Provide default starter workspace with interactive sample document and sample project database.

## Phase 3: Desktop Shell & Navigation
- [ ] 3.1: Build `src/index.html` and modern stylesheet `src/styles.css` supporting light and dark themes.
- [ ] 3.2: Implement Sidebar with Workspace switcher, Spaces (Personal, Work, Private), Expandable page tree with drag-and-drop, Favorites section, and Trash.
- [ ] 3.3: Implement Tab Bar for opening multiple documents simultaneously with tab closing and switching.
- [ ] 3.4: Implement Breadcrumb trail and Page Header with emoji picker, cover image picker, title inline editing, and page locking.

## Phase 4: Rich Block Document Editor
- [ ] 4.1: Implement `src/components/editor.js` managing block lists and selection.
- [ ] 4.2: Implement Slash Command menu (`/`) for inserting blocks quickly with keyboard navigation.
- [ ] 4.3: Implement Block types: Heading (H1, H2, H3), Paragraph, Todo/Checkbox, Bullet list, Numbered list, Toggle list, Callout, Quote, Code block (with language selector), Math equation, Divider, Image embed, and Inline Database.
- [ ] 4.4: Implement inline formatting toolbar: Bold, Italic, Underline, Strikethrough, Code, Color, Highlight, Link.

## Phase 5: Multi-View Database Engine
- [ ] 5.1: Implement `src/components/database.js` managing columns, rows, filters, and sorts.
- [ ] 5.2: Implement **Grid View** with typed columns (Text, Number, Select, Multi-select, Status, Date, Checkbox, URL, Email, Formula), in-cell editing, and summary calculations (Count, Sum, Avg, Min, Max).
- [ ] 5.3: Implement **Board (Kanban) View** with drag-and-drop column groupings and status updates.
- [ ] 5.4: Implement **Calendar View** rendering records on a monthly grid by date column.
- [ ] 5.5: Implement **Gallery View** with card previews and tags.
- [ ] 5.6: Implement **Timeline View** with horizontal Gantt bars.
- [ ] 5.7: Implement **Chart View** generating dynamic summary bar/line charts.
- [ ] 5.8: Implement **Row-as-Document** modal: Clicking any row opens its full nested block document.

## Phase 6: AI Assistant & Built-in Templates
- [ ] 6.1: Implement `src/components/ai.js` providing a sliding assistant drawer.
- [ ] 6.2: Integrate the 10 AppFlowy prompt templates (Terminal, Cover Letter, Business Plan, Niche Finder, CEO Advisor, Accountant, Branding Strategist, Summarizer, Code Explainer, Grammar Polisher).
- [ ] 6.3: Implement contextual document assistance (Summarize page, Improve writing, Extract action items).

## Phase 7: Command Palette, Import/Export & Settings
- [ ] 7.1: Implement `Cmd/Ctrl + K` Command Palette with instant fuzzy search across all titles and block contents.
- [ ] 7.2: Implement Markdown (.md) import and export.
- [ ] 7.3: Implement CSV import and export for database grids.
- [ ] 7.4: Implement Settings modal with theme switching (Light/Dark), accent colors, and keyboard shortcuts reference.

## Phase 8: Automated Test Suite & Verification
- [ ] 8.1: Write unit tests in `test/store.test.js` verifying workspace CRUD, page hierarchy, trash restore, and database queries.
- [ ] 8.2: Write unit tests in `test/editor.test.js` verifying block operations, slash menu, and markdown conversion.
- [ ] 8.3: Write unit tests in `test/database.test.js` verifying all 6 views, calculations, filters, and sorts.
- [ ] 8.4: Write unit tests in `test/io.test.js` verifying Markdown and CSV import/export.
- [ ] 8.5: Run test suite and smoke verification script to guarantee zero regressions.
