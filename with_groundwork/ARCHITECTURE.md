# with_groundwork — Architecture

> High-level technical truth. Names used here are the names used everywhere else — do not
> invent parallel vocabulary. Update in the same change as the thing it describes.

## Overview
One Node server serves a single-page web UI and a PDF export endpoint. The browser shows a live preview. On export, the server renders the same HTML in headless Chromium and returns a PDF.

```
Browser (editor + preview) --POST markdown--> Node server --HTML--> headless Chromium --> PDF --> download
```

## Components and repositories
| Component | Responsibility | Tech | Owner |
| --- | --- | --- | --- |
| Web UI | Paste/upload Markdown, live preview, download button (`public/`) | Plain HTML/CSS/JS | Hemanth |
| Server | Serves the UI and libraries; checks input; `POST /api/pdf` returns the PDF (`server/`) | Node.js, Express | Hemanth |
| Renderer | `public/render.js`: Markdown to themed HTML, shared by preview and PDF | Browser JS | Hemanth |
| PDF step | Opens `/print.html` in headless Chromium, prints to PDF | Puppeteer | Hemanth |

## Data flow
1. User pastes text or picks a `.md` file (read in the browser).
2. The preview and the PDF use the same `render.js` and the same theme stylesheets, so they match.
3. "Download PDF" sends the Markdown to the server; the server returns the PDF. Nothing is stored.

## Tech stack and tools
Node.js, Express, Puppeteer (bundled Chromium). Math (LaTeX), Mermaid diagrams and code highlighting run in the page. Four theme stylesheets. Page options (paper size, orientation, margins, page numbers) are passed to the PDF step. The browser keeps the user's text and settings in local storage. Libraries: Express, Puppeteer, markdown-it (+ task lists, texmath), highlight.js (browser bundle), KaTeX, Mermaid; tests use the Node test runner, pdf-lib and pdfjs-dist. Decided by RFC-0001; details in specs/001-markdown-to-pdf/plan.md.

## Deployment and environments
Local only. Run on the developer's machine. No pipeline, no hosting.

## Boundaries and contracts
One boundary: the browser calls the server's export endpoint with Markdown and receives a PDF. The exact shape is written in the spec.

## Cross-cutting concerns
- No auth, no database, no stored user content.
- Markdown may run scripts in the server's Chromium (math and Mermaid need it). The accepted risk is that untrusted pasted Markdown can run script locally; the server therefore listens on localhost only.
- Input is limited to about 1 MB.

## Local development
`npm install`, `npm start`, `npm test`; details in AGENTS.md and README.md.
