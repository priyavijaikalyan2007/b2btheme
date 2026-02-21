<!-- AGENT: Documentation for the FileUpload component -- drag-and-drop upload zone with progress, validation, and downloads. -->

# FileUpload

A drag-and-drop file upload zone with progress bars, file type validation, size limits, batch upload, and an optional download queue. Modelled after Dropbox, Google Drive, and AWS S3 Console upload patterns.

## Features

- **Drag-and-drop** -- dashed-border dropzone with visual feedback on drag-over
- **Click to browse** -- hidden file input triggered by click or keyboard
- **File validation** -- max file size, max total size, max file count, MIME/extension filtering
- **Progress tracking** -- per-file progress bars with ARIA progressbar role
- **Status transitions** -- queued, uploading, completed, failed with distinct visual states
- **Retry failed uploads** -- action button changes to retry icon on failure
- **Batch upload** -- auto-upload on add or manual `uploadAll()` call
- **Download section** -- optional list of downloadable files with links
- **Disabled state** -- disables all interaction and applies visual indicator
- **Size variants** -- sm, md (default), lg for different layout contexts
- **Accessible** -- ARIA live region, button roles, progressbar roles, keyboard support
- **Reduced motion** -- respects `prefers-reduced-motion` media query

## Assets

| Asset | Path |
|-------|------|
| CSS   | `components/fileupload/fileupload.css` |
| JS    | `components/fileupload/fileupload.js` |
| Types | `components/fileupload/fileupload.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons (for file type and action icons). Does **not** require Bootstrap JS.

## Quick Start

### Basic Upload

```html
<link rel="stylesheet" href="components/fileupload/fileupload.css">
<script src="components/fileupload/fileupload.js"></script>

<div id="upload-container"></div>

<script>
    var uploader = createFileUpload("upload-container", {
        accept: "image/*,.pdf",
        maxFileSize: 5 * 1024 * 1024,
        maxFiles: 5,
        onUpload: function(file, onProgress) {
            return new Promise(function(resolve, reject) {
                // Simulate upload with progress
                var progress = 0;
                var interval = setInterval(function() {
                    progress += 0.1;
                    onProgress(progress);
                    if (progress >= 1) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 200);
            });
        }
    });
</script>
```

### With Downloads

```html
<script>
    var uploader = createFileUpload("upload-container", {
        showDownloads: true,
        downloads: [
            { name: "report.pdf", size: 1258291, url: "/files/report.pdf" },
            { name: "data.csv", size: 45032, url: "/files/data.csv", icon: "bi-file-text" }
        ],
        onUpload: function(file, onProgress) {
            // Your upload logic here
            return fetch("/api/upload", { method: "POST", body: file });
        }
    });
</script>
```

### ES Module

```typescript
import { FileUpload, createFileUpload } from "./components/fileupload/fileupload";

const uploader = createFileUpload("my-container", {
    accept: "image/*",
    maxFileSize: 10 * 1024 * 1024,
    autoUpload: false,
    onUpload: async (file, onProgress) => {
        const formData = new FormData();
        formData.append("file", file);
        await uploadWithProgress("/api/upload", formData, onProgress);
    },
});

// Later, start all uploads manually
uploader.uploadAll();
```

## API

### Factory Function

```typescript
createFileUpload(containerId: string, options: FileUploadOptions): FileUpload
```

Creates a FileUpload instance, appends it to the container, and returns the instance.

### Constructor

```typescript
const uploader = new FileUpload(options: FileUploadOptions);
```

Creates the FileUpload DOM but does not attach to the page. Call `show()` to attach.

### FileUploadOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accept` | `string` | -- | Accepted MIME types/extensions (e.g., `"image/*,.pdf"`) |
| `maxFileSize` | `number` | `10485760` (10 MB) | Max individual file size in bytes |
| `maxTotalSize` | `number` | `104857600` (100 MB) | Max total upload size in bytes |
| `maxFiles` | `number` | `10` | Max number of files |
| `multiple` | `boolean` | `true` | Allow multiple file selection |
| `onUpload` | `function` | -- | Upload handler called per file with progress callback |
| `onRemove` | `function` | -- | Called when a file is removed from the queue |
| `autoUpload` | `boolean` | `true` | Start uploads immediately on file add |
| `showDownloads` | `boolean` | `false` | Show the download section |
| `downloads` | `FileDownloadItem[]` | -- | Pre-populated download items |
| `disabled` | `boolean` | `false` | Disabled state |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | -- | Additional CSS class(es) |
| `keyBindings` | `Partial<Record<string, string>>` | -- | Override default key combos |

### FileDownloadItem

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name of the file |
| `size` | `number` | No | File size in bytes (for display) |
| `url` | `string` | Yes | Download URL |
| `icon` | `string` | No | Bootstrap icon class (e.g., `"bi-file-pdf"`) |

### Methods

| Method | Description |
|--------|-------------|
| `show(containerId?)` | Appends to container (ID string) and activates listeners |
| `hide()` | Removes from DOM without destroying state |
| `destroy()` | Hides, releases all references |
| `getElement()` | Returns the root DOM element |
| `addFiles(files)` | Programmatically adds files to the queue |
| `removeFile(fileId)` | Removes a file from the queue by internal ID |
| `retryFile(fileId)` | Retries a failed file upload |
| `clearAll()` | Removes all files from the queue |
| `getFiles()` | Returns array of `{ name, status, progress }` |
| `setDisabled(disabled)` | Toggles the disabled state |
| `setDownloads(downloads)` | Replaces the download section items |
| `uploadAll()` | Starts uploading all queued files |

### Global Exports

```
window.FileUpload
window.createFileUpload
```

## File States

| State | Description | Visual |
|-------|-------------|--------|
| `queued` | File added, upload not started | Default styling, "Queued" text |
| `uploading` | Upload in progress | Blue progress bar animating, percentage text |
| `completed` | Upload succeeded | Green progress bar at 100%, "Completed" text |
| `failed` | Upload failed | Red progress bar, error text, retry action button |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Open file browser (when dropzone focused) |
| `Space` | Open file browser (when dropzone focused) |
| `Delete` | Remove file (future: when file row focused) |
| `Tab` | Navigate between dropzone, file rows, and action buttons |

Override key bindings via the `keyBindings` option:

```typescript
createFileUpload("container", {
    keyBindings: {
        browse: "Ctrl+O",
    },
});
```

### Available Action Names

| Action | Default | Description |
|--------|---------|-------------|
| `browse` | `Enter` | Open file browser |
| `browseAlt` | `Space` | Open file browser (alternate) |
| `removeFile` | `Delete` | Remove focused file |

## Accessibility

- Dropzone uses `role="button"` with `tabindex="0"` and descriptive `aria-label`
- File list uses `role="list"` with `role="listitem"` on each file row
- Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Action buttons have descriptive `aria-label` (e.g., "Remove photo.jpg", "Retry report.pdf")
- Live region (`aria-live="polite"`) announces file additions, removals, and upload status changes
- Download links have descriptive `aria-label` (e.g., "Download report.pdf")
- Focus-visible outline on dropzone for keyboard navigation
- Disabled state uses `aria-disabled="true"` and removes from tab order
