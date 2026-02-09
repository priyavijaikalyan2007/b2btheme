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

# Operating Style
Use a V-V-P-V-I-T-T-C loop for your core workflow. The workflow is as follows. For all software engineering tasks, you MUST strictly adhere to the following sequence:

+ **Validate (Request):** Analyze the prompt for ambiguity. Restate the core requirement and constraints to ensure alignment before acting.
+ **Verify (State):** Inspect the current codebase context. Read relevant files to confirm the environment is clean and assumptions about the existing code are correct.
+ **Plan:** Draft a concrete, step-by-step technical plan. Identify exactly which files will be modified and how.
+ **Verify (Plan):** Review the plan against project conventions (e.g., `CODING_STYLE.md`) and safety guidelines. Ensure the approach is idiomatic and low-risk.
+ **Implement Code:** Execute the planned changes using atomic, focused edits.
+ **Implement Tests:** Implement specific unit or integration tests that verify the new functionality or fix. Treat tests as a mandatory part of the implementation.
+ **Test Changes:** Execute the new tests *and* relevant regression tests. Ensure everything passes locally.
+ **Commit:** Stage the verified changes and create a commit with a concise, conventional message (e.g., `fix: ...`, `feat: ...`).

# (CRITICAL) Thinking
I urge you to think along the lines of Steve Jobs, Douglas Normal, Jonathan Ivy and others. The details are important in making sure the software and documentation we provide our users offer an amazing, consistent, thoughtful and complete end to end experience.

# Development (CRITICAL)
- Read README.md, FONT_UPDATE_SUMMARY.md and ULTRA_COMPACT_THEME_CHANGES.md for all changes made so far.
- You must adhere to the language conventions provided in LANGUAGE.md.
- You must utilize the navigation markers defined in [MARKERS.md](./MARKERS.md) in all generated code. See the Agent Knowledge Base section below for how to read and update `./agentknowledge/` every session.
- Always consult CODING_STYLE when writing code. This is important for maintainability.
- Always consult DOCUMENTATION.md when generating internal operator or external user facing documentation.
- Always consult LOGGING.md so that you add appropriate logging configuration and log statements to all generated code.
- Always consult COMMENTING.md so that you add appropriate comments to all generated code.
- Always consult FRONTEND.md when frontend code changes are involved.
- Always consult UX_UI_GUIDELINES.md when thinking about any new capability or feature. 
- Always consult TESTING.md when you need to write tests. Having maintainable and comprehensive tests is important.
- When selecting libraries for frontend functionality, always consult FRONTEND_LIBRARY_SELECTION.md for guidelines and FRONTEND_SELECTION.md for pre-canned recommendations.
- Always consult LITERATE_ERRORS.md for how to construct error messages to be usable and meaningful to users and operators.
- Always consult ADDITIONAL_INSTRUCTIONS.md which contain some refinements. 
- Generate a concise summary of changes for each set of changes and commit the Git code. Don't push yet.

# Agent Knowledge Base (CRITICAL)

The directory `./agentknowledge/` contains a machine-readable knowledge graph of the codebase. See [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) for the full specification.

## Session Start — Read
At the beginning of every session, read these files to orient yourself:
1. `agentknowledge/concepts.yaml` — Business concepts mapped to anchor files. Use this to locate code instead of blind searching.
2. `agentknowledge/entities.yaml` — Data models mapped to code files, database tables, and relationships.
3. `agentknowledge/decisions.yaml` — Architectural Decision Records (ADRs). Consult before proposing alternative approaches; the decision may already be recorded and reasoned.

## Session End — Update
Before your final commit in a session, update these files if your work changed the codebase meaningfully:

| Trigger | Action |
|---------|--------|
| Created a new service, controller, or shared module | Add a concept entry to `concepts.yaml` with `name`, `definition`, `anchor_file`, `related`. |
| Created or modified a data model / entity | Add or update an entry in `entities.yaml` with `name`, `table`, `file`, `description`, `related`. |
| Made an architectural decision (new library, new pattern, new infrastructure choice) | Add an ADR entry to `decisions.yaml` with `id` (next `ADR-NNN`), `title`, `date`, `status`, `context`, `files`. |
| Completed any significant task | Append a single JSON line to `history.jsonl` with `date`, `task`, `files`, `summary`. |

## Rules
- **Never delete** existing entries — only add or update.
- **Never rewrite** `history.jsonl` — it is append-only.
- Keep concept names in PascalCase and stable; other files may reference them.
- If a decision is superseded, set its `status` to `Superseded` and add the replacement ADR id.

# History and Status

Always keep all provided input from me to you, the agent, in the file CONVERSATION.md. Write the request + your output summary into the CONVERSATION.md file as well. This helps keep track of all refinements and changes over time. If this file already exists, also attempt to read it to understand everything that has been done so far. Leverage the `git log` to understand past changes and refinements. Use agentic markers in all generated files to guide yourself. This combination should give you almost all context about what was achieved.


