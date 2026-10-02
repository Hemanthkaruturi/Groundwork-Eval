# with_groundwork — Constitution

> The non-negotiable rules. Every RFC, spec and pull request is checked against this. If a
> change conflicts with it, stop and say so — amend it deliberately instead of working around it.
> Keep it short: a rule that cannot be checked is a wish.

**Version:** 1.1.0 · **Ratified:** 2026-10-02

## Principles
1. Spec before code — no implementation without an approved spec.
2. Preview and PDF share one rendering path, so they cannot drift apart.
3. Keep it small: no feature outside PROJECT.md scope without an RFC.

## Guardrails (things that must never happen)
- The server never writes user content to disk or logs it beyond the request. (Browser local storage on the user's own machine is allowed.)
- The server listens on localhost only, because Markdown may run scripts in the PDF renderer (needed for math and Mermaid). Do not expose it to a network.

## Quality gates (what "done" means)
- Tests pass; every acceptance criterion in the spec has a test.
- The PDF export is checked by hand against the preview.

## Amendments
- 2026-10-02 (RFC-0001): removed the guardrail "Markdown content never executes scripts in the PDF renderer" so math and Mermaid work; the localhost-only rule now carries the protection. Clarified that "no stored content" applies to the server.
