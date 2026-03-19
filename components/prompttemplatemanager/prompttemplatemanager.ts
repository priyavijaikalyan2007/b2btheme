/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PromptTemplateManager
 * 📜 PURPOSE: Two-pane CRUD interface for managing prompt templates with
 *             variable extraction, preview, tags, categories, and import/export.
 * 🔗 RELATES: [[EnterpriseTheme]], [[SplitLayout]], [[PromptTemplateManagerSpec]]
 * ⚡ FLOW: [Consumer App] -> [createPromptTemplateManager()] -> [SplitLayout]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PromptTemplateManager]";
const CLS = "promptmanager";
const SEARCH_DEBOUNCE_MS = 200;
const VARIABLE_DEBOUNCE_MS = 300;
const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    save: "Ctrl+s",
    newTemplate: "Ctrl+n",
    togglePreview: "Ctrl+p",
    clearSearch: "Escape",
    searchDown: "ArrowDown",
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PromptVariableType = "text" | "number" | "select" | "textarea";

export interface PromptVariable
{
    name: string;
    defaultValue?: string;
    description?: string;
    type?: PromptVariableType;
    options?: string[];
    required?: boolean;
}

export interface PromptTemplate
{
    id: string;
    name: string;
    description?: string;
    content: string;
    category?: string;
    tags?: string[];
    variables?: PromptVariable[];
    version?: number;
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    metadata?: Record<string, unknown>;
}

export interface PromptTemplateManagerOptions
{
    templates?: PromptTemplate[];
    categories?: string[];
    showPreview?: boolean;
    showVariableEditor?: boolean;
    showImportExport?: boolean;
    showSearch?: boolean;
    editorHeight?: string;
    listWidth?: number;
    height?: string;
    readOnly?: boolean;
    cssClass?: string;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
    onSave?: (template: PromptTemplate) => Promise<PromptTemplate>;
    onDelete?: (templateId: string) => Promise<boolean>;
    onDuplicate?: (template: PromptTemplate) => Promise<PromptTemplate>;
    onPreview?: (content: string, variables: Record<string, string>) => Promise<string>;
    onLoadTemplates?: () => Promise<PromptTemplate[]>;
    onSelect?: (template: PromptTemplate) => void;
    onChange?: (template: PromptTemplate) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function createElement(tag: string, cls?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (cls) { el.className = cls; }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function generateId(): string
{
    return "tpl-" + Date.now() + "-" + (++instanceCounter);
}

function nowISO(): string
{
    return new Date().toISOString();
}

function safeCallback<T>(fn: () => T, fallback: T): T
{
    try { return fn(); }
    catch (e) { console.error(LOG_PREFIX, "Callback error:", e); return fallback; }
}

async function safeAsync<T>(
    fn: () => Promise<T>,
    fallback: T
): Promise<T>
{
    try { return await fn(); }
    catch (e) { console.error(LOG_PREFIX, "Async callback error:", e); return fallback; }
}

function debounce(fn: () => void, delayMs: number): () => void
{
    let timer: number | undefined;
    return (): void =>
    {
        clearTimeout(timer);
        timer = window.setTimeout(fn, delayMs);
    };
}

// ============================================================================
// VARIABLE EXTRACTION
// ============================================================================

function extractVariableNames(content: string): string[]
{
    const regex = /\{\{(\w+)\}\}/g;
    const names: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null)
    {
        const name = match[1];
        if (!seen.has(name))
        {
            seen.add(name);
            names.push(name);
        }
    }

    return names;
}

function mergeVariables(
    names: string[],
    existing: PromptVariable[]
): PromptVariable[]
{
    const existingMap = new Map<string, PromptVariable>();
    for (const v of existing) { existingMap.set(v.name, v); }

    return names.map(function(name)
    {
        const prev = existingMap.get(name);
        if (prev) { return prev; }
        return { name, type: "text" as PromptVariableType };
    });
}

function substituteVariables(
    content: string,
    values: Record<string, string>
): string
{
    return content.replace(
        /\{\{(\w+)\}\}/g,
        function(full, name) { return values[name] || full; }
    );
}

// ============================================================================
// CLASS: PromptTemplateManager
// ============================================================================

export class PromptTemplateManager
{
    private readonly instanceId: string;
    private readonly opts: PromptTemplateManagerOptions;
    private templates: PromptTemplate[] = [];
    private selectedId: string | null = null;
    private dirtyIds = new Set<string>();
    private variableValues = new Map<string, Record<string, string>>();
    private previewVisible = false;
    private destroyed = false;
    private shown = false;

    // DOM
    private rootEl: HTMLElement | null = null;
    private splitEl: HTMLElement | null = null;
    private listPaneEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private detailEl: HTMLElement | null = null;
    private nameInput: HTMLInputElement | null = null;
    private descInput: HTMLInputElement | null = null;
    private categorySelect: HTMLSelectElement | null = null;
    private tagsContainer: HTMLElement | null = null;
    private tagsInput: HTMLInputElement | null = null;
    private editorEl: HTMLTextAreaElement | null = null;
    private variablesSection: HTMLElement | null = null;
    private previewPanel: HTMLElement | null = null;
    private previewBtn: HTMLElement | null = null;
    private statusBar: HTMLElement | null = null;
    private importInput: HTMLInputElement | null = null;
    private emptyDetail: HTMLElement | null = null;

    // Debounced functions
    private debouncedSearch: (() => void) | null = null;
    private debouncedExtract: (() => void) | null = null;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: PromptTemplateManagerOptions)
    {
        this.instanceId = CLS + "-" + (++instanceCounter);
        this.opts = options;
        this.templates = (options.templates || []).map(function(t)
        {
            return { ...t };
        });

        this.rootEl = this.buildRoot();
        this.debouncedSearch = debounce(
            () => this.filterTemplates(), SEARCH_DEBOUNCE_MS
        );
        this.debouncedExtract = debounce(
            () => this.onVariablesExtracted(), VARIABLE_DEBOUNCE_MS
        );

        console.log(LOG_PREFIX, "Created:", this.instanceId,
            "templates:", this.templates.length);
    }

    // ========================================================================
    // BUILD: ROOT STRUCTURE
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", CLS);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "region");
        setAttr(root, "aria-label", "Prompt Template Manager");

        if (this.opts.cssClass)
        {
            root.classList.add(...this.opts.cssClass.split(" "));
        }
        if (this.opts.readOnly) { root.classList.add(CLS + "-readonly"); }

        root.style.height = this.opts.height || "600px";

        root.appendChild(this.buildHeader());
        root.appendChild(this.buildBody());
        root.appendChild(this.buildStatusBar());
        this.importInput = this.buildImportInput();
        root.appendChild(this.importInput);

        root.addEventListener("keydown", (e) => this.onGlobalKeyDown(e));

        return root;
    }

    // ========================================================================
    // BUILD: HEADER
    // ========================================================================

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", CLS + "-header");
        const title = createElement("h3", CLS + "-title");
        title.textContent = "Prompt Templates";
        header.appendChild(title);

        const actions = createElement("div", CLS + "-header-actions");
        if (!this.opts.readOnly)
        {
            actions.appendChild(this.buildHeaderBtn(
                "new", "bi-plus-lg", "New", "Create new template"
            ));
        }
        if (this.opts.showImportExport !== false)
        {
            actions.appendChild(this.buildHeaderBtn(
                "import", "bi-upload", "Import", "Import templates"
            ));
            actions.appendChild(this.buildHeaderBtn(
                "export", "bi-download", "Export", "Export templates"
            ));
        }
        header.appendChild(actions);
        return header;
    }

    private buildHeaderBtn(
        type: string, icon: string, label: string, ariaLabel: string
    ): HTMLElement
    {
        const btn = createElement("button", CLS + "-btn " + CLS + "-btn-" + type);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", ariaLabel);
        setAttr(btn, "title", ariaLabel);

        const i = createElement("i", "bi " + icon);
        setAttr(i, "aria-hidden", "true");
        btn.appendChild(i);

        const span = createElement("span");
        span.textContent = label;
        btn.appendChild(span);

        btn.addEventListener("click", () => this.onHeaderAction(type));
        return btn;
    }

    // ========================================================================
    // BUILD: BODY (SPLIT LAYOUT)
    // ========================================================================

    private buildBody(): HTMLElement
    {
        const body = createElement("div", CLS + "-body");

        this.splitEl = createElement("div", CLS + "-split");
        this.listPaneEl = this.buildListPane();
        const listWidth = this.opts.listWidth || 300;
        this.listPaneEl.style.width = listWidth + "px";
        this.listPaneEl.style.minWidth = "200px";
        this.splitEl.appendChild(this.listPaneEl);

        const divider = createElement("div", CLS + "-divider");
        this.bindDividerDrag(divider);
        this.splitEl.appendChild(divider);

        const detailContent = this.buildDetailPane();
        this.splitEl.appendChild(detailContent);

        body.appendChild(this.splitEl);
        return body;
    }

    private bindDividerDrag(divider: HTMLElement): void
    {
        let startX = 0;
        let startWidth = 0;

        const onMove = (e: PointerEvent): void =>
        {
            if (!this.listPaneEl) { return; }
            const delta = e.clientX - startX;
            const newWidth = Math.max(200, startWidth + delta);
            this.listPaneEl.style.width = newWidth + "px";
        };

        const onUp = (e: PointerEvent): void =>
        {
            divider.releasePointerCapture(e.pointerId);
            divider.classList.remove(CLS + "-divider-active");
            divider.removeEventListener("pointermove", onMove);
            divider.removeEventListener("pointerup", onUp);
        };

        divider.addEventListener("pointerdown", (e: PointerEvent) =>
        {
            e.preventDefault();
            startX = e.clientX;
            startWidth = this.listPaneEl
                ? this.listPaneEl.getBoundingClientRect().width : 300;
            divider.setPointerCapture(e.pointerId);
            divider.classList.add(CLS + "-divider-active");
            divider.addEventListener("pointermove", onMove);
            divider.addEventListener("pointerup", onUp);
        });
    }

    // ========================================================================
    // BUILD: LIST PANE
    // ========================================================================

    private buildListPane(): HTMLElement
    {
        const pane = createElement("div", CLS + "-list-pane-inner");

        if (this.opts.showSearch !== false)
        {
            pane.appendChild(this.buildSearchRow());
        }

        this.listEl = createElement("div", CLS + "-list");
        setAttr(this.listEl, "role", "listbox");
        setAttr(this.listEl, "aria-label", "Template list");
        pane.appendChild(this.listEl);

        this.renderTemplateList();
        return pane;
    }

    private buildSearchRow(): HTMLElement
    {
        const row = createElement("div", CLS + "-search");
        const icon = createElement("i", "bi bi-search " + CLS + "-search-icon");
        setAttr(icon, "aria-hidden", "true");
        row.appendChild(icon);

        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchInput.className = CLS + "-search-input";
        setAttr(this.searchInput, "placeholder", "Search templates...");
        setAttr(this.searchInput, "aria-label", "Search templates");
        this.searchInput.addEventListener("input", () =>
        {
            if (this.debouncedSearch) { this.debouncedSearch(); }
        });
        this.searchInput.addEventListener("keydown", (e) =>
            this.onSearchKeyDown(e));
        row.appendChild(this.searchInput);

        return row;
    }

    // ========================================================================
    // BUILD: DETAIL PANE
    // ========================================================================

    private buildDetailPane(): HTMLElement
    {
        const pane = createElement("div", CLS + "-detail-pane-inner");
        this.detailEl = createElement("div", CLS + "-detail");
        this.detailEl.style.display = "none";

        this.detailEl.appendChild(this.buildDetailHeader());
        this.detailEl.appendChild(this.buildMetaSection());
        this.detailEl.appendChild(this.buildEditorSection());

        if (this.opts.showVariableEditor !== false)
        {
            this.variablesSection = createElement("div",
                CLS + "-variables-section");
            this.detailEl.appendChild(this.variablesSection);
        }

        if (this.opts.showPreview !== false)
        {
            this.detailEl.appendChild(this.buildPreviewSection());
        }

        pane.appendChild(this.detailEl);

        this.emptyDetail = createElement("div", CLS + "-detail-empty");
        this.emptyDetail.textContent = "Select a template to edit, "
            + "or click + New to create one.";
        pane.appendChild(this.emptyDetail);

        return pane;
    }

    private buildDetailHeader(): HTMLElement
    {
        const header = createElement("div", CLS + "-detail-header");

        this.nameInput = document.createElement("input");
        this.nameInput.type = "text";
        this.nameInput.className = CLS + "-name-input";
        setAttr(this.nameInput, "aria-label", "Template name");
        setAttr(this.nameInput, "placeholder", "Template name");
        this.nameInput.addEventListener("input", () => this.onFieldChange());
        header.appendChild(this.nameInput);

        if (!this.opts.readOnly)
        {
            header.appendChild(this.buildDetailActions());
        }

        return header;
    }

    private buildDetailActions(): HTMLElement
    {
        const acts = createElement("div", CLS + "-detail-actions");

        acts.appendChild(this.buildActionBtn(
            "save", "bi-floppy", "Save template", "Save (Ctrl+S)"
        ));
        acts.appendChild(this.buildActionBtn(
            "duplicate", "bi-copy", "Duplicate template", "Duplicate"
        ));
        acts.appendChild(this.buildActionBtn(
            "delete", "bi-trash3", "Delete template", "Delete"
        ));

        return acts;
    }

    private buildActionBtn(
        type: string, icon: string, ariaLabel: string, title: string
    ): HTMLElement
    {
        const btn = createElement("button",
            CLS + "-btn " + CLS + "-btn-" + type);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", ariaLabel);
        setAttr(btn, "title", title);

        const i = createElement("i", "bi " + icon);
        setAttr(i, "aria-hidden", "true");
        btn.appendChild(i);

        btn.addEventListener("click", () => this.onDetailAction(type));
        return btn;
    }

    // ========================================================================
    // BUILD: METADATA (CATEGORY + TAGS)
    // ========================================================================

    private buildMetaSection(): HTMLElement
    {
        const meta = createElement("div", CLS + "-detail-meta");
        meta.appendChild(this.buildCategoryField());
        meta.appendChild(this.buildTagsField());

        this.descInput = document.createElement("input");
        this.descInput.type = "text";
        this.descInput.className = CLS + "-desc-input";
        setAttr(this.descInput, "aria-label", "Template description");
        setAttr(this.descInput, "placeholder", "Description (optional)");
        this.descInput.addEventListener("input", () => this.onFieldChange());
        meta.insertBefore(this.descInput, meta.firstChild);

        return meta;
    }

    private buildCategoryField(): HTMLElement
    {
        const field = createElement("div", CLS + "-meta-field");
        const label = createElement("label", CLS + "-meta-label");
        label.textContent = "Category";
        setAttr(label, "for", this.instanceId + "-category");
        field.appendChild(label);

        this.categorySelect = document.createElement("select");
        this.categorySelect.className = CLS + "-category-select";
        this.categorySelect.id = this.instanceId + "-category";
        setAttr(this.categorySelect, "aria-label", "Template category");
        this.populateCategoryOptions();
        this.categorySelect.addEventListener("change",
            () => this.onFieldChange());
        field.appendChild(this.categorySelect);

        return field;
    }

    private populateCategoryOptions(): void
    {
        if (!this.categorySelect) { return; }
        this.categorySelect.innerHTML = "";

        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "No category";
        this.categorySelect.appendChild(empty);

        const cats = this.opts.categories || [];
        for (const cat of cats)
        {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            this.categorySelect.appendChild(opt);
        }
    }

    private buildTagsField(): HTMLElement
    {
        const field = createElement("div", CLS + "-meta-field");
        const label = createElement("label", CLS + "-meta-label");
        label.textContent = "Tags";
        setAttr(label, "for", this.instanceId + "-tags");
        field.appendChild(label);

        this.tagsContainer = createElement("div", CLS + "-tags-container");
        this.tagsInput = document.createElement("input");
        this.tagsInput.type = "text";
        this.tagsInput.className = CLS + "-tags-input";
        this.tagsInput.id = this.instanceId + "-tags";
        setAttr(this.tagsInput, "placeholder", "Add tag...");
        setAttr(this.tagsInput, "aria-label", "Add tag");
        this.tagsInput.addEventListener("keydown",
            (e) => this.onTagKeyDown(e));
        this.tagsInput.addEventListener("blur",
            () => this.commitTagInput());
        this.tagsContainer.appendChild(this.tagsInput);
        field.appendChild(this.tagsContainer);

        return field;
    }

    // ========================================================================
    // BUILD: EDITOR & PREVIEW
    // ========================================================================

    private buildEditorSection(): HTMLElement
    {
        const section = createElement("div", CLS + "-editor-section");
        const label = createElement("label", CLS + "-editor-label");
        label.textContent = "Prompt";
        setAttr(label, "for", this.instanceId + "-content");
        section.appendChild(label);

        this.editorEl = document.createElement("textarea");
        this.editorEl.className = CLS + "-editor";
        this.editorEl.id = this.instanceId + "-content";
        setAttr(this.editorEl, "aria-label", "Prompt content");
        this.editorEl.style.height = this.opts.editorHeight || "300px";

        if (this.opts.readOnly)
        {
            setAttr(this.editorEl, "readonly", "true");
        }

        this.editorEl.addEventListener("input", () =>
        {
            this.onFieldChange();
            if (this.debouncedExtract) { this.debouncedExtract(); }
        });
        section.appendChild(this.editorEl);

        return section;
    }

    private buildPreviewSection(): HTMLElement
    {
        const section = createElement("div", CLS + "-preview-section");

        this.previewBtn = createElement("button",
            CLS + "-btn " + CLS + "-btn-preview");
        setAttr(this.previewBtn, "type", "button");
        setAttr(this.previewBtn, "aria-expanded", "false");
        setAttr(this.previewBtn, "aria-controls",
            this.instanceId + "-preview");

        const icon = createElement("i", "bi bi-eye");
        setAttr(icon, "aria-hidden", "true");
        this.previewBtn.appendChild(icon);
        const span = createElement("span");
        span.textContent = "Preview";
        this.previewBtn.appendChild(span);
        this.previewBtn.addEventListener("click", () => this.togglePreview());
        section.appendChild(this.previewBtn);

        this.previewPanel = createElement("div", CLS + "-preview-panel");
        this.previewPanel.id = this.instanceId + "-preview";
        setAttr(this.previewPanel, "role", "region");
        setAttr(this.previewPanel, "aria-label", "Template preview");
        this.previewPanel.style.display = "none";
        section.appendChild(this.previewPanel);

        return section;
    }

    // ========================================================================
    // BUILD: STATUS BAR & IMPORT INPUT
    // ========================================================================

    private buildStatusBar(): HTMLElement
    {
        this.statusBar = createElement("div", CLS + "-statusbar");
        setAttr(this.statusBar, "role", "status");
        setAttr(this.statusBar, "aria-live", "polite");
        this.updateStatusBar();
        return this.statusBar;
    }

    private buildImportInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "file";
        input.className = CLS + "-import-file";
        setAttr(input, "accept", ".json");
        setAttr(input, "aria-hidden", "true");
        input.style.display = "none";
        input.addEventListener("change", () => this.onImportFileSelected());
        return input;
    }

    // ========================================================================
    // TEMPLATE LIST RENDERING
    // ========================================================================

    private renderTemplateList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.innerHTML = "";

        if (this.templates.length === 0)
        {
            this.appendListEmpty("No templates yet. Click + New to create one.");
            return;
        }

        for (const tpl of this.templates)
        {
            this.listEl.appendChild(this.buildListItem(tpl));
        }
    }

    private buildListItem(tpl: PromptTemplate): HTMLElement
    {
        const item = createElement("div", CLS + "-list-item");
        setAttr(item, "role", "option");
        setAttr(item, "data-template-id", tpl.id);
        const isSelected = tpl.id === this.selectedId;
        setAttr(item, "aria-selected", String(isSelected));
        if (isSelected) { item.classList.add(CLS + "-list-item-selected"); }
        if (this.dirtyIds.has(tpl.id))
        {
            item.classList.add(CLS + "-list-item-dirty");
        }

        const name = createElement("span", CLS + "-list-item-name");
        name.textContent = tpl.name || "Untitled";
        item.appendChild(name);

        if (tpl.category)
        {
            const cat = createElement("span", CLS + "-list-item-category");
            cat.textContent = tpl.category;
            item.appendChild(cat);
        }

        item.addEventListener("click", () => this.selectTemplate(tpl.id));
        return item;
    }

    private appendListEmpty(message: string): void
    {
        if (!this.listEl) { return; }
        const el = createElement("div", CLS + "-list-empty");
        el.textContent = message;
        this.listEl.appendChild(el);
    }

    // ========================================================================
    // DETAIL PANE RENDERING
    // ========================================================================

    private renderDetail(): void
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl)
        {
            this.showEmptyDetail(true);
            return;
        }

        this.showEmptyDetail(false);
        this.populateNameAndDesc(tpl);
        this.populateCategory(tpl);
        this.renderTags(tpl.tags || []);
        if (this.editorEl) { this.editorEl.value = tpl.content || ""; }
        this.renderVariables();
        this.hidePreview();
        this.updateStatusBar();
    }

    private showEmptyDetail(show: boolean): void
    {
        if (this.detailEl)
        {
            this.detailEl.style.display = show ? "none" : "";
        }
        if (this.emptyDetail)
        {
            this.emptyDetail.style.display = show ? "" : "none";
        }
    }

    private populateNameAndDesc(tpl: PromptTemplate): void
    {
        if (this.nameInput) { this.nameInput.value = tpl.name || ""; }
        if (this.descInput) { this.descInput.value = tpl.description || ""; }
    }

    private populateCategory(tpl: PromptTemplate): void
    {
        if (this.categorySelect)
        {
            this.categorySelect.value = tpl.category || "";
        }
    }

    // ========================================================================
    // TAGS
    // ========================================================================

    private renderTags(tags: string[]): void
    {
        if (!this.tagsContainer || !this.tagsInput) { return; }

        // Remove existing tag badges
        const existing = this.tagsContainer.querySelectorAll(
            "." + CLS + "-tag"
        );
        existing.forEach(function(el) { el.remove(); });

        // Insert badges before the input
        for (const tag of tags)
        {
            const badge = this.buildTagBadge(tag);
            this.tagsContainer.insertBefore(badge, this.tagsInput);
        }
    }

    private buildTagBadge(tag: string): HTMLElement
    {
        const badge = createElement("span", CLS + "-tag");
        badge.appendChild(document.createTextNode(tag));

        if (!this.opts.readOnly)
        {
            const btn = createElement("button", CLS + "-tag-remove");
            setAttr(btn, "type", "button");
            setAttr(btn, "aria-label", "Remove tag " + tag);
            const icon = createElement("i", "bi bi-x");
            setAttr(icon, "aria-hidden", "true");
            btn.appendChild(icon);
            btn.addEventListener("click", () => this.removeTag(tag));
            badge.appendChild(btn);
        }

        return badge;
    }

    private onTagKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" || e.key === ",")
        {
            e.preventDefault();
            this.commitTagInput();
        }
        else if (e.key === "Backspace" && this.tagsInput
            && this.tagsInput.value === "")
        {
            this.removeLastTag();
        }
    }

    private commitTagInput(): void
    {
        if (!this.tagsInput) { return; }
        const raw = this.tagsInput.value.trim();
        if (raw.length === 0) { return; }

        const newTags = raw.split(",").map(function(s)
        {
            return s.trim();
        }).filter(function(s) { return s.length > 0; });

        this.tagsInput.value = "";
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        const current = tpl.tags || [];
        for (const tag of newTags)
        {
            if (current.indexOf(tag) < 0) { current.push(tag); }
        }
        tpl.tags = current;
        this.renderTags(current);
        this.markDirty();
    }

    private removeTag(tag: string): void
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl || !tpl.tags) { return; }
        tpl.tags = tpl.tags.filter(function(t) { return t !== tag; });
        this.renderTags(tpl.tags);
        this.markDirty();
    }

    private removeLastTag(): void
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl || !tpl.tags || tpl.tags.length === 0) { return; }
        tpl.tags.pop();
        this.renderTags(tpl.tags);
        this.markDirty();
    }

    // ========================================================================
    // VARIABLE RENDERING
    // ========================================================================

    private renderVariables(): void
    {
        if (!this.variablesSection) { return; }
        this.variablesSection.innerHTML = "";

        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        const names = extractVariableNames(tpl.content || "");
        tpl.variables = mergeVariables(names, tpl.variables || []);

        const heading = createElement("h4", CLS + "-variables-title");
        heading.textContent = "Variables (" + names.length + " detected)";
        this.variablesSection.appendChild(heading);

        if (names.length === 0)
        {
            const empty = createElement("div", CLS + "-variables-empty");
            empty.textContent = "No variables detected.";
            this.variablesSection.appendChild(empty);
            return;
        }

        const list = createElement("div", CLS + "-variables-list");
        for (const v of tpl.variables)
        {
            list.appendChild(this.buildVariableField(v, tpl.id));
        }
        this.variablesSection.appendChild(list);
    }

    private buildVariableField(
        variable: PromptVariable, tplId: string
    ): HTMLElement
    {
        const field = createElement("div", CLS + "-variable-field");
        const label = createElement("label", CLS + "-variable-label");
        label.textContent = variable.name;
        const inputId = this.instanceId + "-var-" + variable.name;
        setAttr(label, "for", inputId);
        field.appendChild(label);

        const input = this.buildVariableInput(variable, inputId, tplId);
        field.appendChild(input);

        return field;
    }

    private buildVariableInput(
        variable: PromptVariable,
        inputId: string,
        tplId: string
    ): HTMLElement
    {
        const values = this.variableValues.get(tplId) || {};
        const currentVal = values[variable.name]
            || variable.defaultValue || "";

        if (variable.type === "select" && variable.options)
        {
            return this.buildVariableSelect(
                variable, inputId, tplId, currentVal
            );
        }
        if (variable.type === "textarea")
        {
            return this.buildVariableTextarea(
                variable, inputId, tplId, currentVal
            );
        }

        const input = document.createElement("input");
        input.type = variable.type === "number" ? "number" : "text";
        input.className = CLS + "-variable-input";
        input.id = inputId;
        input.value = currentVal;
        setAttr(input, "data-variable", variable.name);
        input.addEventListener("input", () =>
            this.onVariableInput(tplId, variable.name, input.value));
        return input;
    }

    private buildVariableSelect(
        variable: PromptVariable,
        inputId: string,
        tplId: string,
        currentVal: string
    ): HTMLSelectElement
    {
        const sel = document.createElement("select");
        sel.className = CLS + "-variable-select";
        sel.id = inputId;
        for (const opt of (variable.options || []))
        {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            if (opt === currentVal) { o.selected = true; }
            sel.appendChild(o);
        }
        sel.addEventListener("change", () =>
            this.onVariableInput(tplId, variable.name, sel.value));
        return sel;
    }

    private buildVariableTextarea(
        variable: PromptVariable,
        inputId: string,
        tplId: string,
        currentVal: string
    ): HTMLTextAreaElement
    {
        const ta = document.createElement("textarea");
        ta.className = CLS + "-variable-textarea";
        ta.id = inputId;
        ta.rows = 3;
        ta.value = currentVal;
        ta.addEventListener("input", () =>
            this.onVariableInput(tplId, variable.name, ta.value));
        return ta;
    }

    private onVariableInput(
        tplId: string, name: string, value: string
    ): void
    {
        const values = this.variableValues.get(tplId) || {};
        values[name] = value;
        this.variableValues.set(tplId, values);
        if (this.previewVisible) { this.renderPreview(); }
    }

    private onVariablesExtracted(): void
    {
        this.renderVariables();
        this.updateStatusBar();
    }

    // ========================================================================
    // PREVIEW
    // ========================================================================

    private togglePreview(): void
    {
        this.previewVisible = !this.previewVisible;
        if (this.previewBtn)
        {
            setAttr(this.previewBtn, "aria-expanded",
                String(this.previewVisible));
            if (this.previewVisible)
            {
                this.previewBtn.classList.add(CLS + "-btn-preview-active");
            }
            else
            {
                this.previewBtn.classList.remove(CLS + "-btn-preview-active");
            }
        }

        if (this.previewVisible)
        {
            this.renderPreview();
        }
        else
        {
            this.hidePreview();
        }
    }

    private async renderPreview(): Promise<void>
    {
        if (!this.previewPanel) { return; }
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        this.previewPanel.style.display = "";
        const values = this.collectVariableValues(tpl.id);

        if (this.opts.onPreview)
        {
            const result = await safeAsync(
                () => this.opts.onPreview!(tpl.content || "", values),
                "Preview failed"
            );
            this.previewPanel.textContent = result;
        }
        else
        {
            this.previewPanel.textContent = substituteVariables(
                tpl.content || "", values
            );
        }
    }

    private hidePreview(): void
    {
        this.previewVisible = false;
        if (this.previewPanel) { this.previewPanel.style.display = "none"; }
        if (this.previewBtn)
        {
            setAttr(this.previewBtn, "aria-expanded", "false");
            this.previewBtn.classList.remove(CLS + "-btn-preview-active");
        }
    }

    private collectVariableValues(tplId: string): Record<string, string>
    {
        return { ...(this.variableValues.get(tplId) || {}) };
    }

    // ========================================================================
    // STATUS BAR
    // ========================================================================

    private updateStatusBar(): void
    {
        if (!this.statusBar) { return; }
        this.statusBar.innerHTML = "";

        const tpl = this.getSelectedTemplate();
        if (!tpl)
        {
            this.statusBar.textContent = "No template selected";
            return;
        }

        this.appendStatusItem(
            "v" + (tpl.version || 1));
        this.appendStatusSep();
        this.appendStatusItem(
            tpl.updatedAt ? "Saved " + this.relativeTime(tpl.updatedAt) : "Not saved");
        this.appendStatusSep();
        const varCount = extractVariableNames(tpl.content || "").length;
        this.appendStatusItem(varCount + " variable" + (varCount !== 1 ? "s" : ""));
    }

    private appendStatusItem(text: string): void
    {
        const span = createElement("span", CLS + "-status-item");
        span.textContent = text;
        this.statusBar!.appendChild(span);
    }

    private appendStatusSep(): void
    {
        const sep = createElement("span", CLS + "-status-separator");
        setAttr(sep, "aria-hidden", "true");
        sep.textContent = "|";
        this.statusBar!.appendChild(sep);
    }

    private relativeTime(iso: string): string
    {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) { return "just now"; }
        if (mins < 60) { return mins + "m ago"; }
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) { return hrs + "h ago"; }
        return Math.floor(hrs / 24) + "d ago";
    }

    // ========================================================================
    // SEARCH & FILTER
    // ========================================================================

    private filterTemplates(): void
    {
        if (!this.listEl || !this.searchInput) { return; }
        const query = this.searchInput.value.trim().toLowerCase();
        const items = this.listEl.querySelectorAll(
            "." + CLS + "-list-item"
        );

        // Remove old empty message
        const oldEmpty = this.listEl.querySelector("." + CLS + "-list-empty");
        if (oldEmpty) { oldEmpty.remove(); }

        let visibleCount = 0;
        items.forEach((el) =>
        {
            const htmlEl = el as HTMLElement;
            const tplId = htmlEl.getAttribute("data-template-id") || "";
            const tpl = this.templates.find(function(t)
            {
                return t.id === tplId;
            });

            if (!tpl)
            {
                htmlEl.style.display = "none";
                return;
            }

            const matches = query.length === 0
                || this.matchesSearch(tpl, query);

            // Keep selected template visible even if not matching
            if (matches || tplId === this.selectedId)
            {
                htmlEl.style.display = "";
                visibleCount++;
            }
            else
            {
                htmlEl.style.display = "none";
            }
        });

        if (visibleCount === 0 && query.length > 0)
        {
            this.appendListEmpty("No templates match your search.");
        }
    }

    private matchesSearch(tpl: PromptTemplate, query: string): boolean
    {
        const searchable = [
            tpl.name, tpl.description || "", tpl.category || "",
            ...(tpl.tags || [])
        ].join(" ").toLowerCase();
        return searchable.indexOf(query) >= 0;
    }

    private onSearchKeyDown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "clearSearch"))
        {
            if (this.searchInput) { this.searchInput.value = ""; }
            this.filterTemplates();
            if (this.listEl) { this.listEl.focus(); }
        }
        else if (this.matchesKeyCombo(e, "searchDown"))
        {
            e.preventDefault();
            this.selectNextTemplate(1);
        }
    }

    // ========================================================================
    // FIELD CHANGES & DIRTY STATE
    // ========================================================================

    private onFieldChange(): void
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        this.syncFieldsToTemplate(tpl);
        this.markDirty();

        if (this.opts.onChange)
        {
            safeCallback(() => { this.opts.onChange!(tpl); }, undefined);
        }
    }

    private syncFieldsToTemplate(tpl: PromptTemplate): void
    {
        if (this.nameInput) { tpl.name = this.nameInput.value; }
        if (this.descInput) { tpl.description = this.descInput.value; }
        if (this.categorySelect) { tpl.category = this.categorySelect.value || undefined; }
        if (this.editorEl) { tpl.content = this.editorEl.value; }
    }

    private markDirty(): void
    {
        if (!this.selectedId) { return; }
        this.dirtyIds.add(this.selectedId);
        this.updateListItemDirty(this.selectedId, true);
    }

    private clearDirty(id: string): void
    {
        this.dirtyIds.delete(id);
        this.updateListItemDirty(id, false);
    }

    private updateListItemDirty(id: string, dirty: boolean): void
    {
        if (!this.listEl) { return; }
        const item = this.listEl.querySelector(
            "[data-template-id=\"" + id + "\"]"
        );
        if (!item) { return; }

        if (dirty)
        {
            item.classList.add(CLS + "-list-item-dirty");
        }
        else
        {
            item.classList.remove(CLS + "-list-item-dirty");
        }
    }

    // ========================================================================
    // ACTIONS: HEADER
    // ========================================================================

    private onHeaderAction(type: string): void
    {
        if (type === "new") { this.createTemplate(); }
        else if (type === "import") { this.triggerImport(); }
        else if (type === "export") { this.exportTemplates(); }
    }

    // ========================================================================
    // ACTIONS: DETAIL
    // ========================================================================

    private onDetailAction(type: string): void
    {
        if (type === "save") { this.handleSave(); }
        else if (type === "duplicate") { this.handleDuplicate(); }
        else if (type === "delete") { this.handleDelete(); }
    }

    // ========================================================================
    // SAVE
    // ========================================================================

    private async handleSave(): Promise<void>
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        if (!tpl.name || tpl.name.trim().length === 0)
        {
            console.warn(LOG_PREFIX, "Template name is required");
            if (this.nameInput) { this.nameInput.focus(); }
            return;
        }

        tpl.updatedAt = nowISO();
        tpl.version = (tpl.version || 0) + 1;
        tpl.variables = mergeVariables(
            extractVariableNames(tpl.content || ""),
            tpl.variables || []
        );

        if (this.opts.onSave)
        {
            const saved = await safeAsync(
                () => this.opts.onSave!(tpl), tpl
            );
            this.replaceTemplate(saved);
        }

        this.clearDirty(tpl.id);
        this.refreshListItem(tpl);
        this.updateStatusBar();
        console.log(LOG_PREFIX, "Saved:", tpl.id, "v" + tpl.version);
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    private async handleDelete(): Promise<void>
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        if (this.opts.onDelete)
        {
            const ok = await safeAsync(
                () => this.opts.onDelete!(tpl.id), false
            );
            if (!ok) { return; }
        }

        const idx = this.templates.findIndex(function(t)
        {
            return t.id === tpl.id;
        });
        this.templates.splice(idx, 1);
        this.dirtyIds.delete(tpl.id);
        this.variableValues.delete(tpl.id);

        if (this.templates.length > 0)
        {
            const nextIdx = Math.min(idx, this.templates.length - 1);
            this.selectedId = this.templates[nextIdx].id;
        }
        else
        {
            this.selectedId = null;
        }

        this.renderTemplateList();
        this.renderDetail();
        console.log(LOG_PREFIX, "Deleted:", tpl.id);
    }

    // ========================================================================
    // DUPLICATE
    // ========================================================================

    private async handleDuplicate(): Promise<void>
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return; }

        const copy: PromptTemplate = {
            ...tpl,
            id: "",
            name: tpl.name + " (Copy)",
            version: 1,
            createdAt: nowISO(),
            updatedAt: nowISO(),
            tags: tpl.tags ? [...tpl.tags] : [],
            variables: tpl.variables
                ? tpl.variables.map(function(v) { return { ...v }; })
                : []
        };

        if (this.opts.onDuplicate)
        {
            const result = await safeAsync(
                () => this.opts.onDuplicate!(copy), copy
            );
            if (!result.id) { result.id = generateId(); }
            this.templates.push(result);
            this.selectedId = result.id;
        }
        else
        {
            copy.id = generateId();
            this.templates.push(copy);
            this.selectedId = copy.id;
        }

        this.renderTemplateList();
        this.renderDetail();
        console.log(LOG_PREFIX, "Duplicated:", tpl.id, "->", this.selectedId);
    }

    // ========================================================================
    // IMPORT / EXPORT
    // ========================================================================

    private triggerImport(): void
    {
        if (this.importInput)
        {
            this.importInput.value = "";
            this.importInput.click();
        }
    }

    private onImportFileSelected(): void
    {
        if (!this.importInput || !this.importInput.files) { return; }
        const file = this.importInput.files[0];
        if (!file) { return; }

        const reader = new FileReader();
        reader.onload = () =>
        {
            this.processImportData(reader.result as string);
        };
        reader.readAsText(file);
    }

    private processImportData(json: string): void
    {
        try
        {
            const parsed = JSON.parse(json);
            const rawList: unknown[] = Array.isArray(parsed)
                ? parsed
                : (parsed.templates || []);

            let imported = 0;
            for (const raw of rawList)
            {
                if (this.isValidTemplate(raw))
                {
                    const tpl = raw as PromptTemplate;
                    tpl.id = generateId();
                    this.templates.push(tpl);
                    imported++;
                }
                else
                {
                    console.warn(LOG_PREFIX, "Skipping invalid template:", raw);
                }
            }

            if (imported > 0 && this.templates.length > 0)
            {
                this.selectedId = this.templates[
                    this.templates.length - imported
                ].id;
            }

            this.renderTemplateList();
            this.renderDetail();
            console.log(LOG_PREFIX, "Imported:", imported, "templates");
        }
        catch (e)
        {
            console.warn(LOG_PREFIX, "Import failed:", e);
        }
    }

    private isValidTemplate(obj: unknown): boolean
    {
        if (!obj || typeof obj !== "object") { return false; }
        const t = obj as Record<string, unknown>;
        return typeof t.name === "string" && typeof t.content === "string";
    }

    public exportTemplates(): string
    {
        const data = {
            templates: this.templates,
            exportedAt: nowISO(),
            count: this.templates.length
        };
        const json = JSON.stringify(data, null, 2);
        this.downloadJson(json);
        console.log(LOG_PREFIX, "Exported:", this.templates.length, "templates");
        return json;
    }

    private downloadJson(data: string): void
    {
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = "prompt-templates-" + dateStr + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================================================
    // LIST KEYBOARD NAVIGATION
    // ========================================================================

    private selectNextTemplate(delta: number): void
    {
        if (this.templates.length === 0) { return; }
        const currentIdx = this.templates.findIndex(
            (t) => t.id === this.selectedId
        );
        let nextIdx = currentIdx + delta;
        if (nextIdx < 0) { nextIdx = this.templates.length - 1; }
        if (nextIdx >= this.templates.length) { nextIdx = 0; }
        this.selectTemplate(this.templates[nextIdx].id);
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    // ========================================================================
    // GLOBAL KEYBOARD
    // ========================================================================

    private onGlobalKeyDown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "save"))
        {
            e.preventDefault();
            this.handleSave();
        }
        else if (this.matchesKeyCombo(e, "newTemplate"))
        {
            e.preventDefault();
            this.createTemplate();
        }
        else if (this.matchesKeyCombo(e, "togglePreview"))
        {
            e.preventDefault();
            this.togglePreview();
        }
    }

    // ========================================================================
    // HELPER: REPLACE & REFRESH LIST ITEM
    // ========================================================================

    private replaceTemplate(tpl: PromptTemplate): void
    {
        const idx = this.templates.findIndex(function(t)
        {
            return t.id === tpl.id;
        });
        if (idx >= 0) { this.templates[idx] = tpl; }
    }

    private refreshListItem(tpl: PromptTemplate): void
    {
        if (!this.listEl) { return; }
        const item = this.listEl.querySelector(
            "[data-template-id=\"" + tpl.id + "\"]"
        );
        if (!item) { return; }

        const nameEl = item.querySelector("." + CLS + "-list-item-name");
        if (nameEl) { nameEl.textContent = tpl.name || "Untitled"; }

        let catEl = item.querySelector("." + CLS + "-list-item-category");
        if (tpl.category)
        {
            if (!catEl)
            {
                catEl = createElement("span", CLS + "-list-item-category");
                item.appendChild(catEl);
            }
            catEl.textContent = tpl.category;
        }
        else if (catEl)
        {
            catEl.remove();
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public show(containerId: string): void
    {
        if (this.destroyed)
        {
            console.warn(LOG_PREFIX, "Cannot show destroyed instance");
            return;
        }
        if (this.shown)
        {
            console.warn(LOG_PREFIX, "Already shown");
            return;
        }

        const container = document.getElementById(containerId);
        if (!container)
        {
            console.error(LOG_PREFIX, "Container not found:", containerId);
            return;
        }

        if (this.rootEl) { container.appendChild(this.rootEl); }
        this.shown = true;

        // Select first template or load from callback
        if (this.templates.length > 0 && !this.selectedId)
        {
            this.selectTemplate(this.templates[0].id);
        }
        else if (this.templates.length === 0 && this.opts.onLoadTemplates)
        {
            this.refresh();
        }

        if (this.searchInput) { this.searchInput.focus(); }
        console.log(LOG_PREFIX, "Shown in:", containerId);
    }

    public hide(): void
    {
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
        this.shown = false;
        console.debug(LOG_PREFIX, "Hidden");
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.hide();
        this.rootEl = null;
        this.splitEl = null;
        this.listPaneEl = null;
        console.log(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    public getTemplates(): PromptTemplate[]
    {
        return this.templates.map(function(t) { return { ...t }; });
    }

    public setTemplates(templates: PromptTemplate[]): void
    {
        this.templates = templates.map(function(t) { return { ...t }; });
        this.selectedId = null;
        this.dirtyIds.clear();
        this.renderTemplateList();

        if (this.templates.length > 0)
        {
            this.selectTemplate(this.templates[0].id);
        }
        else
        {
            this.renderDetail();
        }
    }

    public getSelectedTemplate(): PromptTemplate | null
    {
        if (!this.selectedId) { return null; }
        return this.templates.find(
            (t) => t.id === this.selectedId
        ) || null;
    }

    public selectTemplate(id: string): void
    {
        const tpl = this.templates.find(function(t) { return t.id === id; });
        if (!tpl)
        {
            console.warn(LOG_PREFIX, "Template not found:", id);
            return;
        }

        this.selectedId = id;
        this.updateListSelection();
        this.renderDetail();

        if (this.opts.onSelect)
        {
            safeCallback(() => { this.opts.onSelect!(tpl); }, undefined);
        }
    }

    private updateListSelection(): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(
            "." + CLS + "-list-item"
        );
        items.forEach((el) =>
        {
            const tplId = el.getAttribute("data-template-id") || "";
            const selected = tplId === this.selectedId;
            setAttr(el as HTMLElement, "aria-selected", String(selected));
            if (selected)
            {
                el.classList.add(CLS + "-list-item-selected");
            }
            else
            {
                el.classList.remove(CLS + "-list-item-selected");
            }
        });
    }

    public createTemplate(): void
    {
        const tpl: PromptTemplate = {
            id: generateId(),
            name: "Untitled Template",
            content: "",
            version: 1,
            createdAt: nowISO(),
            updatedAt: nowISO()
        };

        this.templates.unshift(tpl);
        this.selectedId = tpl.id;
        this.renderTemplateList();
        this.renderDetail();

        if (this.nameInput)
        {
            this.nameInput.focus();
            this.nameInput.select();
        }

        console.log(LOG_PREFIX, "Created new template:", tpl.id);
    }

    public deleteTemplate(id: string): void
    {
        const prev = this.selectedId;
        this.selectedId = id;
        this.handleDelete();
        if (prev !== id) { this.selectedId = prev; }
    }

    public duplicateTemplate(id: string): void
    {
        const prev = this.selectedId;
        this.selectedId = id;
        this.handleDuplicate();
        if (prev !== id) { this.selectedId = prev; }
    }

    public importTemplates(json: string): void
    {
        this.processImportData(json);
    }

    public async refresh(): Promise<void>
    {
        if (!this.opts.onLoadTemplates)
        {
            console.warn(LOG_PREFIX, "No onLoadTemplates callback");
            return;
        }

        const loaded = await safeAsync(
            () => this.opts.onLoadTemplates!(), []
        );
        this.setTemplates(loaded);
        console.log(LOG_PREFIX, "Refreshed:", loaded.length, "templates");
    }

    public getPreviewContent(
        variables?: Record<string, string>
    ): string
    {
        const tpl = this.getSelectedTemplate();
        if (!tpl) { return ""; }

        const values = variables
            || this.collectVariableValues(tpl.id);
        return substituteVariables(tpl.content || "", values);
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

export function createPromptTemplateManager(
    options: PromptTemplateManagerOptions,
    containerId: string
): PromptTemplateManager
{
    const manager = new PromptTemplateManager(options);
    manager.show(containerId);
    return manager;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).PromptTemplateManager = PromptTemplateManager;
(window as unknown as Record<string, unknown>).createPromptTemplateManager = createPromptTemplateManager;
