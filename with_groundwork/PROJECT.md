# with_groundwork — Project

> Business context, not technical detail. Written for a new teammate, a stakeholder, or an
> agent that needs to know *why* this exists. Technical shape lives in ARCHITECTURE.md.
> Never guess a fact here: ask the user.

## What this is
A small web app that turns Markdown into a PDF. The user pastes Markdown or uploads a `.md` file, sees a live preview, and downloads the PDF.

## Who it is for
Hemanth, for quick local use. The pain today: turning Markdown notes and docs into a shareable PDF needs extra tools or manual steps.

## Why now / what success looks like
The downloaded PDF looks like the on-screen preview, in one click. Headings, lists, tables and code blocks render correctly.

## Scope
**In scope:** paste Markdown; upload a `.md` file (about 1 MB max); live preview; four themes (Clean document, GitHub, Dark, Minimal print); page options (paper size, orientation, margins, page numbers); code highlighting, math and Mermaid diagrams; web and embedded images; download PDF; text and settings remembered in the browser; runs locally on desktop Chrome and Firefox.
**Explicitly out of scope:** user accounts and login; public hosting; abuse protection and upload quotas; saving documents on a server; paged preview; phone layouts; local-file image paths.

## Who works on what
| Person | Role | Owns / ask them about | Contact (email / chat handle) |
| --- | --- | --- | --- |
| Hemanth | Requester, owner, deployer, support | Everything | karuturihemanth@gmail.com |

## Stakeholders and decision makers
Hemanth signs off on scope and release.

## Repositories in this product
- `with_groundwork` (this repo) — the whole app — owner: Hemanth

## Glossary
- **Preview:** the on-screen rendering of the Markdown, shown next to the editor.
- **Export:** producing and downloading the PDF from the current Markdown.
