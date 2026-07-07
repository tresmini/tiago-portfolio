# Add Ontic timeline entry

Branch: `add-ontic-timeline-entry`

## Content
- Company: Ontic
- Role: Senior Product Manager
- Period: Mar 2026 — Present
- Description (same text for timeline + card): "Product Manager in the Integrations Squad, owning the API and Native Integration Products. Helped customer-facing teams clarify integrations requirements and build solutions using Ontic's integration portfolio."
- Tags: Enterprise, APIs, B2B
- No case-study page/link — entry ends after description (no "Read case study →")

## Steps
- [x] Add new `<li class="timeline-item">` as the FIRST item in the `<ol class="timeline">` in `src/pages/index.astro` (before Cobli), no `timeline-link` line
- [x] Add new `<article class="card">` as the FIRST card in `.cards` in `src/pages/work.astro` (before Cobli), no `card-link` line
- [x] Start dev server and visually verify both the home page timeline dot/entry and the /work card render correctly
- [x] Check responsive (mobile width) layout isn't broken by the missing link

## Review
- Verified in browser: home page (`/`) shows Ontic as the first timeline dot/entry, `/work` shows Ontic as the first card with Enterprise/APIs/B2B tags.
- No case-study link on Ontic (as chosen) — confirmed layout doesn't break on desktop or mobile (375px) without it; spacing degrades gracefully.
- No other files needed changes — no shared data source exists, so each page's markup was edited independently as per existing pattern.
