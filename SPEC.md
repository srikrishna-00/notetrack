# Specification: AppFlowy Lean Desktop Application

## 1. Objective & Vision
Build a lean, ultra-fast, local-first desktop application inspired by AppFlowy that preserves **100% of AppFlowy's core features** while drastically reducing code complexity and eliminating heavy multi-language FFI overhead.

Where AppFlowy requires 600,000+ lines of code across Flutter widgets, Rust crates, Protocol Buffers, and dual database engines (RocksDB + SQLite), **AppFlowy Lean** is architected in clean, modern, modular JavaScript (Node.js + Electron) with a unified reactive state engine, achieving full feature parity in ~3,000 lines of code.

---

## 2. Capability Map

| Capability | Module ID | Core Responsibilities |
|---|---|---|
| **Storage & Store** | `store` | Local-first atomic persistence, workspace schema, spaces, hierarchical pages, database tables, reactive change listeners, auto-save |
| **Workspace & Shell** | `shell` | Sidebar navigation, multi-workspace switcher, spaces (Personal/Work/Private), favorites, trash/restore, breadcrumbs, multi-tab bar |
| **Block Document Editor** | `editor` | Block tree model, slash command menu (`/`), text formatting (bold, italic, underline, strike, code, color, highlight, link), block types: H1-H3, todo, bullet, number, toggle, callout, quote, code block with syntax highlight, KaTeX math equation, divider, image, inline database |
| **Multi-View Database Engine** | `database` | Typed columns (Text, Number, Select, Multi-Select, Status, Date, Checkbox, URL, Email, Formula, CreatedTime), 6 views (Grid, Board/Kanban, Calendar, Gallery, Timeline, Chart), calculations bar (Sum/Avg/Min/Max/Count), filtering, sorting, and Row-as-Document modal |
| **AI Assistant & Templates** | `ai` | Drawer with 10 built-in AppFlowy prompt templates (Linux terminal, Cover letter, Business consultant, CEO, Accountant, Branding strategist, Summarizer, Code explainer, Grammar polisher) and configurable API integration |
| **Command Palette & Search** | `palette` | `Cmd/Ctrl + K` global modal search across titles and block contents, keyboard navigation |
| **Import / Export** | `io` | Markdown (.md) import/export, CSV import/export for database tables, full workspace JSON backup & restore |
| **Settings & Themes** | `settings` | Dark / Light / System theme, accent color customization, keyboard shortcuts modal, storage diagnostics |

---

## 3. Data Models & Schemas

### A. Workspace & Page Model
```json
{
  "id": "ws-default",
  "name": "My Workspace",
  "spaces": [
    { "id": "space-personal", "name": "Personal", "icon": "👤" },
    { "id": "space-work", "name": "Work", "icon": "💼" }
  ],
  "pages": {
    "page-1": {
      "id": "page-1",
      "spaceId": "space-personal",
      "parentId": null,
      "title": "Welcome to AppFlowy Lean",
      "icon": "🚀",
      "cover": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "isFavorite": true,
      "isLocked": false,
      "inTrash": false,
      "type": "document",
      "createdAt": 1729700000000,
      "updatedAt": 1729700000000,
      "blocks": [
        { "id": "b1", "type": "heading", "level": 1, "text": "Welcome to AppFlowy Lean!" },
        { "id": "b2", "type": "callout", "icon": "💡", "text": "A lightweight, 100% feature-complete alternative built without bloat." },
        { "id": "b3", "type": "todo", "text": "Try typing / for the slash command menu", "checked": false }
      ]
    }
  }
}
```

### B. Database & Multi-View Model
```json
{
  "id": "db-1",
  "title": "Project Roadmap & Tasks",
  "columns": [
    { "id": "c_title", "name": "Task Name", "type": "title" },
    { "id": "c_status", "name": "Status", "type": "select", "options": ["To Do", "In Progress", "Done"] },
    { "id": "c_priority", "name": "Priority", "type": "select", "options": ["Low", "Medium", "High", "Urgent"] },
    { "id": "c_due", "name": "Due Date", "type": "date" },
    { "id": "c_estimate", "name": "Est. Hours", "type": "number" },
    { "id": "c_done", "name": "Completed", "type": "checkbox" },
    { "id": "c_notes", "name": "URL / Docs", "type": "url" }
  ],
  "rows": [
    {
      "id": "r-1",
      "values": {
        "c_title": "Design Lean Engine",
        "c_status": "Done",
        "c_priority": "High",
        "c_due": "2026-10-24",
        "c_estimate": 4,
        "c_done": true,
        "c_notes": "https://appflowy.io"
      },
      "document": {
        "blocks": [
          { "id": "rb1", "type": "heading", "level": 2, "text": "Specification & Architecture" },
          { "id": "rb2", "type": "paragraph", "text": "Document details for this row item." }
        ]
      }
    }
  ],
  "views": [
    { "id": "v-grid", "type": "grid", "name": "All Tasks" },
    { "id": "v-board", "type": "board", "name": "Kanban Board", "groupBy": "c_status" },
    { "id": "v-calendar", "type": "calendar", "name": "Calendar View", "dateColumn": "c_due" },
    { "id": "v-gallery", "type": "gallery", "name": "Card Gallery" },
    { "id": "v-timeline", "type": "timeline", "name": "Gantt Timeline", "dateColumn": "c_due" },
    { "id": "v-chart", "type": "chart", "name": "Effort by Status", "groupBy": "c_status", "measureColumn": "c_estimate" }
  ]
}
```

---

## 4. Commands & Development Scripts
- **Start Desktop App**: `npm start` (Runs Electron app)
- **Run Automated Test Suite**: `npm test` (Runs `node --test test/*.test.js`)
- **Smoke Test**: `npm run smoke` (Automated headless/synthetic UI check)
- **Web / Preview Mode**: `npm run web` (Serves local web preview via built-in HTTP server)

---

## 5. Success Criteria & Verification
1. Workspace navigation supports nested sub-pages, spaces, favorites, and trash with restore.
2. Multi-tab navigation allows opening, switching, and closing multiple pages.
3. Document editor supports all 13 block types, slash command menu, inline formatting, math equations, and code blocks.
4. Database engine supports all 6 views (Grid, Board, Calendar, Gallery, Timeline, Chart) with real-time reactive sync.
5. Every database row opens as a full nested sub-document.
6. AI drawer is preloaded with AppFlowy's built-in prompt templates and provides conversational responses.
7. `Cmd+K` command palette provides instant fuzzy search across titles and content.
8. Full Markdown and CSV import/export functions without data loss.
9. 100% test coverage of store, views, and data conversions.
