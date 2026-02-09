<!-- AGENT: Coding style conventions and formatting rules for the theme and component library. -->

# Coding Style Guide

A guide for writing maintainable, readable, and consistent code in this Bootstrap 5 theme and component library. This repository uses **TypeScript**, **SCSS**, **HTML**, and **CSS**.

## Core Philosophy

**The Student Principle**: Assume that the code you write will be read, maintained, deployed, and operated by a less than gifted high school student. Write code with that in mind.

- **Explicit**: Write explicit code that reveals intent.
- **Simple**: Write concise code that gets the job done without cleverness.
- **Readable**: Assume you will read this code months from now and won't remember what you did.
- **Language**: Adhere to the business communication standards in [LANGUAGE.md](./LANGUAGE.md).

---

## Foundational References

For TypeScript/JavaScript:
1. Follow [ts.dev](https://ts.dev/style/#identifiers)
2. Follow [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
3. Follow [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
4. Apply the overrides in this document

For HTML/CSS/SCSS:
1. Follow [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)
2. Apply the overrides in this document

---

## Formatting Rules

### Indentation and Line Length

- Use 4 spaces for indentation (no tabs).
- Maximum line length: 120 characters.
- One statement per line.
- One expression per line.

### Brace Style (TypeScript)

Use **Allman style** braces: opening brace on its own line.

```typescript
class OrderProcessor
{
    public processOrder(order: Order): void
    {
        if (order.isValid)
        {
            this.executeOrder(order);
        }
        else
        {
            this.rejectOrder(order);
        }
    }
}
```

### Always Use Braces

Always use braces around control flow bodies, even for single statements.

```typescript
// Bad
if (isValid)
    process();

// Good
if (isValid)
{
    process();
}
```

### Parentheses for Clarity

Use parentheses around expressions even when operator precedence is obvious.

```typescript
// Bad
if (a && b || c)

// Good
if ((a && b) || c)
```

### Whitespace for Readability

Use blank lines to separate logical groups of code.

```typescript
// Bad
const container = getContainer();
containerCount += 1;
processNext();
validateState();

// Good
const container = getContainer();

containerCount += 1;

processNext();
validateState();
```

### Parameter Alignment

Align parameters using newlines and consistent indentation.

```typescript
// Short parameter list — single line
function save(name: string, id: number): void

// Long parameter list — align on new lines
function showErrorDialog(
    containerId: string,
    title: string,
    message: string,
    suggestion: string | undefined,
    technicalDetail: string | undefined): void
{
    // ...
}
```

---

## Naming Conventions

### TypeScript / JavaScript

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `ErrorDialog` |
| Interfaces | PascalCase (no I prefix) | `ErrorDialogOptions` |
| Type Aliases | PascalCase | `DialogAction` |
| Functions | camelCase | `showErrorDialog` |
| Methods | camelCase | `renderContent` |
| Properties | camelCase | `errorCode` |
| Variables | camelCase | `containerElement` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Enums | PascalCase | `DialogType.Error` |
| Private Members | #camelCase or _camelCase | `#container` |

```typescript
interface ErrorDialogOptions
{
    readonly title: string;
    readonly message: string;
    readonly suggestion?: string;
}

class ErrorDialog
{
    private static readonly MAX_VISIBLE_ACTIONS = 3;
    private readonly #container: HTMLElement;

    public errorCode: string;

    public async showDialog(options: ErrorDialogOptions): Promise<void>
    {
        const dialog = this.#container.querySelector(".errordialog");
        // ...
    }
}
```

### SCSS / CSS

| Element | Convention | Example |
|---------|------------|---------|
| Class names | lowercase-hyphenated | `.metric-card`, `.toolbar-actions` |
| Component prefix | component name | `.errordialog-header`, `.combobox-item` |
| SCSS variables | $lowercase-hyphenated | `$primary`, `$font-size-sm` |
| SCSS mixins | lowercase-hyphenated | `@mixin responsive-grid` |
| SCSS placeholders | %lowercase-hyphenated | `%visually-hidden` |
| BEM (if used) | block__element--modifier | `.card__header--compact` |

```scss
// Component-scoped class names
.errordialog-header {
    background-color: $gray-900;
    color: white;
    padding: $spacer;
}

.errordialog-body {
    padding: $spacer;
    font-size: $font-size-base;
}

.errordialog-suggestion {
    color: $gray-600;
    font-style: italic;
}
```

### HTML

| Element | Convention | Example |
|---------|------------|---------|
| IDs | lowercase-hyphenated | `id="error-dialog-container"` |
| Classes | lowercase-hyphenated | `class="metric-card"` |
| Data attributes | lowercase-hyphenated | `data-dialog-type="error"` |
| Custom elements | lowercase-hyphenated | `<error-dialog>` |

---

## SCSS-Specific Rules

### Variable Overrides

Always override Bootstrap variables in `_variables.scss`, not in component files.

```scss
// Good — in _variables.scss
$border-radius: 0 !default;

// Bad — in a component file
.my-component {
    border-radius: 0; // Fights Bootstrap's default
}
```

### Nesting Depth

Limit SCSS nesting to 3 levels. Deep nesting produces overly specific selectors.

```scss
// Bad — too deep
.sidebar {
    .nav {
        .nav-item {
            .nav-link {
                &:hover {
                    // 5 levels deep
                }
            }
        }
    }
}

// Good — flattened
.sidebar .nav-link {
    // styles

    &:hover {
        // styles
    }
}
```

### Avoid `!important`

Never use `!important` in component SCSS. If a style is not applying, the selector specificity is wrong — fix the selector, not the declaration.

The only exception is utility classes in the theme itself (e.g., `.p-compact`), where `!important` follows Bootstrap's utility convention.

---

## Method and Function Design

### Size Limits

Keep functions between 25-30 lines of code. If a function exceeds this, break it into smaller functions.

### Nesting Limits

Limit nesting to 3-4 levels. Use early returns to flatten logic.

```typescript
// Bad — too deeply nested
function processItems(items: Item[]): void
{
    for (const item of items)
    {
        if (item.isValid)
        {
            if (item.hasContent)
            {
                if (item.isVisible)
                {
                    renderItem(item);
                }
            }
        }
    }
}

// Good — early returns
function processItems(items: Item[]): void
{
    for (const item of items)
    {
        processItem(item);
    }
}

function processItem(item: Item): void
{
    if (!item.isValid || !item.hasContent || !item.isVisible)
    {
        return;
    }

    renderItem(item);
}
```

---

## Error Handling

### Early Returns (Guard Clauses)

Use early returns to handle edge cases at the beginning of functions.

```typescript
function showDialog(containerId: string, options: ErrorDialogOptions): void
{
    if (!containerId)
    {
        console.error("[ErrorDialog] No container ID provided");
        return;
    }

    const container = document.getElementById(containerId);
    if (!container)
    {
        console.error("[ErrorDialog] Container not found:", containerId);
        return;
    }

    if (!options.title && !options.message)
    {
        console.warn("[ErrorDialog] No title or message provided");
        return;
    }

    // Happy path — render the dialog
    renderDialog(container, options);
}
```

### Assertions and Preconditions

Use assertions to validate assumptions in development.

```typescript
function calculateDiscount(price: number, percent: number): number
{
    if (percent < 0 || percent > 100)
    {
        throw new RangeError("Discount percent must be between 0 and 100");
    }

    console.assert(
        price >= 0,
        "Price should be non-negative"
    );

    return price * (percent / 100);
}
```

---

## Explicit Code Style

Avoid clever tricks. Write code that clearly expresses intent.

```typescript
// Bad — clever but obscure
const result = (b << 4 & b << 8) | (b >> 2);

// Good — explicit and clear
const shift4Bits = b << 4;
const shift8Bits = b << 8;
const divideBy4 = b >> 2;
const mergedBits = (shift4Bits & shift8Bits) | divideBy4;
```

---

## Summary Checklist

- [ ] 4 spaces for indentation (no tabs)
- [ ] Max 120 characters per line
- [ ] Allman braces (opening brace on new line) for TypeScript
- [ ] Always use braces for control flow
- [ ] Parentheses around expressions for clarity
- [ ] Functions under 30 lines
- [ ] Max 3-4 levels of nesting
- [ ] Early returns for guard clauses
- [ ] SCSS nesting max 3 levels
- [ ] No `!important` in component SCSS
- [ ] Component CSS classes prefixed with component name
- [ ] Domain-appropriate naming
- [ ] Explicit code over clever tricks
