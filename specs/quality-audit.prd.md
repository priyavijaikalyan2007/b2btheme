# Open Source Publication Quality Audit — Plan

> **Status:** Draft
> **Date:** 2026-03-29
> **Goal:** Ensure the entire repository is publication-ready for
>   enterprise use, with consistent quality across all 106 components,
>   4 studio apps, and supporting infrastructure.

---

## 1. Scope

| Area | Files | Concern |
|------|-------|---------|
| Copyright headers | ~350+ files | SPDX headers on every source, test, demo, config file |
| Compiled outputs | ~200 JS/CSS | Copyright banner retained after tsc/IIFE/minify |
| Code style | ~106 .ts components | Allman braces, 30-line functions, 4-space indent |
| Commenting | ~106 .ts components | JSDoc on all public APIs |
| Logging | ~106 .ts components | LOG_PREFIX pattern, no console.log leaks |
| Security | ~106 .ts components | No innerHTML with user content, XSS prevention |
| Test quality | ~110 test files | Clean structure, no hacks, descriptive names |
| Demo pages | ~110 HTML files | Consistent structure, copyright, working links |
| Studio apps | 4 HTML files | No brittle patterns, proper error handling |
| Documentation | ~20 .md files | Up-to-date, accurate component counts |
| CONVERSATION.md | 1 file | Update with recent work summary |

---

## 2. Copyright Header Standard

### Source files (.ts, .scss)
```
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
```

### HTML demo/studio files
```html
<!--
  SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
  SPDX-License-Identifier: MIT
-->
```

### Shell scripts (.sh)
```bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
```

### Compiled JS/CSS outputs
The build pipeline must prepend a copyright banner:
```javascript
/* Enterprise Bootstrap Theme | MIT License | (c) 2026 Priya Vijai Kalyan */
```

---

## 3. Audit Phases

### Phase 1: Copyright Headers (~350 files)
- Scan ALL files for missing SPDX headers
- Add headers to: .ts, .scss, .test.ts, .html, .sh, .js (studio)
- Modify wrap-iife.sh to prepend copyright banner to compiled JS
- Modify build:css to prepend copyright banner to compiled CSS
- Verify headers survive the build pipeline

### Phase 2: Code Style Compliance (~106 components)
- Scan for functions exceeding 30 lines
- Scan for non-Allman brace style
- Scan for tabs (should be 4 spaces)
- Scan for innerHTML with user content (security)
- Scan for console.log (should be console.debug or LOG_PREFIX)
- Fix violations

### Phase 3: Security Audit
- Verify no innerHTML with user-supplied content
- Check for DOM injection via textContent (should use textContent)
- Check for eval() or Function() usage
- Check for unescaped URL parameters
- Verify SVG export sanitization
- Check for prototype pollution in option merging

### Phase 4: Test Quality
- Remove any test hacks (skip, only, hardcoded timeouts)
- Verify test isolation (no shared mutable state)
- Check for proper cleanup (afterEach/teardown)
- Verify descriptive test names
- Check for assertion quality (not just .toBeDefined())

### Phase 5: Documentation
- Update CONVERSATION.md with session summaries
- Verify README accuracy (counts, features, links)
- Verify all component READMEs are up-to-date
- Check COMPONENT_INDEX.md completeness
- Check MASTER_COMPONENT_LIST.md accuracy

### Phase 6: Build Pipeline Integrity
- Verify all 106 components build without errors
- Verify all compiled outputs are in dist/
- Verify CDN deployment paths are correct
- Verify demo pages work locally AND on CDN
- Run full test suite and verify 0 failures

---

## 4. Execution Strategy

### Automated scanning scripts
Write shell scripts to detect violations:
```bash
# Find files missing SPDX headers
find components/ -name "*.ts" | xargs grep -L "SPDX-License"

# Find long functions (>30 lines)
# Find innerHTML usage
grep -rn "innerHTML" components/ --include="*.ts" | grep -v test | grep -v "textContent"

# Find console.log (not debug/warn/error)
grep -rn "console\.log" components/ --include="*.ts" | grep -v LOG_PREFIX | grep -v test
```

### Parallel execution
- Phase 1 (headers) can run via script + agent
- Phase 2 (style) can be checked by scanning
- Phase 3 (security) requires manual review
- Phase 4 (tests) can be checked by scanning
- Phases 5-6 are verification steps

---

## 5. Priority

1. **Copyright headers** — CRITICAL for open source publication
2. **Security** — CRITICAL for enterprise use
3. **Compiled output banners** — HIGH for license compliance
4. **Code style** — MEDIUM (functional but aesthetic)
5. **Test quality** — MEDIUM (working but may need cleanup)
6. **Documentation** — MEDIUM (mostly up-to-date)
