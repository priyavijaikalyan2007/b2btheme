<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: instructions
File GUID: ac1f4467-68fc-4137-a805-1f47b737a128
Created: 2026
-->

# Security Guidelines for Coding Agents

**Goal:** Correct the inherent bias of LLMs towards generating insecure "happy path" code. All generated code must be secure-by-design, assuming a hostile environment.

## 1. Universal Principles
*   **Zero Trust:** Never trust input from the client, database, or internal APIs. Validate at every boundary.
*   **Least Privilege:** Grants only the absolute minimum permissions required (IAM roles, Database users, CORS policies).
*   **Defense in Depth:** If one control fails (e.g., frontend validation), another must exist (backend validation).

## 2. Backend Security (ASP.NET Core)
*   **Authentication & Authorization:**
    *   **Do:** Use standard Identity libraries (ASP.NET Core Identity).
    *   **Do:** Enforce HTTPS via `app.UseHttpsRedirection()` and `app.UseHsts()`.
    *   **Do:** Use `[Authorize]` attributes on *all* controllers by default; use `[AllowAnonymous]` explicitly and sparingly.
*   **Security Headers:**
    *   **Instruction:** Configure middleware to send `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strictly configured CSP headers.
*   **Mass Assignment:**
    *   **Don't:** Bind API inputs directly to Entity Framework models.
    *   **Do:** Use specific DTOs (Data Transfer Objects) for all API endpoints to prevent over-posting attacks.
*   **Deserialization:**
    *   **Critical:** Never use `BinaryFormatter`.
    *   **Do:** Use `System.Text.Json` or `Newtonsoft.Json` with `TypeNameHandling.None`.

## 3. Database Security (Entity Framework Core)
*   **SQL Injection:**
    *   **Safe:** LINQ queries (`context.Users.Where(u => u.Name == input)`) are safe by default.
    *   **Risky:** `FromSqlRaw`. If used, **MUST** use parameterized SQL: `FromSqlRaw("SELECT * FROM Users WHERE Name = {0}", input)`.
    *   **Forbidden:** String interpolation inside `FromSqlRaw`: `$"SELECT * FROM ... {input}"`.
*   **Information Leakage:**
    *   **Do:** Use `.Select()` to return only necessary fields. Avoiding `Select *` (or returning full entities) prevents leaking hashed passwords or internal metadata.

## 4. Frontend Security (TypeScript/React)
*   **XSS (Cross-Site Scripting):**
    *   **React:** By default, `{variable}` is escaped.
    *   **Danger:** `dangerouslySetInnerHTML`. **Forbidden** without an explicit user request and usage of `DOMPurify` to sanitize the input first.
*   **Content Security Policy (CSP):**
    *   **Instruction:** Generate a CSP meta tag or header that restricts `script-src` to `'self'` and trusted domains. Avoid `'unsafe-inline'` and `'unsafe-eval'`.
*   **Prototype Pollution:**
    *   **Do:** When merging objects, checking for `__proto__`, `constructor`, and `prototype` keys.
    *   **Do:** Use `Object.create(null)` for simple key-value maps to avoid prototype inheritance issues.
*   **Dependencies:**
    *   **Instruction:** When adding npm packages, prefer those with high maintenance scores.

## 5. Cloud & Infrastructure (Terraform/Cloud)
*   **Secrets Management:**
    *   **Forbidden:** Hardcoding API keys, passwords, or tokens in Terraform/code.
    *   **Do:** Use `AWS Secrets Manager`, `Azure Key Vault`, or environment variables.
*   **SSRF (Server-Side Request Forgery):**
    *   **Risk:** Applications that fetch URLs provided by users (e.g., "Import from URL").
    *   **Mitigation:** Validate the URL schema (http/https only). Block calls to private IP ranges (10.x, 192.168.x, 127.0.0.1) and cloud metadata services (169.254.169.254).
*   **Storage:**
    *   **Do:** Ensure S3 buckets/Azure Blobs are **private** by default. Enable encryption at rest.

## 6. Language-Specific Pitfalls
*   **Python:**
    *   **Critical:** Never use `pickle` for untrusted data. Use `json` or `PyYAML` with `safe_load()`.
    *   **Dependency:** Pin dependencies with hashes to prevent supply chain attacks.
*   **Java:**
    *   **XML:** Disable DTD processing to prevent XXE (XML External Entity) attacks.
    *   **Serialization:** Avoid Java Serialization API; use JSON.
*   **Go:**
    *   **Concurrency:** Use `mutex` to prevent race conditions on shared maps/slices.
    *   **Input:** Check for `nil` pointers on all external inputs.

## 7. Agent Checklist
Before outputting code, the agent MUST verify:
1.  [ ] Are all SQL/Database calls parameterized?
2.  [ ] Is user input sanitized/validated before use?
3.  [ ] Are secrets removed from code and moved to config/env vars?
4.  [ ] Is auth checked on every sensitive endpoint?
5.  [ ] Is the CSP strict enough?
6.  [ ] Are known dangerous functions (`eval`, `pickle`, `system()`) avoided?

## (CRITICAL) Dynamic UI — Scene Documents Are Untrusted Input

A `CanvasDocument` describes which components to mount, how to wire them, and
what to feed them. In a dynamic UI it is authored by a language model from a
user's utterance, which makes it **untrusted input in the strongest sense**:
attacker-influenced content that directly drives code paths.

The layer is designed so that a hostile or hallucinated document cannot do
anything interesting. Each rule below is load-bearing; do not relax one without
replacing the property it provides.

### Allowlist-only component resolution (ADR-143)

`lookupFactory()` reads **exactly one property** off the global scope — the
factory named by a *registered* manifest — and never enumerates or searches it.
An unregistered component name yields a literate error and never triggers a
lookup, however closely it resembles a real global.

ADR-134's `resolveFactoryName()` window-scan fallback is acceptable for
developer-authored form definitions and is **not** acceptable here: scanning
turns an untrusted string into arbitrary global invocation. Never reintroduce a
scan on a path reachable from a document.

### Documents carry data, never code

- The model emits JSON. It never emits markup, CSS, or JavaScript, so `eval`,
  `innerHTML`, and dynamic script loading are outside the threat model.
- Transforms are **registry-named**. A binding may reference `"tableColumns"`;
  it can never carry an expression. An unregistered name fails validation.
- Every label rendered by the canvas goes through `textContent`.

### Bounded by construction

| Vector | Mitigation |
|---|---|
| Unbounded component spawning | `fanout` capped by `FANOUT_CEILING` |
| Wiring loop pinning the CPU | Cycles rejected at validation, plus a per-pass visited set at runtime |
| Identifier smuggling | Control characters rejected in node ids and channel names |
| Memory exhaustion | Mount cap and weight budget with LRU demotion |
| Stale private data on restore | `dataMode: "live"` stores no rows; `"frozen"` is explicit and opt-in |

### Permission hints are not a boundary

`CanvasNode.grants` exists so the canvas can render a disabled action without a
round-trip. It is a **UX affordance only**.

- The backend MUST filter non-viewable data before it reaches a document.
- The backend MUST re-authorise every action regardless of `grants`.
- Any implementation treating `grants` as authoritative is a defect.

### Validate before mounting

`fold()` is deliberately total and never validates, so a corrupted patch log
folds into a plausible-looking document. `LifecycleManager.sync()` validates the
document *and* resolves every component against the allowlist **before** any
mount, and a rejected document leaves the canvas untouched. Do not add a mount
path that bypasses it.

