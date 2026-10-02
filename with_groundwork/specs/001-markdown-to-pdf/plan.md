---
id: 001-markdown-to-pdf
spec: spec.md
spec_version: 619a00843510edb2c4da05b8346ddf28777d8194304b6a99a6abdb8bc7bfa958
created: 2026-10-02
---

# Plan: Markdown To Pdf

<!-- HOW. Cite the spec's requirement ids (FR-n, NFR-n) for every decision. -->

## 1. Approach
- **One render path (FR-8, Constitution principle 2).** A single browser module, `render.js`, turns Markdown into themed HTML (markdown-it, highlight.js, KaTeX, Mermaid). The editor page uses it for the preview (FR-2). The server opens its own `/print` page in headless Chromium (Puppeteer), which loads the same `render.js` and the same theme CSS, then prints to PDF. No second renderer exists.
- **Plain Node, no front-end framework.** Node 24, Express, plain HTML/CSS/JS. Libraries are served from `node_modules` under `/vendor`, so the app works offline except for web images (FR-5).
- **Export flow (FR-8, FR-9).** The browser POSTs `{markdown, theme, page}` to `/api/pdf`. The server loads `/print`, injects the data, waits for rendering to finish, calls `page.pdf()`, and returns the PDF. Warnings (broken images, bad diagrams) come back in a response header; the browser shows them and saves the file under the computed name.
- **Localhost only (FR-11).** The server binds `127.0.0.1` and rejects requests whose `Host` header is not `localhost` or `127.0.0.1` (blocks DNS-rebinding from web pages).
- **Nothing stored (NFR-2, FR-10).** No file writes, no request-body logging. The browser keeps text, theme and page options in local storage.

## 2. Affected modules and files
| File | Purpose | Covers |
| --- | --- | --- |
| `package.json` | Dependencies, `start` and `test` scripts | all |
| `server/index.js` | Express app: static files, `/vendor`, `/api/pdf`, Host check, 1 MB limit | FR-8, FR-11, NFR-1, NFR-2 |
| `server/pdf.js` | Shared Chromium instance; open `/print`, wait, print to PDF, collect warnings | FR-8, FR-7 |
| `public/render.js` | `renderMarkdown(text, theme)` → HTML in a container; collects warnings; sets `window.__renderDone` | FR-3, FR-4, FR-5, FR-6 |
| `public/print.html` | Print-only page that calls `render.js` with injected data | FR-8 |
| `public/index.html`, `public/app.js` | Editor, upload, theme and page controls, live preview, download button, warning display | FR-1, FR-2, FR-6, FR-7, FR-9, FR-10, NFR-3, NFR-4 |
| `public/themes/{clean,github,dark,print}.css` | The four themes; shared `base.css` | FR-6 |
| `test/` | Automated tests (see section 6) | all |

## 3. Data model and migrations
None on the server. Browser local storage holds one JSON entry: `{markdown, theme, page}` (FR-10). Invalid or missing data falls back to defaults.

## 4. Interfaces and contracts
`POST /api/pdf` (JSON, internal, same origin only):
- **Request:** `{ "markdown": string, "theme": "clean|github|dark|print", "page": { "size": "A4|Letter|Legal|A3", "orientation": "portrait|landscape", "margins": "narrow|normal|wide", "pageNumbers": boolean } }`
- **200:** `application/pdf` body; header `X-Render-Warnings` holds a URL-encoded JSON array of messages.
- **400:** invalid fields. **413:** body over 1 MB. **500:** render failed. Errors are JSON `{ "error": string }` and never echo the Markdown.

Margins: narrow 10 mm, normal 20 mm, wide 30 mm (FR-7). Page numbers are a footer "n / total", drawn by the print step (FR-7). `printBackground` is on so the Dark theme prints (FR-6).

`render.js` replaces a failed image or Mermaid block with a visible placeholder and records a warning (spec section 7, FR-4, FR-5).

## 5. Failure modes and edge cases
- **Over 1 MB (NFR-1):** the browser blocks export with a message before sending; the server also returns 413.
- **Empty or whitespace-only input (AC-12, FR-8):** the browser shows "Nothing to export" and sends nothing; the server also answers 400 as a backstop.
- **Broken image / bad Mermaid (FR-4, FR-5):** placeholder plus warning; export succeeds.
- **Slow remote image:** Chromium waits at most 10 seconds for images and diagrams, then continues and warns. [Plan decision, not in spec.]
- **Chromium fails to start or crashes (spec section 7):** 500 with a message; the next request relaunches Chromium; the text stays in the editor.
- **Wrong upload type (FR-1):** error shown, editor unchanged. Checked by file extension.
- **Local storage blocked or corrupt (FR-10):** app starts with defaults.
- **Concurrent exports:** each uses its own page in the shared browser and is closed afterwards.
- **Hostile input:** scripts in Markdown run in the local Chromium by design (RFC-0001, accepted risk); the server stays on localhost with a Host check.

## 6. Test strategy
Tools: Node's built-in test runner; Puppeteer for page tests; `pdf-lib` and `pdfjs-dist` to read PDFs.
- **Unit (`render.js` in a Puppeteer page):** AC-3, AC-4, AC-5 and the broken-image/diagram cases.
- **API tests (start the server, call `/api/pdf`):** AC-7 (page size, orientation, page count/numbers), AC-6 (theme colours in the PDF), AC-10 (non-local Host refused, bound to 127.0.0.1), AC-11 (413), NFR-2 (no files written).
- **UI tests (Puppeteer on the editor page):** AC-1, AC-2, AC-8, AC-9, wrong file type, NFR-3 (labels exist; Tab reaches every control).
- **Manual:** spec section 8, once at the end. Also a visual comparison of preview and PDF for each theme, which automated tests cannot judge.

## 7. Rollout and rollback
Local only. Run with `npm start`. Rollback is `git revert`. No data to migrate. Add the real commands to AGENTS.md and the stack to ARCHITECTURE.md when built.

## 8. Constitution check
- Spec before code: spec approved first.
- One render path: `render.js` and theme CSS are used by both preview and PDF.
- Keep it small: no feature outside the approved spec; no framework, no database.
- Server stores and logs no content; listens on localhost only; the script guardrail was amended by RFC-0001.
