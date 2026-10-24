# Specification: Notion Feature Enhancements for AppFlowy Lean

## 1. Objective
Expand **AppFlowy Lean** to include **all signature Notion capabilities** that distinguish Notion's productivity workflow, creating a unified power-workspace combining AppFlowy's local-first multi-view database engine with Notion's advanced editor, writing tools, and knowledge graph capabilities.

---

## 2. Notion Capabilities to Integrate

| Capability | Module | Specifications |
|---|---|---|
| **1. Markdown Auto-Formatting** | `editor` | Typing `# `, `## `, `### `, `- `, `* `, `1. `, `[] `, `[x] `, `> `, `---`, ```` ``` ````, `$$`, `"" ` automatically converts the current line to its corresponding block type without opening menus. Inline `**bold**`, `*italic*`, `~~strike~~`, and `` `code` `` formatted automatically. |
| **2. Notion Page Styling Options** | `shell` / `editor` | ⋯ Menu: **Font Family** (Default Sans, Serif, Mono), **Small Text** toggle, **Full Width** toggle, **Word Count**, **Character Count**, and **Reading Time** indicators. |
| **3. Table of Contents (TOC) Block** | `editor` | Dynamic TOC block (`type: 'toc'`) that automatically scans H1, H2, H3 headings across the page and renders clickable anchor jump links. |
| **4. Simple Table Block** | `editor` | Lightweight 2D table block (`type: 'table'`) with customizable rows, columns, and optional styled header row, with Tab and Enter cell navigation. |
| **5. Web Bookmark & Embed Block** | `editor` | Bookmark block (`type: 'bookmark'`) rendering link preview cards with title, description, and domain badge. |
| **6. Synced Blocks** | `store` / `editor` | Synced block (`isSynced: true`, `syncSourceId`) allowing a block to be shared across multiple pages with changes synchronizing across all instances. |
| **7. Page Backlinks & @Mentions** | `store` / `shell` | `@page` or `[[page]]` mentions linking documents. Automatic **Backlinks Section** displayed at the top or bottom of every document showing all incoming references. |
| **8. Multi-Select Tags in Database** | `database` / `store` | Support for `multi_select` property with multiple custom color badges per row cell. |
| **9. Database Formula Engine** | `database` / `store` | Notion-style formula parser supporting property references (`prop("column")`), arithmetic (`+`, `-`, `*`, `/`), comparisons, and functions (`round`, `min`, `max`, `concat`, `if`). |
| **10. Notion Iconic Templates** | `store` | Pre-built template library: Meeting Notes, Weekly Sprint Tasks, Daily Journal, Product Roadmap, and Reading List. |
| **11. Writing Modes** | `shell` | **Focus Mode** (<kbd>Cmd+Shift+F</kbd>), **Typewriter Mode** (<kbd>Cmd+Shift+T</kbd>), **Document Outline Drawer** (<kbd>Cmd+Shift+O</kbd>), and **Daily Note Shortcut** (<kbd>Cmd+Shift+D</kbd>). |
