/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiClassifier
 * 📜 PURPOSE: Classify every factory option as data, function, element or
 *    too-broad by asking the TypeScript checker, so the schema tool never
 *    sees anything undeclared. Spec §3, ADR-219.
 * 🔗 RELATES: [[AgentProtocolSchema]], [[NoFallbackCode]]
 * ⚡ FLOW: [tsconfig] -> [ts.Program] -> [factory parameter type]
 *          -> [classifyMembers] -> [resolve.mjs]
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// ⚓ AgentProtocolSchema
export const MEMBER_CLASS = Object.freeze({
    DATA: "data",
    FUNCTION: "function",
    ELEMENT: "element",
    TOO_BROAD: "too-broad",
});

/** Non-data classes, strongest first, for a member with no data arm. */
const STRENGTH = [MEMBER_CLASS.FUNCTION, MEMBER_CLASS.ELEMENT, MEMBER_CLASS.TOO_BROAD];

/** `any`, `unknown`, `object` and `never` cannot be described to an agent. */
const BROAD_FLAGS = ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive | ts.TypeFlags.Never;

/** Declares one value of each reference type the classifier compares against. */
const PROBE_SOURCE = "declare const agentuiNodeProbe: Node;\n"
    + "declare const agentuiDateProbe: Date;\n"
    + "export {};\n";

/**
 * Builds the TypeScript program the classifier reads.
 *
 * @param tsconfigPath - Absolute path of the tsconfig whose files to load.
 * @param cacheDir     - Writable directory for the probe file.
 * @param extraRoots   - Additional root files.
 * @returns The classifier context.
 */
// @entrypoint
export function createClassifier(tsconfigPath, cacheDir, extraRoots = [])
{
    const config = readTsconfig(tsconfigPath);
    fs.mkdirSync(cacheDir, { recursive: true });
    const probePath = path.join(cacheDir, "classifier-probe.ts");
    fs.writeFileSync(probePath, PROBE_SOURCE);

    const program = ts.createProgram([...config.fileNames, ...extraRoots, probePath], config.options);
    const checker = program.getTypeChecker();
    const [nodeType, dateType] = probeTypes(program, checker, probePath);

    return { program, checker, nodeType, dateType };
}

/**
 * Reads a tsconfig, throwing a literate error when it cannot be read.
 *
 * @param tsconfigPath - Absolute path of the tsconfig.
 * @returns The parsed command line.
 */
export function readTsconfig(tsconfigPath)
{
    const host = {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (d) =>
        {
            throw new Error(`Cannot read ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
        },
    };
    const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host);

    if (!parsed)
    {
        throw new Error(`TypeScript returned no configuration for ${tsconfigPath}.`);
    }

    return parsed;
}

/** Reads the Node and Date types out of the probe file. */
function probeTypes(program, checker, probePath)
{
    const statements = program.getSourceFile(probePath).statements;

    return [0, 1].map((i) => checker.getTypeAtLocation(statements[i].declarationList.declarations[0].name));
}

/**
 * Which factory parameter holds the options, per the manifest's factoryStyle.
 *
 * @param manifest - The capability manifest.
 * @returns 1 for container-first (the default), otherwise 0.
 */
export function optionsParameterIndex(manifest)
{
    return (manifest.factoryStyle ?? "container-first") === "container-first" ? 1 : 0;
}

/**
 * The options type of an exported factory, read from its first signature.
 *
 * @param ctx         - Classifier context.
 * @param file        - Absolute path of the component's entry module.
 * @param factoryName - The exported factory, e.g. "createDataGrid".
 * @param paramIndex  - Which parameter holds the options.
 * @returns The non-nullable options type, the location to resolve it at, and
 *          the factory's return (handle) type.
 */
export function factoryOptionsType(ctx, file, factoryName, paramIndex)
{
    const source = ctx.program.getSourceFile(file);

    if (!source)
    {
        throw new Error(`${file} is not in the TypeScript program, so ${factoryName}'s options `
            + "cannot be read. Add the file to the tsconfig \"include\".");
    }

    const factory = findExport(ctx, source, factoryName);
    const signature = ctx.checker.getTypeOfSymbolAtLocation(factory, source).getCallSignatures()[0];
    const parameter = signature?.parameters[paramIndex];

    if (!parameter)
    {
        throw new Error(`${factoryName} in ${file} has no parameter ${paramIndex}, which the manifest's `
            + "factoryStyle says holds the options. Correct factoryStyle in the manifest.");
    }

    const type = ctx.checker.getTypeOfSymbolAtLocation(parameter, source);

    return { type: ctx.checker.getNonNullableType(type), location: source, handleType: signature.getReturnType() };
}

/** Finds an exported symbol by name, resolving re-export aliases. */
function findExport(ctx, source, name)
{
    const moduleSymbol = ctx.checker.getSymbolAtLocation(source);
    const found = moduleSymbol?.exports && ctx.checker.getExportsOfModule(moduleSymbol).find((s) => s.name === name);

    if (!found)
    {
        throw new Error(`${source.fileName} does not export ${name}. `
            + "The manifest's factory field must name a function exported from <name>/<name>.ts.");
    }

    return (found.flags & ts.SymbolFlags.Alias) ? ctx.checker.getAliasedSymbol(found) : found;
}

/**
 * Classifies every member of an options type (spec §3.1). The onChange report
 * of a component with `value` also carries its value fit (ADR-222).
 *
 * @param ctx         - Classifier context.
 * @param optionsType - The options type.
 * @param location    - Node to resolve member types at.
 * @param handleType  - The factory's return type, whose setValue the fit reads.
 * @returns One report per member.
 */
// @entrypoint
export function classifyMembers(ctx, optionsType, location, handleType)
{
    const reports = ctx.checker.getPropertiesOfType(optionsType).map((symbol) => classifyMember(ctx, symbol, location));
    const fit = valueFit(ctx, optionsType, location, handleType);

    return fit ? reports.map((r) => (r.name === "onChange" ? { ...r, valueFit: fit } : r)) : reports;
}

/**
 * What onChange's first parameter can be mapped to (ADR-222, #39), or null
 * when the options lack `value` or a function `onChange`.
 *
 * @returns { param, direct, withoutNull, fromProperty, setValueAcceptsNull }:
 *          the parameter as text; whether it, or it without null, is
 *          assignable to value; which of its properties (present on every
 *          arm) are; and whether the handle's setValue accepts null.
 */
function valueFit(ctx, optionsType, location, handleType)
{
    const c = ctx.checker;
    const typeOf = (s) => c.getNonNullableType(c.getTypeOfSymbolAtLocation(s, location));
    const value = optionsType.getProperty("value");
    const onChange = optionsType.getProperty("onChange");
    const signature = onChange && unionArms(typeOf(onChange)).flatMap((a) => a.getCallSignatures())[0];

    if (!value || !signature) { return null; }

    const target = typeOf(value);
    const first = signature.parameters[0];
    const param = first ? c.getTypeOfSymbolAtLocation(first, location) : null;

    return {
        param: param ? c.typeToString(param) : "(none)",
        direct: param !== null && c.isTypeAssignableTo(param, target),
        withoutNull: param !== null && c.isTypeAssignableTo(c.getNonNullableType(param), target),
        fromProperty: param ? assignableProperties(ctx, param, target) : [],
        setValueAcceptsNull: acceptsNull(ctx, handleType, location),
    };
}

/** Properties present on every arm of `t` whose type is assignable to `target`. */
function assignableProperties(ctx, t, target)
{
    const arms = unionArms(t);

    return ctx.checker.getPropertiesOfType(arms[0]).map((p) => p.name).filter((n) => arms.every((arm) =>
    {
        const p = arm.getProperty(n);

        return p !== undefined && ctx.checker.isTypeAssignableTo(ctx.checker.getTypeOfSymbol(p), target);
    }));
}

/** True when some arm of the handle's setValue first parameter is null. */
function acceptsNull(ctx, handleType, location)
{
    const setValue = handleType?.getProperty("setValue");
    const signature = setValue && ctx.checker.getTypeOfSymbolAtLocation(setValue, location).getCallSignatures()[0];
    const first = signature?.parameters[0];

    return first !== undefined && unionArms(ctx.checker.getTypeOfSymbolAtLocation(first, location))
        .some((a) => (a.flags & ts.TypeFlags.Null) !== 0);
}

/** Classifies one member: its class, mixed arms, nested hazards and JSDoc. */
function classifyMember(ctx, symbol, location)
{
    const type = ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbolAtLocation(symbol, location));
    const arms = unionArms(type);
    const classes = arms.map((arm) => usableClass(ctx, arm));
    const dataArms = arms.filter((_, i) => classes[i] === MEMBER_CLASS.DATA);
    const cls = dataArms.length > 0 ? MEMBER_CLASS.DATA : STRENGTH.find((c) => classes.includes(c));
    const hazards = dataArms.flatMap((arm) => childHazards(ctx, arm, symbol.name, new Set([arm])));

    return {
        name: symbol.name,
        cls,
        optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        arity: cls === MEMBER_CLASS.FUNCTION ? arityOf(type) : null,
        mixedArms: cls === MEMBER_CLASS.DATA ? unique(classes.filter((c) => c !== MEMBER_CLASS.DATA)) : [],
        hazards: uniqueBy(hazards, (h) => `${h.path}|${h.cls}`),
        jsdoc: ts.displayPartsToString(symbol.getDocumentationComment(ctx.checker)).trim(),
    };
}

/**
 * The class of one member arm, where data that cannot be used without host
 * code takes the class of the host code it needs (readiness step 3):
 * FileExplorer's context menu items require an action, and a schema with
 * the action dropped describes items an agent could write but the component
 * could not run.
 */
function usableClass(ctx, t)
{
    const cls = armClass(ctx, t);

    return cls === MEMBER_CLASS.DATA ? hostCodeIn(ctx, t, new Set()) ?? cls : cls;
}

/**
 * The class (function or element) of a member that a data type reaches
 * through arrays and required members and that is only host code, or null.
 */
function hostCodeIn(ctx, t, ancestors)
{
    if (ancestors.has(t) || (t.flags & ts.TypeFlags.Object) === 0 || isDate(ctx, t)) { return null; }

    const next = new Set(ancestors).add(t);
    const required = ctx.checker.isArrayType(t) || ctx.checker.isTupleType(t)
        ? ctx.checker.getTypeArguments(t)
        : ctx.checker.getPropertiesOfType(t).filter((p) => (p.flags & ts.SymbolFlags.Optional) === 0)
            .map((p) => ctx.checker.getTypeOfSymbol(p));

    for (const member of required)
    {
        const cls = onlyHostCode(ctx, ctx.checker.getNonNullableType(member), next);

        if (cls) { return cls; }
    }

    return null;
}

/** The host-code class when every arm of a type is a function, an element, or data that needs host code. */
function onlyHostCode(ctx, t, ancestors)
{
    const classes = unionArms(t).map((arm) =>
    {
        const cls = armClass(ctx, arm);

        return cls === MEMBER_CLASS.DATA ? hostCodeIn(ctx, arm, ancestors) : cls;
    });

    if (!classes.every((c) => c === MEMBER_CLASS.FUNCTION || c === MEMBER_CLASS.ELEMENT)) { return null; }

    return classes.includes(MEMBER_CLASS.ELEMENT) ? MEMBER_CLASS.ELEMENT : MEMBER_CLASS.FUNCTION;
}

/** The class of one union arm. Order matters: Date before methods, methods before Node. */
function armClass(ctx, t)
{
    if (t.flags & BROAD_FLAGS) { return MEMBER_CLASS.TOO_BROAD; }

    if (isDate(ctx, t)) { return MEMBER_CLASS.DATA; }

    if (t.getCallSignatures().length > 0 || isInstance(ctx, t)) { return MEMBER_CLASS.FUNCTION; }

    if (ctx.checker.isTypeAssignableTo(t, ctx.nodeType)) { return MEMBER_CLASS.ELEMENT; }

    if (isOpenBag(ctx, t)) { return MEMBER_CLASS.TOO_BROAD; }

    return MEMBER_CLASS.DATA;
}

/** True for `Date` itself (mutually assignable), which is emitted as a date-time string. */
function isDate(ctx, t)
{
    return (t.flags & ts.TypeFlags.Object) !== 0
        && ctx.checker.isTypeAssignableTo(t, ctx.dateType)
        && ctx.checker.isTypeAssignableTo(ctx.dateType, t);
}

/** True for a component instance: an object whose every property is callable. */
function isInstance(ctx, t)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || ctx.checker.isArrayType(t) || ctx.checker.isTupleType(t))
    {
        return false;
    }

    const props = ctx.checker.getPropertiesOfType(t);

    return props.length > 0 && props.every((p) =>
        ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(p)).getCallSignatures().length > 0);
}

/** True for `{}` and for index signatures of `any`/`unknown`. */
function isOpenBag(ctx, t)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || ctx.checker.getPropertiesOfType(t).length > 0)
    {
        return false;
    }

    const indexes = ctx.checker.getIndexInfosOfType(t);

    return indexes.length === 0
        || indexes.some((i) => (i.type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0);
}

/** Hazards strictly below a data type: every non-data arm reachable through it. */
function childHazards(ctx, type, basePath, ancestors)
{
    return children(ctx, type, basePath).flatMap(([childPath, child]) =>
        hazardsAt(ctx, child, childPath, ancestors));
}

/** Hazards at a path: its non-data arms, plus hazards below its data arms. */
function hazardsAt(ctx, type, at, ancestors)
{
    if (ancestors.has(type)) { return []; }

    const next = new Set(ancestors).add(type);

    return unionArms(type).flatMap((arm) =>
    {
        const cls = armClass(ctx, arm);
        return cls === MEMBER_CLASS.DATA ? childHazards(ctx, arm, at, next) : [{ path: at, cls }];
    });
}

/** Child paths of an object, array, tuple or index signature, with their types. */
function children(ctx, t, at)
{
    if ((t.flags & ts.TypeFlags.Object) === 0 || isDate(ctx, t)) { return []; }

    if (ctx.checker.isArrayType(t) || ctx.checker.isTupleType(t))
    {
        return ctx.checker.getTypeArguments(t).map((a) => [`${at}[]`, ctx.checker.getNonNullableType(a)]);
    }

    const props = ctx.checker.getPropertiesOfType(t).map((p) =>
        [`${at}.${p.name}`, ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(p))]);
    const indexes = ctx.checker.getIndexInfosOfType(t).map((i) => [`${at}[]`, i.type]);

    return [...props, ...indexes];
}

/** Parameter count of the first call signature among a type's arms. */
function arityOf(type)
{
    const signature = unionArms(type).flatMap((arm) => arm.getCallSignatures())[0];

    return signature ? signature.parameters.length : 0;
}

/** The arms of a union, or the type itself. */
function unionArms(t)
{
    return t.isUnion() ? t.types : [t];
}

function unique(values)
{
    return [...new Set(values)];
}

function uniqueBy(values, keyOf)
{
    const seen = new Map(values.map((v) => [keyOf(v), v]));
    return [...seen.values()];
}
