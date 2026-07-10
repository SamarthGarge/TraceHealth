# HealthRisk Predictor — UI Design System v2.0
### (DataLens Base System, Extended for a Health-Risk Web Application)

**Version:** v2.0 | **Base system:** DataLens Design System v1.0 (uploaded) | **Companion to:** TRD v2.0 (React + FastAPI + MongoDB) | **Date:** 2026-07-05

---

## 0. How to Read This Document

This is **not a replacement** for the DataLens system — it's an extension layer on top of it. Everything in DataLens (tokens, typography, spacing, motion, buttons, inputs, tabs, feedback boxes, stat displays, the auth split-panel layout) is **inherited unchanged** and is not repeated in full here. This document covers exactly two things:

1. **What's reused as-is**, with a short pointer to where in DataLens it lives (§1)
2. **What's added or reconciled** to make the system work for a health-risk product: status-semantic colors, categorical chart colors, remapped navigation, and every net-new component the product needs (risk badge, model selector, comparison panel, explanation panel, history/trend views, uploads, consent) (§2 onward)

The clinical-teal palette from UI Design System v1.0 (the Streamlit-era document) is **retired**. DataLens's warm parchment/terracotta/ink identity becomes the product's visual identity going forward.

---

## 1. Inherited Unchanged from DataLens v1.0

| Category | What carries over | Source section in DataLens file |
|---|---|---|
| Design principles 01–04 | Warmth over sterility, typography-led hierarchy, one accent used sparingly, motion that earns its place | §1 Foundations |
| Neutral color ramp | `--parchment-hi/-lo`, `--white`, `--ink/-mid/-light/-ghost`, `--border/-soft/-strong` | §2 Color |
| Typography | Cormorant Garamond (display), Figtree (body), JetBrains Mono (labels/data/mono) | §3 Typography |
| Spacing scale | `--space-1` through `--space-14` (base-4) | §4 Spacing |
| Radius scale | `--radius-sm` through `--radius-full` | §5 Radius |
| Motion | `--ease-enter/-spring/-std/-exit`, `--dur-fast/-base/-slow/-enter` | §6 Motion |
| Buttons | Primary/secondary/ghost button styles | §7 Buttons |
| Inputs | Text field styling, focus ring (`--shadow-focus`) | §8 Inputs |
| Tabs | Sliding indicator tab pattern | §9 Tabs |
| Feedback | Error box pattern, "or continue with" divider | §11 Feedback |
| Stat display | Cormorant numerals + JetBrains Mono delta label | §12 Stats |
| Auth page layout | 52/48 split-panel, left = parchment brand/editorial panel, right = white form panel, 860px breakpoint | §14 Layout |
| Token reference | The full `:root` block | §15 Tokens |

**Rule going forward:** any new component should first check whether a DataLens primitive (button, input, tab, badge, stat, feedback box) already solves it before inventing something new. The health-specific components in §4 exist only where DataLens genuinely has no equivalent.

---

## 2. Reconciling "One Accent, Used Sparingly" with Health Semantics

DataLens Principle 03 is correct for a data tool where terracotta only ever means "this is active/primary." A health-risk product has a **second, independent color vocabulary that must coexist with it**: risk severity (Low/Moderate/High) and categorical identity (which disease, which model). Rather than break Principle 03, we add two clearly-scoped color systems that never bleed into each other or into terracotta's job:

### 2.1 Status Colors (severity only — never used for UI chrome, buttons, or links)

| Token | Hex | Usage | Relationship to DataLens |
|---|---|---|---|
| `--status-low` | `#4D7A60` | Low Risk badges, low bands in charts | **Reused directly** — this is DataLens's existing `--sage`. "Low risk" and "success/good news" are semantically the same signal, so reusing it is intentional, not a new token |
| `--status-low-dim` | `rgba(77, 122, 96, 0.12)` | Low Risk badge background | = existing `--sage-dim` |
| `--status-moderate` | `#B8862E` | Moderate Risk badges, moderate bands | **New token.** A muted ochre/gold sits naturally in the parchment palette (it reads as "aged brass," not "traffic-light yellow") while remaining clearly distinct from terracotta |
| `--status-moderate-dim` | `rgba(184, 134, 46, 0.12)` | Moderate Risk badge background | New, follows the `-dim` pattern used for sage/terra |
| `--status-high` | `#B23A3A` | High Risk badges, high bands | **New token.** Deliberately a cooler, more saturated brick-red than `--terra` (#C25539) — close enough to read as "danger" but far enough that a High Risk badge is never mistaken for an active CTA or a Diabetes-module accent |
| `--status-high-dim` | `rgba(178, 58, 58, 0.12)` | High Risk badge background | New |

**Hard rule (carried from the product's PRD/TRD, non-negotiable):** every status color always ships with its text label ("Low Risk" / "Moderate Risk" / "High Risk"). Color is reinforcement, never the sole signal.

### 2.2 Categorical Chart Colors (data series only — used exclusively inside Plotly charts, never for buttons/links/nav)

A second, clearly-scoped palette for distinguishing *which disease* or *which model* a data series represents. These never appear as backgrounds, borders, or text color outside a chart legend/series.

| Token | Hex | Assigned to (disease) | Assigned to (model) |
|---|---|---|---|
| `--chart-clay` | `#C25539` (= `--terra`) | Diabetes | — |
| `--chart-plum` | `#8B5D6B` | Heart Disease | XGBoost |
| `--chart-slate` | `#5B7C99` | Tuberculosis | Logistic Regression |
| `--chart-gold` | `#A68A4E` | Lung Cancer | Random Forest |

**Why disease and model don't share one mapping:** a disease page's model-comparison chart (3 model bars) and the dashboard's cross-disease radar (4 disease axes) never render on the same screen at the same time, so reusing this four-color set across both contexts (assigning 3 of the 4 to models, all 4 to diseases) keeps the token count minimal without ever creating an on-screen collision. Diabetes intentionally keeps `--terra` as its disease color since it's the app's flagship/first-built module — everywhere else, `--terra` stays reserved for its DataLens job (active states, CTAs, links).

### 2.3 Updated Principle (addendum to DataLens §1)
> **Principle 03a — Two vocabularies, never mixed.** Terracotta remains the single UI-action accent. Status colors (§2.1) speak only about risk severity. Chart colors (§2.2) speak only about data-series identity. A color from one vocabulary never does a second vocabulary's job — e.g., `--status-high` never appears as a button, and `--chart-gold` never appears as a "this is important" highlight outside a chart.

---

## 3. Navigation (Remapped from DataLens §13)

DataLens's dark-ink sidebar pattern (2px terracotta left-border active state, 4% white hover overlay) is kept exactly as specified — only the content changes, mapped to the TRD v2.0 route map:

```
┌───────────────────────────────┐
│  ⬤  HealthRisk Predictor        │  ← sidebar-mark (terra square) + sidebar-name (Cormorant)
│     v2.0                        │  ← sidebar-ver, JetBrains Mono, ghost opacity
├───────────────────────────────┤
│ OVERVIEW                        │  ← nav-section-label
│ ▍ Dashboard                     │  ← active example
│   Insights                       │
├───────────────────────────────┤
│ DISEASE MODULES                  │
│   Diabetes                        │
│   Heart Disease                    │
│   Tuberculosis                      │
│   Lung Cancer                        │
├───────────────────────────────┤
│ YOUR DATA                        │
│   History                          │
│   Uploads                           │
├───────────────────────────────┤
│   Profile                           │
└───────────────────────────────┘
```
- Each disease/route item uses `nav-link` / `nav-link.active` exactly as defined in DataLens §13 — no new nav CSS needed.
- `nav-dot` (the small 4px dot before each label in DataLens's demo) is repurposed: on the 4 disease-module items only, the dot is tinted with that disease's `--chart-*` color (§2.2) instead of `currentColor`, giving a quiet, permanent color-key to the categorical palette without adding any new UI chrome.

---

## 4. Net-New Components (no DataLens equivalent)

All new components inherit DataLens's card conventions by default unless noted: `background: var(--white)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-xl)`, `box-shadow: var(--shadow-sm)`.

### 4.1 Risk Badge
```
┌──────────────────────────────┐
│  ●  High Risk — 74.3%           │
└──────────────────────────────┘
```
- Background: `var(--status-high-dim)` (or `-moderate-dim` / `-low-dim`)
- Text + dot: `var(--status-high)` (full-strength), font-weight 600, Figtree
- Percentage rendered in JetBrains Mono (consistent with DataLens's data-label convention), label text in Figtree
- Implemented once as a shared React component (`<RiskBadge probability risk />`), used on every disease page, the dashboard, and history detail views

### 4.2 Model Selector
A segmented control sitting directly above the prediction result:
```
Choose a model:   [ Logistic Regression ]  [ Random Forest ● ]  [ XGBoost ]
```
- Built on DataLens's tab component (§9 — sliding indicator), not a new pattern: the sliding bar becomes the active-model indicator, colored with that model's `--chart-*` token instead of terracotta (the one deliberate per-instance override of "terracotta = active," justified because this control is about *model identity*, not *navigation/primary action*)
- Default selection = the CV-winning model for that disease, pre-highlighted

### 4.3 Model Comparison Panel
```
┌───────────────────────────────────────────────────────┐
│  How each model scored this input                        │
│                                                            │
│  Logistic Regression   ▓▓▓▓▓▓▓▓░░░░░░░░░  38.2%  Moderate  │
│  Random Forest         ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  61.4%  High  ✓   │
│  XGBoost                ▓▓▓▓▓▓▓▓▓▓▓▓░░░░  58.9%  Moderate  │
└───────────────────────────────────────────────────────┘
```
- Horizontal Plotly bar chart, one bar per model in its `--chart-*` color; threshold bands at 30%/60% shown as very light vertical shading using `--status-moderate-dim` / `--status-high-dim`
- Card chrome, header text in Figtree 600, values in JetBrains Mono
- Currently-selected model's bar gets a 2px `--ink` outline so its connection to the badge above is unambiguous

### 4.4 Explanation Panel (SHAP / Coefficient)
- Card titled "Why this prediction?" (Cormorant Garamond, italic, matching DataLens's `<em>` section-title treatment: `Why this <em>prediction</em>?`)
- **Tree models:** SHAP waterfall, matplotlib, rendered inside the card with a transparent figure background and Figtree-matched font so the static image doesn't clash with the surrounding warm palette; SHAP's own red/blue convention is kept as-is (a recognized standard, not reskinned)
- **Logistic Regression:** Plotly horizontal bar chart of standardized-coefficient × input value, using `--status-high`/`--status-low` (not chart colors) for "pushes risk up"/"pushes risk down," since this chart is communicating direction-of-effect, which is a severity concept, not a categorical one
- Caption footer, JetBrains Mono, `--ink-light`: states which explainer was used, per the TreeExplainer-only constraint from TRD v1.0 §6.2

### 4.5 History Timeline
- Vertical list of past predictions, each row styled as a compact DataLens card: date (JetBrains Mono, `--ink-light`) — disease name with its `--chart-*` dot — RiskBadge (§4.1) — chevron to detail view
- Filter controls (disease, date range) use DataLens's existing input/select styling (§8) — no new form component needed

### 4.6 History Trend Chart
- Plotly line chart, one line per disease (only the diseases the user has predicted more than once), colored with `--chart-*` tokens, plotted against `--status-*` threshold bands as light horizontal reference zones
- X-axis: prediction date; Y-axis: risk probability

### 4.7 Model Leaderboard Table (Insights page)
- `react-table` or a plain styled `<table>`, following DataLens's `border: 1px solid var(--border)` + `--radius-lg` card wrapper
- Accuracy/F1/ROC-AUC columns rendered as inline progress bars filled with `--ink-light` (kept neutral — this table compares algorithms, not risk, so it deliberately avoids both the status and chart palettes to prevent a false "this model = this disease/risk color" association)
- CV-winning model row gets a 2px left border in `--terra` (this is a legitimate "primary/best" signal, consistent with terracotta's defined job)

### 4.8 Upload Dropzone
- Dashed `--border-strong` boundary, `--radius-xl`, `--parchment` background (idle state) → `--terra-dim` background on drag-over (reuses DataLens's existing hover-tint convention from `nav-link:hover`)
- File type/size validation errors render via DataLens's existing error-box component (§11) verbatim — no new error styling needed

### 4.9 Consent Banner
- Appears once at signup, styled as a non-dismissible variant of DataLens's feedback box (§11), using `--parchment` background (informational, not an error) and `--ink` text
- Persistent one-line footer version (post-signup, on every page): "Educational tool only — not a medical diagnosis." in `--ink-light`, JetBrains Mono, 11px — mirrors the `sidebar-ver` treatment for visual consistency

---

## 5. Page-by-Page Layout (React Routes from TRD v2.0)

| Route | Layout |
|---|---|
| `/login`, `/signup` | DataLens auth split-panel (§14) verbatim. Left panel (parchment): wordmark, eyebrow ("Explainable Health Screening"), editorial headline, 4-item feature pill list (§4.6 in DataLens — "SHAP Explainability," "Multi-Model Comparison," "Personal Risk History," "Private by Design"), stat row (e.g., "4 Diseases Screened," "3 Models per Prediction," "100% Explainable"). Right panel (white): form, max-width 380px |
| `/dashboard` | Sidebar + main content area (DataLens `.main` padding). Top: greeting + consent banner footer. Grid of 4 disease quick-link cards (DataLens card styling, disease `--chart-*` dot). Below: recent-activity list using a condensed History Timeline (§4.5) |
| `/predict/:disease` | Two-column: left = input form (DataLens input styling), right = Risk Badge (§4.1) → Model Selector (§4.2) → Model Comparison Panel (§4.3) → Explanation Panel (§4.4) |
| `/history` | Full History Timeline (§4.5) with filters, History Trend Chart (§4.6) at top |
| `/history/:id` | Read-only recreation of the `/predict/:disease` result layout, stamped with the original date/time |
| `/uploads` | Upload Dropzone (§4.8) at top, file list below using the same row pattern as History Timeline |
| `/insights` | Model Leaderboard Table (§4.7) per disease, dataset distribution charts (Plotly, `--chart-*` palette split by class) |
| `/profile` | DataLens card-based settings list; "Delete my account" as a DataLens secondary/danger button variant — a new button state using `--status-high` border/text on an otherwise ghost button, the one place a status color legitimately appears on a button, since deletion genuinely is a "high severity" action |

---

## 6. Tailwind Token Mapping (for the React build)

Since DataLens ships as raw CSS variables, map them into `tailwind.config.js` so React components can use utility classes rather than inline `var()` calls:

```js
// tailwind.config.js (excerpt)
module.exports = {
  theme: {
    extend: {
      colors: {
        parchment: { DEFAULT: '#F4EFE6', lo: '#EDE7DC', hi: '#FAF7F2' },
        ink: { DEFAULT: '#1C1510', mid: '#4A3D35', light: '#8A7D74', ghost: '#C4B9B0' },
        border: { DEFAULT: '#DDD5C9', soft: '#EDE7DC', strong: '#C4B9B0' },
        terra: { DEFAULT: '#C25539', dark: '#9E3D26', dim: 'rgba(194,85,57,0.09)' },
        sage: { DEFAULT: '#4D7A60', dim: 'rgba(77,122,96,0.12)' },
        status: {
          low: '#4D7A60', 'low-dim': 'rgba(77,122,96,0.12)',
          moderate: '#B8862E', 'moderate-dim': 'rgba(184,134,46,0.12)',
          high: '#B23A3A', 'high-dim': 'rgba(178,58,58,0.12)',
        },
        chart: { clay: '#C25539', plum: '#8B5D6B', slate: '#5B7C99', gold: '#A68A4E' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      borderRadius: { sm: '4px', md: '8px', lg: '10px', xl: '14px' },
    },
  },
};
```
Plotly's `layout.template` should pull the same hex values directly (Plotly doesn't consume CSS variables), defined once in `core/vizTheme.js` on the frontend and imported into every chart component.

---

## 7. Design QA Checklist (pre-release, v2.0-specific additions to the v1.0 checklist)

- [ ] No `--status-*` color is ever used on a button, link, or nav element (except the deliberate Delete Account exception, §5)
- [ ] No `--chart-*` color is ever used outside a chart legend/series or its matching sidebar nav-dot
- [ ] Every Risk Badge pairs color with text label
- [ ] Model Selector's active-indicator color correctly overrides to the selected model's `--chart-*` token (not left as terracotta)
- [ ] Auth pages collapse correctly below 860px per DataLens's documented breakpoint (left panel hides)
- [ ] Cormorant Garamond is used only for display/stat numerals, never body copy (per DataLens Typography role rule)
- [ ] Tailwind config values match the token table in §6 exactly — no drift between this doc and `tailwind.config.js`
- [ ] SHAP waterfall image background is transparent and doesn't show a white/mismatched box against the parchment page background
