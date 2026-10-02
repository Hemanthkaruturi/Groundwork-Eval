# Markdown to PDF

A local web app. Paste or upload Markdown, see a live preview, download a PDF that matches it.

## Run
```
npm install
npm start          # http://localhost:3000  (set PORT to change)
npm test
```
Tested on Node 24. `npm install` downloads Chromium for the PDF step.

## Use
1. Type or paste Markdown, or upload a `.md` / `.markdown` file.
2. Pick a theme (Clean document, GitHub, Dark, Minimal print) and page options (paper size, orientation, margins, page numbers).
3. Click **Download PDF**. Broken images or invalid diagrams still export, with a warning.

Supports tables, task lists, code highlighting, LaTeX math (`$x^2$`), Mermaid diagrams, and images from web URLs or embedded base64. Input is limited to about 1 MB. Your text and settings are kept in this browser only.

## Safety
Math and Mermaid run scripts in the PDF renderer, so **do not paste Markdown you do not trust**. The server only accepts connections from this machine and stores nothing.
