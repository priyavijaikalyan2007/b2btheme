# CDN Bug: no usable categorical palette, and three mappings that fail contrast as text

**Filed**: 2026-10-23
**Component**: `static.knobby.io/css/custom.css` tokens, and the guidance in your `2026-10-23-hardcoded-colours-and-dark-mode.md`
**Severity**: Medium. One gap blocks us from removing our last hardcoded colours. Three published mappings make contrast worse if a consumer follows them.
**Status**: Open
**Related**: your `2026-10-23-hardcoded-colours-and-dark-mode.md`, filed into `knobbyio/apps`. Our tracking issue is knobbyio/apps#316.

## What we did with your report

We migrated the file you said to fix first, `strukture-add-relationship.ts`. We then measured every colour it paints. We measured in both themes, composited over the real surface, in a browser.

That found three problems in the mappings your report prescribes. It also found one gap that stops us finishing the work.

Our rule is that no colour gets customised on top of the base theme. A theme update should reach our apps without an edit to our repository. Where the theme cannot supply a colour, we raise it with you rather than invent one. This report does that.

We allow exactly one exception, decided on 2026-10-23. A palette may live in our code when someone outside our product prescribes the colours. A notation such as UML or BPMN qualifies. A brand owner's published colours qualify. Our diagram shape catalogues fall under this exception and will stay. Nothing else does.

## 1. We cannot use the categorical palette

Your only categorical set is `--theme-group-bg-1` through `--theme-group-bg-5`. We have two palettes that want it. One has seven relationship categories. The other has six entity types. The set cannot carry either.

```
light   --theme-group-bg-1:#dbeafe  -2:#dcfce7  -3:#fef3c7  -4:#fce7f3  -5:#e0e7ff
dark    --theme-group-bg-1:rgba(28,126,214,.18)   -2:rgba(82,183,136,.18)
        -3:rgba(245,158,11,.18)  -4:rgba(248,113,113,.14)  -5:rgba(116,192,252,.18)
```

Three things block us.

**Five slots cannot hold seven categories.** Two categories would share a colour. That defeats the only purpose a categorical palette has.

**The backgrounds have no paired foreground.** You publish no `--theme-group-fg-*`. A category badge needs a text colour to sit on the tint. The dark values are alphas of 14 to 18 percent, so what reads on them depends on what sits behind them. We cannot choose that text colour ourselves. Choosing it would invent the colour this rule exists to prevent.

**No rule in your stylesheet uses these five.** We found no reference rendering. So we cannot see what you intended them for, or what you expect on top of them.

**What would unblock us.** Publish a categorical palette of at least eight slots. Give each slot a background and a foreground. Contrast-check each pair in both themes. Use the palette in at least one component, so the intended pairing is visible. If eight is the wrong number, we will design to the number you publish.

Until then these two palettes stay hardcoded in our repository. We would rather delete them.

## 2. Three of your mappings fail the contrast floor as text

Your remediation table maps each hex value to a token by matching values. For text, three of those mappings are wrong. A `--bs-<colour>` token is the fill a component is painted with. It is not a text colour.

We measured each one as text on the page background, composited, in both themes:

| Your mapping | Light | Dark | What passes | Light | Dark |
|---|---:|---:|---|---:|---:|
| `--bs-danger` | 4.02 | 3.82 | `--bs-danger-text-emphasis` | 11.72 | 6.79 |
| `--bs-primary` | 3.49 | 4.40 | `--bs-primary-text-emphasis` | 10.88 | 8.17 |
| `--bs-tertiary-color` | 3.26 | 3.93 | `--bs-secondary-color` | 7.17 | 7.38 |

`--bs-tertiary-color` carries a 50 percent alpha. It composites below the 4.5 floor in both themes. It suits a disabled control, which WCAG exempts. It does not suit text a person needs to read. Your report recommends it for empty-state text, and empty-state text is text a person needs to read.

This reaches past our repository. A consumer who follows that table moves text from a colour that failed in one theme to a token that fails in both. Your rendered audit cannot catch it. The audit measures what your components paint. This is guidance for what consumers paint.

**Suggested fix.** Mark in the table which tokens are fills and which are text. Map every text role to the matching `-text-emphasis` variant.

## 3. The remediation for the 105 stale blues does nothing

Your report says 105 copies of `#1c7ed6` are now a different blue, because the token moved. It tells the reader to use `var(--bs-primary)`.

`--bs-primary` is still `#1c7ed6`. It carries no `[data-bs-theme=dark]` override, so it is `#1c7ed6` in both themes. The token that moved to `#1971c2` is `--theme-primary`. That is a different token, and its dark value is `#4dabf7`.

So the substitution changes nothing today. It also does not flip in dark mode.

We are not saying `--bs-primary` is wrong to hold one value. That is ordinary Bootstrap 5.3, where `-bg-subtle` and `-border-subtle` carry the half that depends on theme. We are saying the table sends 105 call sites to a token that cannot deliver what the paragraph above it promises.

**Suggested fix.** Say which of `--bs-primary` and `--theme-primary` a consumer should reach for, and when.

## 4. The scan undercounts, so the file counts are low

Your scan matched colours inside inline `style=` attributes. Our wizard also carries a `<style>` block. That block held five more hardcoded colours, and your table listed none of them. One of the five is the `2px solid #e2e8f0` tab underline. It is visible in the screenshot your report was built around.

Expect the same undercount across the other nine files. A consumer who fixes what the table lists will believe a file is finished before it is.

**Suggested fix.** Match `<style>` blocks and stylesheet rules as well as inline attributes.

## 5. Small and separate: `RelationshipDefinitionSummary.inverseName`

`component-library.d.ts` declares `inverseName: string` as required. Our API leaves the key out when a definition has no inverse, because `JsonIgnoreCondition.WhenWritingNull` drops a null rather than sending one.

Declaring the field required did not make it arrive. It only stopped the compiler from asking. A renderer then called `.replace` on `undefined`, the first time a tenant created a definition with no inverse.

We fixed our side by sending an empty string. We will not edit a declaration to describe behaviour we cannot verify from our repository.

**Our question.** Does the component accept a missing `inverseName`? If it does, the declaration should read `inverseName?: string`. If it does not, the declaration is right and we will keep sending a string.

## What we changed on our side

`strukture-add-relationship.ts` now takes every chrome colour from a published token. All seven of its text roles pass AA in both themes.

Every one of those seven failed in at least one theme before. A person had reported exactly one of them. The other six failed in silence. That ratio is the clearest argument we can offer for the token over the copy.
