# Epic AI Products — Design System

The visual language for the app. Adapted from the "Rupert" aesthetic (parchment / ink / brass,
Inter at light weights, editorial restraint) and applied to product surfaces: console, portal,
tables, forms. Follow this exactly for every page. The brand *name and copy* are ours; only the
visual system is borrowed.

## Absolute rules (never break)
- **Light mode only.** Never build a dark mode. The parchment-and-ink feel is load-bearing.
- **Inter, weights 300 / 400 / 500 only. Bold (600+) is forbidden anywhere.** Emphasis = weight 500, color, or size — never bold.
- **No** gradients, glassmorphism, frosted panels, drop-shadow stacks, purple or electric blue, emoji, exclamation marks, countdown-urgency/scarcity language, or AI-forward/hype wording ("AI-powered", "supercharge", "unlock").
- **Icons:** Lucide only, stroke width 1.5, never filled. 20px inline, 24px standalone.
- **Dropdowns:** never a native `<select>` for an openable list. OS option menus break the system every time. Use `app/ui/dropdown.tsx` (`.dropdown` classes).
- Uppercase is only for small labels (12px, 0.08em tracking).
- **Titles are Title Case.** Page titles, section titles, and nav labels capitalize principal words: Email Analytics, Email Performance, My Leads, LinkedIn Activity. Articles and prepositions of three letters or fewer stay lowercase unless first or last. Body copy, buttons, and helper text stay sentence case.

## Color tokens
| Token | Hex | Use |
|---|---|---|
| ink | `#1A1A2E` | headings, primary buttons, logo, key anchors |
| ink-dark | `#11111F` | primary button hover |
| slate | `#4A5568` | secondary buttons, supporting UI |
| brass | `#B5935A` | links, selective highlights, dividers, quote marks |
| parchment | `#FAF9F7` | page background (warm white) |
| white | `#FFFFFF` | cards, panels, inputs |
| smoke | `#E4E2DE` | all borders and ruled lines |
| ash | `#8A8A8A` | meta, captions, labels, timestamps |
| charcoal | `#2D2D2D` | body text |
| sage | `#3A7D5E` | success — sent, reply received, stage complete |
| amber | `#C07C2A` | non-blocking warnings |
| cinnabar | `#C0392B` | destructive actions, validation errors |

## Typography
- Sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif` (300/400/500).
- Mono: `'IBM Plex Mono', 'Courier New', monospace` (400) — metrics, IDs, campaign previews, pipeline data only.
- Scale: display 56/1.1/300 · h1 40/1.2/300 · h2 28/1.3/400 · h3 20/1.4/500 · h4 16/1.5/500 · body 16/1.7/400 · body-sm 14/1.6/400 · label 12/1.4/500 uppercase 0.08em.
- display and h1 use letter-spacing -0.02em. Prose max width 680px. Container max 1160px.

## Spacing & layout
- 8px base. Tokens: 4 xs · 8 sm · 16 md · 24 lg · 40 xl · 64 2xl · 96 3xl.
- Section vertical padding never below 64px desktop / 40px mobile. Nav bar max height 64px.
- Breakpoints: sm 480 · md 768 · lg 1024 · xl 1280.

## Motion
- Hover: 150ms ease opacity/border shifts. Reveal: single fade-up (opacity 0→1, translateY 12→0) 400ms, once.
- No parallax, particles, animated gradients, counters, typing effects. Respect `prefers-reduced-motion`.

## Applying to app surfaces
- Cards: white on parchment, 1px smoke border, ~10px radius, generous padding (24–36px). No heavy shadow.
- Tables: hairline smoke row borders, ash column labels (uppercase 12px), mono for numeric/ID columns.
- Buttons: primary = ink bg + white text (500), hover ink-dark. Secondary/ghost = transparent + smoke border, hover border ink.
- Status: sage / amber / cinnabar as text or 1px-bordered chips, never loud fills.
- Metrics: ash uppercase label above, large light number (34px/300 ink) below. On analytics overviews, fit five metrics in one row (`.metric-row` + `.metric-card`): Sent, Opens, Replies, Bounces, Bounce rate. Cards are equal width, compact padding (16×14), 26px/300 mono value, reserved caption line for the rate so the row stays even. Each campaign repeats that same five-card row under its Title Case name — do not wrap a campaign in a second large card.
- Portal / console sidebar: 220px, labels visible by default. Collapse is icon-only (48px) via `PanelLeft` / `PanelLeftClose` (20px, stroke 1.5). Default is expanded. Persist the choice in `localStorage`. Active item: white fill + 3px brass inset. Hover: `rgba(26,26,46,.045)`. Disabled items stay ash, no link.
- Dropdowns (required — do not invent another version):
  - Trigger matches `.input`: 44px tall, white, 1px smoke, 6px radius, 16px/400 charcoal, 14px left padding.
  - Chevron is Lucide `ChevronDown`, 16px, stroke 1.5, ash, 12px from the right. Never the OS arrow. Rotates 180° when open (150ms).
  - Hover: border ink. Open/focus: border brass, no outline.
  - Menu sits 4px below the trigger, same width. White, 1px smoke, 10px radius (card), 6px vertical padding. **No shadow.** Max-height 280px, then scroll.
  - Options: 15px/400 charcoal, 10px 14px padding, full-width text buttons. Hover: `rgba(26,26,46,.045)` + ink. Selected: ink / 500 + 3px brass inset (same as portal nav).
  - Long labels ellipsis on the trigger; full text in the menu.
  - Choosers that change the URL update immediately on pick — no extra Apply button.
  - Form fields: pass `name` so a hidden input submits with the form. Width 100% of the field.
  - Implement with `app/ui/dropdown.tsx`. Do not restyle `<select>`.

## Copy voice
Measured, precise, calm. Titles are Title Case (Email Analytics, Email Performance). Buttons, body, and errors stay sentence case. Say what a control does ("Push to Instantly", "Compute and assign").
No exclamation marks, no hype, no "please/simply/just". Errors state what happened and how to fix it.

---

## Code — paste these into the app

### 1. Fonts — `app/layout.tsx`
```tsx
import { Inter, IBM_Plex_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-sans" });
const mono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Tokens & base — add to `app/globals.css` (keep the existing Tailwind import line at the very top)
```css
:root{
  --ink:#1A1A2E; --ink-dark:#11111F; --slate:#4A5568; --brass:#B5935A;
  --parchment:#FAF9F7; --white:#FFFFFF; --smoke:#E4E2DE; --ash:#8A8A8A;
  --charcoal:#2D2D2D; --sage:#3A7D5E; --amber:#C07C2A; --cinnabar:#C0392B;
}
html,body{background:var(--parchment);color:var(--charcoal);
  font-family:var(--font-sans),-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
  font-weight:400;line-height:1.7;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{color:var(--ink);font-weight:300;letter-spacing:-0.02em}
h2{font-weight:400;letter-spacing:0} h3,h4{font-weight:500;letter-spacing:0}
a{color:var(--brass);text-decoration:none;font-weight:500;transition:opacity .15s ease}
a:hover{opacity:.7}
.label{font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ash)}
.mono{font-family:var(--font-mono),monospace}
.btn{height:44px;padding:0 22px;border:none;border-radius:6px;background:var(--ink);color:#fff;
  font-weight:500;font-size:15px;cursor:pointer;transition:background .15s ease}
.btn:hover{background:var(--ink-dark)}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--smoke)}
.btn-ghost:hover{border-color:var(--ink)}
.card{background:var(--white);border:1px solid var(--smoke);border-radius:10px}
.input{width:100%;height:44px;padding:0 14px;background:#fff;border:1px solid var(--smoke);
  border-radius:6px;font-size:16px;color:var(--charcoal);transition:border-color .15s ease}
.input:focus{outline:none;border-color:var(--brass)}
.dropdown-wrap{width:280px;max-width:100%}
.dropdown{position:relative;width:100%}
.dropdown-trigger{
  position:relative;width:100%;height:44px;padding:0 40px 0 14px;
  background:var(--white);border:1px solid var(--smoke);border-radius:6px;
  font-family:inherit;font-size:16px;font-weight:400;color:var(--charcoal);text-align:left;cursor:pointer;
  display:flex;align-items:center;transition:border-color .15s ease}
.dropdown-trigger span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dropdown-trigger:hover{border-color:var(--ink)}
.dropdown-trigger:focus,.dropdown-trigger[data-open="true"]{outline:none;border-color:var(--brass)}
.dropdown-chevron{position:absolute;right:12px;color:var(--ash);flex-shrink:0;transition:transform .15s ease}
.dropdown-trigger[data-open="true"] .dropdown-chevron{transform:rotate(180deg)}
.dropdown-menu{
  position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:30;
  background:var(--white);border:1px solid var(--smoke);border-radius:10px;
  padding:6px 0;max-height:280px;overflow:auto}
.dropdown-option{
  display:block;width:100%;padding:10px 14px;border:none;background:transparent;
  font-family:inherit;font-size:15px;font-weight:400;color:var(--charcoal);text-align:left;cursor:pointer}
.dropdown-option:hover{background:rgba(26,26,46,.045);color:var(--ink)}
.dropdown-option[data-active="true"]{color:var(--ink);font-weight:500;box-shadow:inset 3px 0 0 var(--brass)}
.portal-nav a{font-weight:inherit}
.portal-nav a:hover{opacity:1}
.portal-range a:hover{opacity:1}
.portal-nav a[data-active="false"]:hover{background:rgba(26,26,46,.045);color:var(--ink)}
.portal-nav-toggle{
  display:flex;align-items:center;justify-content:center;
  width:32px;height:32px;padding:0;border:none;border-radius:8px;
  background:transparent;color:var(--slate);cursor:pointer;flex-shrink:0;
  transition:background .15s ease,color .15s ease}
.portal-nav-toggle:hover{background:rgba(26,26,46,.045);color:var(--ink)}
.metric-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.metric-card{padding:16px 14px}
.metric-card .metric-value{font-size:26px;font-weight:300;color:var(--ink);line-height:1.15;margin-top:6px}
.sr-only{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:768px){.metric-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
```

### 3. Dropdown component — `app/ui/dropdown.tsx`

Use this for every chooser and form select. Import `Dropdown` from `@/app/ui/dropdown`. Never ship a native `<select>` menu.
