<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 0328ccda-891a-45a8-adcd-e9cc18b945a1
Created: 2026
-->

<!-- AGENT: The icon packs served at /icons/<pack>/ (Fluent UI, Fluent Emoji, AWS, Azure, GCP): what is served, the URL scheme, manifests, usage, licences and attribution, what was changed, and how the Apps team switches to the CDN-hosted icons. Source of truth for the packs is icon-packs/ and scripts/icons/sources.json. -->
<!-- ⚓ DOC: IconPacksGuide -->

# Icon packs

The CDN serves ready-to-use SVG icon packs at `https://static.outcrop.us/icons/<pack>/`.
They have clean names, one category folder per topic, and a JSON manifest for
lookup and search. `static.outcrop.us` and `static.knobby.io` are the same
origin, and the examples here use the host-neutral name.

The packs are additive. The Bootstrap Icons font at `/icons/bootstrap-icons.css`
and `/icons/fonts/*` is unchanged.

## What's served

| Pack | Contents | Icons | SVGs | Licence | Upstream |
|---|---|---|---|---|---|
| `fluent-ui` | Microsoft Fluent UI System Icons: regular and filled at 16 and 24 px, and every colour icon at every size it comes in | 2,718 | 9,345 | MIT | [GitHub](https://github.com/microsoft/fluentui-system-icons), [npm](https://www.npmjs.com/package/@fluentui/svg-icons), [design guidance](https://fluent2.microsoft.design/iconography) |
| `fluent-emoji` | Microsoft Fluent Emoji: the Color style at 32 px, with all six skin tones for every emoji that has them | 1,587 | 3,134 | MIT | [GitHub](https://github.com/microsoft/fluentui-emoji) |
| `aws` | AWS Architecture Icons: services (64 px), resources (48 px) and category icons | 897 | 898 | AWS terms, diagrams only | [aws.amazon.com/architecture/icons](https://aws.amazon.com/architecture/icons/) |
| `azure` | Microsoft Azure architecture icons | 676 | 676 | Microsoft terms, diagrams only | [learn.microsoft.com](https://learn.microsoft.com/en-us/azure/architecture/icons/) |
| `gcp` | Google Cloud product icons | 216 | 216 | Google brand permissions, diagrams only | [cloud.google.com/icons](https://cloud.google.com/icons) |

Every pack folder also serves:
- `manifest.json`: every icon with its files, keywords and category;
- `ATTRIBUTION.md`: the source, the exact version, the subset and what was changed;
- the licence: `LICENSE` for Fluent UI, `TERMS.md` for the cloud packs;
- for the cloud packs only, `legacy-map.json`, which maps each old path to its new one (see below);
- for the two Fluent packs, icon stylesheets that give every icon a CSS class (see "In components").

## URL scheme

```
https://static.outcrop.us/icons/<pack>/<category>/<name>-<size>-<variant>.svg
```

- **`<name>` and `<category>`:** lowercase ASCII words joined by hyphens, with no spaces.
- **`<size>`:** the icon's design grid in pixels (its viewBox). Fluent UI draws each size separately, so use the size you display at when one exists.
- **`<variant>`:** one of the pack's fixed variants.

| Pack | Variants | Example |
|---|---|---|
| `fluent-ui` | `regular`, `filled`, `color` | `/icons/fluent-ui/data-charts/table-24-color.svg` |
| `fluent-emoji` | `color` (the default tone), `color-tone-light`, `color-tone-medium-light`, `color-tone-medium`, `color-tone-medium-dark`, `color-tone-dark` | `/icons/fluent-emoji/people-body/artist-32-color-tone-medium.svg` |
| `aws` | `service`, `resource`, `category` | `/icons/aws/compute/aws-fargate-64-service.svg` |
| `azure` | `color` | `/icons/azure/monitor/application-insights-18-color.svg` |
| `gcp` | `color` | `/icons/gcp/databases/cloud-sql-24-color.svg` |

**Categories:**
- **Fluent UI:** derived from each icon's name. The first word that names a topic decides, so `document-edit` goes in `documents-files` and `calendar-clock` in `calendar-time`. The topics are `ai`, `arrows`, `calendar-time`, `commerce`, `communication`, `data-charts`, `devices`, `documents-files`, `layout-shapes`, `maps-places`, `media`, `objects`, `people`, `security`, `settings-tools`, `status-alerts`, `text-editing`, `weather-nature` and `general`.
- **Fluent Emoji:** the emoji's Unicode group: `smileys-emotion`, `people-body`, `animals-nature`, `food-drink`, `travel-places`, `activities`, `objects`, `symbols` and `flags`. Names are the Unicode CLDR short names, so 😀 is `grinning-face` and 🥇 is `1st-place-medal`.
- **AWS and Azure:** the providers' own categories.
- **GCP:** rule-based, because the source has no categories.
- **Icons in more than one category:** when a provider files an icon in several categories, it appears in each of them, and its manifest entry lists the others in `alsoIn`.

## Manifest

`/icons/<pack>/manifest.json` looks like this (abridged):

```json
{
  "pack": "fluent-ui",
  "title": "Fluent UI System Icons",
  "license": "MIT",
  "source": "@fluentui/svg-icons@1.1.345 (git 73ec879377b1)",
  "variants": ["regular", "filled", "color"],
  "fileCount": 9345,
  "icons": [
    {
      "id": "data-charts/table",
      "name": "table",
      "category": "data-charts",
      "keywords": ["table", "cell", "row", "column", "information", "chart", "excel"],
      "description": "Used to represent a data table.",
      "files": { "16-regular": "data-charts/table-16-regular.svg", "24-color": "data-charts/table-24-color.svg" }
    }
  ]
}
```

- **`id`** is `<category>/<name>` and is unique within a pack. A `name` can repeat across categories in the cloud packs.
- **`files`** keys are `<size>-<variant>`, and each value is relative to the pack folder.
- **Search:** match on `name`, `keywords` and, for the cloud packs, `alsoIn`.
- **Fluent Emoji entries** also carry `glyph` (the emoji character, such as `"🧑‍🎨"`) and `unicode` (its code points, such as `"1f9d1 200d 1f3a8"`), so an app can map a typed emoji to its picture.

## Using the icons

```html
<img src="https://static.outcrop.us/icons/fluent-ui/data-charts/table-24-color.svg"
     width="24" height="24" alt="Table">
```

- **`<img>` and CSS `background-image`:** work for every icon.
- **Recolouring monochrome Fluent icons:** Fluent UI `regular` and `filled` icons carry no fill. Inline them and set `fill`, or use them as a CSS `mask-image` over `background-color: currentColor` so they follow the text colour.
- **Colour icons:** `color` icons keep their own palette. Fluent UI colour icons suit toolbars and ribbons; Fluent Emoji suit reactions, status and empty states.
- **Skin tones:** an emoji that has tones has one file per tone; `color` is the default (yellow) tone. Pick the user's preferred tone from the manifest's `files` keys. Three emoji lack one tone (see What was changed), and `raising-hands` lacks `32-color`, so choose another key from `files` when the one you want is missing.
- **File size:** Fluent UI SVGs are about 1 KB. Fluent Emoji are detailed artwork: about 36 KB on average and up to 560 KB, roughly a sixth of that on the wire with compression. Load emoji on demand, not hundreds at once.
- **Inlining with `fetch()`:** CORS is open. Every SVG here passes a safety check (no scripts, event handlers, `foreignObject` or external references), but treat inlined markup as you would any other HTML you insert.
- **Caching:** a day, then stale-while-revalidate for a week. The paths carry no version, so a repack reaches browsers within a day.

### In components: Ribbon, Toolbar, InlineToolbar, ContextMenu, GraphCanvas, TypeBadge, ExplorerPicker, SymbolPicker

Any component whose `icon` option takes CSS classes (Ribbon, Toolbar,
InlineToolbar, ContextMenu, Sidebar and others) shows a pack icon once the page
loads that pack's stylesheet. The class is `<pack>-<name>-<size>-<variant>`,
the icon's file name with the pack in front:

```html
<link rel="stylesheet" href="https://static.outcrop.us/icons/fluent-ui/fluent-ui-color.css" crossorigin="anonymous">
<link rel="stylesheet" href="https://static.outcrop.us/icons/fluent-ui/fluent-ui-16-regular.css" crossorigin="anonymous">
```

```js
{ type: "button", id: "table", label: "Table", icon: "fluent-ui-table-24-color", size: "large" }
{ type: "button", id: "cut", label: "Cut", icon: "fluent-ui-cut-16-regular", size: "small" }
```

| Stylesheet | Classes | Size |
|---|---|---|
| `/icons/fluent-ui/fluent-ui-color.css` | every colour icon, at every size it comes in | 82 KB, 7 KB compressed |
| `/icons/fluent-ui/fluent-ui-16-regular.css`, `-16-filled.css` | 16 px monochrome | about 250 KB each |
| `/icons/fluent-ui/fluent-ui-24-regular.css`, `-24-filled.css` | 24 px monochrome | about 365 KB each |
| `/icons/fluent-emoji/fluent-emoji.css` | every emoji in the default tone | 158 KB |
| `/icons/fluent-emoji/fluent-emoji-tones.css` | the five other skin tones | 206 KB |

- **Sizing:** an icon is a `1em` square, so it takes the size of the text around it. The Ribbon draws large-button icons at 24 px and small and mini ones at 15 px, so use the `24-` and `16-` classes there.
- **Colour and theme:** colour icons keep their palette in light and dark themes. Monochrome icons are masks over `currentColor`, so they follow the text colour as Bootstrap Icons do.
- **What `icon` takes:**
  - **Ribbon:** one class or a class string (`"bi bi-scissors"`).
  - **InlineToolbar and ContextMenu:** the same, and a bare Bootstrap Icons name (`"folder-plus"`) as before. A value with a space, or one that starts with `bi-` or a pack prefix (`fluent-ui-`, `fluent-emoji-`, `aws-`, `azure-`, `gcp-`), is used as given; anything else gets `bi bi-` in front. A checked ContextMenu item still shows its checkmark.
  - **GraphCanvas** (a node's `icon`): the same rule as InlineToolbar, except a value starting with `bi-` stays a Bootstrap Icons name, as before. The class is drawn in the node's SVG: font icons (Bootstrap Icons, Font Awesome in its two-class form, `"fa-solid fa-user"`) as text in their own font, monochrome pack icons in the secondary text colour, colour ones as they are. `exportPNG()` draws no node icons. See the component README.
  - **TypeBadge and GraphLegend** (a node type's `icon`): the same rule as GraphCanvas, so one stored value shows on the graph, in the type list and in the legend. The badge's `sm`, `md` and `lg` sizes size every icon family; use the `16-` Fluent classes.
  - **ExplorerPicker** (a resource's icon, from a node, an ontology type or `iconResolver`): one class or a class string, used as given (`"bi-file-earmark-code"`, `"fluent-ui-document-16-regular"`, `"fa-solid fa-file"`). It adds no `bi` prefix, so a bare Bootstrap name does not work there.
  - **Toolbar:** one class (`"fluent-ui-cut-16-regular"` or `"bi-scissors"`). It adds `bi` itself, so a class string with a space does not work there.
- **Disabled:** a disabled Ribbon control, InlineToolbar button or ContextMenu item shows a colour icon in grey, as Office does.
- **SymbolPicker:** it finds the icons in any loaded pack stylesheet and files them by pack folder, for example "Data Charts (fluent-ui)". The selected item's `code` is the class to use. Don't load `fluent-emoji.css` on a page with a SymbolPicker: its "All" view draws every icon, about 57 MB of emoji artwork.
- **`crossorigin="anonymous"`:** the icons show without it, but SymbolPicker can read a cross-origin stylesheet's classes only when the `<link>` carries it. The CDN sends the CORS headers.
- **Coverage:** about 200 Fluent UI icons come in colour. Mix them with monochrome ones where no colour version exists, as the Ribbon demo does.

### For the Apps team: switching to CDN-hosted icons

1. **Allow the origin.** Add `https://static.outcrop.us` (or `https://static.knobby.io`) to your Content-Security-Policy `img-src`. Add it to `connect-src` too if you fetch manifests or inline SVGs.

2. **Look icons up through the manifest** rather than building paths by hand:

   ```js
   const ICONS = "https://static.outcrop.us/icons";
   const manifests = new Map();

   /** The pack's manifest, fetched once per page. */
   function iconPack(pack)
   {
       if (!manifests.has(pack))
       {
           manifests.set(pack, fetch(`${ICONS}/${pack}/manifest.json`).then((r) =>
           {
               if (!r.ok) { throw new Error(`icon pack ${pack}: HTTP ${r.status}`); }
               return r.json();
           }));
       }
       return manifests.get(pack);
   }

   /** iconUrl("fluent-ui", "data-charts/table", "24-color") */
   async function iconUrl(pack, id, key)
   {
       const icon = (await iconPack(pack)).icons.find((i) => i.id === id);
       const rel = icon?.files[key];
       if (!rel) { throw new Error(`${pack}: no ${id} at ${key}`); }
       return `${ICONS}/${pack}/${rel}`;
   }
   ```

3. **Migrating from the old `cloud-icons/` layout.** If your app bundles the earlier `cloud-icons/` files (`AWS/Services/Compute/AWS Fargate.svg` and so on), each cloud pack's `legacy-map.json` maps every old path to its new one. All 1,790 files map one to one, byte-identical.

   ```js
   const legacy = await (await fetch(`${ICONS}/aws/legacy-map.json`)).json();
   // legacy["AWS/Services/Compute/AWS Fargate.svg"] === "compute/aws-fargate-64-service.svg"
   const url = `${ICONS}/aws/${legacy["AWS/Services/Compute/AWS Fargate.svg"]}`;
   ```

   Keys start with the provider folder (`AWS/`, `Azure/`, `GCP/`) and are case-sensitive. Once every icon reference has moved, delete your bundled copy.

4. **Diagrams (DiagramEngine, maxGraph):**
   - Use the URL as the shape's image, for example `image=https://static.outcrop.us/icons/azure/monitor/application-insights-18-color.svg`.
   - Cross-origin images display normally, but they taint a canvas you then export with `toDataURL`. For exports, `fetch()` the SVG (CORS is open) and embed it as a `data:` URL.

5. **Credit the icons.** See the obligations below.

6. **Stability.** Published paths don't move or disappear without a deprecation notice (the repository's `CDN_CONTRACT.md`, §2d). New icons can appear in any pack at any time.

## Licences and attribution

| Pack | Copyright and trademarks | Licence | What your app must do |
|---|---|---|---|
| `fluent-ui` | Copyright (c) 2020 Microsoft Corporation | [MIT](https://opensource.org/license/mit), full text at `/icons/fluent-ui/LICENSE` | Include the copyright line and MIT permission notice in your app's third-party notices |
| `fluent-emoji` | Copyright (c) Microsoft Corporation | [MIT](https://opensource.org/license/mit), full text at `/icons/fluent-emoji/LICENSE` | Include the copyright line and MIT permission notice in your app's third-party notices |
| `aws` | Amazon Web Services, AWS and all related names and logos are trademarks of Amazon.com, Inc. or its affiliates | [AWS trademark guidelines](https://aws.amazon.com/trademark-guidelines/) | Use only to depict AWS services in architecture and infrastructure diagrams |
| `azure` | Microsoft, Azure and all related names and logos are trademarks of Microsoft Corporation | [Microsoft terms of use](https://learn.microsoft.com/en-us/legal/termsofuse) | Use only to depict Azure services in architecture and infrastructure diagrams |
| `gcp` | Google, Google Cloud and all related names and logos are trademarks of Google LLC | [Google brand permissions](https://about.google/brand-resource-center/) | Use only to depict Google Cloud services in architecture and infrastructure diagrams |

**Exact sources:**
- `fluent-ui`: npm `@fluentui/svg-icons@1.1.345`, verified against its published integrity hash. Metadata and LICENSE come from [microsoft/fluentui-system-icons](https://github.com/microsoft/fluentui-system-icons) at commit `73ec879377b1f412f33aca4a128aa967e6c238f0`, the commit that release was built from.
- `fluent-emoji`: [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji) at commit `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`.
- `aws`, `azure` and `gcp`: the curated set first published in this repository's `cloud-icons/` folder (commit `29cae6a1`, 2026-02-09), which was downloaded from each provider's icon page above.

## What was changed

- **Renamed** to `<name>-<size>-<variant>.svg` and **regrouped** into category folders.
- **Subsets:**
  - Fluent UI leaves out sizes other than 16 and 24 for regular and filled, the `light` style, the npm package's `RTL/`, `LTR/` and per-language folders, and 7 files whose artwork is off its size's grid. Each exclusion is listed with its reason in `scripts/icons/fluent-ui.categories.json`.
  - Fluent Emoji keeps only the Color style (no 3D, Flat or High Contrast), and leaves out 11 files whose artboard is 32×33 or 33×32 rather than 32×32. Eight emoji (black heart, bomb, elephant, eye in speech bubble, growing heart, hamster, pig nose, rhinoceros) are therefore missing, and three toned emoji lack one tone each. Each exclusion is listed with its reason in `scripts/icons/fluent-emoji.categories.json`.
  - The cloud packs are complete copies of the earlier set.
- **Nothing else.** Every SVG is byte-for-byte identical to its source.

## Trademarks

Microsoft, Fluent and Azure are trademarks of Microsoft Corporation. AWS and
Amazon Web Services are trademarks of Amazon.com, Inc. or its affiliates.
Google and Google Cloud are trademarks of Google LLC. The MIT licence grants no
trademark rights. Nothing here implies endorsement by, sponsorship by or
affiliation with any of these companies.

## Updating a pack

For maintainers of this repository:

1. Move the pin in `scripts/icons/sources.json`.
2. Run `npm run icons:repack -- <pack>`.
3. Review the diff of `icon-packs/<pack>/`.
4. Run `npm test`. Check `[30]` re-validates every file and the file budget: at most 15,000 files in `icon-packs/`, and fewer than 19,500 in `dist/` against Cloudflare's 20,000-file limit.

The cloud adapter (`scripts/icons/cloud.mjs`) is one-shot migration tooling for
the old `cloud-icons/` layout. To re-run it, `git worktree add <tmp> 29cae6a1`
and pass `<tmp>/cloud-icons/<Provider>` as the second argument. A new download
from a provider needs its own adapter.
