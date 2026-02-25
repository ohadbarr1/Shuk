# Cheshbeshbon (חשבשבון) — Financial Decision Simulator

## About
A financial planning tool for Israeli users. Provides real-time calculators for mortgages, salary/net income, rent vs. buy comparisons, and pension projections using 2026 Israeli tax data. Core calculators work client-side with optional backend for auth, cloud sync, and payments.

## Tech Stack
- **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Framework:** None — pure static SPA with hash-based routing
- **Backend:** Supabase (auth + PostgreSQL + Edge Functions)
- **Payments:** Stripe Checkout (via Supabase Edge Functions)
- **Analytics:** PostHog
- **External Libraries (CDN):**
  - Chart.js 4.4.1 — data visualization
  - Supabase JS v2 — auth, database, edge functions
  - html2canvas 1.4.1 — PDF export (lazy-loaded)
  - jsPDF 2.5.1 — PDF generation (lazy-loaded)
  - Heebo — Hebrew typography (Google Fonts)
- **Storage:** localStorage (offline-first) + Supabase PostgreSQL (cloud sync when logged in)
- **Build System:** None — no bundler, no transpiler, deploy as-is
- **Hosting:** Static site (GitHub Pages / Netlify / Vercel / S3)

## File Structure
```
index.html                  — SPA template (all page sections)
css/
  styles.css                — Design system, dark theme, responsive, RTL
js/
  app.js                    — Entry point, reactive engine, navigation, analytics
  router.js                 — Hash-based SPA router with SEO support
  supabase-client.js        — Supabase client initialization
  auth.js                   — Auth module (email + Google OAuth, session management)
  profile.js                — Financial profile page CRUD + calculator pre-fill
  mortgage.js               — Multi-track mortgage calculator (up to 5 tracks)
  salary.js                 — Salary/net income (employee & self-employed)
  rent-vs-buy.js            — Rent vs. buy comparison with timelines
  pension.js                — Pension projections with replacement ratio
  charts.js                 — Chart.js wrapper, currency formatting, animations
  insights.js               — Smart contextual insights engine
  scenarios.js              — Save/restore calculator states + cloud sync
  premium.js                — Premium feature gating, Stripe Checkout integration
  pdf-export.js             — PDF export via html2canvas + jsPDF
  share.js                  — Web Share API & clipboard sharing
  ui-helpers.js             — Shared UI rendering helpers
  tax-data.js               — 2026 Israeli tax constants
api/
  premiumService.js         — Subscription check via Supabase + offline fallback
supabase/
  migrations/
    001_initial_schema.sql  — DB schema (profiles, scenarios, subscriptions, financial_profiles)
  functions/
    create-checkout/        — Stripe Checkout session creator (Edge Function)
    stripe-webhook/         — Stripe webhook handler (Edge Function)
    check-subscription/     — Subscription status check (Edge Function)
assets/
  favicon.svg               — SVG favicon
sitemap.xml                 — SEO sitemap
robots.txt                  — SEO robots file
```

## Commands
No package.json or build scripts. This is a zero-build static site.
- **Run locally:** Open `index.html` in a browser, or use `npx serve .`
- **Deploy:** Push to GitHub Pages, Netlify, or any static host
- **Supabase:** Run migration SQL in Supabase dashboard, deploy edge functions with `supabase functions deploy`

## Architecture Notes
- **Routing:** Hash-based (`#home`, `#calculators`, `#mortgage`, `#salary`, `#rent-vs-buy`, `#pension`, `#about`, `#faq`, `#contact`, `#profile`)
- **Module pattern:** Each calculator is a self-contained object (`MortgageCalc`, `SalaryCalc`, `RentVsBuyCalc`, `PensionCalc`)
- **Reactive engine:** Debounced input listeners (150ms) trigger recalculation
- **Auth:** Optional — Supabase auth (email + Google OAuth). All calculators work without login.
- **Cloud sync:** Offline-first — localStorage always, Supabase sync when logged in. Merge on login (newest wins).
- **Payments:** Stripe Checkout redirect-based flow via Supabase Edge Function
- **All Hebrew (RTL):** Every UI string is in Hebrew
- **2026 Israeli data:** Tax brackets, national insurance rates, purchase tax tiers, pension ceilings
- **Privacy-first:** Zero external API calls for core calculator functionality

## Script Load Order
1. Supabase CDN → supabase-client.js → auth.js (infrastructure)
2. premiumService.js → premium.js (services)
3. Calculator modules (mortgage, salary, rent-vs-buy, pension)
4. scenarios.js, pdf-export.js, profile.js (features)
5. router.js → app.js (core, last)

## Setup Prerequisites
To enable backend features, configure:
1. **Supabase:** Create project, run migration SQL, set URL + anon key in `supabase-client.js`
2. **Stripe:** Create account, set price IDs + secret key in Edge Function env vars
3. **PostHog:** Create account, uncomment + set API key in `index.html`
4. **Google OAuth:** Configure in Supabase Auth settings

## Upgrade Cycle
This project uses a two-phase upgrade cycle powered by Claude Code subagents:

1. **Phase 1 — Product Manager** (`.claude/agents/product-manager.md`):
   Researches industry trends, audits the codebase, and writes a prioritized improvement spec to `.claude/specs/current-cycle.md`.

2. **Phase 2 — Developer** (`.claude/agents/developer.md`):
   Reads the spec, implements each item, writes tests, runs them, and commits after each completed feature.

Run Phase 1 first, review the spec, then run Phase 2.
