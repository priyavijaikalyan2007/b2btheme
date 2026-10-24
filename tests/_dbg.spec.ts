import { test } from "@playwright/test";
test("dbg", async ({ page }) =>
{
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/demo/full-demo.html", { waitUntil: "load" });
    await page.waitForTimeout(350);
    console.log(await page.evaluate(() =>
    {
        const pres = Array.from(document.querySelectorAll("pre"))
            .filter((p) => getComputedStyle(p).opacity !== "1");
        return pres.map((p) =>
        {
            const anc = p.closest("[disabled], [aria-disabled], .disabled, fieldset");
            return `pre class="${p.className}" opacity=${getComputedStyle(p).opacity}\n`
                + `  outer=${p.outerHTML.slice(0, 120)}\n`
                + `  parent=${p.parentElement?.outerHTML.slice(0, 160)}\n`
                + `  disabledAncestor=${anc ? anc.tagName + "." + anc.className : "none"}`;
        }).join("\n");
    }));
});
