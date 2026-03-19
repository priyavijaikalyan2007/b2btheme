<!-- AGENT: Master instructions file for coding agents; start here for all tasks. -->

# Introduction

This repository contains themes, icons, and components to be used in cloud based software-as-a-service (SaaS) applications. This includes both B2B and B2C SaaS-es. The core of the system relies on Bootstrap 5 customizations and Bootstrap 5 compatible components. This is important because Javascript frameworks like React, Vue.js, Next.js are very heavyweight, hard to understand, require specialized skills debugging and are prone to opaque errors that are often hard to fix. Simple frameworks like Bootstrap 5 with vanilla TypeScript compiled to Javascript are much more preferable to those frameworks.

# Customizations
Bootstrap's initial choices of colors, fonts, sizing, border radius and more are just too colorful. Serious SaaS applications should prefer more muted, limited choices of colors and appropriately sized spacing, icons, component sizing and fonts. Hence, our customizations. The key items are:

- We prefer rectangular components with 0-2 border radius. This means components are rectangularr instead of having rounded corners.
- We prefer components and spacing to be compact. 
- We prefer muted colors that fit into a good complementary palette of colors.
- We prefer good contrast for accessibility. For example, light grey text on bright backgrounds are a terrible choice.
- We prefer hyper legible fonts such as Google OpenSans Text and Atkinson Hyperlegible for regular text to aid low vision readers.
- We prefer clean legible fonts such as JetBrains Mono for fixed width text to aid low vision readers.
- We prefer to load fonts from the Google Fonts project with a fallback to system fonts.

# Components
Bootstrap by default does not have all the components that a full fledged SaaS might require. For example, a modal dialog for literate errors does not exist. An editable combo box similar to that found in operating systems like Linux and Windows native UIs doesn't exist. A tree of checkbox style selections do not exist. An explorer like navigation pane with tree layout and high customizations does not exist. And many more. So, beyond the vanilla components that exist in Bootstrap by default, we will build custom components where necessary. For that:

- All custom components must be placed within the ./components/ folder.
- There must be one folder per custom component. For example ./components/errordialog/.
- The folder must contain all the code for that component include CSS, HTML and Typescript.
- All component Javascript must be written in TypeScript and compiled into Javascript.
- Specifications for components will be in the ./specs/ folder. 
- Components should be packeged in an appropriate fashion for use in Bootstrap based applications.
- Combine component outputs into the output folder ./dist/ where the main Bootstrap CSS, Javascript are placed.
- Create or update a COMPONENTS.md file that lists all components and the path to their CSS and Javascript files. 
- The full list of components that will be built in this repository is outlined in MASTER_COMPONENT_LIST.md. Basic specifications for every component is provided in that file. You MUST start from that specification before expanding on it if the component is in that file.
- Always consult KEYBOARD.md to make sure to adhere to teh keyboard usage conventions outlined in that document. Every component you build MUST consistently use the same keyboard combinations. 

## Operating Style

Use the **V-V-P-T-I-R-V-C** loop (Plan ? Test ? Implement ? Refactor ? Verify) for your core workflow. This is a strict **Test-Driven Development** workflow. For all software engineering tasks, you MUST follow this sequence. **Never write implementation code before writing a failing test.**

+ **Validate (Request):** Analyse the prompt for ambiguity. Restate the core requirement and constraints to ensure alignment before acting.

+ **Verify (State):** Inspect the current codebase context. Read relevant files to confirm the environment is clean and assumptions about the existing code are correct. Consult `agentknowledge/concepts.yaml` to locate related code.

+ **Plan (Design):** Draft a concrete, step-by-step technical plan. This step is where architecture happens � not during implementation. The plan MUST include:
  1. **Files to modify or create** � list every file.
  2. **Pattern selection** � consult `GOF_PATTERNS.md` and select any GoF patterns that apply. Justify each choice against the Balance Checklist. If no pattern is needed, state "No pattern required � simple function/class suffices."
  3. **Interface design** � define the public interfaces (method signatures, DTOs) BEFORE thinking about implementation.
  4. **Layering check** � confirm that business logic is in services (not controllers), HTTP concerns are in controllers, cross-cutting concerns use middleware or filters.
  5. **Review the plan** against project conventions (`CODING_STYLE.md`, `SECURITY_GUIDELINES.md`, `API_GUIDELINES.md`, `PERFORMANCE.md`). Ensure the approach is idiomatic and low-risk.

+ **Test First (Red):** Write the tests BEFORE writing any implementation code. This is the "Red" phase of TDD.
  1. Write unit tests that describe the expected behaviour of the new code. Follow `TESTING.md` conventions (Arrange-Act-Assert, one assertion per test, descriptive names).
  2. For new interfaces or services, write tests against the interface contract.
  3. For bug fixes, write a test that reproduces the bug and currently fails.
  4. For refactorings, verify that existing tests pass as a baseline (per `MIGRATIONS.md` Phase 1). Fill coverage gaps to =90% BEFORE refactoring.
  5. Run the tests � they MUST fail (Red). If they pass, the tests are not testing the new behaviour.

+ **Implement (Green):** Write the minimum code needed to make the failing tests pass. This is the "Green" phase of TDD.
  1. Focus on correctness, not elegance. Get the tests to pass with the simplest implementation.
  2. Apply the GoF patterns identified in the Plan step.
  3. Follow `CODING_STYLE.md` (Allman braces, max 30-line methods, max 3 nesting levels, guard clauses).
  4. Add logging per `LOGGING.md`, comments per `COMMENTING.md`, and markers per `MARKERS.md`.
  5. Run the tests � they MUST pass (Green). If they fail, fix the implementation, NOT the tests.

+ **Refactor (Clean):** Now that tests pass, improve the code structure without changing behaviour. This is the "Refactor" phase of TDD. Apply Martin Fowler refactoring techniques:
  1. **Extract Method** � break methods exceeding 30 lines into smaller, named methods.
  2. **Extract Class** � split classes exceeding 500 lines or having multiple responsibilities.
  3. **Replace Conditional with Polymorphism** � replace switch/if-else chains dispatching to type-specific code with Strategy or polymorphic calls.
  4. **Replace Magic String with Symbolic Constant** � replace hardcoded strings in conditionals with enums or constants.
  5. **Move Method** � move logic to the class where it belongs (e.g., business logic out of controllers).
  6. **Encapsulate Collection** � replace `Dictionary<string, object>` with strongly-typed classes.
  7. Run the tests after EACH refactoring step. If tests fail, revert the last refactoring.

+ **Verify (Full):** Execute the new tests AND all relevant regression tests. Ensure everything passes locally. Run `dotnet build` with zero warnings. Run `./test.sh` for full suite validation.

+ **Commit:** Stage the verified changes and create a commit with a concise, conventional message (e.g., `fix: ...`, `feat: ...`, `refactor: ...`). One logical change per commit.

## (CRITICAL) Thinking
I urge you to think along the lines of Steve Jobs, Douglas Normal, Jonathan Ivy and others. The details are important in making sure the software and documentation we provide our users offer an amazing, consistent, thoughtful and complete end to end experience.

## Development (CRITICAL)
- Read README.md, FONT_UPDATE_SUMMARY.md and ULTRA_COMPACT_THEME_CHANGES.md for all changes made so far.
- You must adhere to the language conventions provided in LANGUAGE.md.
- You must utilize the navigation markers defined in [MARKERS.md](./MARKERS.md) in all generated code. See the Agent Knowledge Base section below for how to read and update `./agentknowledge/` every session.
- Always consult CODING_STYLE.md when writing code. This is important for maintainability.
- **(CRITICAL)** Always consult GOF_PATTERNS.md when designing new services, controllers, or significant features. Select patterns during the **Plan** step, not during implementation. Consult the "Usage Guidance in This Codebase" section for patterns already in use and anti-patterns to avoid. Consult GOF_REFACTOR.md for the active refactoring backlog and to understand the target architecture.
- Always consult DOCUMENTATION.md when generating internal operator or external user facing documentation.
- Always consult MIGRATIONS.md when migrating from one stack to another such as Javascript to TypeScript, Python to .NET Core etc.
- Always consult LOGGING.md so that you add appropriate logging configuration and log statements to all generated code.
- Always consult COMMENTING.md so that you add appropriate comments to all generated code.
- Always consult PRAGMATIC_PROGRAMMER.md for pragmatic engineering principles and PRAGMATIC_PROGRAMMER.checklist.md for a quick review.
- Always consult CODE_COMPLETE.md for software construction best practices and CODE_COMPLETE.checklist.md for a quick review.
- Always consult SECURITY_GUIDELINES.md so that you are aware of how to mitigate security concerns and do not introduce inadvertent security issues.
- **(CRITICAL)** Always consult DARKMODE.md when building or modifying any component. All components MUST be dark-mode compatible using `var(--theme-*)` CSS tokens. This is mandatory for accessibility and theme consistency.
- Always consult FRONTEND.md when frontend code changes are involved.
- Always consult UX_UI_GUIDELINES.md when thinking about any new capability or feature. 
- Always consult UI_UX_CONSISTENCY.md when thinking about and implementing UIs. 
- Always consult API_GUIDELINES.md when implementing new APIs.
- Always consult PERFORMANCE.md when implementing backends, frontends or APIs. It is important to keep performance in mind upfront.
- **(CRITICAL)** Always consult TESTING.md when writing tests. Tests are written BEFORE implementation code (TDD "Red" phase). Having maintainable and comprehensive tests is the foundation of code quality. Without tests, refactoring is unsafe.
- Always consult MIGRATIONS.md when refactoring or restructuring existing code, not just when migrating between stacks. The Golden Loop (baseline ? refactor ? verify) applies to all refactorings. Establish a test baseline before changing any code.
- When selecting libraries for frontend functionality, always consult FRONTEND_LIBRARY_SELECTION.md for guidelines and FRONTEND_SELECTION.md for pre-canned recommendations.
- Before building new UI components, always consult the MASTER_COMPONENT_LIST.md to check if a resuable component exists. If not, produce a specification for resuable UI components and then wait for the user to confirm that the components are available for use before proceeding. This ensures that UI code uses
standardized repeatable patterns and not AI slop.
- Always consult LITERATE_ERRORS.md for how to construct error messages to be usable and meaningful to users and operators.
- Always consult LLM_TECHNIQUES.md and NON_LLM_AIML_TECHNIQUES.md to determine the best approach for infusing any AI or ML feature. It's important to choose the right AI or ML technique instead of one-shotting everything with LLMs. Make sure to consult AIML_SECURITY.md *every time* to make sure AI or ML features especially those involving LLMs do not lead to system compromise or data exfiltration.
- Always consult ADDITIONAL_INSTRUCTIONS.md which contain some refinements. 
- Always make sure that all generated code includes copyright information following the instructions in ./COPYRIGHT_HEADER.md
- Generate a concise summary of changes for each set of changes and commit the Git code. Don't push yet.

## Local Development

### Clean
```bash
./clean.sh
```

### Build
```bash
./build.sh
```

### Run
```bash
./run.sh
```

## Local Endpoints

After `run.sh` starts, about 1 minute later, the app should be available at `http://localhost:8000`. 
# Agent Knowledge Base (CRITICAL)

The directory `./agentknowledge/` contains a machine-readable knowledge graph of the codebase. See [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) for the full specification.

## Session Start � Read
At the beginning of every session, read these files to orient yourself:
1. `agentknowledge/concepts.yaml` � Business concepts mapped to anchor files. Use this to locate code instead of blind searching.
2. `agentknowledge/entities.yaml` � Data models mapped to code files, database tables, and relationships.
3. `agentknowledge/decisions.yaml` � Architectural Decision Records (ADRs). Consult before proposing alternative approaches; the decision may already be recorded and reasoned.

## Session End � Update
Before your final commit in a session, update these files if your work changed the codebase meaningfully:

| Trigger | Action |
|---------|--------|
| Created a new service, controller, or shared module | Add a concept entry to `concepts.yaml` with `name`, `definition`, `anchor_file`, `related`. |
| Created or modified a data model / entity | Add or update an entry in `entities.yaml` with `name`, `table`, `file`, `description`, `related`. |
| Made an architectural decision (new library, new pattern, new infrastructure choice) | Add an ADR entry to `decisions.yaml` with `id` (next `ADR-NNN`), `title`, `date`, `status`, `context`, `files`. |
| Completed any significant task | Append a single JSON line to `history.jsonl` with `date`, `task`, `files`, `summary`. |
| Made any user-visible change (feature, fix, refactor) | Add an entry to `CHANGELOG.md` under the current date with the appropriate category (Added/Changed/Fixed/Removed). Keep entries concise — one line per change. |

## Rules
- **Never delete** existing entries � only add or update.
- **Never rewrite** `history.jsonl` � it is append-only.
- Keep concept names in PascalCase and stable; other files may reference them.
- If a decision is superseded, set its `status` to `Superseded` and add the replacement ADR id.

# History and Status

Always keep all provided input from me to you, the agent, in the file CONVERSATION.md. Write the request + your output summary into the CONVERSATION.md file as well. This helps keep track of all refinements and changes over time. If this file already exists, also attempt to read it to understand everything that has been done so far. Leverage the `git log` to understand past changes and refinements. Use agentic markers in all generated files to guide yourself. This combination should give you almost all context about what was achieved.

Always keep the per-component progress and plans in an component specific file inside the `./specs/` directory. For example, as we are working on the *Permissions Matrix* component, keep progress from CONVERSATION.md, your context, your history, the `git log`, bug fixes, refinements in the file `./specs/permissions_matrix.md`. This makes it easier to resume sessions working on the component over time or for bug fixes etc. This is going to be shorter context than CONVERSATION.md which is quite large.


# Demo
Whenever components, CSS, HTML or TypeScript, Javascript are modified, created or enabled, a demonstration site must be created within the ./demo/ folder. The site can be a single or multi-page HTML site. But it must demonstrate all styles, all components, all dialogs, all typography, alll colors from the base Bootstrap framework with the customizations added. This allows the user to validate that the theme is working well or if not, adjust any instructions.
