/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: FileUpload
 * PURPOSE: Drag-and-drop file upload zone with progress bars, file type
 *    validation, size limits, batch upload, and optional download queue.
 *    Based on MASTER_COMPONENT_LIST 14.1.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[FileExplorer]]
 * FLOW: [Consumer App] -> [createFileUpload()] -> [DOM upload widget]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, CONSTANTS
// ============================================================================

/** A single item in the download section. */
export interface FileDownloadItem
{
    /** Display name of the file. */
    name: string;

    /** File size in bytes (used for display). */
    size?: number;

    /** Download URL. */
    url: string;

    /** Bootstrap icon class (e.g., "bi-file-pdf"). */
    icon?: string;
}

/** Configuration options for the FileUpload component. */
export interface FileUploadOptions
{
    /** Accepted file types. MIME/extension string e.g. "image/*,.pdf". */
    accept?: string;

    /** Max individual file size in bytes. Default: 10 MB. */
    maxFileSize?: number;

    /** Max total upload size in bytes. Default: 100 MB. */
    maxTotalSize?: number;

    /** Max number of files. Default: 10. */
    maxFiles?: number;

    /** Allow multiple file selection. Default: true. */
    multiple?: boolean;

    /** Upload handler. Called per file with progress callback. */
    onUpload?: (
        file: File,
        onProgress: (fraction: number) => void
    ) => Promise<void>;

    /** Called when a file is removed from the queue. */
    onRemove?: (fileName: string) => void;

    /** Start uploads immediately on file add. Default: true. */
    autoUpload?: boolean;

    /** Show download section. Default: false. */
    showDownloads?: boolean;

    /** Pre-populated download items. */
    downloads?: FileDownloadItem[];

    /** Disabled state. */
    disabled?: boolean;

    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Additional CSS class. */
    cssClass?: string;

    /** Override default key combos. */
    keyBindings?: Partial<Record<string, string>>;
}

/** Internal tracking state for each queued file. */
interface FileState
{
    id: string;
    file: File;
    status: "queued" | "uploading" | "completed" | "failed";
    progress: number;
    error?: string;
    element: HTMLElement;
    progressBarEl: HTMLElement;
    statusEl: HTMLElement;
    actionBtnEl: HTMLElement;
}

// ============================================================================
// S1b: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FileUpload]";

let instanceCounter = 0;

const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE_DEFAULT = 100 * 1024 * 1024;
const MAX_FILES_DEFAULT = 10;

/** Maps MIME type prefixes to Bootstrap icon classes. */
const FILE_ICON_MAP: Record<string, string> = {
    "image": "bi-file-image",
    "video": "bi-file-play",
    "audio": "bi-file-music",
    "application/pdf": "bi-file-pdf",
    "text": "bi-file-text",
    "application/zip": "bi-file-zip",
    "default": "bi-file-earmark",
};

/** Default keyboard bindings for the upload zone. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    browse: "Enter",
    browseAlt: " ",
    removeFile: "Delete",
};

// ============================================================================
// S2: DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 */
function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/**
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// S3: FILE UPLOAD CLASS
// ============================================================================

/**
 * FileUpload provides a drag-and-drop upload zone with progress tracking,
 * file validation, batch upload, and an optional download section.
 */
export class FileUpload
{
    private readonly instanceId: string;
    private readonly options: FileUploadOptions;

    // State
    private fileStates: FileState[] = [];
    private fileCounter: number = 0;
    private visible: boolean = false;
    private destroyed: boolean = false;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private dropzoneEl: HTMLElement | null = null;
    private fileInputEl: HTMLInputElement | null = null;
    private fileListEl: HTMLElement | null = null;
    private downloadSectionEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;
    private dropzoneLimitsEl: HTMLElement | null = null;

    // Bound listeners for cleanup
    private boundOnDragOver: ((e: DragEvent) => void) | null = null;
    private boundOnDragLeave: ((e: DragEvent) => void) | null = null;
    private boundOnDrop: ((e: DragEvent) => void) | null = null;
    private boundOnDropzoneClick: (() => void) | null = null;
    private boundOnDropzoneKeydown: ((e: KeyboardEvent) => void) | null = null;
    private boundOnFileInputChange: ((e: Event) => void) | null = null;

    // ---- Constructor ----

    /**
     * Creates a new FileUpload instance and builds its DOM.
     */
    constructor(options: FileUploadOptions)
    {
        instanceCounter += 1;
        this.instanceId = `fileupload-${instanceCounter}`;

        this.options = {
            multiple: true,
            autoUpload: true,
            showDownloads: false,
            disabled: false,
            size: "md",
            ...options,
        };

        this.buildRoot();

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
        console.debug(`${LOG_PREFIX} Options:`, this.options);
    }

    // ========================================================================
    // S4: LIFECYCLE
    // ========================================================================

    /**
     * Appends the upload widget to a container and activates listeners.
     */
    // @entrypoint
    public show(containerId?: string): void
    {
        if (this.destroyed)
        {
            console.warn(`${LOG_PREFIX} Cannot show destroyed instance.`);
            return;
        }

        if (this.visible || !this.rootEl)
        {
            return;
        }

        const target = this.resolveContainer(containerId);
        target.appendChild(this.rootEl);
        this.attachListeners();
        this.visible = true;

        console.debug(`${LOG_PREFIX} Shown in container.`);
    }

    /**
     * Detaches from DOM without destroying state.
     */
    public hide(): void
    {
        if (!this.visible || !this.rootEl)
        {
            return;
        }

        this.detachListeners();
        this.rootEl.remove();
        this.visible = false;

        console.debug(`${LOG_PREFIX} Hidden.`);
    }

    /**
     * Hides and releases all references.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.hide();
        this.fileStates = [];
        this.rootEl = null;
        this.dropzoneEl = null;
        this.fileInputEl = null;
        this.fileListEl = null;
        this.downloadSectionEl = null;
        this.liveRegionEl = null;
        this.destroyed = true;

        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    /** Returns the root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // S5: PUBLIC API
    // ========================================================================

    /**
     * Programmatically adds files to the upload queue.
     */
    public addFiles(files: FileList | File[]): void
    {
        if (this.destroyed || this.options.disabled)
        {
            return;
        }

        const fileArray = Array.from(files);
        this.processFiles(fileArray);
    }

    /**
     * Removes a file from the queue by its internal ID.
     */
    public removeFile(fileId: string): void
    {
        const index = this.fileStates.findIndex((s) => s.id === fileId);

        if (index === -1)
        {
            console.warn(`${LOG_PREFIX} File not found:`, fileId);
            return;
        }

        const state = this.fileStates[index];
        state.element.remove();
        this.fileStates.splice(index, 1);
        this.updateDropzoneState();

        if (this.options.onRemove)
        {
            try { this.options.onRemove(state.file.name); }
            catch (err)
            {
                console.error(`${LOG_PREFIX} onRemove error:`, err);
            }
        }

        this.announceStatus(`Removed ${state.file.name}`);
        console.debug(`${LOG_PREFIX} Removed file:`, state.file.name);
    }

    /**
     * Retries a failed file upload.
     */
    public retryFile(fileId: string): void
    {
        const state = this.fileStates.find((s) => s.id === fileId);

        if (!state || state.status !== "failed")
        {
            console.warn(`${LOG_PREFIX} Cannot retry:`, fileId);
            return;
        }

        this.uploadFile(state);
    }

    /**
     * Removes all files from the queue.
     */
    public clearAll(): void
    {
        const ids = this.fileStates.map((s) => s.id);

        for (const id of ids)
        {
            this.removeFile(id);
        }
    }

    /**
     * Returns an array describing each queued file.
     */
    public getFiles(): Array<{
        name: string;
        status: string;
        progress: number;
    }>
    {
        return this.fileStates.map((s) => ({
            name: s.file.name,
            status: s.status,
            progress: s.progress,
        }));
    }

    /**
     * Toggles the disabled state of the component.
     */
    public setDisabled(disabled: boolean): void
    {
        this.options.disabled = disabled;

        if (!this.rootEl)
        {
            return;
        }

        this.rootEl.classList.toggle("fileupload-disabled", disabled);
        this.updateDropzoneDisabledAttr();
    }

    /**
     * Replaces the download section items.
     */
    public setDownloads(downloads: FileDownloadItem[]): void
    {
        this.options.downloads = downloads;
        this.rebuildDownloadSection();
    }

    /**
     * Starts uploading all queued files.
     */
    public uploadAll(): void
    {
        const queued = this.fileStates.filter(
            (s) => s.status === "queued"
        );

        for (const state of queued)
        {
            this.uploadFile(state);
        }
    }

    // ========================================================================
    // S6: DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete root element tree.
     */
    private buildRoot(): void
    {
        const sizeClass = `fileupload-${this.options.size || "md"}`;
        const classes = ["fileupload", sizeClass];

        if (this.options.cssClass)
        {
            classes.push(...this.options.cssClass.split(" "));
        }

        if (this.options.disabled)
        {
            classes.push("fileupload-disabled");
        }

        this.rootEl = createElement("div", classes);
        setAttr(this.rootEl, "id", this.instanceId);

        this.buildDropzone();
        this.buildFileList();
        this.buildDownloadSectionIfNeeded();
        this.buildLiveRegion();
    }

    /**
     * Builds the dashed-border drop area with icon and instructional text.
     */
    private buildDropzone(): void
    {
        this.dropzoneEl = createElement("div", ["fileupload-dropzone"]);
        setAttr(this.dropzoneEl, "role", "button");
        setAttr(this.dropzoneEl, "tabindex", "0");
        setAttr(this.dropzoneEl, "aria-label",
            "Drop files here or click to browse");

        this.dropzoneEl.appendChild(this.buildDropzoneIcon());
        this.dropzoneEl.appendChild(this.buildDropzoneText());
        this.dropzoneEl.appendChild(this.buildDropzoneHint());
        this.dropzoneLimitsEl = this.buildDropzoneLimits();
        this.dropzoneEl.appendChild(this.dropzoneLimitsEl);
        this.buildFileInput();
        this.dropzoneEl.appendChild(this.fileInputEl as HTMLElement);

        this.updateDropzoneDisabledAttr();
        this.rootEl!.appendChild(this.dropzoneEl);
    }

    /**
     * Creates the cloud-arrow-up icon for the dropzone.
     */
    private buildDropzoneIcon(): HTMLElement
    {
        const icon = createElement("i", [
            "bi", "bi-cloud-arrow-up", "fileupload-dropzone-icon",
        ]);
        setAttr(icon, "aria-hidden", "true");
        return icon;
    }

    /**
     * Creates the primary instruction text for the dropzone.
     */
    private buildDropzoneText(): HTMLElement
    {
        return createElement(
            "p", ["fileupload-dropzone-text"], "Drag & drop files here"
        );
    }

    /**
     * Creates the secondary hint text for the dropzone.
     */
    private buildDropzoneHint(): HTMLElement
    {
        return createElement(
            "p", ["fileupload-dropzone-hint"], "or click to browse"
        );
    }

    /**
     * Creates the limits description text for the dropzone.
     */
    private buildDropzoneLimits(): HTMLElement
    {
        const maxSize = this.options.maxFileSize || MAX_FILE_SIZE_DEFAULT;
        const sizeText = this.formatFileSize(maxSize);
        let limitsText = `Max ${sizeText} per file`;

        if (this.options.accept)
        {
            limitsText += `. Accepts: ${this.options.accept}`;
        }

        return createElement(
            "p", ["fileupload-dropzone-limits"], limitsText
        );
    }

    /**
     * Creates the hidden file input element.
     */
    private buildFileInput(): void
    {
        const input = document.createElement("input");
        input.type = "file";
        input.classList.add("fileupload-input");
        input.hidden = true;

        if (this.options.accept)
        {
            input.accept = this.options.accept;
        }

        if (this.options.multiple !== false)
        {
            input.multiple = true;
        }

        this.fileInputEl = input;
    }

    /**
     * Creates the file list container.
     */
    private buildFileList(): void
    {
        this.fileListEl = createElement("div", ["fileupload-filelist"]);
        setAttr(this.fileListEl, "role", "list");
        setAttr(this.fileListEl, "aria-label", "Upload queue");
        this.rootEl!.appendChild(this.fileListEl);
    }

    /**
     * Conditionally builds the download section.
     */
    private buildDownloadSectionIfNeeded(): void
    {
        if (!this.options.showDownloads)
        {
            return;
        }

        this.downloadSectionEl = this.buildDownloadSection();
        this.rootEl!.appendChild(this.downloadSectionEl);

        if (this.options.downloads)
        {
            this.populateDownloads(this.options.downloads);
        }
    }

    /**
     * Creates the download section wrapper element.
     */
    private buildDownloadSection(): HTMLElement
    {
        const section = createElement("div", ["fileupload-downloads"]);
        setAttr(section, "role", "list");
        setAttr(section, "aria-label", "Available downloads");

        const title = createElement(
            "h6", ["fileupload-downloads-title"], "Downloads"
        );
        section.appendChild(title);

        return section;
    }

    /**
     * Populates download rows from the given items.
     */
    private populateDownloads(items: FileDownloadItem[]): void
    {
        if (!this.downloadSectionEl)
        {
            return;
        }

        for (const item of items)
        {
            this.downloadSectionEl.appendChild(
                this.buildDownloadRow(item)
            );
        }
    }

    /**
     * Builds a single download row with icon, name, size, and link.
     */
    private buildDownloadRow(item: FileDownloadItem): HTMLElement
    {
        const row = createElement("div", ["fileupload-download"]);
        setAttr(row, "role", "listitem");

        const iconClass = item.icon || "bi-file-earmark";
        const iconClasses = iconClass.split(" ").filter((c) => c.length > 0);
        const icon = createElement("i", [
            "bi", ...iconClasses, "fileupload-download-icon",
        ]);
        setAttr(icon, "aria-hidden", "true");
        row.appendChild(icon);

        row.appendChild(
            createElement("span", ["fileupload-download-name"], item.name)
        );

        if (item.size !== undefined)
        {
            row.appendChild(createElement(
                "span",
                ["fileupload-download-size"],
                this.formatFileSize(item.size)
            ));
        }

        row.appendChild(this.buildDownloadLink(item));
        return row;
    }

    /**
     * Builds the download anchor element for a download row.
     */
    private buildDownloadLink(item: FileDownloadItem): HTMLElement
    {
        const link = createElement("a", ["fileupload-download-link"]);
        setAttr(link, "href", item.url);
        setAttr(link, "download", "");
        setAttr(link, "aria-label", `Download ${item.name}`);

        const linkIcon = createElement("i", ["bi", "bi-download"]);
        setAttr(linkIcon, "aria-hidden", "true");
        link.appendChild(linkIcon);

        return link;
    }

    /**
     * Creates the ARIA live region for status announcements.
     */
    private buildLiveRegion(): void
    {
        this.liveRegionEl = createElement("div", ["fileupload-live"]);
        setAttr(this.liveRegionEl, "role", "status");
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        this.rootEl!.appendChild(this.liveRegionEl);
    }

    // ========================================================================
    // S6b: FILE ROW CONSTRUCTION
    // ========================================================================

    /**
     * Builds a file row element for the given state.
     */
    private buildFileRow(state: FileState): HTMLElement
    {
        const row = createElement("div", [
            "fileupload-file", `fileupload-file-${state.status}`,
        ]);
        setAttr(row, "role", "listitem");
        setAttr(row, "data-file-id", state.id);

        row.appendChild(this.buildFileIcon(state.file));
        row.appendChild(this.buildFileInfo(state.file));

        const progressBar = this.buildProgressBar();
        state.progressBarEl = progressBar;
        row.appendChild(progressBar.parentElement || progressBar);

        state.statusEl = createElement(
            "span", ["fileupload-file-status"], "Queued"
        );
        row.appendChild(state.statusEl);

        state.actionBtnEl = this.buildFileAction(state);
        row.appendChild(state.actionBtnEl);

        state.element = row;
        return row;
    }

    /**
     * Creates the file type icon element based on MIME type.
     */
    private buildFileIcon(file: File): HTMLElement
    {
        const iconClass = this.getFileIcon(file);
        const icon = createElement("i", [
            "bi", iconClass, "fileupload-file-icon",
        ]);
        setAttr(icon, "aria-hidden", "true");
        return icon;
    }

    /**
     * Creates the file info wrapper with name and size.
     */
    private buildFileInfo(file: File): HTMLElement
    {
        const info = createElement("div", ["fileupload-file-info"]);

        info.appendChild(createElement(
            "span", ["fileupload-file-name"], file.name
        ));

        info.appendChild(createElement(
            "span", ["fileupload-file-size"],
            this.formatFileSize(file.size)
        ));

        return info;
    }

    /**
     * Creates the progress bar track and fill elements.
     */
    private buildProgressBar(): HTMLElement
    {
        const track = createElement("div", ["fileupload-file-progress"]);
        const fill = createElement("div", ["fileupload-file-progress-bar"]);

        setAttr(fill, "role", "progressbar");
        setAttr(fill, "aria-valuenow", "0");
        setAttr(fill, "aria-valuemin", "0");
        setAttr(fill, "aria-valuemax", "100");
        fill.style.width = "0%";

        track.appendChild(fill);

        // Return the fill; parent is accessible via parentElement
        return fill;
    }

    /**
     * Creates the action button (remove or retry) for a file row.
     */
    private buildFileAction(state: FileState): HTMLElement
    {
        const btn = createElement("button", ["fileupload-file-action"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", `Remove ${state.file.name}`);

        const icon = createElement("i", ["bi", "bi-x-lg"]);
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);

        btn.addEventListener("click", () =>
        {
            this.onActionClick(state);
        });

        return btn;
    }

    // ========================================================================
    // S7: EVENT LISTENERS
    // ========================================================================

    /**
     * Attaches all event listeners to the dropzone and file input.
     */
    private attachListeners(): void
    {
        if (!this.dropzoneEl || !this.fileInputEl)
        {
            return;
        }

        this.boundOnDragOver = (e) => this.onDragOver(e);
        this.boundOnDragLeave = (e) => this.onDragLeave(e);
        this.boundOnDrop = (e) => this.onDrop(e);
        this.boundOnDropzoneClick = () => this.onDropzoneClick();
        this.boundOnDropzoneKeydown = (e) => this.onDropzoneKeydown(e);
        this.boundOnFileInputChange = (e) => this.onFileInputChange(e);

        this.dropzoneEl.addEventListener("dragover", this.boundOnDragOver);
        this.dropzoneEl.addEventListener("dragleave", this.boundOnDragLeave);
        this.dropzoneEl.addEventListener("drop", this.boundOnDrop);
        this.dropzoneEl.addEventListener("click", this.boundOnDropzoneClick);
        this.dropzoneEl.addEventListener(
            "keydown", this.boundOnDropzoneKeydown
        );
        this.fileInputEl.addEventListener(
            "change", this.boundOnFileInputChange
        );
    }

    /**
     * Removes all event listeners from the dropzone and file input.
     */
    private detachListeners(): void
    {
        if (!this.dropzoneEl || !this.fileInputEl)
        {
            return;
        }

        this.detachDropzoneListeners();
        this.detachFileInputListener();
        this.clearBoundListeners();
    }

    /**
     * Removes drag, click, and keydown listeners from the dropzone.
     */
    private detachDropzoneListeners(): void
    {
        if (!this.dropzoneEl)
        {
            return;
        }

        const pairs: Array<[string, EventListener | null]> = [
            ["dragover", this.boundOnDragOver as EventListener | null],
            ["dragleave", this.boundOnDragLeave as EventListener | null],
            ["drop", this.boundOnDrop as EventListener | null],
            ["click", this.boundOnDropzoneClick as EventListener | null],
            ["keydown", this.boundOnDropzoneKeydown as EventListener | null],
        ];

        for (const [event, handler] of pairs)
        {
            if (handler)
            {
                this.dropzoneEl.removeEventListener(event, handler);
            }
        }
    }

    /**
     * Removes the change listener from the hidden file input.
     */
    private detachFileInputListener(): void
    {
        if (this.fileInputEl && this.boundOnFileInputChange)
        {
            this.fileInputEl.removeEventListener(
                "change", this.boundOnFileInputChange
            );
        }
    }

    /**
     * Nulls out bound listener references for garbage collection.
     */
    private clearBoundListeners(): void
    {
        this.boundOnDragOver = null;
        this.boundOnDragLeave = null;
        this.boundOnDrop = null;
        this.boundOnDropzoneClick = null;
        this.boundOnDropzoneKeydown = null;
        this.boundOnFileInputChange = null;
    }

    // ========================================================================
    // S8: EVENT HANDLERS
    // ========================================================================

    /**
     * Handles dragover: prevents default and adds highlight class.
     */
    // <- Handles: dragover
    private onDragOver(e: DragEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        e.preventDefault();
        this.dropzoneEl?.classList.add("fileupload-dropzone-active");
    }

    /**
     * Handles dragleave: removes highlight class.
     */
    // <- Handles: dragleave
    private onDragLeave(e: DragEvent): void
    {
        e.preventDefault();
        this.dropzoneEl?.classList.remove("fileupload-dropzone-active");
    }

    /**
     * Handles drop: extracts files and processes them.
     */
    // <- Handles: drop
    private onDrop(e: DragEvent): void
    {
        e.preventDefault();
        this.dropzoneEl?.classList.remove("fileupload-dropzone-active");

        if (this.options.disabled || !e.dataTransfer)
        {
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    /**
     * Handles click on dropzone: triggers hidden file input.
     */
    // <- Handles: click
    private onDropzoneClick(): void
    {
        if (this.options.disabled)
        {
            return;
        }

        this.fileInputEl?.click();
    }

    /**
     * Handles keydown on dropzone: Enter/Space opens file browser.
     */
    // <- Handles: keydown
    private onDropzoneKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        const isBrowse = this.matchesKeyCombo(e, "browse");
        const isBrowseAlt = this.matchesKeyCombo(e, "browseAlt");

        if (isBrowse || isBrowseAlt)
        {
            e.preventDefault();
            this.fileInputEl?.click();
        }
    }

    /**
     * Handles file input change: extracts files and processes them.
     */
    // <- Handles: change
    private onFileInputChange(e: Event): void
    {
        const input = e.target as HTMLInputElement;

        if (!input.files || input.files.length === 0)
        {
            return;
        }

        const files = Array.from(input.files);
        this.processFiles(files);

        // Reset input value so the same file can be re-selected
        input.value = "";
    }

    /**
     * Handles action button click (remove or retry) for a file row.
     */
    private onActionClick(state: FileState): void
    {
        if (state.status === "failed")
        {
            this.retryFile(state.id);
        }
        else
        {
            this.removeFile(state.id);
        }
    }

    // ========================================================================
    // S9: FILE PROCESSING
    // ========================================================================

    /**
     * Validates each file and adds valid ones to the queue.
     */
    private processFiles(files: File[]): void
    {
        for (const file of files)
        {
            const error = this.validateFile(file);

            if (error)
            {
                console.warn(`${LOG_PREFIX} Rejected:`, file.name, error);
                this.announceStatus(`${file.name}: ${error}`);
                continue;
            }

            const totalError = this.validateTotalSize(file);

            if (totalError)
            {
                console.warn(
                    `${LOG_PREFIX} Total size exceeded:`, file.name
                );
                this.announceStatus(`${file.name}: ${totalError}`);
                continue;
            }

            this.addFileToQueue(file);
        }
    }

    /**
     * Creates a file state, builds the row, and optionally starts upload.
     */
    private addFileToQueue(file: File): void
    {
        this.fileCounter += 1;
        const id = `${this.instanceId}-file-${this.fileCounter}`;

        const state: FileState = {
            id,
            file,
            status: "queued",
            progress: 0,
            element: null as unknown as HTMLElement,
            progressBarEl: null as unknown as HTMLElement,
            statusEl: null as unknown as HTMLElement,
            actionBtnEl: null as unknown as HTMLElement,
        };

        const row = this.buildFileRow(state);
        this.fileStates.push(state);
        this.fileListEl?.appendChild(row);
        this.updateDropzoneState();
        this.announceStatus(`Added ${file.name}`);

        if (this.options.autoUpload !== false)
        {
            this.uploadFile(state);
        }
    }

    // ========================================================================
    // S10: FILE VALIDATION
    // ========================================================================

    /**
     * Validates a single file against size, type, and count constraints.
     * Returns an error string or null if valid.
     */
    private validateFile(file: File): string | null
    {
        const maxSize = this.options.maxFileSize || MAX_FILE_SIZE_DEFAULT;

        if (file.size > maxSize)
        {
            return `File exceeds maximum size of ${this.formatFileSize(maxSize)}`;
        }

        if (this.options.accept && !this.matchesAccept(file))
        {
            return "File type not accepted";
        }

        const maxFiles = this.options.maxFiles || MAX_FILES_DEFAULT;

        if (this.fileStates.length >= maxFiles)
        {
            return `Maximum of ${maxFiles} files allowed`;
        }

        return null;
    }

    /**
     * Validates that adding this file would not exceed the total size limit.
     */
    private validateTotalSize(file: File): string | null
    {
        const maxTotal = this.options.maxTotalSize || MAX_TOTAL_SIZE_DEFAULT;
        const currentTotal = this.fileStates.reduce(
            (sum, s) => sum + s.file.size, 0
        );

        if ((currentTotal + file.size) > maxTotal)
        {
            return `Total upload size would exceed ${this.formatFileSize(maxTotal)}`;
        }

        return null;
    }

    /**
     * Tests whether a file matches the accept string (MIME types, extensions).
     */
    private matchesAccept(file: File): boolean
    {
        if (!this.options.accept)
        {
            return true;
        }

        const acceptParts = this.options.accept
            .split(",")
            .map((s) => s.trim().toLowerCase());

        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        for (const part of acceptParts)
        {
            if (this.matchesSingleAccept(part, fileName, fileType))
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Tests a file against a single accept token (extension or MIME).
     */
    private matchesSingleAccept(
        token: string, fileName: string, fileType: string
    ): boolean
    {
        // Extension match: ".pdf", ".jpg"
        if (token.startsWith("."))
        {
            return fileName.endsWith(token);
        }

        // Wildcard MIME: "image/*"
        if (token.endsWith("/*"))
        {
            const prefix = token.slice(0, -2);
            return fileType.startsWith(prefix);
        }

        // Exact MIME: "application/pdf"
        return fileType === token;
    }

    // ========================================================================
    // S11: UPLOAD LOGIC
    // ========================================================================

    /**
     * Initiates the upload for a single file state.
     */
    private uploadFile(state: FileState): void
    {
        if (!this.options.onUpload)
        {
            this.setFileStatus(state, "completed");
            return;
        }

        this.setFileStatus(state, "uploading");

        const onProgress = (fraction: number): void =>
        {
            this.updateProgress(state, fraction);
        };

        this.options
            .onUpload(state.file, onProgress)
            .then(() => this.onUploadSuccess(state))
            .catch((err) => this.onUploadError(state, err));
    }

    /**
     * Handles successful completion of a file upload.
     */
    private onUploadSuccess(state: FileState): void
    {
        this.setFileStatus(state, "completed");
        this.announceStatus(`${state.file.name} uploaded successfully`);
    }

    /**
     * Handles a failed file upload.
     */
    private onUploadError(state: FileState, err: unknown): void
    {
        const errorMsg = err instanceof Error
            ? err.message
            : "Upload failed";

        this.setFileStatus(state, "failed", errorMsg);
        this.announceStatus(`${state.file.name} failed: ${errorMsg}`);
        console.error(
            `${LOG_PREFIX} Upload failed:`, state.file.name, err
        );
    }

    /**
     * Updates the progress bar and ARIA attributes for a file.
     */
    private updateProgress(state: FileState, fraction: number): void
    {
        state.progress = Math.max(0, Math.min(1, fraction));
        const pct = Math.round(state.progress * 100);

        state.progressBarEl.style.width = `${pct}%`;
        setAttr(state.progressBarEl, "aria-valuenow", String(pct));
        state.statusEl.textContent = `${pct}%`;
    }

    /**
     * Updates the visual status of a file row.
     */
    private setFileStatus(
        state: FileState, status: string, error?: string
    ): void
    {
        // Remove old status class
        state.element.classList.remove(
            `fileupload-file-${state.status}`
        );

        state.status = status as FileState["status"];
        state.error = error;

        // Add new status class
        state.element.classList.add(`fileupload-file-${status}`);

        this.updateStatusText(state);
        this.updateActionButton(state);
    }

    /**
     * Updates the status text element based on current file state.
     */
    private updateStatusText(state: FileState): void
    {
        switch (state.status)
        {
            case "queued":
                state.statusEl.textContent = "Queued";
                break;
            case "uploading":
                state.statusEl.textContent = "Uploading...";
                break;
            case "completed":
                state.statusEl.textContent = "Completed";
                state.progressBarEl.style.width = "100%";
                setAttr(
                    state.progressBarEl, "aria-valuenow", "100"
                );
                break;
            case "failed":
                state.statusEl.textContent = state.error || "Failed";
                break;
        }
    }

    /**
     * Updates the action button icon based on file status.
     */
    private updateActionButton(state: FileState): void
    {
        const btn = state.actionBtnEl;

        // Clear existing icon
        btn.textContent = "";

        if (state.status === "failed")
        {
            const icon = createElement("i", [
                "bi", "bi-arrow-clockwise",
            ]);
            setAttr(icon, "aria-hidden", "true");
            btn.appendChild(icon);
            setAttr(btn, "aria-label", `Retry ${state.file.name}`);
        }
        else
        {
            const icon = createElement("i", ["bi", "bi-x-lg"]);
            setAttr(icon, "aria-hidden", "true");
            btn.appendChild(icon);
            setAttr(btn, "aria-label", `Remove ${state.file.name}`);
        }
    }

    // ========================================================================
    // S12: KEYBOARD SUPPORT
    // ========================================================================

    /**
     * Resolves the key combo string for a named action.
     * Consumer overrides take precedence over defaults.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Tests whether a KeyboardEvent matches the combo for a named action.
     * Combo format: "Ctrl+Shift+Key", "Enter", " ", etc.
     */
    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);

        if (!combo)
        {
            return false;
        }

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
    // S13: UTILITY HELPERS
    // ========================================================================

    /**
     * Returns the Bootstrap icon class for a given file based on MIME type.
     */
    private getFileIcon(file: File): string
    {
        const type = file.type.toLowerCase();

        // Check exact MIME first
        if (FILE_ICON_MAP[type])
        {
            return FILE_ICON_MAP[type];
        }

        // Check MIME prefix (image, video, audio, text)
        const prefix = type.split("/")[0];

        if (FILE_ICON_MAP[prefix])
        {
            return FILE_ICON_MAP[prefix];
        }

        return FILE_ICON_MAP["default"];
    }

    /**
     * Formats a byte count into a human-readable string.
     */
    private formatFileSize(bytes: number): string
    {
        if (bytes < 1024)
        {
            return bytes + " B";
        }

        if (bytes < (1024 * 1024))
        {
            return (bytes / 1024).toFixed(1) + " KB";
        }

        if (bytes < (1024 * 1024 * 1024))
        {
            return (bytes / (1024 * 1024)).toFixed(1) + " MB";
        }

        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }

    /**
     * Updates the ARIA live region with a status message.
     */
    private announceStatus(message: string): void
    {
        if (this.liveRegionEl)
        {
            this.liveRegionEl.textContent = message;
        }
    }

    /**
     * Updates the dropzone disabled/enabled visual state.
     */
    private updateDropzoneDisabledAttr(): void
    {
        if (!this.dropzoneEl)
        {
            return;
        }

        if (this.options.disabled)
        {
            setAttr(this.dropzoneEl, "aria-disabled", "true");
            setAttr(this.dropzoneEl, "tabindex", "-1");
        }
        else
        {
            this.dropzoneEl.removeAttribute("aria-disabled");
            setAttr(this.dropzoneEl, "tabindex", "0");
        }
    }

    /**
     * Disables the dropzone visually when max files are reached.
     */
    private updateDropzoneState(): void
    {
        const maxFiles = this.options.maxFiles || MAX_FILES_DEFAULT;
        const atCapacity = this.fileStates.length >= maxFiles;

        if (this.dropzoneEl)
        {
            this.dropzoneEl.classList.toggle(
                "fileupload-dropzone-full", atCapacity
            );
        }

        if (this.dropzoneLimitsEl && atCapacity)
        {
            this.dropzoneLimitsEl.textContent =
                `Maximum of ${maxFiles} files reached`;
        }
    }

    /**
     * Rebuilds the download section with current download items.
     */
    private rebuildDownloadSection(): void
    {
        if (!this.downloadSectionEl || !this.rootEl)
        {
            // Build section if it does not exist yet
            this.downloadSectionEl = this.buildDownloadSection();
            this.rootEl?.appendChild(this.downloadSectionEl);
        }
        else
        {
            this.clearDownloadRows();
        }

        if (this.options.downloads)
        {
            this.populateDownloads(this.options.downloads);
        }
    }

    /**
     * Removes all download row elements from the download section.
     */
    private clearDownloadRows(): void
    {
        if (!this.downloadSectionEl)
        {
            return;
        }

        const rows = this.downloadSectionEl.querySelectorAll(
            ".fileupload-download"
        );

        for (const row of Array.from(rows))
        {
            row.remove();
        }
    }

    /**
     * Resolves a container ID string to an HTMLElement.
     */
    private resolveContainer(containerId?: string): HTMLElement
    {
        if (!containerId)
        {
            return document.body;
        }

        const el = document.getElementById(containerId);

        if (!el)
        {
            console.warn(
                `${LOG_PREFIX} Container not found:`,
                containerId,
                "-- using document.body."
            );
            return document.body;
        }

        return el;
    }
}

// ============================================================================
// S14: FACTORY FUNCTION
// ============================================================================

/**
 * Creates a FileUpload instance, shows it in the given container, and
 * returns the instance.
 */
// @entrypoint
export function createFileUpload(
    containerId: string,
    options: FileUploadOptions
): FileUpload
{
    const uploader = new FileUpload(options);
    uploader.show(containerId);
    return uploader;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["FileUpload"] = FileUpload;
(window as unknown as Record<string, unknown>)["createFileUpload"] = createFileUpload;
