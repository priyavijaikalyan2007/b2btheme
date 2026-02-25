<!-- AGENT: Canonical ribbon configuration reference for coding agents. Use this
     when building createRibbon() configurations to ensure consistent grouping,
     naming, control types, and layout across all applications. -->

# Ribbon Setup Guide (Agent Reference)

This guide defines the canonical ribbon group patterns. When creating a ribbon
configuration, follow these patterns exactly. Do not merge groups that should be
separate, and do not split groups that should be together.

---

## Tabs

A ribbon has tabs. Each tab has groups. Groups have controls. The standard tab
order is:

| Tab ID | Label | Purpose | When to include |
|--------|-------|---------|-----------------|
| `file` | File | Backstage (Info, New, Save As, Print, Export) | Always |
| `home` | Home | Most-used editing commands | Always |
| `insert` | Insert | Insert new objects (tables, images, links, media) | Document/canvas apps |
| `design` | Design | Themes, page layout, backgrounds | Document/design apps |
| `layout` | Layout | Margins, orientation, spacing, columns | Document apps |
| `view` | View | View modes, zoom, show/hide UI elements | Always |
| `tools` | Tools | App-specific utilities (spell check, macros) | When needed |
| `help` | Help | Docs, shortcuts, about | Optional |

Contextual tabs (appear on selection) follow the standard tabs:

| Tab ID | Label | Trigger | Accent |
|--------|-------|---------|--------|
| `table-design` | Table Design | Table selected | `#e06030` |
| `picture-format` | Picture Format | Image selected | `#40a060` |
| `shape-format` | Shape Format | Shape selected | `#4080d0` |
| `chart-design` | Chart Design | Chart selected | `#8060c0` |

---

## Standard Groups by Tab

### Home Tab

| Group ID | Label | Priority | Controls |
|----------|-------|----------|----------|
| `clipboard` | Clipboard | 30 | Paste (large, split-button), Cut (small), Copy (small), Format Painter (small) |
| `font` | Font | 50 | Row 1: Font family dropdown (120px), font size dropdown (55px). Row 2: Bold, Italic, Underline, Strikethrough (all mini toggle), font color (mini color), highlight color (mini color) |
| `paragraph` | Paragraph | 40 | Row 1: Align Left/Center/Right/Justify (mini toggle). Row 2: Bullets, Numbering, Decrease Indent, Increase Indent (mini). Row 3: Line spacing (number) |
| `styles` | Styles | 60 | Gallery control with Normal, Heading 1-3, Subtitle, Quote |
| `editing` | Editing | 70 | Find (small), Replace (small), Select All (small) |

### Insert Tab

| Group ID | Label | Controls |
|----------|-------|----------|
| `tables` | Tables | Insert Table (large) |
| `illustrations` | Illustrations | Image (large), Shapes (small), Icons (small), Chart (small) |
| `links` | Links | Link (large), Bookmark (small), Comment (small) |
| `media` | Media | Video (small), Audio (small), Code Block (small) |
| `symbols` | Symbols | Equation (small), Symbol (small) |

### View Tab

| Group ID | Label | Controls |
|----------|-------|----------|
| `views` | Views | Normal (large toggle, active), Outline (small toggle), Preview (small toggle) |
| `show` | Show | Ruler (checkbox, checked), Gridlines (checkbox), Navigation Pane (checkbox) |
| `zoom` | Zoom | Zoom level (number, 25-400%, step 25), Dark Mode (toggle) |

---

## Group Rules

1. **Never merge Clipboard + Font.** Clipboard is paste/cut/copy. Font is
   typeface/size/style. They are always separate groups.

2. **Never merge Font + Paragraph.** Font controls character formatting.
   Paragraph controls block formatting. Separate groups.

3. **Never merge Illustrations + Links.** Illustrations are visual objects.
   Links are references. Separate groups.

4. **File operations go in the backstage**, not in Home tab groups. The File tab
   uses `backstage: true` and has sidebar items (Info, New, Save As, Print,
   Export, Close). It has no panel groups.

5. **Undo/Redo go in the QAT** (Quick Access Toolbar), not in ribbon groups.
   Standard QAT: Save, Undo, Redo.

6. **One gallery per group.** If a group has a gallery control, it should be the
   only control in that group (or the primary control with minor helpers).

---

## Collapse Priority

Lower numbers collapse first. Standard priorities:

| Priority | Groups |
|----------|--------|
| 30 | Clipboard |
| 40 | Paragraph |
| 50 | Font |
| 60 | Styles, Illustrations |
| 70 | Editing, Media, Links |

The most important groups (Font, Styles) survive longest.

---

## Control Size Rules

| Size | When to use |
|------|-------------|
| `large` | Primary action in a group (Paste, Insert Table, Insert Image, Insert Link). Max 1-2 large per group. |
| `small` | Secondary actions (Cut, Copy, Shapes, Icons). Show icon + label. |
| `mini` | Tertiary/toggle actions (Bold, Italic, alignment buttons). Icon only, label in tooltip. |

---

## Row Layout Pattern

Use `row-break` controls to arrange mini/small controls into explicit horizontal
rows within a group. This is the standard Office-style layout for Font and
Paragraph groups.

```
controls: [
    { type: "row-break", id: "r1" },   // Row 1 starts
    // ... row 1 controls ...
    { type: "row-break", id: "r2" },   // Row 2 starts
    // ... row 2 controls ...
]
```

The Font group always uses 2 rows:
- Row 1: font-family dropdown + font-size dropdown
- Row 2: B/I/U/S toggles + font color + highlight color

The Paragraph group always uses 2-3 rows:
- Row 1: alignment toggles (left/center/right/justify)
- Row 2: list toggles (bullets/numbering) + indent buttons
- Row 3: line spacing number input (optional)

---

## QAT (Quick Access Toolbar)

Standard items:

```javascript
qat: [
    { id: "save",  icon: "bi bi-floppy",                   tooltip: "Save",  keyTip: "1" },
    { id: "undo",  icon: "bi bi-arrow-counterclockwise",   tooltip: "Undo",  keyTip: "2" },
    { id: "redo",  icon: "bi bi-arrow-clockwise",          tooltip: "Redo",  keyTip: "3" }
]
```

Position: `qatPosition: "above"` (default). Never put Save/Undo/Redo in ribbon
groups — they belong in the QAT.

---

## Menu Bar (Optional)

If included, standard menu items:

| Menu | Items |
|------|-------|
| File | New, Open, Save, --- , Save As (submenu: DOCX/PDF/HTML), --- , Print, Close |
| Edit | Undo, Redo, --- , Cut, Copy, Paste, --- , Find, Replace, Select All |
| View | Normal, Outline, --- , Zoom In, Zoom Out, --- , Fullscreen |
| Help | Documentation, Keyboard Shortcuts, --- , About |

---

## Backstage (File Tab)

The File tab uses `backstage: true`. Standard sidebar items:

```javascript
backstageSidebar: [
    { id: "bs-info",   label: "Info",    icon: "bi bi-info-circle",      content: fn },
    { id: "bs-new",    label: "New",     icon: "bi bi-file-earmark-plus", content: fn },
    { id: "bs-save",   label: "Save As", icon: "bi bi-floppy",           onClick: fn },
    { id: "bs-print",  label: "Print",   icon: "bi bi-printer",          content: fn },
    { id: "bs-export", label: "Export",  icon: "bi bi-box-arrow-up",     content: fn }
]
```

---

## App-Specific Adaptations

Not every app needs every group. Strip what doesn't apply:

| App Type | Typical Tabs | Notes |
|----------|-------------|-------|
| Document editor | File, Home, Insert, Design, Layout, View | Full ribbon |
| Diagram/canvas | File, Home, Insert, View + contextual | Drop Layout, add Shape Format contextual |
| Data/grid app | File, Home, Insert, View | Drop Design/Layout, Insert has fewer groups |
| Settings/admin | File, Home, View | Minimal — consider if a ribbon is even needed |
| Dashboard | File, View | Very minimal — mostly view controls |

---

## Icon Conventions

Always use Bootstrap Icons (`bi bi-*`). Standard mappings:

| Action | Icon |
|--------|------|
| Paste | `bi bi-clipboard` |
| Cut | `bi bi-scissors` |
| Copy | `bi bi-files` |
| Format Painter | `bi bi-paint-bucket` |
| Bold | `bi bi-type-bold` |
| Italic | `bi bi-type-italic` |
| Underline | `bi bi-type-underline` |
| Strikethrough | `bi bi-type-strikethrough` |
| Align Left | `bi bi-text-left` |
| Align Center | `bi bi-text-center` |
| Align Right | `bi bi-text-right` |
| Justify | `bi bi-justify` |
| Bullets | `bi bi-list-ul` |
| Numbering | `bi bi-list-ol` |
| Decrease Indent | `bi bi-text-indent-left` |
| Increase Indent | `bi bi-text-indent-right` |
| Table | `bi bi-table` |
| Image | `bi bi-image` |
| Shapes | `bi bi-pentagon` |
| Chart | `bi bi-bar-chart` |
| Link | `bi bi-link-45deg` |
| Comment | `bi bi-chat-square-text` |
| Save | `bi bi-floppy` |
| Undo | `bi bi-arrow-counterclockwise` |
| Redo | `bi bi-arrow-clockwise` |
| Find | `bi bi-search` |
| Print | `bi bi-printer` |
| Video | `bi bi-camera-video` |
| Audio | `bi bi-music-note-beamed` |
| Code | `bi bi-code-slash` |

---

## Complete Minimal Example

```javascript
createRibbon({
    tabs: [
        {
            id: "file", label: "File", backstage: true, keyTip: "F",
            groups: [],
            backstageSidebar: [
                { id: "bs-info", label: "Info", icon: "bi bi-info-circle", content: infoPanel },
                { id: "bs-save", label: "Save As", icon: "bi bi-floppy", onClick: onSaveAs }
            ]
        },
        {
            id: "home", label: "Home", keyTip: "H",
            groups: [
                {
                    id: "clipboard", label: "Clipboard", collapsePriority: 30,
                    controls: [
                        { type: "split-button", id: "paste", label: "Paste", icon: "bi bi-clipboard", size: "large", keyTip: "V", menuItems: [...] },
                        { type: "button", id: "cut", label: "Cut", icon: "bi bi-scissors", size: "small", keyTip: "X" },
                        { type: "button", id: "copy", label: "Copy", icon: "bi bi-files", size: "small", keyTip: "C" }
                    ]
                },
                {
                    id: "font", label: "Font", collapsePriority: 50,
                    controls: [
                        { type: "row-break", id: "font-r1" },
                        { type: "dropdown", id: "font-family", options: [...], value: "Arial", width: "120px" },
                        { type: "dropdown", id: "font-size", options: [...], value: "11", width: "55px" },
                        { type: "row-break", id: "font-r2" },
                        { type: "button", id: "bold", label: "Bold", icon: "bi bi-type-bold", size: "mini", toggle: true, keyTip: "B" },
                        { type: "button", id: "italic", label: "Italic", icon: "bi bi-type-italic", size: "mini", toggle: true, keyTip: "I" },
                        { type: "button", id: "underline", label: "Underline", icon: "bi bi-type-underline", size: "mini", toggle: true, keyTip: "U" }
                    ]
                }
            ]
        },
        {
            id: "view", label: "View", keyTip: "W",
            groups: [
                {
                    id: "zoom", label: "Zoom",
                    controls: [
                        { type: "number", id: "zoom-level", label: "Zoom", value: 100, min: 25, max: 400, step: 25, suffix: "%", width: "60px" }
                    ]
                }
            ]
        }
    ],
    qat: [
        { id: "save", icon: "bi bi-floppy", tooltip: "Save", keyTip: "1" },
        { id: "undo", icon: "bi bi-arrow-counterclockwise", tooltip: "Undo", keyTip: "2" },
        { id: "redo", icon: "bi bi-arrow-clockwise", tooltip: "Redo", keyTip: "3" }
    ]
}, "ribbon-container");
```
