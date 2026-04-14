# Bug Report: CDN RelationshipManager Dark Mode Text Visibility

**Date:** 2026-04-13
**Component:** RelationshipManager (CDN)
**Severity:** Medium
**Affects:** All apps using RelationshipManager in dark mode (Strukture, Thinker, Checklists, Diagrams, Explorer)

## Description

The CDN `RelationshipManager` component renders relationship cards with light gray metadata text that is hard to read against the dark background when `data-bs-theme="dark"` is active.

## Affected Text Elements

1. **Metadata line** (e.g., "Org Unit · MANUAL · 2026-04-10") — appears as very faint light gray
2. **Type badge labels** (e.g., "Org Unit", "Checklist Template", "Person") — low contrast badge text
3. **Role/property annotations** (e.g., "role_type: stakeholder") — barely visible

## Expected Behavior

All text within the RelationshipManager should adapt to `data-bs-theme` and use CSS custom properties (`var(--bs-body-color)`, `var(--bs-secondary-color)`, `var(--bs-tertiary-color)`) instead of hardcoded hex colors. Text should have sufficient contrast (WCAG AA) in both light and dark modes.

## Screenshot

See `related2.png` in repo root (captured 2026-04-13).

## Reproduction

1. Enable dark mode via `data-bs-theme="dark"` on `<html>`
2. Open any app with a right sidebar showing the "Related" tab
3. Select a resource with existing relationships
4. Observe the metadata text is barely readable

## Suggested Fix

The RelationshipManager component's internal styles should use Bootstrap CSS custom properties:
- Metadata text: `var(--bs-secondary-color)` instead of hardcoded gray
- Type badges: `var(--bs-secondary-bg)` / `var(--bs-secondary-color)`
- Card borders: `var(--bs-border-color-translucent)`
- Group headers: `var(--bs-body-color)` for title, `var(--bs-secondary-color)` for count
