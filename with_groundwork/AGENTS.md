# AGENTS.md — with_groundwork

Instructions for coding agents. Humans: read PROJECT.md first.

## Read before you write anything
1. `PROJECT.md` — what we build and why, and who to ask.
2. `ARCHITECTURE.md` — the boxes and their names.
3. `CONSTITUTION.md` — non-negotiable rules.
4. `DECISIONS/` — RFCs (proposals, approved or not) and the ADRs they left behind.

## Tooling defaults
- Node.js app. Use `npm` for install and scripts. Commit the lockfile.
- Setup: `npm install` (downloads Chromium). Run: `npm start` (http://localhost:3000, `PORT` to change). Test: `npm test` (Node test runner; starts its own server and headless Chromium; about 1 minute). There is no linter.
- Layout: `server/` (Express app, PDF step), `public/` (editor page, shared `render.js`, themes), `test/`, `specs/`.
- Preview and PDF must keep using the same `public/render.js` and theme CSS. Never add a second renderer.
- Run `node_modules` libraries through the `/vendor` routes in `server/index.js`; the app must work offline except for web images.

## Process (enforced by the groundwork plugin)
Interview → RFC → human approval → spec → plan → tasks → evals → implement → handover.
You cannot approve documents; only the user can, with `/groundwork-specflow:approve`.

## Repositories
with_groundwork — . — the whole app (single repo)
