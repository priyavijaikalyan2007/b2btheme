# Component Library Enhancements Needed

> Items identified during DockLayout integration testing (2026-02-17).
> These require changes to the CDN component library at `theme.priyavijai-kalyan2007.workers.dev`.

---

## 1. Toolbar: Right-Aligned Content Region

**Need:** Some apps need content on the right side of the toolbar (not toolbar buttons — custom HTML content).

**Use cases:**
- **Thinker**: Show selected session name and access level on the far right
- **Diagrams**: Show diagram name, type, version, and access permissions (currently a separate metadata bar)

**Proposed API:**
```typescript
interface ToolbarOptions {
    rightContent?: HTMLElement;  // Custom HTML element rendered right-aligned
}
```

**Priority:** High — Diagrams currently has a duplicate toolbar (metadata bar) that should be merged.

---

## 2. Toolbar: Embedded Input Support

**Need:** Strukture's search bar should be embedded in the toolbar rather than floating separately.

**Proposed API:**
```typescript
interface ToolbarItem {
    type?: 'button' | 'input';       // NEW: 'input' renders a search field
    placeholder?: string;             // Placeholder text for input type
    onInput?: (value: string) => void;
}
```

**Priority:** Medium — search currently works in its own container but should ideally be in the toolbar.

---

## 3. Toolbar: Title `minWidth`

**Need:** The app name (title region) is too narrow by default, making it invisible or clipped.

**Proposed API:**
```typescript
interface ToolbarTitle {
    minWidth?: string;  // e.g. '216px' — minimum width for the title region
}
```

**Workaround (current):** Using `backgroundColor` and `color` on `ToolbarTitle` to make it stand out, but width is still library-controlled.

**Priority:** High — app identity is lost without a visible title.

---

## 4. StatusBar: `getElement()` Method

**Need:** Access the status bar's root DOM element for attaching event listeners (e.g., click-to-copy on build region).

**Proposed API:**
```typescript
interface StatusBar {
    getElement(): HTMLElement;  // Returns the status bar's root DOM element
}
```

**Workaround (current):** Using `requestAnimationFrame` + `document.querySelector('[data-region="build"]')` after render.

**Priority:** Low — workaround is functional.

---

## 5. Thinker: Collapsible Sidebar Sections (App-Level)

**Note:** This is NOT a library enhancement — it's app-level UI work.

**Need:** In Thinker's right sidebar, make the AI Instructions, Description, and Title sections individually collapsible (accordion-style), similar to how categories are currently collapsible.

**Implementation:** Pure CSS/JS in `thinker-sidebar.ts` using `<details>`/`<summary>` or custom collapse toggles.

**Priority:** Medium — UX improvement for Thinker only.

---

## 6. Strukture: Tree Mode / Graph Mode Sidebar Unification (App-Level)

**Note:** This is NOT a library enhancement — it's app-level UI work.

**Need:** In Strukture, tree mode uses its own popout drawer for unit details instead of the shared right sidebar. Both modes should use the same Details sidebar.

**Implementation:** Wire tree mode's node selection to use `window.renderUnitDetails()` + `window.getDetailsSidebar().expand()` instead of the custom drawer.

**Priority:** Medium — consistency improvement.
