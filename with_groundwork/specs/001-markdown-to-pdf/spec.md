---
id: 001-markdown-to-pdf
rfc: RFC-0001
title: Markdown To Pdf
status: approved
created: 2026-10-02
author: karuturihemanth@gmail.com
requested_by: Hemanth
owner: karuturihemanth@gmail.com
implemented_by: []
support: []
extends: []
depends_on: []
builds_against: []
amends: []
approved_by: [karuturihemanth@gmail.com]
---

# Spec: Markdown To Pdf

<!-- Relations (front matter, NNN-slug or repo/NNN-slug): `depends_on` = must be implemented before this can be built;
`builds_against` = needs only the other spec approved and its plan finished (parallel build against an agreed contract);
`extends` = this adds to an existing feature — specify only the delta; `amends` = this changes an existing feature's behaviour: that spec
MUST get a dated line under its '## Changes' section naming this feature, and be re-approved. Leave all empty if independent.
WHAT and WHY only, in domain language. No class names, table schemas or library choices —
those belong in plan.md. Number every requirement so plans, tasks, evals and tests can cite
them. Every unknown is an unresolved marker; never guess. Keep it to about a page. -->

## 1. Problem
Turning Markdown notes into a shareable PDF needs extra tools or manual steps. This app does it in one page, locally, and the PDF looks like what the user saw. (RFC-0001)

## 2. Users and context
Hemanth, on their own machine, using desktop Chrome or Firefox. One user, no login. Input is trusted by the user; untrusted Markdown should not be pasted because math and diagrams run scripts.

## 3. User stories
- **US-1**: As a writer, I want to paste or upload Markdown and see a live preview so that I know what the PDF will look like.
- **US-2**: As a writer, I want to choose a theme and page options so that the PDF fits where I will share or print it.
- **US-3**: As a writer, I want to download the PDF in one click so that I can share it.

## 4. Functional requirements
- **FR-1**: The user MUST be able to enter Markdown by typing or pasting into a text area, or by uploading a `.md` or `.markdown` file that fills that text area.
- **FR-2**: The preview MUST update shortly after the user stops typing, as one continuous scroll.
- **FR-3**: The system MUST render GitHub-style Markdown: headings, lists, task lists, tables, links, images, blockquotes, strikethrough and fenced code.
- **FR-4**: Fenced code MUST be syntax-highlighted by language. LaTeX math and Mermaid diagrams MUST render in both preview and PDF.
- **FR-5**: Images MUST load from web URLs and from embedded (base64) data. Local-file paths are not supported.
- **FR-6**: The user MUST be able to pick one of four themes: Clean document, GitHub, Dark, Minimal print. The default is Clean document.
- **FR-7**: The user MUST be able to set paper size (A4, Letter, Legal, A3), orientation (portrait, landscape), margins (narrow, normal, wide) and page numbers (on, off). Defaults: A4, portrait, normal, on.
- **FR-8**: "Download PDF" MUST produce a PDF using the same rendering and theme as the preview, with the chosen page options.
- **FR-9**: The PDF file name MUST come from the uploaded file name; otherwise the first heading; otherwise `document.pdf`.
- **FR-10**: The text, theme and page options MUST be remembered in the browser's local storage and restored on the next visit. The server stores nothing.
- **FR-11**: The server MUST accept connections from the local machine only.

## 5. Non-functional requirements
- **NFR-1**: Input over about 1 MB MUST be rejected with a clear message before export.
- **NFR-2**: The server MUST NOT write user content to disk or logs.
- **NFR-3**: Controls MUST be labelled and usable by keyboard.
- **NFR-4**: Layout MUST work on desktop Chrome and Firefox; narrow windows stack editor above preview.

## 6. Acceptance criteria
- **AC-1**: Given an empty page, when the user pastes Markdown, then the preview shows the rendered result within about one second of the last keystroke. (FR-1, FR-2)
- **AC-2**: Given a `.md` file, when the user uploads it, then its text appears in the editor and preview. (FR-1)
- **AC-3**: Given Markdown with a table, a task list and a fenced code block, then all three render, and the code is coloured. (FR-3, FR-4)
- **AC-4**: Given a `$x^2$` formula and a Mermaid block, then both render as formula and diagram in preview and PDF. (FR-4)
- **AC-5**: Given a web image URL and a base64 image, then both appear in preview and PDF. (FR-5)
- **AC-6**: Given each of the four themes, when the user selects it, then preview and PDF both use it. (FR-6, FR-8)
- **AC-7**: Given Letter, landscape, wide margins and page numbers off, when exporting, then the PDF has those settings. (FR-7, FR-8)
- **AC-8**: Given an uploaded `notes.md`, then the download is `notes.pdf`; given pasted text starting `# Plan`, then `Plan.pdf`; given neither, `document.pdf`. (FR-9)
- **AC-9**: Given text and settings, when the page is reloaded, then they are restored. (FR-10)
- **AC-10**: Given the server running, when another machine tries to connect, then it is refused. (FR-11)
- **AC-11**: Given input over about 1 MB, then no PDF is made and a message explains the limit. (NFR-1)
- **AC-12**: Given an empty or whitespace-only editor, when the user clicks Download PDF, then no PDF is made and "Nothing to export" is shown. (FR-8)

## 7. Failure behaviour
- A broken image URL or invalid Mermaid block still exports. A visible placeholder marks the spot, and a warning message is shown. (FR-4, FR-5, FR-8)
- Oversized input is rejected with a message; the editor keeps the text.
- Empty or whitespace-only input is not exported; the user sees "Nothing to export" and no PDF is made. (FR-8)
- If PDF creation fails, the user sees an error message and can retry; the text is kept.
- Uploading any file other than `.md` or `.markdown` shows an error and changes nothing. (FR-1)

## 8. Manual test
1. Start the app (command in AGENTS.md once built) and open it in Chrome on this machine.
2. Paste Markdown with a heading, table, task list, fenced code, `$x^2$`, a Mermaid block and an image URL. Preview appears; all render.
3. Switch through the four themes; the preview changes each time.
4. Set Letter, landscape, wide margins, page numbers off; click Download PDF.
5. Open the PDF: it matches the preview and chosen settings. File name follows the first heading.
6. Upload a `notes.md`; download gives `notes.pdf`.
7. Add a broken image URL; export still works and a warning shows.
8. Reload the page; text and settings return.
9. From another machine, try the server address; the connection is refused.

## 9. Out of scope
Accounts, public hosting, quotas, saving on a server, paged preview, phone layouts, local-file image paths.

## 10. Constitution check
- Spec before code: this spec precedes any code.
- One rendering path: FR-8 requires preview and PDF to match.
- Keep it small: scope comes from RFC-0001.
- Server stores nothing (NFR-2) and listens locally only (FR-11); the script guardrail was amended by RFC-0001.

## Changes
- 2026-10-02: found while writing evals: the spec did not say what happens when the editor is empty. User chose to block the export with a message. Added a line to section 7 and AC-12.
