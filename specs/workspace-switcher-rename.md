# WorkspaceSwitcher should be TenantSwitcher

**From:** knobbyio/apps, GitHub #255
**Component:** `static.knobby.io/components/workspaceswitcher/`
**Status:** request, not urgent. The app works today.

---

## What changed on our side

The platform used "workspace" and "tenant" for the same thing. Two tables stored that value twice under both names, with nothing keeping the copies equal, and one entity class existed twice under both names with the correctly named one dead.

So the whole of `knobbyio/apps` now says **tenant**, in the schema, the types, the wire contract and the interface. Tenant creation already asks whether a tenant is a project or an enterprise, so the variation people care about is carried by a type rather than by a second noun.

## What that leaves

`createWorkspaceSwitcher` is the last place the old word survives in our codebase, and it survives because the component is yours rather than ours.

```ts
// typescript/apps/shell/shell-tenants.ts
window.createWorkspaceSwitcher(
    {
        workspaces: switcherItems,
        activeWorkspaceId: activeId,
        onSwitch: (item: WorkspaceItem) => { ... },
    },
    'tenant-switcher-container'
);
```

The surrounding code says tenant. The three lines crossing into the component say workspace. There is a comment at that boundary explaining why, so nobody tidies it away and breaks the switcher.

## What we are asking for

A rename, whenever it suits you:

| Now | Proposed |
|---|---|
| `createWorkspaceSwitcher` | `createTenantSwitcher` |
| `WorkspaceSwitcherOptions.workspaces` | `TenantSwitcherOptions.tenants` |
| `WorkspaceSwitcherOptions.activeWorkspaceId` | `activeTenantId` |
| `WorkspaceItem` | `TenantItem` |
| `setWorkspaces`, `setActiveWorkspace` | `setTenants`, `setActiveTenant` |
| Any user-facing string saying "workspace" | "tenant" |

`WorkspaceItem`'s own fields need no change. They are already `id`, `name`, `avatarUrl`, `icon` and `role`.

## Please do not break the old names in the same release

Keep both for one release if that is easy, so the app can move over without the switcher disappearing in between. A global that silently becomes `undefined` means the component never renders and nothing reports an error, which is the failure mode we have been removing elsewhere this week.

If a clean break is simpler for you, tell us the release and we will land our change in the same window.

## Why this is worth your time rather than ours to absorb

We could keep translating at the boundary forever, and the translation is three lines. The reason to fix it properly is that a reader of either codebase now has to know the two words mean one thing.

That is exactly what produced the bugs this came out of. A comment in our schema said *"workspace == tenant in current model"*, which was true and was not a constraint, so a test fixture quietly created rows where the two disagreed, and a unique-index test named *"SameResourceInDifferentTenants"* never used two tenants.
