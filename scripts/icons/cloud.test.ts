// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: CloudIconAdapter. How the cloud-icons/ layout becomes the aws,
 *    azure and gcp packs, and the old-path map apps switch with.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { collect } from "./cloud.mjs";
import { legacyMap } from "./write-pack.mjs";

const svg = (w: number, h = w) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path/></svg>`;

function tree(files: Record<string, string>): string
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-"));
    for (const [rel, text] of Object.entries(files))
    {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
}

describe("aws", () =>
{
    const rules = { aliases: { lot: "internet-of-things", "vr-ar": "vr-and-ar" } };

    test("variant comes from the top folder, category from the next, through the aliases", () =>
    {
        const dir = path.join(tree({
            "AWS/Services/Compute/Amazon EC2 Auto Scaling.svg": svg(64),
            "AWS/Resources/Compute/Amazon EC2 Auto Scaling.svg": svg(48),
            "AWS/Resources/loT/AWS IoT Topic.svg": svg(48),
            "AWS/Categories/VR AR.svg": svg(64),
        }), "AWS");
        const icons = collect("aws", dir, rules);
        expect(icons.map((i) => i.id)).toEqual([
            "compute/amazon-ec2-auto-scaling", "internet-of-things/aws-iot-topic", "vr-and-ar/vr-ar",
        ]);
        expect(icons[0].files).toEqual({
            "64-service": { src: path.join(dir, "Services/Compute/Amazon EC2 Auto Scaling.svg"),
                rel: "compute/amazon-ec2-auto-scaling-64-service.svg" },
            "48-resource": { src: path.join(dir, "Resources/Compute/Amazon EC2 Auto Scaling.svg"),
                rel: "compute/amazon-ec2-auto-scaling-48-resource.svg" },
        });
        expect(icons[0].legacyPaths).toEqual({
            "64-service": "AWS/Services/Compute/Amazon EC2 Auto Scaling.svg",
            "48-resource": "AWS/Resources/Compute/Amazon EC2 Auto Scaling.svg",
        });
        expect(icons[2].files["64-category"].rel).toBe("vr-and-ar/vr-ar-64-category.svg");
    });

    test("an unknown top folder throws", () =>
    {
        const dir = path.join(tree({ "AWS/Groups/Compute/X.svg": svg(64) }), "AWS");
        expect(() => collect("aws", dir, rules)).toThrow(/unexpected path/);
    });
});

describe("azure", () =>
{
    test("duplicates stay in every category, linked by alsoIn; non-square files size by the longer side", () =>
    {
        const dir = path.join(tree({
            "Azure/Monitor/Application Insights.svg": svg(18),
            "Azure/DevOps/Application Insights.svg": svg(18),
            "Azure/Web/App Space.svg": svg(18, 20),
        }), "Azure");
        const icons = collect("azure", dir, { aliases: {} });
        expect(icons.map((i) => [i.id, i.alsoIn])).toEqual([
            ["devops/application-insights", ["monitor"]],
            ["monitor/application-insights", ["devops"]],
            ["web/app-space", undefined],
        ]);
        expect(icons[2].files["20-color"].rel).toBe("web/app-space-20-color.svg");
        const written = icons.map((i) => ({
            ...i, files: Object.fromEntries(Object.entries(i.files).map(([k, f]) => [k, f.rel])),
        }));
        expect(legacyMap(written))
            .toEqual({
                "Azure/DevOps/Application Insights.svg": "devops/application-insights-18-color.svg",
                "Azure/Monitor/Application Insights.svg": "monitor/application-insights-18-color.svg",
                "Azure/Web/App Space.svg": "web/app-space-20-color.svg",
            });
    });

    test("two source files mapping to one path throws", () =>
    {
        const files = { "Azure/Web/App-Space.svg": svg(18), "Azure/Web/App Space.svg": svg(18) };
        const dir = path.join(tree(files), "Azure");
        expect(() => collect("azure", dir, { aliases: {} })).toThrow(/both map to web\/app-space/);
    });
});

describe("gcp", () =>
{
    const rules = {
        rules: [
            { category: "databases", pattern: "\\b(sql|spanner)\\b" },
            { category: "storage", pattern: "\\bstorage\\b" },
        ],
        overrides: {},
    };

    test("rules categorise by name; no match is general", () =>
    {
        const dir = path.join(tree({
            "GCP/Cloud SQL/Cloud SQL.svg": svg(24),
            "GCP/Cloud Storage/Cloud Storage.svg": svg(24),
            "GCP/Other/Other.svg": svg(24),
        }), "GCP");
        expect(collect("gcp", dir, rules).map((i) => i.id))
            .toEqual(["databases/cloud-sql", "general/other", "storage/cloud-storage"]);
    });

    test("an override naming an unknown category throws", () =>
    {
        const dir = path.join(tree({ "GCP/Other/Other.svg": svg(24) }), "GCP");
        expect(() => collect("gcp", dir, { ...rules, overrides: { other: "nope" } })).toThrow(/nope/);
    });
});
