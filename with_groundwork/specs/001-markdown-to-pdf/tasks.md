---
id: 001-markdown-to-pdf
spec: spec.md
spec_version: 619a00843510edb2c4da05b8346ddf28777d8194304b6a99a6abdb8bc7bfa958
plan: plan.md
created: 2026-10-02
---

# Tasks: Markdown To Pdf

> One task = one reviewable change, ordered so the suite stays green after each.
> `[P]` marks tasks on disjoint files. Legend: `[ ]` not started · `[~]` in progress · `[x]` done.
> Mark a task `[x]` only after its "done when" is verified.

- [x] **T001** — Project setup: `package.json` (Node, Express, Puppeteer, markdown-it and plugins, highlight.js, KaTeX, Mermaid, pdf-lib, pdfjs-dist), lockfile, `.gitignore`, `npm start` and `npm test` scripts, minimal server that listens on 127.0.0.1 and serves `public/`
  - **Files:** `package.json`, `package-lock.json`, `.gitignore`, `server/index.js`, `public/index.html` (placeholder)
  - **Done when:** `npm install` succeeds; `npm start` serves the page on localhost; `npm test` runs and passes with one smoke test
  - **Covers:** FR-11

- [x] **T002** — Server guards: Host check (only localhost / 127.0.0.1), 1 MB body limit returning 413, no body logging; tests for each
  - **Files:** `server/index.js`, `test/guards.test.js`
  - **Done when:** tests show a foreign Host is refused (AC-10), a >1 MB body gets 413 (AC-11), and the server is bound to 127.0.0.1
  - **Covers:** FR-11, NFR-1, NFR-2

- [x] **T003** — Shared renderer `render.js`: Markdown to HTML with GitHub-style features, task lists, tables, highlighted code; test page in Puppeteer
  - **Files:** `public/render.js`, `public/base.css`, `test/render.test.js`
  - **Done when:** tests for AC-3 pass (table, task list, coloured code block)
  - **Covers:** FR-3, FR-4

- [x] **T004** — Math and Mermaid in the renderer, served from `/vendor`; failed diagrams show a placeholder and record a warning
  - **Files:** `public/render.js`, `server/index.js` (vendor routes), `test/render.test.js`
  - **Done when:** AC-4 render tests pass for a formula and a diagram; a bad Mermaid block gives a placeholder and one warning
  - **Covers:** FR-4

- [x] **T005** — Images: web URL and base64 load; broken image becomes a placeholder with a warning; 10-second wait limit
  - **Files:** `public/render.js`, `test/render.test.js`
  - **Done when:** AC-5 passes; a broken URL yields a placeholder and a warning without throwing
  - **Covers:** FR-5

- [x] **T006** [P] — Four themes (Clean document default, GitHub, Dark, Minimal print) as CSS applied by the renderer
  - **Files:** `public/themes/clean.css`, `github.css`, `dark.css`, `print.css`, `test/themes.test.js`
  - **Done when:** test shows each theme changes the page's colours/fonts as expected; default is Clean document
  - **Covers:** FR-6

- [x] **T007** — PDF export: `server/pdf.js`, `public/print.html`, `POST /api/pdf` with validation, page size/orientation/margins/page numbers, `printBackground`, warnings header, 500 on failure
  - **Files:** `server/pdf.js`, `server/index.js`, `public/print.html`, `test/pdf.test.js`
  - **Done when:** AC-6 (theme in PDF) and AC-7 (Letter, landscape, wide margins, no numbers; and A4 with numbers) pass; invalid input gets 400; Chromium failure gives 500 and the next request works
  - **Covers:** FR-7, FR-8, FR-6

- [x] **T008** — Editor page: text area, `.md`/`.markdown` upload with error on other types, live preview (debounced), theme and page controls, labels and keyboard order
  - **Files:** `public/index.html`, `public/app.js`, `public/app.css`, `test/ui.test.js`
  - **Done when:** AC-1, AC-2, wrong-file-type check and NFR-3 (labels, Tab order) pass; narrow window stacks editor above preview
  - **Covers:** FR-1, FR-2, FR-6, FR-7, NFR-3, NFR-4

- [x] **T009** — Download, file name and warnings: Download PDF button calls the API, shows warnings, blocks over-1 MB input, names the file from upload name, first heading, or `document.pdf`
  - **Files:** `public/app.js`, `test/ui.test.js`
  - **Done when:** AC-8, AC-12 (empty input shows "Nothing to export", no request sent) and the client side of AC-11 pass; a broken image shows a warning and the file still downloads
  - **Covers:** FR-8, FR-9, NFR-1

- [x] **T010** — Remember text, theme and page options in local storage; safe fallback if blocked or corrupt
  - **Files:** `public/app.js`, `test/ui.test.js`
  - **Done when:** AC-9 passes; corrupt stored data gives defaults without errors
  - **Covers:** FR-10

- [x] **T011** — No-writes check and docs: test that exporting writes no files; README with run steps and the untrusted-Markdown warning; update AGENTS.md commands and ARCHITECTURE.md
  - **Files:** `test/nowrite.test.js`, `README.md`, `AGENTS.md`, `ARCHITECTURE.md`
  - **Done when:** no-writes test passes; AGENTS.md lists verified setup, run and test commands
  - **Covers:** NFR-2

## Verification
- [x] **T900** — full check/test command passes
- [x] **T901** — every FR in the spec maps to at least one completed task
- [ ] **T902** — the spec's manual-test section was run by hand and matches
- [x] **T903** — foundation docs (ARCHITECTURE/AGENTS/CONTRACTS/PROJECT) updated or explicitly unchanged; `groundwork.py fresh` is clean
