/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TOOL: Generates a handle interface from a class. PAT-1, AGENTS.md
 * "Factory return type".
 *
 * WHY A TOOL AND NOT A BUILD STEP. The first write of a handle can be
 * mechanical, because a class that has already used `private` for its
 * fields has made most of the decision. Every write after that is a
 * judgement — `ActionItemsHandle` leaves `exportItems` off a class that
 * publishes it. If this ran on every build it would put that method
 * back, and the handle would stop being a decision. So it runs when
 * somebody asks, and `implements` is what holds the result afterwards.
 *
 * WHY THE COMPILER AND NOT A REGEX. A regex on `public foo(` misses
 * getters, setters, overloads, generics, `readonly`, and anything
 * inherited. `checker.typeToString` gets all of them right, and this
 * file's whole purpose is to be right about a member list.
 *
 * Usage: node scripts/gen-handles.mjs [--write] [component …]
 */

import ts from "typescript";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const ONLY = new Set(argv.filter((a) => !a.startsWith("--")));

/** Files to consider. The bundled DiagramEngine is generated; its source is not. */
export function sourceFiles()
{
    return execSync(
        'git ls-files "components/*/*.ts" "components/diagramengine/src/*.ts"',
        { encoding: "utf8" })
        .split("\n")
        .filter((f) => f && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")
            && f !== "components/diagramengine/diagramengine.ts");
}

/** `DiagramEngineImpl` -> `DiagramEngineHandle`. */
export function handleNameFor(className)
{
    return `${className.replace(/Impl$/, "")}Handle`;
}

function isPublicInstanceMember(member, sf)
{
    if (ts.isConstructorDeclaration(member)) { return false; }
    if (ts.isIndexSignatureDeclaration(member)) { return false; }
    if (!member.name) { return false; }

    const flags = ts.getCombinedModifierFlags(member);
    const hidden = ts.ModifierFlags.Private | ts.ModifierFlags.Protected
        | ts.ModifierFlags.Static;

    return (flags & hidden) === 0
        && !member.name.getText(sf).startsWith("#");
}

/**
 * Every public instance member of `cls`, printed as interface members.
 *
 * @param {ts.ClassDeclaration} cls - The class to mirror.
 * @param {ts.SourceFile} sf - Its source file, for `getText`.
 * @returns {string[]} One line per member, already indented.
 */
export function memberLines(cls, sf)
{
    const seen = new Set();
    const lines = [];

    for (const member of cls.members)
    {
        if (!isPublicInstanceMember(member, sf)) { continue; }

        const name = member.name.getText(sf);

        // An overloaded method appears once per signature. The handle
        // carries each one, but a get/set PAIR is a single property.
        if (ts.isSetAccessor(member) && seen.has(`get:${name}`)) { continue; }
        if (ts.isGetAccessor(member)) { seen.add(`get:${name}`); }

        lines.push(printMember(member, sf, name));
    }

    return lines;
}

/**
 * One parameter, printed for an INTERFACE rather than an implementation.
 *
 * `exportData(format: ExportFormat = "json")` is legal on a class and is
 * TS2371 on an interface, so the default is dropped and the parameter
 * becomes optional — which is what the default meant to a caller.
 *
 * @param {ts.ParameterDeclaration} param - The parameter to print.
 * @param {ts.SourceFile} sf - Its source file.
 * @returns {string} The parameter as an interface signature writes it.
 */
export function printParameter(param, sf)
{
    const rest = param.dotDotDotToken ? "..." : "";
    const name = param.name.getText(sf);
    const type = param.type ? `: ${param.type.getText(sf)}` : "";

    // A rest parameter is already optional and may not carry `?`.
    const optional = !rest && (param.questionToken || param.initializer)
        ? "?" : "";

    return `${rest}${name}${optional}${type}`;
}

function printMember(member, sf, name)
{
    const typeText = (node, fallback) => (node ? node.getText(sf) : fallback);

    if (ts.isMethodDeclaration(member))
    {
        const generics = member.typeParameters
            ? `<${member.typeParameters.map((t) => t.getText(sf)).join(", ")}>`
            : "";
        const params = member.parameters
            .map((p) => printParameter(p, sf)).join(", ");
        return `    ${name}${generics}(${params}): ${typeText(member.type, "void")};`;
    }

    if (ts.isGetAccessor(member))
    {
        const hasSetter = member.parent.members.some(
            (m) => ts.isSetAccessor(m) && m.name.getText(sf) === name);
        const readonly = hasSetter ? "" : "readonly ";
        return `    ${readonly}${name}: ${typeText(member.type, "unknown")};`;
    }

    if (ts.isSetAccessor(member))
    {
        const value = member.parameters[0];
        return `    ${name}: ${typeText(value?.type, "unknown")};`;
    }

    // A public property. The fleet has none today, and if one appears
    // the handle should carry it rather than quietly drop it.
    const readonly = (ts.getCombinedModifierFlags(member)
        & ts.ModifierFlags.Readonly) ? "readonly " : "";
    return `    ${readonly}${name}: ${typeText(member.type, "unknown")};`;
}

/**
 * Every exported function whose declared return type is a class.
 *
 * PAT-1's gate. The compiler, not a regex: a factory returning
 * `Toolbar` and one returning `ToolbarHandle` differ by a resolved
 * symbol, and `grep` cannot tell a class from an interface.
 *
 * @returns {{file: string, factory: string, className: string}[]} One
 *   row per offending factory, empty when the rule holds.
 */
export function factoriesReturningClass()
{
    const files = sourceFiles();
    const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: true,
        skipLibCheck: true,
    });

    const rows = [];

    for (const file of files)
    {
        const sf = program.getSourceFile(file);
        if (!sf) { continue; }

        const classes = new Set();
        sf.forEachChild((node) =>
        {
            if (ts.isClassDeclaration(node) && node.name)
            { classes.add(node.name.text); }
        });

        for (const node of sf.statements)
        {
            if (!ts.isFunctionDeclaration(node) || !node.name) { continue; }
            if (!node.modifiers?.some(
                (m) => m.kind === ts.SyntaxKind.ExportKeyword)) { continue; }
            if (!node.type || !ts.isTypeReferenceNode(node.type)) { continue; }

            const returned = node.type.typeName.getText(sf);
            if (classes.has(returned))
            {
                rows.push({ file, factory: node.name.text, className: returned });
            }
        }
    }

    return rows;
}

/**
 * Classes that have a matching handle and never declare the relationship.
 *
 * `implements` is the whole contract, and nothing else enforces it.
 * The typecheck catches a class drifting BELOW its handle only once the
 * clause is there; without it the two agree by luck, which is how 6 of
 * 14 pairs stood on 2026-10-22. `DiagramEngineImpl` is why this reads
 * the heritage clause rather than the file text: it already implemented
 * `EngineForTools`, and the first sweep stepped around it in silence.
 *
 * @returns {{file: string, className: string, handle: string}[]} One row
 *   per undeclared pair, empty when the rule holds.
 */
export function handlesWithoutImplements()
{
    const files = sourceFiles();
    const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: true,
        skipLibCheck: true,
    });

    const rows = [];

    for (const file of files)
    {
        const sf = program.getSourceFile(file);
        if (!sf) { continue; }

        const classes = new Map();
        const handles = [];

        sf.forEachChild((node) =>
        {
            if (ts.isClassDeclaration(node) && node.name)
            { classes.set(node.name.text, node); }
            if (ts.isInterfaceDeclaration(node)
                && node.name.text.endsWith("Handle"))
            { handles.push(node.name.text); }
        });

        for (const handle of handles)
        {
            const base = handle.replace(/Handle$/, "");
            const cls = classes.get(base) ?? classes.get(`${base}Impl`);
            if (!cls) { continue; }

            const declared = cls.heritageClauses?.some(
                (h) => h.token === ts.SyntaxKind.ImplementsKeyword
                    && h.types.some(
                        (t) => t.expression.getText(sf) === handle));

            if (!declared)
            {
                rows.push({ file, className: cls.name.text, handle });
            }
        }
    }

    return rows;
}

function run()
{
    const files = sourceFiles();
    const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: true,
        skipLibCheck: true,
    });

    const plans = [];

    for (const file of files)
    {
        const component = file.split("/")[1];
        if (ONLY.size && !ONLY.has(component)) { continue; }

        const sf = program.getSourceFile(file);
        if (!sf) { continue; }

        const classes = new Map();
        const interfaces = new Set();

        sf.forEachChild((node) =>
        {
            if (ts.isClassDeclaration(node) && node.name)
            { classes.set(node.name.text, node); }
            if (ts.isInterfaceDeclaration(node))
            { interfaces.add(node.name.text); }
        });

        for (const node of sf.statements)
        {
            if (!ts.isFunctionDeclaration(node) || !node.name) { continue; }
            if (!node.modifiers?.some(
                (m) => m.kind === ts.SyntaxKind.ExportKeyword)) { continue; }

            // Not `create*`: `showBanner`, `showProgressModal` and
            // `getCommandPalette` hand back the same object under another
            // verb. Keying on the name would have left five functions
            // returning the class beside a factory returning the handle,
            // and the typecheck found them. What makes a function a
            // factory here is its RETURN TYPE, not its spelling.
            if (!node.type || !ts.isTypeReferenceNode(node.type)) { continue; }

            const returned = node.type.typeName.getText(sf);
            const cls = classes.get(returned);
            if (!cls) { continue; }

            const handle = handleNameFor(returned);
            const implementsClause = cls.heritageClauses?.find(
                (h) => h.token === ts.SyntaxKind.ImplementsKeyword);

            plans.push({
                file, component, factory: node.name.text,
                className: returned, handle, sf,
                handleExists: interfaces.has(handle),
                lines: memberLines(cls, sf),
                classStart: cls.getStart(sf),
                // The end of the class NAME plus any type parameters: where
                // an `implements` clause starts when there is not one yet.
                nameEnd: cls.typeParameters
                    ? cls.typeParameters[cls.typeParameters.length - 1].getEnd() + 1
                    : cls.name.getEnd(),
                implementsClause,
                returnTypeStart: node.type.getStart(sf),
                returnTypeEnd: node.type.getEnd(),
            });
        }
    }

    // One interface per class, however many factories return it.
    const byClass = new Map();
    for (const p of plans)
    {
        const key = `${p.file}::${p.className}`;
        if (!byClass.has(key)) { byClass.set(key, { ...p, factories: [] }); }
        byClass.get(key).factories.push(p);
    }

    console.log(`factories returning a class: ${plans.length}`);
    console.log(`classes to mirror:           ${byClass.size}`);
    console.log(`members to declare:          `
        + `${[...byClass.values()].reduce((n, p) => n + p.lines.length, 0)}`);

    if (!WRITE)
    {
        console.log("\n(dry run — pass --write to apply)");
        return;
    }

    // Group edits per file and apply from the END of the file backwards,
    // so an earlier offset is still valid after a later edit.
    const byFile = new Map();
    for (const plan of byClass.values())
    {
        if (!byFile.has(plan.file)) { byFile.set(plan.file, []); }
        byFile.get(plan.file).push(plan);
    }

    let written = 0;

    for (const [file, filePlans] of byFile)
    {
        let src = readFileSync(file, "utf8");
        const edits = [];

        for (const plan of filePlans)
        {
            if (!plan.handleExists)
            {
                const doc = [
                    "/**",
                    ` * The ${plan.className} surface a factory caller receives.`,
                    " *",
                    " * PAT-1. `implements` below is what keeps this in step with the",
                    " * class: remove a member there and the typecheck fails here. Adding",
                    " * one to the class does NOT add it here, which is the point — a new",
                    " * method is API when somebody writes it into this interface.",
                    " */",
                    `export interface ${plan.handle}`,
                    "{",
                    ...plan.lines,
                    "}",
                    "",
                ].join("\n");
                edits.push({ at: plan.classStart, remove: 0, insert: `${doc}\n` });
            }

            // The `implements` clause, placed from the AST rather than
            // guessed from text.
            //
            // The first version matched the class name with a negative
            // lookahead for `implements`, so a class that ALREADY
            // implemented something was stepped around in silence.
            // `DiagramEngineImpl implements EngineForTools` received its
            // interface and its factory return type and no contract, the
            // typecheck passed, and the run reported "wrote 76 files".
            // A skip is an exception now, because a half-applied class is
            // the one outcome that looks like success.
            const already = plan.implementsClause?.types.some(
                (t) => t.expression.getText(plan.sf) === plan.handle);

            if (!already)
            {
                if (plan.implementsClause)
                {
                    const types = plan.implementsClause.types;
                    edits.push({
                        at: types[types.length - 1].getEnd(),
                        remove: 0,
                        insert: `, ${plan.handle}`,
                    });
                }
                else if (plan.nameEnd !== undefined)
                {
                    edits.push({
                        at: plan.nameEnd,
                        remove: 0,
                        insert: ` implements ${plan.handle}`,
                    });
                }
                else
                {
                    throw new Error(`${plan.file}: cannot place implements `
                        + `${plan.handle} on ${plan.className}`);
                }
            }

            for (const f of plan.factories)
            {
                edits.push({
                    at: f.returnTypeStart,
                    remove: f.returnTypeEnd - f.returnTypeStart,
                    insert: plan.handle,
                });
            }
        }

        edits.sort((a, b) => b.at - a.at);
        for (const e of edits)
        {
            src = src.slice(0, e.at) + e.insert + src.slice(e.at + e.remove);
        }

        writeFileSync(file, src);
        written += 1;
    }

    console.log(`\nwrote ${written} files`);
}

// Importing this file for `factoriesReturningClass` must not run the CLI.
if (process.argv[1] && process.argv[1].endsWith("gen-handles.mjs"))
{
    run();
}
