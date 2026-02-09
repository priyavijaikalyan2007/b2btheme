<!-- AGENT: Human-centric error handling guidelines for constructing literate error messages in components. -->

# Literate Errors: Guidelines for Human-Centric Error Handling

This document establishes the standard for how error messages are constructed in this component library. The goal is to move away from "computer-centric" errors (stack traces, obscure codes) towards "human-centric" literate errors that empower users to understand and resolve issues.

This is particularly relevant for the **ErrorDialog** component (see `specs/ERROR_DIALOG_COMPONENT.md`), but the principles apply to any component that communicates errors to users.

---

## 1. The Core Philosophy

An error is a conversation between the system and the user. It should answer three questions:
1. **What happened?** (in plain language)
2. **Why did it happen?** (contextualised to the user's action)
3. **What can I do about it?** (actionable advice)

Technical details (stack traces, error codes) must be preserved but strictly separated from the user-facing narrative.

---

## 2. Structure of a Literate Error

Every error displayed by a component must be structured to contain two distinct layers:

### Layer A: The User Facet (Human Readable)

This layer is for the end-user. It must be safe to display in the UI.

- **Title:** A short, non-alarming summary (e.g., "Unable to Save Document" vs "WriteFaultException").
- **Narrative:** A full sentence explaining the situation without jargon.
    - *Bad:* "Connection refused on port 443."
    - *Good:* "We couldn't connect to the secure server to upload your file."
- **Actionable Advice:** Steps the user can take to fix the problem.
    - *Examples:* "Please check your internet connection," "Try reducing the file size below 5MB," "Contact your team admin to request edit permissions."

### Layer B: The Technical Facet (Machine Readable)

This layer is for developers and support staff. It is hidden by default in the UI (collapsed/accordion).

- **Error Code:** A unique, searchable string constant for this specific error type (e.g., `DOC_SAVE_WRITE_LOCK`, `AUTH_TOKEN_EXPIRED`).
- **Correlation ID:** A UUID linking this error to backend logs (if available from the API response).
- **Timestamp:** UTC timestamp of occurrence.
- **Technical Detail:** The raw error message or stack trace.
- **Context Data:** Key-value pairs of relevant state (e.g., `ResourceId: 123`, `AttemptCount: 3`).

---

## 3. Writing Guidelines for Agents

When constructing error objects or rendering error components, follow these rules:

1. **No "Computer-Speak" in User Messages:**
    - Avoid words like: *Exception, Null, Undefined, Array, Index, String, Buffer, Stack.*
    - Use words like: *Item, Missing, Not Found, Text, List, Limit.*

2. **Be Specific, Not Generic:**
    - *Bad:* "An error occurred."
    - *Good:* "We couldn't calculate the total because the tax rate for this region is missing."

3. **Blameless Tone:**
    - Do not accuse the user.
    - *Bad:* "You entered invalid data."
    - *Good:* "The date format wasn't recognised. Please use YYYY-MM-DD."

4. **Downstream Errors:**
    - If a backend API returns a raw error, **wrap** it with a human-readable message.
    - *Scenario:* API returns `500 Internal Server Error`.
    - *User Message:* "The system is currently unable to process this request. Please try again in a moment."
    - *Technical Detail:* The raw API response, status code, and request URL.

---

## 4. TypeScript Error Interface

Components in this library should use a structured error interface:

```typescript
/**
 * A literate error object containing both user-facing and technical information.
 */
interface LiterateError
{
    /** Short, non-alarming summary for the user. */
    title: string;

    /** Full sentence explaining the situation in plain language. */
    message: string;

    /** Actionable advice the user can follow to resolve the issue. */
    suggestion?: string;

    /** Unique, searchable error code for this specific error type. */
    errorCode?: string;

    /** UUID linking this error to backend logs. */
    correlationId?: string;

    /** UTC timestamp of when the error occurred. */
    timestamp?: string;

    /** Raw technical details (stack trace, API response, etc.). */
    technicalDetail?: string;

    /** Key-value pairs of relevant system state. */
    context?: Record<string, string>;
}
```

### Usage Example

```typescript
const error: LiterateError = {
    title: "Document Could Not Be Saved",
    message: "The server rejected the save request because the document is locked by another user.",
    suggestion: "Please wait for them to finish editing, or ask them to close the document.",
    errorCode: "DOC_WRITE_LOCK_COLLISION",
    correlationId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    timestamp: new Date().toISOString(),
    technicalDetail: "PUT /api/documents/42 returned 409 Conflict",
    context: {
        documentId: "42",
        lockingUser: "jane.doe"
    }
};

showErrorDialog("dialog-container", error);
```

---

## 5. JSON Structure (API Responses)

When components consume error responses from APIs, they should expect and handle this structure (extending RFC 7807 Problem Details):

```json
{
    "type": "https://docs.api.com/errors/DOC_LOCK",
    "title": "Document is Locked",
    "status": 409,
    "detail": "This document is currently being edited by another user and cannot be saved right now.",
    "suggestion": "Please wait for them to finish or ask them to close the document.",
    "technical": {
        "code": "DOC_WRITE_LOCK_COLLISION",
        "correlationId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "timestamp": "2023-10-27T10:00:00Z"
    }
}
```

Components should map this structure to the `LiterateError` interface for rendering.

---

## 6. ErrorDialog Component Integration

The ErrorDialog component (specified in `specs/ERROR_DIALOG_COMPONENT.md`) is the primary consumer of literate errors in this library. It renders:

- The **title** in the modal header with an appropriate icon.
- The **message** in the modal body as the primary content.
- The **suggestion** in a highlighted callout below the message.
- The **technical detail** in a collapsible accordion section, hidden by default.
- The **error code** and **correlation ID** in the technical section for support reference.

See the component specification for the full HTML structure and styling requirements.
