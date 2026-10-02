# Groundwork evaluation: the same app built with and without Groundwork

This repo compares two builds of the same web app by the same coding agent. One build used the
[Groundwork](#about-groundwork) Claude Code plugin; the other did not. Both apps, their session usage
and the PDFs they produced are kept here as they were, so anyone can check the results.

**Full report:** [docs/groundwork_vs_adhoc_eval.pdf](docs/groundwork_vs_adhoc_eval.pdf) (8 pages) covers
cost, code quality, documentation, testing, output quality and what this means at production scale.

## The experiment

Both sessions got this exact one-sentence prompt:

> "create a web application which can take markdown file or content as input and then convert into pdf, where user can download the pdf"

| | Without Groundwork | With Groundwork |
| --- | --- | --- |
| Model | Claude Sonnet 5.5 (Claude Code) | Claude Sonnet 5.5 (Claude Code) |
| Plugin | None | groundwork-specflow 0.1.4 (standard 0.5.0) |
| Path to code | Prompt → code | Interview → RFC → approval → spec → approval → plan → tasks → evals → code |
| Human sign-offs | None | 2 (the RFC and the spec) |

Both apps then converted the same test document (a public Markdown feature cheat sheet) to PDF.

## Repository layout

```
docs/                        full evaluation report (PDF)
without_groundwork/          app built without the plugin, as produced
  eval_results/              session usage screenshot and the PDF it produced
with_groundwork/             app built with the plugin, as produced
  DECISIONS/                 RFC-0001: interview record, alternatives, accepted risks, approver
  specs/001-markdown-to-pdf/ spec, plan, tasks, evals, log
  PROJECT.md, CONSTITUTION.md, ARCHITECTURE.md, AGENTS.md
  .groundwork/               approval hashes, ledger, freshness state
  eval_results/              session usage screenshot and the PDF it produced
```

The `eval_results/` folders were added after the runs. Everything else is the agents' output, unchanged.

## Results at a glance

| Measure | Without Groundwork | With Groundwork |
| --- | --- | --- |
| Session cost | $0.58 | $3.31 (5.7×) |
| Model compute time | 2m 26s | 11m 9s (4.6×) |
| Wall-clock time | 26m 40s | 33m 55s (1.27×) |
| Output tokens | 11.7k | 79.2k |
| Prompt cache hit rate | 98% | 98% |
| App code | 159 lines, 3 files | 675 lines, 12 files |
| Automated tests | 0 (`npm test` exits with an error) | 36, all passing in about 23 s |
| Documents | None, no README | 11 files, 539 lines, cross-linked by requirement ID |
| Requirements written down | None | 11 functional, 4 non-functional, 12 acceptance criteria |
| `groundwork check` | n/a | "conforms to standard 0.5.0 — no findings" |

Source: the Claude Code session summaries in each `eval_results/usage.png`.

### What Groundwork changed

- **Requirements came from the owner, not the agent.** The thin prompt became a recorded interview of 19 questions and answers before any code. Without the plugin, the agent guessed every requirement.
- **Risky trade-offs went to a human.** Math and diagrams need scripts to run in the PDF renderer. Groundwork stopped, laid out the options, and recorded the owner's choice and its risk in RFC-0001. The ad-hoc build listens on every network interface, and no one decided that.
- **Much more was delivered.** Four themes, paper size, orientation, margins, page numbers, LaTeX math, Mermaid diagrams, saved state and smart file names. The ad-hoc build has paste, upload, live preview and A4/Letter.
- **Every line traces to a reason.** Code comments cite requirement IDs, tests are named after acceptance criteria, the plan cites the spec, and the spec cites the RFC. Approvals are stored with a document hash, signer and time.
- **Per line delivered, it was not more expensive.** About 42 output tokens per line on disk with Groundwork, against about 74 without. The extra cost bought extra work, not waste.

### Where the Groundwork build still falls short

We kept these defects on purpose, to show what the process does and does not catch:

- **Long code lines are cut off** at the right edge of the PDF (`with_groundwork/public/base.css` uses horizontal scrolling inside code blocks, which paper cannot do).
- **Some headings are stranded** at the bottom of a page, apart from their text (5 in the test PDF).
- `evals.md` cites `test/themes.test.js`, which does not exist. The theme checks are in `render.test.js` and `pdf.test.js`.

No automated test inspects visual layout. That check is the spec's manual test, task T902, which
`tasks.md` still marks as not done. The process left the gap visible, but a person still has to close it.

The ad-hoc PDF wraps long code lines and keeps headings with their text. However, it prints raw HTML
tags, has no page numbers, and shows a broken-image icon where the Groundwork build shows a labelled
placeholder and a warning.

## Run the apps

Each app needs Node.js (tested on Node 24). `npm install` downloads Chromium for the PDF step.

```
cd with_groundwork
npm install
npm start      # http://localhost:3000
npm test       # 36 tests

cd ../without_groundwork
npm install
node server.js # http://localhost:3000
```

To re-run the Groundwork conformance check, run `groundwork check` with the plugin installed.

## Limitations

- One run per condition on a small app. This shows direction, not statistical proof.
- Groundwork's interview grew the scope, so part of the cost premium paid for extra features.
- The builds were not committed during the runs, so Groundwork's git-hook and CI enforcement was not exercised. Multi-repo RFCs and multi-signer approvals were not tested either.
- Wall-clock time includes human reading and idle time in both sessions.

## About Groundwork

Groundwork is an open-source Claude Code plugin that makes coding agents work from a shared written
plan instead of improvising. It defines standard documents (RFC → spec → plan → tasks → evals), a
mandatory path from idea to code, and human approval gates. A model-free `groundwork check` enforces
conformance locally, in git hooks and in CI.
