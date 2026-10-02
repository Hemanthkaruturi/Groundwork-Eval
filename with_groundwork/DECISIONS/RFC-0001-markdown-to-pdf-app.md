---
id: RFC-0001
title: Markdown To Pdf App
status: approved
classification: internal
signoffs_required: 1
requested_by: Hemanth
request_source: direct request in a Claude Code session on 2026-10-02
owner: karuturihemanth@gmail.com
supersedes: []
related_rfcs: []
author: karuturihemanth@gmail.com
created: 2026-10-02
approved_by: [karuturihemanth@gmail.com]
---

# RFC-0001 — Markdown To Pdf App

<!-- An RFC records a decision. Classification: `internal` (one repo) or `api` (crosses a repo
boundary — set signoffs_required to the number of leads it touches). Every section is
filled from the interview with the user; anything not yet answered is an unresolved marker. -->

## 1. Summary
Build a local web app that converts Markdown to PDF. The user pastes Markdown or uploads a `.md` file, sees a live preview in one of four themes, sets page options, and downloads a PDF that matches the preview. Math, Mermaid diagrams, code highlighting and images are supported. To allow math and diagrams, the Constitution's "no scripts in the renderer" guardrail is amended.

## 2. The need
**User scenario:** Hemanth has Markdown notes or docs and wants a shareable PDF without extra tools or manual steps.
**Done means:** Paste or upload Markdown, see the preview, click Download, and get a PDF that looks like the preview, including tables, code, math, diagrams and images, in the chosen theme and page setup.

## 3. Interview record
<!-- Every question asked and the user's answer, verbatim in substance. This is the evidence
that the picture is clear. Group by theme. Effect is one of: Confirmed, Tension, Open decision,
Doc update, Out of scope. -->
| # | Question | Answer | Effect |
| --- | --- | --- | --- |
| 1 | Which Markdown features must render in the PDF? | GitHub-style basics, code highlighting, math (LaTeX), diagrams (Mermaid) | Confirmed |
| 2 | …but Mermaid and math need scripts or rendering in Chromium; the Constitution says Markdown content never executes scripts in the renderer | Not yet decided | Tension |
| 3 | Page setup | Full options: size, orientation, margins, page numbers | Confirmed |
| 4 | Look | Choice of themes (which themes: not yet asked) | Confirmed |
| 5 | Images | Web URLs and embedded base64 | Confirmed |
| 7 | Resolve the scripts tension (option offered: trusted bundled scripts only) | User chose: amend the rule to allow scripts, because the app is local-only. Risk: a pasted untrusted document could run script in the local Chromium and fetch URLs | Tension (resolved by amending; risk stays visible in §6) |
| 8 | Which themes? | Clean document, GitHub, Dark, Minimal print | Confirmed |
| 9 | Broken image URL or diagram syntax error | Export anyway; show a visible placeholder and a warning message | Confirmed |
| 10 | Relationship and requester | Independent (no existing specs). Requested and owned by Hemanth | Confirmed |
| 11 | CONSTITUTION.md guardrail "Markdown content never executes scripts in the PDF renderer" must be amended (Constitution amendment) | Follows from #7 | Doc update |
| 12 | Exact wording of the amended rule | Scripts allowed in the renderer; the server stays on localhost only | Confirmed |
| 13 | Page options | Paper size, orientation, margins, page numbers | Confirmed |
| 14 | Largest input | About 1 MB (about 100 pages); larger is rejected with a clear message | Confirmed |
| 15 | Download file name | From uploaded file name, else first heading, else document.pdf | Confirmed |
| 16 | Remember text and settings? | Yes, in the browser's local storage only | Confirmed (Doc update: Constitution "no content stored" means server-side) |
| 17 | Preview updates | Live, shortly after typing stops | Confirmed |
| 18 | Preview pagination | Continuous scroll; page breaks only in the PDF | Confirmed |
| 19 | Devices | Desktop Chrome and Firefox; stacked layout on narrow windows | Confirmed |
| 6 | PROJECT.md says "headings, lists, tables, code blocks" only; scope is now larger | PROJECT.md in-scope list must grow | Doc update |

### Read-back
<!-- Written at the end of the interview and confirmed by the user. -->
- **Confirmed:** Local app, desktop Chrome/Firefox. Paste or upload Markdown (about 1 MB max), live preview, four themes, page options (size, orientation, margins, page numbers), GitHub-style Markdown plus code highlighting, math and Mermaid, web and embedded images. Broken images or diagrams still export with a warning. File name from upload name or first heading. Text and settings remembered in the browser only. Independent feature, requested and owned by Hemanth.
- **Tensions:** Mermaid and math need scripts in the renderer; the user chose to amend the Constitution to allow scripts (server stays on localhost). Risk: pasting untrusted Markdown can run script locally.
- **Open decisions:** None.
- **Docs to update after approval:** PROJECT.md (larger in-scope list); CONSTITUTION.md (script guardrail amended; "no stored content" means server side); ARCHITECTURE.md (libraries, page options, browser storage).

## 4. Proposal
A Node server serves one web page and one export endpoint. The page has an editor (paste or upload), a live preview, a theme picker and page options (paper size, orientation, margins, page numbers). One shared Markdown-to-HTML step and one stylesheet per theme feed both the preview and the PDF. On export the browser sends the Markdown and settings; the server renders the page in headless Chromium and returns the PDF. Broken images or diagrams export with a visible placeholder and a warning. Input above about 1 MB is rejected with a clear message. Text and settings are remembered in the browser's local storage only. The server listens on localhost only and stores nothing.

## 5. Alternatives considered
- **PDF in the browser only (no server):** simpler to host, but less control over page options and layout. Rejected earlier by the user's stack choice.
- **Python with WeasyPrint:** easier install, but no JavaScript, so Mermaid and math would not work. Rejected.
- **Drop Mermaid to avoid scripts:** safer, but the user wants diagrams. Rejected; the guardrail is amended instead.

## 6. Risks and objections
- **Scripts in pasted Markdown:** the user chose to allow scripts because the app is local-only. A pasted untrusted document could run script in the local Chromium and request URLs. Mitigation: localhost-only server, and a README note to avoid untrusted Markdown. This risk is accepted by the user.
- **Preview and PDF drift:** mitigated by one shared render path and a hand check of the PDF against the preview.
- **Size and speed:** large input or many diagrams can be slow; the 1 MB limit bounds it.

## 7. Impact
**Repos touched:** `with_groundwork` only. Independent feature: it extends, amends and depends on nothing.
**Constitution check:** Spec-before-code: followed. Shared render path: complies. Keep it small: this RFC is the required approval for the larger scope. Guardrail "Markdown content never executes scripts in the PDF renderer" conflicts and is amended after approval. "No user content written to disk or logged" complies (browser local storage is client-side, not the server). Localhost-only guardrail: complies.
**Cost / performance / security notes:** Runs on the user's machine at no cost. Bundles Chromium (a large download). Export time depends on document size and diagrams.

## 8. Cross-repo contract (only if classification is `api`)
N/A, internal.

## 9. Out of scope
- User accounts, login, public hosting, upload quotas and abuse protection.
- Saving documents on a server.
- Paged preview (page breaks appear only in the PDF).
- Phone and tablet layouts.
- Local-file image paths.

## 10. Open questions
_None. (List any as unresolved markers; approval is blocked while any remain.)_
