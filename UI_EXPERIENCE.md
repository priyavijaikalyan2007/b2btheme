# Enterprise UI Experience Baseline Specification

## 1. Purpose

This specification defines the default user experience for enterprise software built with the shared UI component library.

A feature specification defines what a feature does. This specification defines how users interact with that feature.

The component library already provides a broad set of reusable controls for enterprise applications. It includes forms, editors, grids, people controls, help, validation, policy tools, workflows, and navigation.  This specification adds a common behavioral contract above those components.

The main rule is:

> **Match the richness of the interaction to the richness of the data and task.**

A value with domain meaning must not become a plain text field only because text is its storage format.

An email recipient is a person or address, not a string. A CEL expression is executable logic, not a string. A date is a temporal value, not formatted text. A service reference is an entity, not an identifier.

Each feature inherits four levels of requirements:

1. **Common baseline requirements** apply to all user interfaces.
2. **Data-type requirements** apply to the semantic value that a user reads or edits.
3. **Component-family requirements** apply to the interaction pattern.
4. **Workflow requirements** apply to complete tasks that combine several components.

A feature can add requirements. A feature must not silently remove baseline requirements.

### 1.1 Requirement levels

This specification uses three requirement levels:

- **Required:** The implementation must meet the requirement before normal release.
- **Recommended:** The implementation should meet the requirement unless a documented reason prevents it.
- **Optional:** The implementation can provide the behavior when the product benefits from it.

An exception to a Required behavior must identify:

- The requirement that cannot be met.
- The reason.
- The user impact.
- The alternative behavior.
- The owner.
- The planned resolution, if applicable.

---

# 2. Common experience baseline

## 2.1 Semantic controls

The UI must use the semantic type of a value to select its interaction.

Do not use a generic text input when a more specific interaction can understand the value.

Examples include:

| Data | Required default interaction |
|---|---|
| Person | People picker |
| Email recipient | Recipient editor with identity resolution |
| Date | Date input and date picker |
| Time | Time input and time picker |
| Time zone | Searchable IANA time-zone picker |
| Duration | Duration editor |
| Entity reference | Entity lookup |
| Multiple entities | Multi-select lookup with entity pills |
| CEL or policy expression | Expression editor |
| JSON or YAML | Code editor |
| Secret | Masked secret control |
| Color | Color picker |
| File | File selector or upload manager |
| Query | Structured query builder or query-aware editor |
| Formula | Formula editor |
| Permission | Permission-aware selector or matrix |

A simple control remains acceptable when the semantic type is simple.

## 2.2 Field anatomy

Every editable field must support the following field structure:

1. Label.
2. Required or optional state.
3. Reason for collection when the purpose is not obvious.
4. Short guidance when format or interpretation matters.
5. Input control.
6. Current validation or status message.
7. Field-level help.
8. Detailed contextual help.

Do not use an asterisk as the only indication that a field is required.

Optional fields should normally include `(optional)` in the label. GOV.UK also recommends this pattern and advises against required-field asterisks. 

When a required value is not self-explanatory, explain why it is required.

Use:

> **Business unit**  
> Required. The system uses this value to select the approval policy.

Do not use:

> **Business unit \***

## 2.3 Help is part of every field

Every form field must provide field-level help.

The component library already contains `HelpTooltip` for brief guidance and `HelpDrawer` for persistent contextual documentation. It also contains `HoverCard` for richer informational previews. 

Each field must support three levels of help.

**Level 1: Immediate guidance**

Show concise guidance beside the field when users commonly need it.

Examples include accepted format, units, scope, or an important consequence.

**Level 2: Help icon**

Provide a consistent help control beside the field label.

Activating the control must show a brief explanation without destroying the user's current work.

**Level 3: Detailed help**

The help control must provide access to a detailed topic in `HelpDrawer`.

The topic should include, when applicable:

- Purpose.
- Valid values.
- Examples.
- Default behavior.
- Required reason.
- Dependencies.
- Side effects.
- Permission requirements.
- Security implications.
- Related settings.
- Troubleshooting guidance.
- Links to deeper documentation.

The help drawer should remain open while the user works.

Opening help must not reset the form.

The drawer must preserve its topic when the user moves between nearby fields, unless the user requests automatic topic changes.

WCAG 2.2 includes a Consistent Help criterion. Help mechanisms should therefore remain in a predictable location and order. 

## 2.4 Keyboard behavior is part of the component

Keyboard behavior is not a later accessibility enhancement.

Every component must define its keyboard contract when the component is designed.

The general convention is:

- `Tab` moves to the next component.
- `Shift+Tab` moves to the previous component.
- Arrow keys navigate within a composite component.
- `Enter` activates or confirms the current item.
- `Space` activates controls where that convention applies.
- `Escape` dismisses the current temporary interaction.
- `Home` and `End` move to logical boundaries where useful.

This convention follows the WAI-ARIA Authoring Practices Guide. It uses Tab between components and arrow keys within composite components. 

Components must not create keyboard traps.

Keyboard focus must remain visible and must not be hidden behind sticky headers, overlays, or other content. WCAG 2.2 adds explicit requirements for focus visibility and focus obstruction. 

## 2.5 Focus management

Every interactive component must define:

- Where focus enters.
- How focus moves inside the component.
- Where focus goes after completion.
- Where focus goes after cancellation.
- What happens when an item disappears.
- How focus behaves after validation fails.
- How focus behaves after an asynchronous update.

A popup must not unexpectedly move focus away from the control that opened it.

Autocomplete controls should normally keep focus in the input. They should expose the active result through ARIA relationships.

A modal dialog must trap focus within the dialog.

When a modal closes, focus must return to the control that opened it, unless the workflow has moved elsewhere.

## 2.6 Pointer and touch input

All core behavior must work without drag, hover, or a precision pointer.

Any operation that uses drag must provide a non-drag alternative. WCAG 2.2 includes this requirement for dragging interactions. 

Examples include:

- Move up and Move down actions.
- Reorder menus.
- Keyboard reordering.
- Destination selectors.
- Cut and paste operations.

Pointer targets must meet WCAG target-size requirements.

For this library, touch-oriented interfaces should target at least 44 by 44 CSS pixels where layout permits.

Hover information must also be available through keyboard focus or another explicit action.

## 2.7 Component states

Every component must implement all states that can occur.

Do not implement only the ideal state.

The common state vocabulary is:

| State | Meaning |
|---|---|
| Idle | Ready for interaction |
| Focused | User has keyboard focus |
| Loading | Initial data is loading |
| Pending | User action is being checked or processed |
| Ready | Data is available |
| Empty | Valid state with no data |
| Valid | Current value passed meaningful validation |
| Warning | Value is allowed but deserves attention |
| Invalid | Value cannot be accepted |
| Partial | Some data or results are available |
| Stale | Displayed data may no longer be current |
| Offline | Required network service is unavailable |
| Disabled | Action is unavailable |
| Read-only | Value can be read but not changed |
| Error | The operation failed |

Components must distinguish `disabled` from `read-only`.

A disabled control should explain why it is unavailable when the reason is not obvious.

## 2.8 Asynchronous behavior

An asynchronous control must expose its state.

Do not allow an asynchronous lookup to appear frozen.

The component must:

- Show pending state.
- Prevent stale responses from replacing newer responses.
- Preserve the user's current value.
- Allow retry when retry is safe.
- Explain network failures.
- Distinguish no results from request failure.
- Cancel obsolete requests when practical.
- Prevent duplicate commits.
- Preserve idempotency for retried mutations where the API supports it.

Async validation must use a generation number, cancellation token, or equivalent mechanism.

The newest user input must remain authoritative.

## 2.9 Preserve user work

An error must not erase valid user input.

Navigation away from dirty work must follow an explicit policy.

The feature must use one of these approaches:

- Automatic save.
- Explicit save with dirty-state warning.
- Draft persistence.
- Intentional discard.

Do not silently discard work.

If an operation fails after partial completion, tell the user what succeeded and what failed.

## 2.10 Undo before confirmation

Prefer reversible actions over confirmation dialogs when the action can safely be undone.

For example, an archive operation can complete immediately and provide Undo.

Use confirmation when an action:

- Is destructive.
- Is difficult to reverse.
- Has a large scope.
- Has security consequences.
- Creates external side effects.
- Affects many records.
- Sends communication.
- Starts an expensive process.

A destructive confirmation must identify the affected object and consequence.

Do not ask users to confirm routine, harmless actions.

## 2.11 Current context

The UI must keep important context visible.

Examples include:

- Tenant.
- Environment.
- Organization.
- Project.
- Selected record.
- Active filter.
- Effective date.
- Time zone.
- Acting identity.
- Delegated identity.

Production and non-production environments must be visibly distinguishable.

The UI must not depend on color alone to communicate the difference.

## 2.12 Responsive behavior

Responsive behavior must preserve task capability.

A narrow layout may rearrange or collapse controls.

It must not silently remove an essential action.

If an action moves into overflow, its name and keyboard access must remain available.

## 2.13 Accessibility

WCAG 2.2 AA is the minimum accessibility target for the shared component library.

Accessibility must be built into the component API and automated tests where possible.

At minimum, every component must support:

- Keyboard operation.
- Visible focus.
- Programmatic name, role, and value.
- Text alternatives where required.
- Sufficient contrast.
- Status announcements.
- Error identification in text.
- Zoom and reflow.
- Reduced motion.
- Non-color state indicators.
- Non-drag alternatives.
- Predictable help.

WCAG 2.2 specifically adds requirements concerning focus obstruction, dragging, minimum target size, consistent help, and redundant data entry. 

---

# 3. Validation and error behavior

## 3.1 Validation levels

Validation must be treated as a pipeline.

A field can require several independent checks.

| Level | Example |
|---|---|
| Lexical | The value contains valid characters |
| Structural | An email has a valid address shape |
| Type | A CEL expression applies an operator to compatible types |
| Range | Percentage is between 0 and 100 |
| Semantic | Referenced service exists |
| Cross-field | End date is after start date |
| Remote | Username is available |
| Policy | Current user may perform the requested operation |
| Conflict | Record changed after the form loaded |
| System | Required backend service is unavailable |

The UI must report the correct level of failure.

Do not show “Invalid value” when the system knows the actual problem.

## 3.2 Validation timing

Validate early when validation provides useful guidance.

Do not interrupt typing with errors for incomplete values.

Use these general rules:

- Check obvious format requirements during input.
- Check completed values on blur.
- Check related fields when their dependency changes.
- Debounce remote validation.
- Perform authoritative validation before commit.
- Revalidate time-sensitive conditions immediately before the external action.

## 3.3 Positive validation

Positive validation is useful when success removes uncertainty.

Examples include:

- Username is available.
- Connection test succeeded.
- Expression is valid.
- DNS record was found.
- Recipient was resolved.
- Secret has required permissions.

Do not add green success messages to every ordinary text field.

## 3.4 Inline errors

Place an error beside or below the field that caused it.

An error must state:

1. What is wrong.
2. How the user can correct it.

GOV.UK recommends an error summary together with field-level errors for forms that contain errors. 

Use:

> The end date must be after 19 August 2026.

Do not use:

> Invalid date.

## 3.5 Form error summary

When a submitted form contains one or more blocking errors:

- Show an error summary near the start of the form.
- List each blocking error.
- Link each error to its field.
- Keep all valid values.
- Keep user-entered invalid values when correction is possible.
- Move focus to the error summary when appropriate.
- Announce the error state to assistive technology.

## 3.6 Warning versus error

An error blocks completion.

A warning identifies risk but allows completion unless policy says otherwise.

Warnings must use explicit language.

For example:

> This address is outside your organization. You can still send this message.

Do not make a warning look like an error unless the action is actually blocked.

## 3.7 System errors

A system failure must distinguish the failed operation from invalid user input.

A system error should include:

- User-facing explanation.
- Failed operation.
- Whether data was saved.
- Retry action.
- Recovery action.
- Correlation or request identifier when useful.
- Expandable technical details when appropriate.

The catalog already includes a dedicated `Error Dialog` for structured application failures. 

---

# 4. Data-type behavior requirements

## 4.1 Plain text

Plain text inputs must support:

- Clear label.
- Length limit when one exists.
- Character count when the limit matters.
- Paste.
- Undo and redo.
- Browser spelling support where appropriate.
- Smart Text Input Engine integration when references are allowed.
- Input-purpose autocomplete when appropriate.

Do not use a textarea only because text might become long.

Choose a single-line input, textarea, rich-text editor, or structured editor based on the task.

## 4.2 Rich text

Rich-text controls must support:

- Standard keyboard editing.
- Paste sanitization.
- Undo and redo.
- Clear formatting.
- Accessible toolbar navigation.
- Link editing.
- Structured inline tokens when references are supported.
- Plain-text or structured serialization.
- Predictable paste behavior from common office applications.

The catalog's Smart Text Input Engine can enrich text, rich text, Markdown, CodeMirror, and Monaco inputs. It keeps domain semantics in the host application. 

## 4.3 Identifier, name, and slug

An identifier editor must understand whether the value is:

- User-facing.
- Immutable.
- Case-sensitive.
- Globally unique.
- Unique within a scope.
- Generated automatically.

When the system can generate a safe identifier, offer that value.

If changing an identifier breaks references, explain that consequence before allowing the change.

## 4.4 Number

Numeric controls must:

- Accept only meaningful numeric syntax.
- Show the expected unit.
- Validate minimum and maximum values.
- Preserve required precision.
- Support keyboard entry.
- Support a stepper only when stepping is useful.
- Format for locale without changing the stored value.

Do not force users to remove display formatting before editing.

## 4.5 Currency

Currency inputs must show:

- Currency code or symbol.
- Decimal precision.
- Whether tax is included.
- Exchange-rate assumptions when conversion occurs.

Never infer currency only from a symbol when several currencies use that symbol.

## 4.6 Percentage and ratio

Show whether the stored representation is:

- `25`
- `25%`
- `0.25`

The user must not have to infer the conversion.

## 4.7 Boolean values

Use a checkbox for independent yes or no choices.

Use a switch when changing the value immediately changes a system state.

Use radio buttons when the domain has two named alternatives that are more meaningful than yes and no.

Do not use a switch for a value that remains unsaved until form submission without making that behavior clear.

## 4.8 Enumerations

For a small number of stable choices, prefer direct visible choices.

For longer lists, use a searchable selector.

A selector should support:

- Current selection.
- Keyboard navigation.
- Search when useful.
- Descriptions for unfamiliar options.
- Disabled options with reasons.
- Grouping where useful.
- Recently used options when repetition is common.

Do not use placeholder text as the field label.

## 4.9 Entity reference

An entity lookup must return entities, not strings.

Each result should show enough context to disambiguate it.

Depending on the entity, this can include:

- Name.
- Type.
- Identifier.
- Status.
- Parent.
- Workspace.
- Owner.
- Environment.
- Icon.
- Short description.

Selected entities should become atomic tokens or structured references.

If the entity is deleted, inaccessible, or renamed later, the UI must show that state.

## 4.10 Tags and taxonomy values

Tag controls must distinguish controlled taxonomy values from freeform tags.

The UI must not make a newly created freeform tag look identical to an existing governed taxonomy value.

When creation is allowed:

- Show an explicit Create action.
- Detect close matches.
- Prevent accidental duplicates.
- Apply normalization rules consistently.
- Show taxonomy ownership where useful.

## 4.11 Date

Date fields must support both efficient keyboard entry and visual selection.

The UI must:

- Show the expected date format.
- Parse supported human input predictably.
- Validate impossible dates.
- Preserve date-only values without accidental time-zone conversion.
- Offer a calendar picker.
- Support direct year navigation for distant dates.
- Explain business-date constraints.

Examples include:

- Earliest valid date.
- Latest valid date.
- Business days only.
- Fiscal periods.
- Blackout dates.

## 4.12 Time

Time inputs must show:

- 12-hour or 24-hour convention.
- Time zone when the value has one.
- Minute precision.
- Second precision when required.

Do not display local time without identifying the applicable time zone when ambiguity matters.

## 4.13 Time zone

Time-zone controls must use stable IANA zone identifiers as the canonical value.

Search results should show:

- City or zone name.
- Current UTC offset.
- Daylight-saving behavior when useful.
- Common aliases where appropriate.

Do not store only the current UTC offset for a regional time zone.

## 4.14 Duration

A duration control must distinguish duration from clock time.

Allow users to enter meaningful units such as:

- Days.
- Hours.
- Minutes.
- Seconds.

Show a normalized human-readable representation.

## 4.15 Secrets and sensitive values

Secrets must use the library's masked-value behavior.

The default display must not reveal the full secret.

The control should support:

- Explicit reveal.
- Copy.
- Clear reveal state.
- Rotation.
- Expiration status.
- Scope.
- Last-used information when available.

Do not write secrets to normal client logs, analytics events, or error reports.

## 4.16 Files

A file control must support keyboard file selection in addition to drag and drop.

Before upload, show:

- Accepted file types.
- Maximum size.
- Maximum count.
- Other relevant restrictions.

During upload, show progress for each file.

After failure, allow retry for the failed file without restarting successful uploads.

The system must distinguish:

- Upload complete.
- Processing.
- Security scan pending.
- Processing failed.
- Rejected.
- Ready.

## 4.17 URL, host, domain, and network values

Network-related fields must use the correct semantic validator.

Do not treat these values as interchangeable:

- URL.
- Hostname.
- Domain.
- IPv4 address.
- IPv6 address.
- CIDR range.
- URI template.

When testing connectivity is possible, provide a Test action.

The test must identify whether failure occurred during DNS, transport, TLS, authentication, or application validation.

---

# 5. Expression and policy editor

## 5.1 Requirement

Any field that accepts an executable expression must use an **Expression Workbench** behavior.

This applies to CEL, formulas, policy expressions, conditional rules, query expressions, and similar languages.

A plain textarea is not an acceptable primary editor for these values.

The existing catalog already includes a structured Policy Rule Editor with nested conditions, simulation, precedence, and version history.  The Expression Workbench extends the same principle to source-oriented expression languages.

## 5.2 Interaction modes

The workbench must support these modes when the language permits them:

### Builder

A structured visual editor lets users build expressions from fields, operators, functions, values, and logical groups.

The builder must prevent structurally invalid combinations where possible.

### Source

An expert editor exposes the exact expression.

The editor must provide:

- Syntax highlighting.
- Line and column information.
- Bracket matching.
- Automatic indentation.
- Completion.
- Diagnostics.
- Hover documentation.
- Signature help.
- Type information.
- Formatting.
- Search.
- Undo and redo.

Language Server Protocol patterns standardize editor features such as completion, diagnostics, hover information, and language-aware assistance. 

### Explain

The system translates the current expression into plain language.

For example:

```text
request.user.department == "Finance" &&
resource.classification != "Restricted"
```

can display:

> Allow this condition only when the user's department is Finance and the resource is not Restricted.

The explanation must identify assumptions when the source is ambiguous.

### Generate

Users can describe the required rule in natural language.

The system can propose an expression.

Generated expressions must never silently replace the existing expression.

The user must see:

1. The requested intent.
2. The generated expression.
3. A plain-language interpretation.
4. Diagnostics.
5. An explicit Apply action.

### Test

Users can evaluate an expression with controlled input data.

### Trace

Users can inspect how the evaluator reached the result.

This is an evaluation trace, not a traditional source-code debugger.

## 5.3 Language environment

Every expression editor must receive a language environment from its host application.

The environment should describe:

- Available variables.
- Variable types.
- Object fields.
- Functions.
- Function overloads.
- Macros.
- Constants.
- Enumerations.
- Deprecated elements.
- Documentation.
- Examples.
- Security classification when useful.

CEL specifically supports declarations that its type checker can use to verify identifier and function references. 

Completion must therefore be based on the actual host environment.

Do not provide generic CEL completion when the application exposes a narrower environment.

## 5.4 Contextual completion

Completion should understand the expression at the cursor.

For example, after:

```text
request.user.
```

the editor should suggest only valid fields on `request.user`.

A suggestion row should show:

- Name.
- Type.
- Short description.
- Source.
- Deprecation state.
- Example value when useful.

Function completion should show signatures and parameter descriptions.

## 5.5 Diagnostics

Diagnostics must include:

- Severity.
- Message.
- Line.
- Column.
- Affected expression.
- Suggested correction when one is known.

The workbench must distinguish:

- Syntax error.
- Unknown identifier.
- Unknown field.
- Type mismatch.
- Invalid function overload.
- Invalid literal.
- Deprecated feature.
- Runtime-only failure.

Diagnostics should update while the user edits.

The update must be debounced so that validation does not interfere with typing.

## 5.6 Contextual documentation

Selecting or hovering over a symbol should provide contextual help.

The help can show:

- Definition.
- Type.
- Allowed values.
- Examples.
- Related functions.
- Security meaning.
- Source system.
- Link to the detailed help topic.

The help drawer should synchronize with the selected expression element when the user requests this behavior.

## 5.7 Builder and source synchronization

Builder and source modes must represent the same canonical expression.

Switching modes must not change semantic meaning.

If the source contains syntax that the visual builder cannot represent:

- Preserve the source.
- Explain the unsupported construct.
- Keep Source mode available.
- Do not silently simplify the expression.

## 5.8 Test data

Test mode must provide a fixture for all referenced inputs.

The system should generate initial sample values from the environment schema.

Users must be able to replace the generated values.

Test cases should support:

- Name.
- Input values.
- Expected result.
- Actual result.
- Pass or fail state.
- Notes.

Users should be able to save multiple test cases with a policy.

## 5.9 Evaluation trace

Trace mode should show the expression as a tree of subexpressions.

For each evaluated subexpression, show:

- Source expression.
- Input values.
- Result.
- Result type.
- Evaluation order.
- Short-circuit behavior.
- Error, if one occurred.

For example:

```text
A && B
```

can show:

```text
A = false
B = not evaluated
Result = false
Reason: AND short-circuited after A
```

The trace must reflect the behavior of the real evaluator.

Do not simulate behavior that differs from production semantics.

## 5.10 Sandbox behavior

Test evaluation must not create production side effects.

The evaluator should enforce appropriate:

- Time limits.
- Memory limits.
- Data access controls.
- Function restrictions.
- Output limits.

If an expression can invoke side-effecting extensions, Test mode must mock or block those operations.

## 5.11 Runtime identity

The workbench must identify the environment used for validation and testing.

Show, when applicable:

- Language.
- Language version.
- Runtime version.
- Schema version.
- Policy version.
- Environment.
- Last refresh time.

If the environment changed after the editor loaded, warn before publish.

## 5.12 Publish workflow

Editing, testing, and publishing must be separate concepts.

Before publishing a policy, show:

- Current expression.
- Validation state.
- Test results.
- Changes from the current published version.
- Scope of effect.
- Effective time.
- Author.
- Required approvals.

High-impact policies should support simulation against representative real or synthetic scenarios before activation.

---

# 6. People and email recipient editor

## 6.1 Semantic model

A To, Cc, or Bcc control is an identity editor.

It is not a multi-value text field.

Selected recipients must use structured identity objects.

Each identity can include:

- Stable identity identifier.
- Display name.
- Canonical email address.
- Avatar.
- Organization.
- Role or title.
- Domain.
- Internal or external state.
- Presence.
- Directory source.
- Delivery status metadata.

The catalog already provides `PersonChip` and `PeoplePicker` for this type of interaction. 

## 6.2 Recipient entry

The editor must support:

- Typing a name.
- Typing an email address.
- Pasting one address.
- Pasting a list of addresses.
- Directory search.
- Group search.
- Recent recipients.
- Frequent recipients.
- Keyboard selection.

A selected recipient becomes an atomic pill.

Backspace at the start of an empty input should first select the previous pill.

A subsequent Backspace can remove it.

## 6.3 Suggestions

Suggestions should rank meaningful candidates.

Possible ranking signals include:

- Exact match.
- Prefix match.
- Recent use.
- Frequent use.
- Same team.
- Same organization.
- Current collaboration context.

A result should show enough information to distinguish people with similar names.

At minimum, show name and address when ambiguity exists.

## 6.4 Identity resolution

The control must distinguish:

- Resolved internal identity.
- Resolved external identity.
- Valid but unresolved address.
- Invalid address.
- Distribution group.
- External group.
- Disabled account.
- Unknown address.

Do not make all these states look identical.

## 6.5 Duplicate handling

The editor must detect duplicate recipients across To, Cc, and Bcc.

If the same canonical recipient appears more than once, prevent duplication or explain the existing location.

Aliases that resolve to the same identity should also be treated as duplicates when the directory can determine this.

## 6.6 Rich people cards

Hover or keyboard focus on a resolved person should offer a people card.

The card can show:

- Full name.
- Address.
- Title.
- Organization.
- Location.
- Presence.
- Manager.
- Contact actions.
- Relevant relationship.

The card must respect directory permissions.

## 6.7 Domain awareness

External recipients must be visually identifiable.

Do not use color as the only external indicator.

The editor can use:

- External icon.
- Domain label.
- Pill treatment.
- Warning text.

Different external domains can receive distinct visual treatment when that information helps users detect mistakes.

## 6.8 Recipient intelligence

Before sending, the application should evaluate available recipient intelligence.

Microsoft Graph MailTips can expose recipient information such as automatic replies, delivery restrictions, moderation requirements, external group membership, and mailbox-full state. 

The editor should surface relevant conditions such as:

- Recipient is out of office.
- Mailbox is full.
- Recipient cannot accept the message.
- Message requires moderation.
- Group contains external members.
- Recipient is outside the organization.
- Recipient belongs to a very large audience.
- Address previously bounced, when delivery history is available.

A previous-bounce warning must come from the application's actual delivery history.

Do not infer a bounce from an unrelated signal.

## 6.9 Typo protection

The editor should detect likely errors such as:

- Misspelled common domains.
- Similar internal names.
- Similar addresses.
- Confusable display names.
- An address that differs from a frequent recipient by one character.

A correction must remain a suggestion.

Do not silently replace a valid address.

## 6.10 Send-time validation

Recipient state can change after composition begins.

Perform final validation immediately before sending when the application supports live recipient checks.

The final check should identify new blocking conditions.

Do not repeat low-value warnings that the user already acknowledged unless their meaning changed.

## 6.11 Large audiences

When a message has a large audience:

- Show the approximate recipient count.
- Identify distribution groups.
- Identify external recipients.
- Consider recommending Bcc for suitable external bulk communication.
- Require confirmation when policy defines the audience as high risk.

## 6.12 Privacy

Do not expose hidden group membership without permission.

Do not reveal private directory data merely because the user typed part of a name.

Search results must follow the same authorization policy as other directory views.

---

# 7. Forms and dynamic forms

The catalog's Dynamic Form Builder already supports conditional visibility, schema-defined fields, async validation, and read-only or edit modes.  These capabilities must inherit the common form behavior below.

## 7.1 Layout

Forms should follow the user's reading and completion order.

Prefer one logical column when fields have dependencies.

Use multiple columns when the fields are short, independent, and naturally related.

Do not use columns only to reduce vertical length.

## 7.2 Sections

Group fields by task or concept.

A section heading must explain its subject.

Long forms should support:

- Section navigation.
- Completion status.
- Error counts.
- Save state.
- Help context.

## 7.3 Conditional fields

When one value reveals another field:

- Insert the field in a predictable location.
- Announce the change to assistive technology when needed.
- Move focus only when the workflow requires it.
- Define what happens to hidden values.

A schema must specify one hidden-value policy:

- Preserve value.
- Clear value.
- Reset to default.

Do not let the implementation make this decision accidentally.

## 7.4 Required fields

A field schema should support:

```text
required: true
requiredReason: "Used to determine the approval chain."
```

The `requiredReason` should be displayed when the reason is not obvious.

## 7.5 Read-only values

A read-only field should remain readable and selectable.

Use disabled state only when interaction itself is unavailable.

If a field is read-only because of permission or process state, explain the reason.

## 7.6 Save behavior

Every form must clearly communicate:

- Unsaved.
- Saving.
- Saved.
- Save failed.
- Conflict detected.

Automatic save must not make failure invisible.

## 7.7 Multi-step forms

A wizard must:

- Show the current step.
- Show overall progress.
- Permit Back without losing completed values.
- Validate each step before dependent steps.
- Allow draft save when the workflow is long.
- Provide a review step for consequential submissions.

---

# 8. Search, lookup, autocomplete, and filtering

## 8.1 Search input

Search must provide immediate acknowledgement after input.

Remote searches should use a short debounce.

Search requests must prevent stale-result races.

## 8.2 Search states

Search must distinguish:

- No query.
- Searching.
- Results.
- No results.
- Search failed.
- Partial results.
- More results available.

A no-results state should repeat the query and suggest a useful next action.

## 8.3 Autocomplete

Autocomplete must support:

- Arrow navigation.
- Active-item indication.
- Enter to choose.
- Escape to close.
- Mouse or touch selection.
- Loading state.
- Empty state.
- Async results.

Focus should normally remain in the input.

## 8.4 Structured search

When the product supports structured facets, the search control should understand them.

For example:

```text
status:open owner:@me environment:prod
```

The editor should provide completion for both facet names and values.

Invalid facets should receive expression-style diagnostics.

## 8.5 Saved views

A saved view should capture all state that defines the view.

This can include:

- Query.
- Filters.
- Sorting.
- Grouping.
- Visible columns.
- Column order.
- Pinning.
- Density.
- Visualization mode.

The UI must identify whether a view is personal or shared.

---

# 9. Pickers and selectors

Every picker must support both discovery and efficient repeat use.

## 9.1 Common picker behavior

A picker should support, where applicable:

- Search.
- Keyboard navigation.
- Current value.
- Clear.
- Recent values.
- Favorites.
- Grouping.
- Disabled values.
- Descriptions.
- Preview.
- Custom value.
- Empty state.

## 9.2 Visual values

Visual values should be shown visually.

Examples include:

- Fonts rendered in the font.
- Line widths rendered at the width.
- Line endings shown as line endings.
- Gradients shown as gradients.
- Page sizes shown proportionally.
- Layout algorithms shown with diagrams.

The catalog already follows this pattern for several picker components. 

## 9.3 Recent choices

Use most-recently-used suggestions when repeated selection is common.

Do not let recency reorder safety-critical enumerations whose order has semantic meaning.

---

# 10. Data grids and tables

## 10.1 Keyboard model

A data grid is a composite widget.

Tab should enter or leave the grid.

Arrow keys should navigate cells where the grid supports cell focus.

Selection and keyboard focus must remain separate concepts.

## 10.2 Sorting

A sortable column must show:

- Whether sorting is active.
- Sort direction.
- Sort precedence when multiple columns are sorted.

Sorting must be available by keyboard.

## 10.3 Filtering

Column filters must identify active filters.

A user must be able to clear:

- One filter.
- All filters.

The result count should update when practical.

## 10.4 Editing

Editable cells must provide a consistent editing convention.

Recommended defaults are:

- `Enter` or `F2` starts editing.
- `Enter` commits.
- `Escape` cancels.
- `Tab` commits and moves to the next editable cell.

The application may change these conventions when another established domain convention is stronger.

## 10.5 Bulk operations

When rows are selected, show a contextual action surface.

The surface should identify:

- Number selected.
- Selection scope.
- Available actions.
- Destructive actions.
- Whether hidden or paged rows are included.

“Select all” must state whether it means:

- Visible page.
- Loaded rows.
- All filtered results.

## 10.6 Data states

Every grid must implement:

- Loading.
- Empty.
- No matching filters.
- Error.
- Partial.
- Stale.

Do not show the same blank grid for all states.

## 10.7 Column customization

If columns can be resized, reordered, hidden, or pinned, provide non-drag alternatives.

Persist personal column configuration when the product benefits from it.

---

# 11. Trees, graphs, diagrams, and canvases

## 11.1 Tree navigation

Trees must use standard hierarchical keyboard behavior.

Users must be able to:

- Move between visible nodes.
- Expand and collapse.
- Move to parent.
- Move to first child.
- Activate a node.
- Select independently when selection differs from activation.

## 11.2 Graph and canvas navigation

A visual graph must not require a mouse for essential inspection.

Provide keyboard commands for:

- Next node.
- Previous node.
- Connected nodes.
- Zoom in.
- Zoom out.
- Fit to view.
- Reset view.
- Open details.

Large graphs should provide search and a minimap.

The minimap must not be the only navigation method.

## 11.3 Accessible alternative

A graph that communicates important data should provide a structured alternative.

Depending on the graph, this can be:

- Tree.
- List.
- Table.
- Relationship list.
- Text summary.

## 11.4 Selection and detail

Selecting a visual object should expose a detail surface.

The detail surface should identify the selected object's:

- Name.
- Type.
- Status.
- Properties.
- Relationships.
- Actions.

## 11.5 Drag editing

Node movement and edge creation must provide alternatives when these operations are necessary for task completion.

Undo must be available for direct-manipulation edits.

---

# 12. Dialogs, drawers, popovers, and overlays

## 12.1 Modal dialogs

Use a modal only when the user must resolve the interaction before continuing.

A modal must:

- Move focus into itself.
- Trap focus.
- Provide a clear title.
- Provide an obvious completion action.
- Provide a cancellation path when cancellation is valid.
- Respond to Escape where safe.
- Return focus after close.

## 12.2 Drawers

Prefer a non-modal drawer when the user benefits from seeing the parent context.

Examples include:

- Help.
- Properties.
- Preview.
- Related records.
- Filters.

A drawer should not trap focus unless it intentionally acts as a modal.

## 12.3 Popovers

A popover should remain attached to its source.

It must close predictably.

Escape should normally close it and restore normal interaction.

A popover must not contain a complex multi-step workflow when a drawer or dialog would work better.

## 12.4 Nested overlays

Avoid nested modal dialogs.

If a modal task requires secondary selection, prefer an in-dialog picker, popover, or side panel.

---

# 13. Progress and long-running operations

## 13.1 Immediate feedback

When an operation is not immediate, show that the system accepted the action.

Do not leave an enabled button that appears to do nothing.

## 13.2 Progress states

A long-running operation must identify:

- Queued.
- Running.
- Waiting for input.
- Completed.
- Completed with warnings.
- Failed.
- Canceled.

## 13.3 Determinate progress

Use determinate progress when the system can calculate meaningful progress.

Use indeterminate progress when it cannot.

Do not show an invented percentage.

## 13.4 Detailed progress

For multi-stage work, show meaningful steps.

The existing `Steppable Progress Modal` already models pending, active, done, and error steps. 

Show:

- Current step.
- Completed steps.
- Elapsed time.
- Failure location.
- Retry action.
- Cancel action when safe.

## 13.5 Background work

Do not keep the whole application blocked for work that can continue in the background.

When possible:

- Let users leave the page.
- Keep a persistent job indicator.
- Send completion to the notification center.
- Allow reopening the job details.

---

# 14. Toolbars and command surfaces

## 14.1 Commands

A command surface must distinguish:

- Command.
- Toggle.
- Selector.
- Menu.
- Split command.

Do not use the same visual treatment for controls with different behavior.

## 14.2 Disabled commands

A disabled command should expose the reason when the reason is not obvious.

For example:

> Delete is unavailable because you do not have permission to delete production services.

## 14.3 Keyboard behavior

Toolbars should use a single Tab stop when they contain many controls.

Arrow keys should move between toolbar items.

Important commands should expose their keyboard shortcut.

## 14.4 Overflow

Responsive overflow must preserve:

- Command name.
- State.
- Keyboard access.
- Tooltip.
- Shortcut.
- Permission behavior.

---

# 15. Navigation and workspaces

## 15.1 State preservation

Navigation should preserve meaningful working state.

Examples include:

- Filters.
- Scroll position.
- Selected tab.
- Expanded nodes.
- Open record.
- Split-pane sizes.
- Draft edits.

## 15.2 Deep links

Important views should have stable, shareable URLs where practical.

The URL should capture enough state to reopen the intended business context.

Do not encode secrets or sensitive transient data in URLs.

## 15.3 Tabs

Workspace tabs should support:

- Keyboard navigation.
- Close.
- Close others.
- Reorder.
- Pin.
- Unsaved-state indicator.
- Session restoration when appropriate.

Closing a dirty tab must not silently discard changes.

## 15.4 Context switching

Tenant, workspace, or environment switches must clearly show their effect.

If switching context discards work or changes authorization, warn before the switch.

---

# 16. Charts, metrics, and visualizations

## 16.1 Data meaning

A visualization must identify:

- Metric.
- Unit.
- Time range.
- Time zone when relevant.
- Aggregation.
- Comparison period.
- Data source when useful.
- Freshness when useful.

## 16.2 Color

Color must not be the only encoding for an important state.

Use another cue such as:

- Text.
- Icon.
- Pattern.
- Shape.
- Line style.
- Position.

## 16.3 Tooltips

Data tooltips must be available through keyboard focus when the chart supports individual-point interaction.

A tooltip should show exact values rather than forcing users to estimate from the chart.

## 16.4 Data alternative

Charts that communicate decision-relevant values must expose an accessible data alternative.

The catalog's `Chart Panel` already includes a hidden table for screen readers. 

## 16.5 Cross-filtering

When chart selection filters other components:

- Show the active filter.
- Provide a clear action.
- Keep filter state synchronized.
- Make the relationship visible.

---

# 17. Workflows, automation, and policy

## 17.1 Visual builders

Workflow builders must provide structured creation rather than raw configuration where practical.

A node should expose:

- Name.
- Type.
- Inputs.
- Outputs.
- Validation state.
- Execution state.
- Help.
- Configuration.

## 17.2 Validation

A workflow must validate both local and whole-flow constraints.

Examples include:

- Missing required configuration.
- Invalid connection.
- Incompatible data types.
- Unreachable nodes.
- Cycles where cycles are forbidden.
- Missing terminal path.
- Permission mismatch.

## 17.3 Test and simulation

Workflow and policy editors should provide test or dry-run behavior.

The catalog already defines simulation for policy rules and dry-run execution for workflow tooling. 

Testing should show:

- Test input.
- Path taken.
- Conditions evaluated.
- Actions that would execute.
- Outputs.
- Warnings.
- Failures.

## 17.4 Production activation

Publishing an automation should identify:

- Scope.
- Trigger.
- Effective environment.
- Side effects.
- Required credentials.
- Changed behavior.
- Test status.

A material change should provide a diff against the active version.

---

# 18. AI and agent interactions

## 18.1 AI suggestions

AI-generated output must remain distinguishable from committed application state.

The UI must identify when content is:

- Suggested.
- Generated.
- Reviewed.
- Applied.
- Published.

## 18.2 Applying changes

An AI action that changes structured data should provide a preview when practical.

For code, policy, configuration, or documents, show a diff before applying consequential changes.

## 18.3 Agent actions

Before a consequential agent action, the UI should show:

- Intended action.
- Target.
- Scope.
- Relevant parameters.
- Expected side effects.
- Required permission.
- Approval requirement.

## 18.4 Human control

Agent workflows must support human intervention when the workflow requires judgment or approval.

The catalog already includes patterns for human intervention, including context, recommendation, override, escalation, and batch review. 

## 18.5 Trace and explanation

Show observable execution information such as:

- Tool calls.
- Inputs.
- Outputs.
- Timing.
- Errors.
- Data sources.
- Policy checks.
- Concise rationale summaries.

Do not make the product depend on exposing hidden model chain-of-thought.

## 18.6 Failure and retry

Regeneration or retry must not destroy the previous result.

Users should be able to compare the old and new result when the difference matters.

---

# 19. Security and permission behavior

## 19.1 Authorization

The server must remain the authority for authorization.

The UI can hide or disable unavailable actions, but client-side controls are not security enforcement.

## 19.2 Permission denial

A permission error should state:

- Which action is unavailable.
- Which resource is affected.
- Why the user cannot perform it, when disclosure is safe.
- Which role or approval is required, when known.
- What the user can do next.

## 19.3 Destructive scope

A destructive action must show its effective scope.

For example:

> Delete 1 environment and its 14 deployment configurations.

Do not use:

> Are you sure?

## 19.4 Sensitive environments

Production operations should receive stronger visual and confirmation treatment than development operations when the risk differs.

The current environment must remain visible during consequential operations.

---

# 20. Smart Text Input Engine integration

The catalog defines the Smart Text Input Engine as a reusable behavioral layer for mentions, references, formulas, and commands. It supports adapters for plain inputs, rich text, CodeMirror, and Monaco. 

Use STIE only for text-oriented controls.

Do not attach STIE to structured controls such as password, numeric, date, select, file, or read-only inputs. The catalog explicitly excludes these cases. 

STIE-enabled inputs must preserve the standard keyboard contract.

Its autocomplete behavior must:

- Keep focus in the editor.
- Support arrow navigation.
- Support Enter selection.
- Support Escape cancellation.
- Announce inserted tokens.
- Expose active results through ARIA.

These behaviors are already part of the catalog's STIE accessibility model. 

---

# 21. Component-family mapping

Each catalog family inherits the following additional requirements.

| Catalog family | Required behavior profiles |
|---|---|
| Pickers | Picker, typed value, validation, keyboard, help |
| Progress | Async state, cancel, retry, system feedback |
| Dialogs | Focus management, keyboard, dirty-state protection |
| Data entry | Form field, typed value, validation, help |
| Rich content editing | Editor, keyboard, serialization, STIE where applicable |
| Code and expression editing | Editor, language intelligence, diagnostics, test |
| Data grids | Grid navigation, filtering, selection, editing, async state |
| Trees | Tree navigation, selection, expansion, drag alternative |
| Toolbars | Composite keyboard model, command state, overflow |
| Status surfaces | Live state, accessible announcements, non-color encoding |
| Containers | Focus order, responsive behavior, state persistence |
| AI components | AI state, human control, trace, change preview |
| Metrics and charts | Units, data alternative, focus, filtering, freshness |
| Timelines and activity | Time zone, ordering, filtering, expandable detail |
| Onboarding | Dismissal, persistence, keyboard, reduced motion |
| Help | Field context, detailed topic, persistent drawer |
| Search and filtering | Async search, autocomplete, stale response protection |
| File management | File validation, progress, retry, non-drag input |
| Workspace navigation | Context, deep links, persistence, keyboard |
| Governance and security | Permission state, masking, auditability |
| Collaboration | Identity, mentions, people cards, notifications |
| Workflow and automation | Validation, simulation, versioning, publish safety |
| Kanban and layout | Drag alternative, keyboard movement, undo |
| Feedback controls | Consistent status vocabulary and live announcements |
| Dynamic forms | Field schema, dependencies, required reasons, async validation |
| Policy editors | Builder, source where applicable, simulation, precedence |
| Operational queues | Keyboard triage, bulk actions, SLA context |
| Process intelligence | Accessible graph alternative, drill-down, metric definitions |
| Agent management | Permissions, guardrails, cost, trace, human intervention |
| Dynamic canvas | Keyboard selection, non-drag operations, focus model |

A component can inherit more than one row.

For example, a CEL field inside a Dynamic Form inherits:

```text
Common baseline
  + Dynamic form
  + Expression editor
  + Validation
  + Help
  + Async state
  + Security, if the expression controls access
```

An email To field inherits:

```text
Common baseline
  + People and email
  + Autocomplete
  + Entity reference
  + Validation
  + Help
  + Async state
```

---

# 22. Standard component contract

Every reusable component should document the following contract.

```text
Component:
Purpose:

Semantic data:
Primary user tasks:

States:
- idle
- focused
- loading
- pending
- ready
- empty
- valid
- warning
- invalid
- disabled
- read-only
- error

Keyboard:
- entry
- internal navigation
- activation
- cancellation
- exit
- shortcuts

Pointer:
- click behavior
- hover behavior
- drag behavior
- non-drag alternative

Validation:
- local
- semantic
- remote
- cross-field
- policy

Help:
- inline guidance
- HelpTooltip topic
- HelpDrawer topic
- examples

Async behavior:
- loading
- stale-response handling
- retry
- cancellation
- partial results

Persistence:
- current value
- dirty state
- layout state
- recent values

Accessibility:
- role
- name
- value
- descriptions
- focus
- live announcements
- reduced motion
- non-color indicators

Security:
- permissions
- sensitive values
- logging restrictions

Telemetry:
- meaningful user actions
- errors
- latency
- abandonment where useful

Test requirements:
- unit
- interaction
- keyboard
- accessibility
- async race
- error states
```

A new component is incomplete until this contract is defined.

---

# 23. Feature specification integration

Every UI feature specification should contain a short **Experience requirements** section.

The section should identify inherited requirements rather than repeating this document.

Example:

```text
## Experience requirements

Baseline:
- Enterprise UI Experience Baseline Specification

Data types:
- Person
- Email recipient
- Date and time
- CEL expression

Component families:
- Dynamic Form
- People Picker
- Expression Workbench
- Form Dialog

Special requirements:
- Sending to an external domain requires a warning.
- Policy tests use the tenant's current CEL declaration environment.
- The form can be saved as a draft.
```

This structure keeps feature specifications focused on domain behavior.

It also makes common experience requirements enforceable without copying them into every feature.

---

# 24. UI engineering acceptance checklist

A UI implementation is not complete until the engineer or reviewer checks all applicable items.

## Common behavior

- [ ] The implementation uses semantic controls instead of generic text fields where a semantic control exists.
- [ ] Every field has a visible label.
- [ ] Every field has field-level help.
- [ ] Required fields explain their purpose when the reason is not obvious.
- [ ] Optional fields are identified consistently.
- [ ] All reachable states have an intentional design.
- [ ] User-entered data survives validation and system errors.
- [ ] Loading, empty, warning, and error states are distinct.
- [ ] Disabled controls explain non-obvious restrictions.

## Validation

- [ ] Local validation identifies exact problems.
- [ ] Semantic validation is implemented where the domain permits it.
- [ ] Remote validation handles stale responses.
- [ ] Cross-field constraints are validated.
- [ ] Blocking errors and warnings have different behavior.
- [ ] Form submission errors provide both summary and field-level guidance when needed.
- [ ] Error messages explain how to correct the problem.

## Keyboard and accessibility

- [ ] All normal tasks can be completed with a keyboard.
- [ ] Tab order follows the task order.
- [ ] Composite components use established keyboard conventions.
- [ ] Focus remains visible.
- [ ] Dialogs manage focus correctly.
- [ ] Escape behavior is defined.
- [ ] Drag operations have a non-drag alternative.
- [ ] Important states do not depend on color.
- [ ] Status changes are announced when required.
- [ ] Reduced-motion preferences are respected.
- [ ] Touch targets meet the applicable target-size requirement.

## Async behavior

- [ ] Pending operations have visible feedback.
- [ ] Obsolete responses cannot replace newer results.
- [ ] Retry behavior is defined.
- [ ] Cancel behavior is defined where cancellation is safe.
- [ ] Partial completion is explained.
- [ ] Duplicate mutations are prevented.

## Help

- [ ] Every field has a HelpTooltip topic.
- [ ] Detailed help is available in HelpDrawer.
- [ ] Help explains valid values and important side effects.
- [ ] Help remains accessible without losing current work.
- [ ] Help placement is consistent.

## Security and safety

- [ ] Permission restrictions are represented correctly.
- [ ] Server authorization remains authoritative.
- [ ] Secrets are not exposed in normal logs.
- [ ] Consequential actions show scope before commitment.
- [ ] Production context remains visible during high-risk operations.

## Rich editors

- [ ] Structured languages use an appropriate editor.
- [ ] Language-aware completion is available where practical.
- [ ] Syntax and semantic diagnostics are distinct.
- [ ] Contextual documentation is available.
- [ ] Test or preview behavior exists where execution is meaningful.
- [ ] Generated changes require explicit acceptance.

## People and recipients

- [ ] Selected identities use structured pills.
- [ ] Ambiguous people are distinguishable.
- [ ] Duplicate recipients are detected.
- [ ] External recipients are identifiable without color alone.
- [ ] Available recipient warnings are shown.
- [ ] Final send-time validation occurs when live data is available.

## Grids, trees, and visual interfaces

- [ ] Keyboard navigation follows the relevant established pattern.
- [ ] Focus and selection remain distinct.
- [ ] Drag has an alternative.
- [ ] Loading, empty, and error states are implemented.
- [ ] Important visual information has a structured alternative.
- [ ] Filters and selection scope remain visible.

---

# 25. Design rule for future components

When a new component enters the library, do not begin by asking which HTML control can store its value.

Ask these questions:

1. What does the value mean?
2. What does the user need to understand before changing it?
3. What mistakes can the system detect?
4. What mistakes can the system prevent?
5. What information can the system suggest?
6. What context can the system resolve automatically?
7. What can the user preview or test before committing?
8. What help is available at the point of use?
9. What keyboard pattern already exists for this interaction?
10. What happens when the network, API, or validation service fails?
11. What does the user need to recover from a mistake?
12. What state must persist when the user leaves and returns?
13. What security or permission context changes the behavior?
14. What would make an expert user faster?
15. What would let a new user succeed without becoming an expert?

The resulting component should make the domain easier to use.

It should not merely expose the domain's storage format.

---

# 26. Research basis

This specification uses the component catalog as its implementation vocabulary. The catalog already includes rich help, form, editor, identity, policy, validation, workflow, and Smart Text Input Engine primitives.  

The accessibility requirements use WCAG 2.2 and the WAI-ARIA Authoring Practices Guide. These sources define established behavior for keyboard navigation, focus, composite widgets, dragging, target size, and consistent help. 

The form and validation rules also use GOV.UK Design System guidance. That guidance emphasizes clear questions, explicit optional fields, field-level errors, and error summaries. 

The Expression Workbench requirements use the capabilities of CEL and modern language-aware editors as their technical basis. CEL provides a typed declaration environment that can validate identifiers and function use before runtime.  Language Server Protocol patterns provide a mature model for diagnostics, completion, hover help, and other editor intelligence. 

The email recipient requirements use enterprise mail and directory patterns. Microsoft Graph MailTips provides recipient conditions such as automatic replies, delivery restrictions, moderation, external membership, and mailbox-full status. 

The writing in this specification follows the supplied language guide. That guide requires clear technical language, direct verbs, consistent terminology, and preservation of technical meaning.
