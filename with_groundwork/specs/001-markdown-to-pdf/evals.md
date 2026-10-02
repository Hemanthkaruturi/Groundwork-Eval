---
id: 001-markdown-to-pdf
spec: spec.md
spec_version: 619a00843510edb2c4da05b8346ddf28777d8194304b6a99a6abdb8bc7bfa958
created: 2026-10-02
---

# Evaluations: Markdown To Pdf

<!-- How we will know it is right — written BEFORE the code. Expected inputs, edge cases, and
the unplanned ones (empty, huge, hostile, concurrent, repeated). Each row cites an AC/FR. -->

| ID | Scenario | Input | Expected | Covers | How checked |
| --- | --- | --- | --- | --- | --- |
| E1 | Live preview | Paste `# Hi` | Preview shows a heading within ~1 s of last keystroke | AC-1 | `test/ui.test.js` |
| E2 | Upload | `notes.md` and `a.markdown` | Text fills editor and preview | AC-2 | `test/ui.test.js` |
| E3 | GitHub features | Table, task list, fenced `js` code | All render; code has coloured spans | AC-3 | `test/render.test.js` |
| E4 | Math and diagram | `$x^2$` and a valid Mermaid block | Formula and SVG diagram in preview and in the PDF | AC-4 | `test/render.test.js`; PDF text check in `test/pdf.test.js` |
| E5 | Images | Web URL image and base64 image | Both load in preview and PDF | AC-5 | `test/render.test.js`; manual step 2 |
| E6 | Themes | Each of four themes | Preview and PDF use the theme (distinct background/font colours); default is Clean document | AC-6 | `test/themes.test.js`, `test/pdf.test.js` |
| E7 | Page options | Letter, landscape, wide margins, numbers off | PDF page size 612x792 pt rotated, no footer numbers | AC-7 | `test/pdf.test.js` (pdf-lib) |
| E8 | Page options default | No changes | A4 portrait, normal margins, "1 / N" footer | FR-7 | `test/pdf.test.js` |
| E9 | File name | Upload `notes.md`; paste `# Plan`; paste plain text | `notes.pdf`; `Plan.pdf`; `document.pdf` | AC-8 | `test/ui.test.js` |
| E10 | Restore | Enter text, pick theme and options, reload | All restored | AC-9 | `test/ui.test.js` |
| E11 | Local only | Request with `Host: evil.example`; check listen address | Refused; bound to 127.0.0.1 | AC-10 | `test/guards.test.js` |
| E12 | Too big | Body just over 1 MB | 413 from server; client shows message and sends nothing | AC-11 | `test/guards.test.js`, `test/ui.test.js` |
| E13 | Empty export | Empty and whitespace-only editor | "Nothing to export"; no PDF, no request | AC-12 | `test/ui.test.js` |
| E14 | Broken image | `![x](https://invalid.invalid/a.png)` | Placeholder in preview and PDF; warning shown; file downloads | FR-5, spec section 7 | `test/render.test.js`, `test/ui.test.js` |
| E15 | Bad Mermaid | Mermaid block with a syntax error | Placeholder and warning; rest of document intact; export works | FR-4, spec section 7 | `test/render.test.js` |
| E16 | Wrong upload type | `pic.png`, `notes.txt` | Error shown; editor unchanged | FR-1 | `test/ui.test.js` |
| E17 | Chromium failure | Kill Chromium, then export twice | First gives 500 with message, text kept; second succeeds | spec section 7 | `test/pdf.test.js` |
| E18 | Invalid API input | Unknown theme, size `B5`, missing markdown | 400 with `{error}`; Markdown not echoed | FR-7, FR-8 | `test/pdf.test.js` |
| E19 | Nothing stored | Export a document; compare files before/after | No new files; no body text in server output | NFR-2 | `test/nowrite.test.js` |
| E20 | Keyboard and labels | Tab through the page | Every control reachable, has a label | NFR-3 | `test/ui.test.js` |
| E21 | Narrow window | 700 px wide viewport | Editor stacked above preview | NFR-4 | `test/ui.test.js` |
| E22 | Concurrent exports | Three exports at once | Three valid PDFs, no cross-contamination | FR-8 | `test/pdf.test.js` |
| E23 | Corrupt local storage | Invalid JSON in saved entry | App starts with defaults, no error | FR-10 | `test/ui.test.js` |
| E24 | Preview matches PDF | Sample document, each theme | Human judges they look alike | FR-8 | Manual test steps 3-5 |

## Scenario catalogue (things real users will do that nobody wrote down)
- A heading with characters illegal in file names (`# a/b: c?`) — the download name must be made safe.
- A heading containing formatting (`# **Bold** title`) — the name uses plain text.
- Very long single line, or a table wider than the page — PDF must not crash; overflow handled by the theme.
- A document of exactly ~1 MB — accepted at the limit, rejected just over.
- Pressing Download twice quickly — two files or one disabled button, but no crash.
- Pasting HTML or a `<script>` tag — it runs locally by design (RFC-0001); the server stays up and nothing is stored.
- Unicode, emoji and right-to-left text — shown in the PDF, not as empty boxes.
- Math with a syntax error — placeholder and warning, like a bad diagram.
- Opening the app in a second tab — each tab restores the same saved text; last write wins.
