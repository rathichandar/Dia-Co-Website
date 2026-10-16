# Dia-Co Visual Reference (extracted from Claude Design bundle)

This file contains the FULL design system and component implementations from the Claude Design mockup.

Use this as the source of truth for CSS classes, design tokens, component structure, and visual hierarchy.

## Files included:

- reference.html: Full HTML file with all CSS (design tokens + layout + components)

- orders_and_history.jsx: OrdersList and HistoryScreen React components (the actual rendering logic)

- topbar_sidebar.jsx: Icon, Badge, Button base components

- dash_utility.jsx: DashUtility component

- shared_fixtures.jsx: STAGES, image fixtures


---


## ==================== FILE: reference.html ====================


<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dia-Co Portal · Dashboard, Orders, History</title>

  
  
  
  
  
  
  
  
  
  <style>/* Dia-Co Portal — Dashboard styles
   Imports brand tokens, adds layout + dashboard-specific rules */
/* ==========================================================================
   DIA-CO DESIGN SYSTEM — Colors & Typography
   Source of truth: reference/Visual Specifications.pdf
   ========================================================================== */

/* ---- Fonts ----------------------------------------------------------------
   Headlines:   Playfair Display (brand font, local TTF variable)
   Body/UI:     IBM Plex Sans (brand font, local TTF variable)
   Ampersand:   Libre Baskerville Roman (Google Fonts) — ONLY for "&" glyph
   NOTE: Never use the Playfair Display ampersand. Either spell out "and"
   or set "&" in Libre Baskerville Roman (upright, not italic).
   -------------------------------------------------------------------------- */
@font-face {
  font-family: 'Playfair Display';
  src: url("e9b16345-8b0b-477b-8a80-5175451f849f") format('truetype-variations');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Playfair Display';
  src: url("53afc014-7ab4-47c2-9f81-50053b6ad3ec") format('truetype-variations');
  font-weight: 400 900;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url("06888faa-727b-4cdf-958c-f0fd7ffced03") format('truetype-variations');
  font-weight: 100 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url("d45230e8-3f92-4e11-b210-e401af7d234e") format('truetype-variations');
  font-weight: 100 700;
  font-style: italic;
  font-display: swap;
}
/* latin-ext */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("d67da9e5-8610-4655-bffe-e50e9573fac1") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("2af3a445-328f-4649-a568-b8d6ea840102") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* latin-ext */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("d67da9e5-8610-4655-bffe-e50e9573fac1") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("2af3a445-328f-4649-a568-b8d6ea840102") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}


:root {
  /* ---------- Brand Palette ---------- */
  --dc-brown:        #8B7355;   /* Primary accent — logo borders, numbers, labels, 6px dividers */
  --dc-red:          #C1403D;   /* Highlight accent — NEW/SALE, alerts. Use 2–3x per document max */
  --dc-gold:         #D4A94A;   /* Logo "D" gold (secondary brand accent, editorial pop) */

  /* ---------- Neutrals ---------- */
  --dc-black:        #1A1A1A;   /* Headlines, titles, important text */
  --dc-gray-700:     #666666;   /* Body text, paragraphs */
  --dc-gray-400:     #999999;   /* Muted text, metadata */
  --dc-gray-300:     #E0E0E0;   /* Standard 1px borders */
  --dc-gray-200:     #F0F0F0;   /* Hairline separators */
  --dc-gray-100:     #F8F8F8;   /* Smoke white — sidebars, alternate sections, info boxes */
  --dc-gray-050:     #F5F5F5;   /* Light gray — page background, canvas */
  --dc-white:        #FFFFFF;   /* Content background */

  /* ---------- Semantic tokens ---------- */
  --fg-1:            var(--dc-black);     /* Primary text / headlines */
  --fg-2:            var(--dc-gray-700);  /* Body copy */
  --fg-3:            var(--dc-gray-400);  /* Muted / metadata */
  --fg-accent:       var(--dc-brown);     /* Labels, section numbers */
  --fg-highlight:    var(--dc-red);       /* Sale / alert / new */
  --fg-on-dark:      var(--dc-white);

  --bg-page:         var(--dc-gray-050);
  --bg-surface:      var(--dc-white);
  --bg-subtle:       var(--dc-gray-100);
  --bg-dark:         var(--dc-black);

  --border-standard: 1px solid var(--dc-gray-300);
  --border-accent:   2px solid var(--dc-brown);
  --border-thick:    6px solid var(--dc-brown);

  /* ---------- Typography — families ---------- */
  --font-display:    'Playfair Display', 'Libre Baskerville', Georgia, 'Times New Roman', serif;
  --font-sans:       'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --font-mono:       'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  --font-ampersand:  'Libre Baskerville', Georgia, serif;  /* Use this for & */

  /* ---------- Type scale (spec values) ---------- */
  --fs-page-number:  96px;   /* IBM Plex Sans 300, line-height 1.0, brown */
  --fs-headline:     64px;   /* Playfair Display 600, line-height 1.1, black */
  --fs-email-head:   42px;   /* Playfair Display 600, line-height 1.1, black */
  --fs-section-num:  48px;   /* IBM Plex Sans 300, line-height 1.0, brown */
  --fs-section-ttl:  24px;   /* IBM Plex Sans 600, line-height 1.2, black */
  --fs-body:         15px;   /* IBM Plex Sans 400, line-height 1.7, gray */
  --fs-body-italic:  16px;   /* IBM Plex Sans 400 italic, line-height 1.7 */
  --fs-label:        12px;   /* IBM Plex Sans 600 UPPERCASE, 2px letter-spacing, brown */

  /* ---------- Spacing (spec values) ---------- */
  --sp-section:      60px;   /* Main section padding */
  --sp-box:          40px;   /* Accent box padding */
  --sp-between:      35px;   /* Between elements (steps, list items) */
  --sp-grid-gap:     20px;   /* Grid column gap */
  --sp-label-track:  2px;    /* Letter-spacing for uppercase labels */

  /* ---------- Radii ----------
     Dia-Co's print-inspired aesthetic keeps corners crisp. Radii are used
     sparingly and small — never pill-shaped for primary surfaces. */
  --radius-none:     0;
  --radius-sm:       2px;
  --radius-md:       4px;

  /* ---------- Shadows ----------
     Editorial layout leans on borders + whitespace, not shadow. These are
     for interactive elements (modals, dropdowns) only. */
  --shadow-sm:       0 1px 2px rgba(26, 26, 26, 0.06);
  --shadow-md:       0 4px 12px rgba(26, 26, 26, 0.08);
  --shadow-lg:       0 16px 40px rgba(26, 26, 26, 0.12);
}

/* ==========================================================================
   Base + Semantic element styles
   ========================================================================== */

html, body {
  background: var(--bg-page);
  color: var(--fg-2);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: 1.7;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Headlines — Playfair Display */
h1, .dc-h1 {
  font-family: var(--font-display);
  font-size: var(--fs-headline);
  font-weight: 600;
  line-height: 1.1;
  color: var(--fg-1);
  letter-spacing: -0.01em;
  margin: 0;
}
h2, .dc-h2 {
  font-family: var(--font-display);
  font-size: var(--fs-email-head);
  font-weight: 600;
  line-height: 1.15;
  color: var(--fg-1);
  margin: 0;
}

/* Section title — sans */
h3, .dc-section-title {
  font-family: var(--font-sans);
  font-size: var(--fs-section-ttl);
  font-weight: 600;
  line-height: 1.2;
  color: var(--fg-1);
  margin: 0;
}

/* Page / section number — light sans, brown */
.dc-page-number {
  font-family: var(--font-sans);
  font-size: var(--fs-page-number);
  font-weight: 300;
  line-height: 1.0;
  color: var(--fg-accent);
}
.dc-section-number {
  font-family: var(--font-sans);
  font-size: var(--fs-section-num);
  font-weight: 300;
  line-height: 1.0;
  color: var(--fg-accent);
}

/* Label — uppercase brown, tracked */
.dc-label {
  font-family: var(--font-sans);
  font-size: var(--fs-label);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--sp-label-track);
  color: var(--fg-accent);
  line-height: 1.0;
}

/* Body */
p, .dc-body {
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  font-weight: 400;
  line-height: 1.7;
  color: var(--fg-2);
  margin: 0;
}
.dc-body-italic {
  font-family: var(--font-sans);
  font-size: var(--fs-body-italic);
  font-weight: 400;
  font-style: italic;
  line-height: 1.7;
  color: var(--fg-2);
}

/* The sanctioned ampersand — Libre Baskerville Roman (upright), not italic */
.dc-amp {
  font-family: 'Libre Baskerville', Georgia, serif !important;
  font-style: normal !important;
  font-weight: 400 !important;
  font-feature-settings: normal;
}

/* Badges */
.dc-badge-new {
  display: inline-block;
  background: var(--dc-red);
  color: var(--dc-white);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

/* Accent box — 2px brown border, 40px padding */
.dc-accent-box {
  border: var(--border-accent);
  padding: var(--sp-box);
  background: var(--bg-surface);
}

/* Thick section divider */
.dc-divider-thick {
  border: 0;
  border-top: var(--border-thick);
  margin: var(--sp-section) 0;
}
.dc-divider {
  border: 0;
  border-top: var(--border-standard);
  margin: var(--sp-between) 0;
}

/* Links — understated, underline on hover */
a {
  color: var(--fg-1);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  transition: opacity 160ms ease;
}
a:hover { opacity: 0.6; }

/* Buttons — editorial (rectangle, no radius, thin border) */
.dc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 14px 28px;
  border: var(--border-accent);
  border-radius: var(--radius-none);
  background: transparent;
  color: var(--fg-1);
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, opacity 180ms ease;
}
.dc-btn:hover  { background: var(--dc-brown); color: var(--dc-white); }
.dc-btn:active { opacity: 0.85; }

.dc-btn--primary {
  background: var(--dc-black);
  color: var(--dc-white);
  border-color: var(--dc-black);
}
.dc-btn--primary:hover { background: var(--dc-brown); border-color: var(--dc-brown); }

.dc-btn--ghost {
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
}
.dc-btn--ghost:hover { background: transparent; color: var(--dc-brown); }


* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg-page); color: var(--fg-2); }

/* ============================================================
   PORTAL SHELL — shared between directions
   ============================================================ */
.portal {
  display: grid;
  grid-template-columns: var(--sidebar-w, 240px) 1fr;
  grid-template-rows: 64px 1fr;
  height: 100%;
  background: var(--bg-page);
}
.portal__top  { grid-column: 1 / -1; }
.portal__side { grid-row: 2; min-height: 0; }
.portal__main {
  grid-row: 2; grid-column: 2;
  overflow: auto;
  padding: 40px 48px 100px;
}

/* ---------- Topbar ---------- */
.topbar {
  height: 64px; z-index: 10;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--dc-gray-300);
  display: flex; align-items: center; gap: 24px;
  padding: 0 32px;
}
.topbar__wordmark { height: 26px; }
.topbar__search {
  flex: 1; max-width: 440px;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--dc-gray-050);
  border: 1px solid transparent;
  border-radius: 2px;
  font-size: 13px; color: var(--fg-2);
  transition: border-color 160ms ease, background 160ms ease;
}
.topbar__search:focus-within { border-color: var(--dc-brown); background: #fff; }
.topbar__search input {
  all: unset; flex: 1; font-family: var(--font-sans);
  font-size: 13px; color: var(--fg-1);
}
.topbar__actions { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.topbar__iconbtn {
  width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; color: var(--fg-1); cursor: pointer;
  border-radius: 2px; position: relative;
  transition: background 160ms ease, color 160ms ease;
}
.topbar__iconbtn:hover { background: var(--dc-gray-050); color: var(--dc-brown); }
.topbar__iconbtn .dot {
  position: absolute; top: 8px; right: 8px;
  width: 7px; height: 7px; background: var(--dc-red); border-radius: 50%; border: 2px solid white;
}
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--dc-brown); color: white;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600; letter-spacing: 1px;
}
.topbar__company {
  display: flex; flex-direction: column; gap: 1px; padding-right: 4px;
  border-right: 1px solid var(--dc-gray-300); padding-right: 16px; margin-right: 4px;
}
.topbar__company-name {
  font-family: var(--font-sans); font-size: 12px; font-weight: 600; color: var(--fg-1); line-height: 1.1;
}
.topbar__company-role {
  font-family: var(--font-sans); font-size: 10px; color: var(--dc-brown);
  text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.1;
}

/* ---------- Sidebar (light variant) ---------- */
.sidebar {
  background: var(--dc-white);
  border-right: 1px solid var(--dc-gray-300);
  padding: 24px 16px 20px;
  display: flex; flex-direction: column; gap: 2px; overflow: auto;
}
.sidebar--dark {
  background: var(--dc-black);
  border-right: 1px solid var(--dc-black);
  color: #D7D2CA;
}
.sidebar__section {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 2px; color: var(--fg-3);
  padding: 18px 14px 8px;
}
.sidebar--dark .sidebar__section { color: #8B7355; }
.sidebar__link {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 2px;
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  color: var(--fg-2); cursor: pointer; background: none; border: none; text-align: left;
  transition: background 160ms ease, color 160ms ease;
  position: relative;
}
.sidebar__link:hover { color: var(--fg-1); background: var(--dc-gray-050); }
.sidebar__link.is-active {
  color: var(--fg-1); background: var(--dc-gray-050);
  box-shadow: inset 3px 0 0 var(--dc-brown);
}
.sidebar--dark .sidebar__link { color: #B8B0A3; }
.sidebar--dark .sidebar__link:hover { color: #fff; background: rgba(255,255,255,0.04); }
.sidebar--dark .sidebar__link.is-active {
  color: #fff; background: rgba(139,115,85,0.15); box-shadow: inset 3px 0 0 var(--dc-brown);
}
.sidebar__link svg { width: 16px; height: 16px; stroke-width: 1.5; flex-shrink: 0; }
.sidebar__link .count {
  margin-left: auto; font-family: var(--font-sans);
  font-size: 10px; font-weight: 600; letter-spacing: 1px;
  background: var(--dc-brown); color: #fff; padding: 2px 6px; border-radius: 2px;
  min-width: 18px; text-align: center;
}
.sidebar__link.is-alert .count { background: var(--dc-red); }
.sidebar__foot {
  margin-top: auto; padding: 16px 14px 6px;
  border-top: 1px solid var(--dc-gray-200);
  font-size: 11px; color: var(--fg-3); line-height: 1.6;
}
.sidebar--dark .sidebar__foot { border-top-color: rgba(255,255,255,0.08); color: #8B7355; }
.sidebar--dark .sidebar__foot strong { color: #fff; }

.sidebar__brand {
  padding: 4px 14px 14px;
  display: flex; align-items: center; gap: 10px;
}
.sidebar__brand-mark {
  width: 28px; height: 28px; border: 2px solid var(--dc-brown); padding: 3px;
  display: inline-flex; align-items: center; justify-content: center;
}
.sidebar__brand-mark img { width: 100%; height: 100%; object-fit: contain; }
.sidebar--dark .sidebar__brand-mark { border-color: var(--dc-brown); background: #fff; }
.sidebar__brand-text { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--fg-1); letter-spacing: 0.02em; }
.sidebar--dark .sidebar__brand-text { color: #fff; }

/* ============================================================
   PAGE HEAD — editorial (shared)
   ============================================================ */
.page-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 32px;
  padding-bottom: 24px;
  border-bottom: 6px solid var(--dc-brown);
  margin-bottom: 36px;
}
.page-head__eyebrow {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 14px;
}
.page-head__title {
  font-family: var(--font-display); font-size: 48px; font-weight: 600;
  line-height: 1.05; color: var(--fg-1);
  letter-spacing: -0.01em; margin: 0;
}
.page-head__sub {
  font-family: var(--font-sans); font-style: italic; font-size: 15px;
  color: var(--fg-2); margin-top: 10px; max-width: 560px; line-height: 1.6;
}
.page-head__actions { display: flex; gap: 10px; flex-shrink: 0; }

/* ============================================================
   BUTTONS (operational — short labels, less uppercase)
   ============================================================ */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  padding: 9px 16px;
  border: 1px solid var(--dc-black); background: var(--dc-black); color: #fff;
  border-radius: 2px; cursor: pointer; white-space: nowrap;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, opacity 180ms ease;
}
.btn:hover { background: var(--dc-brown); border-color: var(--dc-brown); }
.btn:active { opacity: 0.85; }
.btn--sec { background: #fff; color: var(--fg-1); border-color: var(--dc-gray-300); }
.btn--sec:hover { background: #fff; color: var(--dc-brown); border-color: var(--dc-brown); }
.btn--ghost { background: transparent; color: var(--fg-1); border-color: transparent; padding-left: 4px; padding-right: 4px; }
.btn--ghost:hover { background: transparent; color: var(--dc-brown); border-color: transparent; }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn--lg { padding: 12px 22px; font-size: 14px; }
.btn--danger { background: #fff; color: var(--dc-red); border-color: var(--dc-gray-300); }
.btn--danger:hover { background: var(--dc-red); color: #fff; border-color: var(--dc-red); }
.btn svg { width: 14px; height: 14px; stroke-width: 1.75; }

/* ============================================================
   BADGES
   ============================================================ */
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.2px;
  padding: 4px 8px; border-radius: 2px; line-height: 1.2;
  white-space: nowrap;
}
.badge--stage { background: var(--dc-gray-100); color: var(--fg-2); border: 1px solid var(--dc-gray-300); }
.badge--ok    { background: #EFF5F0; color: #2D6A4F; border: 1px solid #D4E4D9; }
.badge--warn  { background: #FBF1E9; color: var(--dc-brown); border: 1px solid #E8D7BF; }
.badge--alert { background: #FBECEB; color: var(--dc-red); border: 1px solid #EFC9C7; }
.badge--new   { background: var(--dc-red); color: #fff; }
.badge--dark  { background: var(--dc-black); color: #fff; }
.badge .dot   { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

/* ============================================================
   PANELS (white surface, 1px hairline, flat — editorial)
   ============================================================ */
.panel { background: #fff; border: 1px solid var(--dc-gray-300); }
.panel--accent { border: 2px solid var(--dc-brown); }
.panel__head {
  padding: 16px 22px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--dc-gray-200);
}
.panel__head h4 {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600;
  color: var(--fg-1); margin: 0;
}
.panel__body { padding: 22px; }
.panel__foot {
  padding: 12px 22px; border-top: 1px solid var(--dc-gray-200);
  font-size: 12px; color: var(--fg-3);
  display: flex; align-items: center; justify-content: space-between;
}

/* ============================================================
   SECTION HEADERS
   ============================================================ */
.sec-row {
  display: flex; align-items: baseline; justify-content: space-between;
  margin: 0 0 18px;
}
.sec-row h3 {
  font-family: var(--font-display); font-size: 22px; font-weight: 600;
  color: var(--fg-1); margin: 0; letter-spacing: -0.005em;
}
.sec-row .sec-eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 6px; display: block;
}
.sec-row__link {
  font-family: var(--font-sans); font-size: 12px; font-weight: 500;
  color: var(--dc-brown); cursor: pointer; border-bottom: 1px solid currentColor;
  padding-bottom: 2px; transition: opacity 160ms ease;
}
.sec-row__link:hover { opacity: 0.6; }

/* ============================================================
   UTIL
   ============================================================ */
.stack { display: flex; flex-direction: column; }
.row   { display: flex; }
.gap-8  { gap: 8px;  }
.gap-12 { gap: 12px; }
.gap-16 { gap: 16px; }
.gap-20 { gap: 20px; }
.gap-24 { gap: 24px; }
.gap-32 { gap: 32px; }
.divider-thick { border: 0; border-top: 6px solid var(--dc-brown); margin: 36px 0; }
.divider { border: 0; border-top: 1px solid var(--dc-gray-200); margin: 20px 0; }
.mono { font-family: var(--font-mono); }
.num-light { font-family: var(--font-sans); font-weight: 300; }
.tabular { font-variant-numeric: tabular-nums; }
</style>
  <style>/* Dia-Co Dashboard — direction-specific styles */

/* ============================================================
   DIRECTION A — EDITORIAL
   Whitespace, warm, image-forward. Inspired by museum wall labels.
   ============================================================ */

/* Greeting panel — large editorial block with warm background */
.ed-greet {
  display: grid; grid-template-columns: 1.3fr 1fr; gap: 0;
  background: #fff;
  border: 1px solid var(--dc-gray-300);
  margin-bottom: 36px;
}
.ed-greet__left {
  padding: 40px 44px 40px;
  border-right: 1px solid var(--dc-gray-200);
}
.ed-greet__date {
  font-family: var(--font-sans); font-size: 11px; font-weight: 500;
  color: var(--fg-3); letter-spacing: 1.5px; text-transform: uppercase;
  margin-bottom: 18px;
  display: flex; align-items: center; gap: 10px;
}
.ed-greet__date::before {
  content: ''; width: 24px; height: 2px; background: var(--dc-brown);
}
.ed-greet__hello {
  font-family: var(--font-display); font-size: 40px; font-weight: 600;
  line-height: 1.08; color: var(--fg-1); letter-spacing: -0.01em;
  margin-bottom: 14px;
}
.ed-greet__hello em {
  font-style: italic; color: var(--dc-brown);
}
.ed-greet__sub {
  font-family: var(--font-sans); font-size: 15px; color: var(--fg-2);
  line-height: 1.6; max-width: 460px;
  margin-bottom: 26px;
}
.ed-greet__quick {
  display: flex; gap: 10px; flex-wrap: wrap;
}

.ed-greet__right {
  background: var(--dc-gray-100);
  padding: 32px 36px; display: flex; flex-direction: column; gap: 20px;
}
.ed-greet__right-head {
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 12px; border-bottom: 1px solid var(--dc-gray-300);
}
.ed-greet__right-head .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
}
.ed-greet__right-head .num {
  font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--fg-1);
}
.ed-attn-list { display: flex; flex-direction: column; gap: 14px; }
.ed-attn-item {
  display: grid; grid-template-columns: 40px 1fr auto;
  gap: 14px; align-items: center;
  cursor: pointer; padding: 4px 0;
  transition: opacity 160ms ease;
}
.ed-attn-item:hover { opacity: 0.7; }
.ed-attn-item .img {
  width: 40px; height: 40px; background: #EFEAE2; border: 1px solid var(--dc-gray-300);
  display: flex; align-items: center; justify-content: center;
  background-size: cover; background-position: center;
}
.ed-attn-item .img svg { color: var(--dc-brown); opacity: 0.5; width: 18px; height: 18px; stroke-width: 1; }
.ed-attn-item .title {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  color: var(--fg-1); line-height: 1.3;
}
.ed-attn-item .meta {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3);
  margin-top: 2px; font-style: italic;
}

/* Big editorial stat block */
.ed-stats {
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: #fff; border: 1px solid var(--dc-gray-300);
  margin-bottom: 36px;
}
.ed-stat {
  padding: 28px 26px;
  border-right: 1px solid var(--dc-gray-200);
  display: flex; flex-direction: column; gap: 10px;
  position: relative;
}
.ed-stat:last-child { border-right: none; }
.ed-stat__eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
}
.ed-stat__value {
  font-family: var(--font-sans); font-size: 48px; font-weight: 300;
  color: var(--fg-1); line-height: 1; font-variant-numeric: tabular-nums;
}
.ed-stat__value--alert { color: var(--dc-red); }
.ed-stat__value sup {
  font-size: 14px; font-weight: 400; color: var(--fg-3);
  margin-left: 4px; vertical-align: 14px;
}
.ed-stat__note {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3);
  font-style: italic;
}
.ed-stat__note strong { color: var(--fg-1); font-style: normal; font-weight: 500; }

/* Two-column editorial content */
.ed-two { display: grid; grid-template-columns: 1.6fr 1fr; gap: 28px; align-items: start; }

/* Attention cards — large image + editorial detail */
.ed-attn-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ed-attn-card {
  background: #fff; border: 1px solid var(--dc-gray-300);
  cursor: pointer; transition: border-color 180ms ease, transform 180ms ease;
  display: flex; flex-direction: column;
}
.ed-attn-card:hover { border-color: var(--dc-brown); }
.ed-attn-card__img {
  aspect-ratio: 4/3; background: #EFEAE2 center/cover no-repeat;
  border-bottom: 1px solid var(--dc-gray-200); position: relative;
}
.ed-attn-card__badge { position: absolute; top: 12px; left: 12px; }
.ed-attn-card__body { padding: 20px 22px; display: flex; flex-direction: column; gap: 8px; }
.ed-attn-card__po {
  font-family: var(--font-mono); font-size: 11px; color: var(--dc-brown);
  letter-spacing: 1px;
}
.ed-attn-card__title {
  font-family: var(--font-display); font-size: 19px; font-weight: 600;
  color: var(--fg-1); line-height: 1.2;
}
.ed-attn-card__spec {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
  font-style: italic; line-height: 1.5;
}
.ed-attn-card__foot {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 12px; margin-top: 2px;
  border-top: 1px solid var(--dc-gray-200);
}
.ed-attn-card__foot .label {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.ed-attn-card__foot .val {
  font-family: var(--font-sans); font-size: 15px; font-weight: 500;
  color: var(--fg-1); margin-top: 2px;
}

/* Production list — editorial table */
.ed-prod {
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.ed-prod-row {
  display: grid;
  grid-template-columns: 48px 56px 1.4fr 1fr 1.3fr 110px 40px;
  gap: 16px; align-items: center;
  padding: 14px 20px;
  border-top: 1px solid var(--dc-gray-200);
  cursor: pointer;
  transition: background 160ms ease;
}
.ed-prod-row:first-child { border-top: none; }
.ed-prod-row:hover { background: #FBF7F1; }
.ed-prod-row .num {
  font-family: var(--font-sans); font-size: 20px; font-weight: 300;
  color: var(--dc-brown); line-height: 1;
}
.ed-prod-row .img {
  width: 48px; height: 48px; background: #EFEAE2 center/cover no-repeat;
  border: 1px solid var(--dc-gray-300);
}
.ed-prod-row .piece-name {
  font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--fg-1);
  line-height: 1.3;
}
.ed-prod-row .piece-po {
  font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); margin-top: 2px;
}
.ed-prod-row .stage {
  display: flex; flex-direction: column; gap: 4px;
}
.ed-prod-row .stage-label {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.ed-prod-row .stage-val {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-1);
}
.ed-prod-row .ship {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2);
}
.ed-prod-row .ship strong { color: var(--fg-1); font-weight: 500; }
.ed-prod-row .arrow { text-align: right; color: var(--fg-3); }
.ed-prod-row:hover .arrow { color: var(--dc-brown); }

/* Progress bar for stage */
.stage-bar {
  height: 3px; background: var(--dc-gray-200); border-radius: 0;
  position: relative; width: 100%;
}
.stage-bar__fill {
  position: absolute; inset: 0; background: var(--dc-brown);
  right: auto;
}

/* Right column — activity + financial */
.ed-side { display: flex; flex-direction: column; gap: 24px; }

.ed-financial {
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.ed-fin-head {
  padding: 22px 24px 18px;
  border-bottom: 1px solid var(--dc-gray-200);
}
.ed-fin-head .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 8px;
}
.ed-fin-head .big {
  font-family: var(--font-sans); font-size: 36px; font-weight: 300;
  color: var(--fg-1); line-height: 1; font-variant-numeric: tabular-nums;
}
.ed-fin-head .note {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
  margin-top: 6px; font-style: italic;
}
.ed-fin-rows { padding: 8px 24px 18px; }
.ed-fin-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans); font-size: 13px;
}
.ed-fin-row:last-child { border-bottom: none; }
.ed-fin-row .l { color: var(--fg-2); }
.ed-fin-row .v {
  color: var(--fg-1); font-variant-numeric: tabular-nums;
}
.ed-fin-row .v--alert { color: var(--dc-red); }
.ed-fin-row .v--muted { color: var(--fg-3); }

/* Credit bar */
.credit-bar {
  margin-top: 8px;
  height: 6px; background: var(--dc-gray-100); position: relative;
}
.credit-bar__fill {
  height: 100%; background: var(--dc-brown);
}
.credit-bar__labels {
  display: flex; justify-content: space-between; margin-top: 6px;
  font-family: var(--font-mono); font-size: 10px; color: var(--fg-3);
}

/* Activity feed */
.ed-activity { background: #fff; border: 1px solid var(--dc-gray-300); }
.activity-row {
  display: grid; grid-template-columns: 28px 1fr auto;
  gap: 12px; align-items: flex-start;
  padding: 14px 22px;
  border-top: 1px solid var(--dc-gray-200);
}
.activity-row:first-child { border-top: none; }
.activity-row .ico {
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  color: var(--dc-brown); flex-shrink: 0;
}
.activity-row .ico svg { width: 16px; height: 16px; stroke-width: 1.5; }
.activity-row .ico--red  { color: var(--dc-red); }
.activity-row .ico--green { color: #2D6A4F; }
.activity-row .text {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-1); line-height: 1.5;
}
.activity-row .text .ref {
  color: var(--dc-brown); font-weight: 500;
}
.activity-row .text .sub {
  display: block; color: var(--fg-3); font-size: 11px; margin-top: 2px; font-style: italic;
}
.activity-row .time {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic;
  white-space: nowrap;
}

/* ============================================================
   DIRECTION B — UTILITY / DENSER
   Operational command bar. Same tokens, tighter.
   ============================================================ */

/* Compact greeting strip */
.ut-greet {
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  padding: 0 0 20px;
  margin-bottom: 24px;
  border-bottom: 6px solid var(--dc-brown);
}
.ut-greet__title {
  font-family: var(--font-display); font-size: 34px; font-weight: 600;
  color: var(--fg-1); letter-spacing: -0.005em; line-height: 1.1;
}
.ut-greet__title em { font-style: italic; color: var(--dc-brown); }
.ut-greet__sub {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2);
  font-style: italic; margin-top: 4px;
}
.ut-greet__actions { display: flex; gap: 8px; align-items: center; }

/* KPI strip */
.ut-kpis {
  display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 0; margin-bottom: 24px;
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.ut-kpi {
  padding: 18px 20px;
  border-right: 1px solid var(--dc-gray-200);
  display: flex; flex-direction: column; gap: 6px;
  position: relative; cursor: pointer;
  transition: background 160ms ease;
}
.ut-kpi:last-child { border-right: none; }
.ut-kpi:hover { background: #FBF7F1; }
.ut-kpi.is-attention::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--dc-red);
}
.ut-kpi__label {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  display: flex; align-items: center; gap: 6px;
}
.ut-kpi__label svg { width: 12px; height: 12px; stroke-width: 1.75; }
.ut-kpi__value {
  font-family: var(--font-sans); font-size: 30px; font-weight: 300;
  color: var(--fg-1); line-height: 1.05; font-variant-numeric: tabular-nums;
}
.ut-kpi__value--alert { color: var(--dc-red); }
.ut-kpi__note {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic;
}

/* Two-column grid */
.ut-grid {
  display: grid; grid-template-columns: 1.45fr 1fr;
  gap: 24px; align-items: start;
}

/* Attention queue — compact */
.ut-queue { background: #fff; border: 1px solid var(--dc-gray-300); }
.ut-queue__head {
  padding: 14px 20px;
  border-bottom: 1px solid var(--dc-gray-300);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--dc-gray-100);
}
.ut-queue__head .t {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1);
  display: flex; align-items: center; gap: 10px;
}
.ut-queue__head .count {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  background: var(--dc-red); color: #fff; padding: 2px 7px; border-radius: 2px;
  letter-spacing: 1px;
}
.ut-queue__tabs { display: flex; gap: 2px; }
.ut-queue__tab {
  font-family: var(--font-sans); font-size: 11px; font-weight: 500;
  color: var(--fg-3); padding: 6px 10px; cursor: pointer;
  background: none; border: none;
  border-bottom: 2px solid transparent;
  display: inline-flex; align-items: center; gap: 6px;
}
.ut-queue__tab .ct {
  font-family: var(--font-mono); font-size: 9px;
  background: var(--dc-gray-100); color: var(--fg-2);
  padding: 1px 5px; border-radius: 2px; letter-spacing: 0.3px;
}
.ut-queue__tab.is-active .ct { background: var(--dc-brown); color: #fff; }
.ut-queue__expand {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  background: none; border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px; margin-left: auto;
}
.ut-queue__expand:hover { text-decoration: underline; }
.ut-search {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #fff; border: 1px solid var(--dc-gray-300);
  border-radius: 2px; min-width: 280px;
}
.ut-search input {
  all: unset; flex: 1; font-family: var(--font-sans); font-size: 12px; color: var(--fg-1);
}
  background: transparent; border: none;
  text-transform: uppercase; letter-spacing: 1.5px;
  border-bottom: 2px solid transparent;
}
.ut-queue__tab.is-active { color: var(--fg-1); border-bottom-color: var(--dc-brown); }

.ut-queue-row {
  display: grid;
  grid-template-columns: 40px 4px 1fr 1.2fr 1fr auto;
  gap: 14px; align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--dc-gray-200);
  cursor: pointer;
}
.ut-queue-row:first-child { border-top: none; }
.ut-queue-row:hover { background: #FBF7F1; }
.ut-queue-row .img {
  width: 40px; height: 40px; background: #EFEAE2 center/cover no-repeat;
  border: 1px solid var(--dc-gray-300);
}
.ut-queue-row .bar { width: 3px; height: 32px; background: var(--dc-red); }
.ut-queue-row .bar--warn { background: var(--dc-brown); }
.ut-queue-row .bar--stage { background: var(--dc-gray-300); }
.ut-queue-row .piece {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--fg-1); line-height: 1.3;
}
.ut-queue-row .piece-po {
  font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-top: 2px; letter-spacing: 0.5px;
}
.ut-queue-row .reason {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2);
}
.ut-queue-row .reason strong { color: var(--fg-1); font-weight: 500; }
.ut-queue-row .qty {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
  text-align: right; font-variant-numeric: tabular-nums;
}
.ut-queue-row .qty strong { color: var(--fg-1); display: block; font-weight: 500; font-size: 14px; }

/* Production scoreboard */
.ut-scoreboard { background: #fff; border: 1px solid var(--dc-gray-300); }
.ut-score-head {
  padding: 14px 20px;
  border-bottom: 1px solid var(--dc-gray-300);
  background: var(--dc-gray-100);
  display: flex; align-items: center; justify-content: space-between;
}
.ut-score-head .t { font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1); }
.ut-score-head .summary { font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); }

.stage-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 18px 20px 10px;
  gap: 0;
  border-bottom: 1px solid var(--dc-gray-200);
}
.stage-cell {
  position: relative; padding: 6px 10px 6px 0;
  border-right: 1px solid var(--dc-gray-200);
  min-width: 0;
}
.stage-cell:last-child { border-right: none; }
.stage-cell__let {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  margin-bottom: 4px;
}
.stage-cell__val {
  font-family: var(--font-sans); font-size: 24px; font-weight: 300;
  color: var(--fg-1); line-height: 1; font-variant-numeric: tabular-nums;
}
.stage-cell__sub {
  font-family: var(--font-sans); font-size: 10px; color: var(--fg-3);
  margin-top: 4px; line-height: 1.3;
}

.ut-score-pieces { padding: 4px 0; }
.ut-piece-row {
  display: grid;
  grid-template-columns: 40px 1.4fr 1fr 110px 60px;
  gap: 14px; align-items: center;
  padding: 10px 20px;
  border-top: 1px solid var(--dc-gray-200);
  cursor: pointer;
}
.ut-piece-row:first-child { border-top: none; }
.ut-piece-row:hover { background: #FBF7F1; }
.ut-piece-row .img {
  width: 40px; height: 40px; background: #EFEAE2 center/cover no-repeat;
  border: 1px solid var(--dc-gray-300);
}
.ut-piece-row .n {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--fg-1); line-height: 1.3;
}
.ut-piece-row .po { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-top: 2px; }

/* Mini stage track (A–G dots) */
.mini-track { display: flex; align-items: center; gap: 2px; }
.mini-track__dot {
  width: 14px; height: 4px; background: var(--dc-gray-200); border-radius: 1px;
}
.mini-track__dot.is-done { background: var(--dc-brown); }
.mini-track__dot.is-current { background: var(--dc-black); }
.mini-track__label {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--fg-3); text-transform: uppercase; letter-spacing: 1.5px;
  margin-left: 10px;
}
.mini-track__label strong { color: var(--fg-1); font-weight: 500; }
.mini-track__label.is-late { color: var(--dc-red); }

.ut-piece-row .ship {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); text-align: right;
  font-variant-numeric: tabular-nums;
}
.ut-piece-row .ship strong { color: var(--fg-1); display: block; font-weight: 500; font-size: 13px; }
.ut-piece-row .late { color: var(--dc-red); }
.ut-piece-row .qty {
  font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); text-align: right;
}

/* Financial block — compact */
.ut-fin {
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.ut-fin__head {
  padding: 14px 20px;
  background: var(--dc-gray-100);
  border-bottom: 1px solid var(--dc-gray-300);
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1);
  display: flex; align-items: center; justify-content: space-between;
}
.ut-fin__big {
  padding: 20px 20px 14px;
  border-bottom: 1px solid var(--dc-gray-200);
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
}
.ut-fin__big .cell { display: flex; flex-direction: column; gap: 4px; }
.ut-fin__big .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.ut-fin__big .v {
  font-family: var(--font-sans); font-size: 26px; font-weight: 300;
  color: var(--fg-1); line-height: 1.1; font-variant-numeric: tabular-nums;
}
.ut-fin__big .v--alert { color: var(--dc-red); }
.ut-fin__big .n { font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic; }

.ut-fin__rows { padding: 4px 20px 14px; }
.ut-fin__rows .ed-fin-row { font-size: 12px; padding: 8px 0; }

/* Activity */
.ut-activity { background: #fff; border: 1px solid var(--dc-gray-300); }
.ut-activity__head {
  padding: 14px 20px;
  background: var(--dc-gray-100);
  border-bottom: 1px solid var(--dc-gray-300);
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1);
  display: flex; align-items: center; justify-content: space-between;
}
.ut-activity__head .filter {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3);
  display: flex; gap: 10px;
}
.ut-activity__head .filter span.is-on { color: var(--fg-1); border-bottom: 1px solid var(--dc-brown); padding-bottom: 2px; }
.ut-activity .activity-row { padding: 10px 20px; }
.ut-activity .activity-row .text { font-size: 12px; }

/* Ship-today strip (operational) */
.ut-ship {
  background: var(--dc-black); color: #fff;
  display: flex; align-items: center; gap: 20px; padding: 14px 24px;
  border: 1px solid var(--dc-black);
  margin-bottom: 24px;
}
.ut-ship__lbl {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 2px; color: #D4A94A;
}
.ut-ship__list { display: flex; gap: 16px; flex-wrap: wrap; flex: 1; }
.ut-ship__item {
  font-family: var(--font-sans); font-size: 13px;
  display: flex; align-items: center; gap: 8px;
}
.ut-ship__item .po { font-family: var(--font-mono); font-size: 11px; color: #8B7355; }
.ut-ship__item::before {
  content: ''; display: inline-block; width: 4px; height: 4px; background: #D4A94A; border-radius: 50%;
}
.ut-ship__view {
  font-family: var(--font-sans); font-size: 11px; font-weight: 500;
  color: #D4A94A; text-transform: uppercase; letter-spacing: 1.5px;
  border: 1px solid #8B7355; padding: 6px 12px; cursor: pointer;
  transition: background 160ms ease;
}
.ut-ship__view:hover { background: var(--dc-brown); color: #fff; border-color: var(--dc-brown); }

/* Editorial ship today (less loud) — for Direction A */
.ed-ship {
  background: #fff; border: 2px solid var(--dc-brown);
  padding: 22px 28px;
  margin-bottom: 36px;
  display: grid; grid-template-columns: 220px 1fr auto; gap: 28px; align-items: center;
}
.ed-ship__label {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 8px;
}
.ed-ship__title {
  font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--fg-1);
  line-height: 1.2;
}
.ed-ship__list { display: flex; gap: 22px; flex-wrap: wrap; }
.ed-ship__list .one { display: flex; flex-direction: column; }
.ed-ship__list .one .n { font-family: var(--font-sans); font-size: 14px; color: var(--fg-1); }
.ed-ship__list .one .po { font-family: var(--font-mono); font-size: 11px; color: var(--dc-brown); margin-top: 2px; }
</style>
  <style>/* Dia-Co Portal — Order screens (New Order + Order Detail) */

/* ============================================================
   SHARED ORDER PAGE LAYOUT
   ============================================================ */
.order-page { display: grid; grid-template-columns: 1fr 360px; gap: 28px; align-items: start; }
.order-page__main { min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.order-page__side { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 88px; }

/* Page header (detail + new) */
.order-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 32px;
  padding-bottom: 22px;
  border-bottom: 6px solid var(--dc-brown);
  margin-bottom: 8px;
}
.order-head__eyebrow {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 12px; display: flex; align-items: center; gap: 10px;
}
.order-head__eyebrow .back {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3);
  cursor: pointer; border: none; background: none; padding: 0;
  display: inline-flex; align-items: center; gap: 4px;
}
.order-head__eyebrow .back:hover { color: var(--dc-brown); }
.order-head__title {
  font-family: var(--font-display); font-size: 42px; font-weight: 600;
  line-height: 1.05; color: var(--fg-1); letter-spacing: -0.01em; margin: 0;
  display: flex; align-items: center; gap: 16px;
}
.order-head__sub {
  font-family: var(--font-sans); font-style: italic; font-size: 14px;
  color: var(--fg-2); margin-top: 8px; line-height: 1.5;
}
.order-head__actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ============================================================
   COLLAPSIBLE ORDER SECTION (New Order — progressive disclosure)
   ============================================================ */
.osec {
  background: #fff;
  border: 1px solid var(--dc-gray-300);
  transition: border-color 180ms ease;
}
.osec.is-open { border-color: var(--dc-brown); }
.osec__head {
  display: grid; grid-template-columns: 52px 1fr auto auto; gap: 20px;
  align-items: center;
  padding: 20px 24px; cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: background 160ms ease, border-color 160ms ease;
}
.osec.is-open .osec__head {
  border-bottom-color: var(--dc-gray-200);
}
.osec__head:hover { background: #FBF7F1; }
.osec__num {
  font-family: var(--font-sans); font-size: 28px; font-weight: 300;
  color: var(--dc-brown); line-height: 1;
}
.osec__title {
  font-family: var(--font-display); font-size: 20px; font-weight: 600;
  color: var(--fg-1); line-height: 1.2;
  display: flex; align-items: center; gap: 10px;
}
.osec__title .req {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.osec__title .opt {
  font-family: var(--font-sans); font-size: 10px; font-weight: 500;
  color: var(--fg-3); text-transform: uppercase; letter-spacing: 1.5px;
  font-style: italic;
}
.osec__sub {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
  font-style: italic; margin-top: 4px;
}
.osec__summary {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2);
  text-align: right; line-height: 1.5;
}
.osec__summary strong { color: var(--fg-1); font-weight: 500; display: block; font-style: normal; }
.osec__summary em {
  font-style: italic; color: var(--fg-3);
}
.osec__chev {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--fg-3); transition: color 160ms ease, transform 200ms ease;
}
.osec.is-open .osec__chev { transform: rotate(90deg); color: var(--dc-brown); }

.osec__body { padding: 0 24px 28px 96px; }
.osec__body .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.osec__body .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

/* Form controls — clean */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.field:last-child { margin-bottom: 0; }
.field label {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  display: flex; align-items: center; gap: 6px;
}
.field label .opt { font-style: italic; color: var(--fg-3); text-transform: none; letter-spacing: 0; font-weight: 400; }
.field input, .field select, .field textarea {
  font-family: var(--font-sans); font-size: 14px; color: var(--fg-1);
  padding: 11px 14px; border: 1px solid var(--dc-gray-300); background: #fff;
  border-radius: 2px; outline: none;
  transition: border-color 160ms ease;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--dc-brown); }
.field textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
.field .hint { font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic; }

/* Big 'describe the piece' textarea */
.describe {
  font-family: var(--font-sans); font-size: 15px; color: var(--fg-1);
  padding: 20px; border: 1px solid var(--dc-gray-300); background: #fff;
  border-radius: 2px; outline: none; width: 100%; min-height: 140px;
  line-height: 1.7; resize: vertical;
  transition: border-color 160ms ease;
}
.describe:focus { border-color: var(--dc-brown); }

/* Dropzone — prominent */
.dropzone {
  border: 2px dashed var(--dc-gray-300);
  padding: 40px 24px; text-align: center;
  background: #fff;
  transition: border-color 160ms ease, background 160ms ease; cursor: pointer;
  margin-top: 14px;
}
.dropzone:hover, .dropzone.is-drag { border-color: var(--dc-brown); background: #FBF7F1; }
.dropzone__icon { color: var(--dc-brown); margin-bottom: 10px; }
.dropzone__title {
  font-family: var(--font-display); font-size: 18px; color: var(--fg-1);
  margin-bottom: 4px; font-weight: 600;
}
.dropzone__sub { font-size: 12px; color: var(--fg-3); }
.dropzone__sub strong { color: var(--fg-2); font-weight: 500; }

.uploaded-list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
.uploaded-row {
  display: grid; grid-template-columns: 32px 1fr auto 24px;
  gap: 12px; align-items: center;
  padding: 10px 14px; background: var(--dc-gray-050);
  border: 1px solid var(--dc-gray-200);
}
.uploaded-row .ico { color: var(--dc-brown); }
.uploaded-row .ico svg { width: 18px; height: 18px; stroke-width: 1.5; }
.uploaded-row .n { font-family: var(--font-sans); font-size: 13px; color: var(--fg-1); font-weight: 500; }
.uploaded-row .meta { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }
.uploaded-row .rm {
  color: var(--fg-3); background: none; border: none; cursor: pointer;
  width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
}
.uploaded-row .rm:hover { color: var(--dc-red); }

/* Pill toggles (product type, metal, stone shape) */
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  padding: 9px 16px; border: 1px solid var(--dc-gray-300); background: #fff;
  color: var(--fg-1); cursor: pointer; border-radius: 2px;
  transition: all 160ms ease;
  display: inline-flex; align-items: center; gap: 8px;
}
.pill:hover { border-color: var(--dc-brown); color: var(--dc-brown); }
.pill.is-active { background: var(--dc-black); color: #fff; border-color: var(--dc-black); }
.pill svg { width: 14px; height: 14px; stroke-width: 1.5; }

/* Metal / stone added rows */
.added-item {
  display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;
  padding: 14px 18px; background: var(--dc-gray-050); border: 1px solid var(--dc-gray-200);
  margin-bottom: 10px;
}
.added-item .spec { font-family: var(--font-sans); font-size: 13px; color: var(--fg-1); }
.added-item .spec strong { font-weight: 500; }
.added-item .spec .sep { color: var(--dc-brown); margin: 0 8px; }
.added-item .rm {
  background: none; border: none; color: var(--fg-3); cursor: pointer;
  font-family: var(--font-sans); font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 1px;
}
.added-item .rm:hover { color: var(--dc-red); }

/* Yes/no toggle row */
.yesno {
  display: flex; align-items: center; gap: 14px; margin-bottom: 18px;
}
.yesno__label {
  font-family: var(--font-sans); font-size: 14px; color: var(--fg-1); font-weight: 500;
}
.yesno__group { display: inline-flex; border: 1px solid var(--dc-gray-300); background: #fff; border-radius: 2px; }
.yesno__btn {
  padding: 8px 18px; background: transparent; border: none; cursor: pointer;
  font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--fg-2);
  transition: all 160ms ease;
}
.yesno__btn.is-on { background: var(--dc-black); color: #fff; }
.yesno__btn:first-child.is-on { border-radius: 1px 0 0 1px; }

/* Submit bar */
.submit-bar {
  background: #fff; border: 2px solid var(--dc-brown); padding: 22px 28px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  position: sticky; bottom: 0;
}
.submit-bar .recap {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); line-height: 1.5;
}
.submit-bar .recap strong { color: var(--fg-1); font-weight: 600; }
.submit-bar .actions { display: flex; gap: 10px; }

/* Sidebar on new order — live summary */
.side-summary { background: #fff; border: 1px solid var(--dc-gray-300); }
.side-summary__head { padding: 18px 22px; border-bottom: 1px solid var(--dc-gray-200); }
.side-summary__head .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;
}
.side-summary__head .tt { font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--fg-1); }
.side-summary__body { padding: 10px 22px 18px; }
.summary-row {
  display: grid; grid-template-columns: 88px 1fr; gap: 14px;
  padding: 10px 0; border-bottom: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans); font-size: 12px;
}
.summary-row:last-child { border-bottom: none; }
.summary-row .k {
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  font-size: 10px; font-weight: 600;
}
.summary-row .v { color: var(--fg-1); line-height: 1.5; }
.summary-row .v em { font-style: italic; color: var(--fg-3); }

/* ============================================================
   ORDER DETAIL
   ============================================================ */
.detail-status {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.5px;
  padding: 6px 12px; border-radius: 2px;
  background: #FBF1E9; color: var(--dc-brown); border: 1px solid #E8D7BF;
}
.detail-status .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* Hero card — CAD preview */
.cad-hero {
  background: #fff; border: 1px solid var(--dc-gray-300);
  display: grid; grid-template-columns: 1.6fr 1fr; gap: 0;
  overflow: hidden;
}
.cad-hero__main {
  aspect-ratio: 16/11;
  background: #EFEAE2 center/cover no-repeat;
  border-right: 1px solid var(--dc-gray-200);
  position: relative;
}
.cad-hero__main .hero-badge { position: absolute; top: 16px; left: 16px; }
.cad-hero__main .hero-3d {
  position: absolute; bottom: 16px; right: 16px;
  background: rgba(26,26,26,0.88); color: #fff;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.5px;
  padding: 8px 14px; border: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  transition: background 160ms ease;
}
.cad-hero__main .hero-3d:hover { background: var(--dc-brown); }
.cad-hero__thumbs {
  display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 1px;
  background: var(--dc-gray-200);
}
.cad-hero__thumb {
  background: #EFEAE2 center/cover no-repeat;
  aspect-ratio: 1; position: relative;
}
.cad-hero__thumb::after {
  content: attr(data-n);
  position: absolute; top: 8px; left: 10px;
  font-family: var(--font-mono); font-size: 10px; color: #fff;
  background: rgba(26,26,26,0.7); padding: 2px 6px; border-radius: 2px;
}
.cad-hero__meta {
  grid-column: 1 / -1;
  padding: 14px 24px;
  border-top: 1px solid var(--dc-gray-200);
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
}
.cad-hero__version {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-1);
}
.cad-hero__version select {
  font-family: var(--font-sans); font-size: 12px;
  border: 1px solid var(--dc-gray-300); padding: 6px 10px; background: #fff;
  border-radius: 2px;
}

/* Key specs strip (metal + stones + size) */
.key-specs {
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.key-spec {
  padding: 18px 22px; border-right: 1px solid var(--dc-gray-200);
  display: flex; flex-direction: column; gap: 4px;
}
.key-spec:last-child { border-right: none; }
.key-spec__k {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.key-spec__v {
  font-family: var(--font-sans); font-size: 15px; font-weight: 500; color: var(--fg-1);
}
.key-spec__n {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic;
}

/* Description block */
.desc-block {
  background: #fff; border: 1px solid var(--dc-gray-300); padding: 22px 24px;
}
.desc-block .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;
}
.desc-block p {
  font-family: var(--font-sans); font-size: 14px; color: var(--fg-1);
  line-height: 1.7; margin: 0; max-width: 720px;
}

/* Instruction history timeline */
.ihist { background: #fff; border: 1px solid var(--dc-gray-300); }
.ihist__head {
  padding: 16px 22px;
  border-bottom: 1px solid var(--dc-gray-200);
  display: flex; align-items: center; justify-content: space-between;
}
.ihist__head h4 {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1); margin: 0;
}
.ihist__thread { padding: 20px 22px; display: flex; flex-direction: column; gap: 20px; }
.ih-msg {
  display: grid; grid-template-columns: 36px 1fr; gap: 14px;
  position: relative;
}
.ih-msg::before {
  content: ''; position: absolute; left: 17px; top: 38px; bottom: -26px;
  width: 1px; background: var(--dc-gray-200);
}
.ih-msg:last-child::before { display: none; }
.ih-msg__av {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600; color: #fff;
  flex-shrink: 0; z-index: 1;
}
.ih-msg__av.dc { background: var(--dc-black); }
.ih-msg__av.us { background: var(--dc-brown); }
.ih-msg__head {
  display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px;
}
.ih-msg__name {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1);
}
.ih-msg__role {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
}
.ih-msg__time {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic;
  margin-left: auto;
}
.ih-msg__body {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); line-height: 1.6;
}
.ih-msg__body .event {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 12px; font-weight: 500;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1px;
}
.ihist__composer {
  border-top: 1px solid var(--dc-gray-200);
  padding: 16px 22px; display: flex; align-items: center; gap: 12px;
}
.ihist__composer input {
  flex: 1; all: unset;
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-1);
}
.ihist__composer .attach {
  color: var(--fg-3); cursor: pointer; width: 20px; height: 20px;
  display: inline-flex; align-items: center; justify-content: center;
}

/* Collapsible detail card */
.coll {
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.coll__head {
  padding: 16px 22px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  transition: background 160ms ease;
}
.coll__head:hover { background: #FBF7F1; }
.coll__head h4 {
  font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-1); margin: 0;
}
.coll__head .chev { color: var(--fg-3); transition: transform 160ms ease; }
.coll.is-open .coll__head .chev { transform: rotate(90deg); color: var(--dc-brown); }
.coll__body { padding: 4px 22px 22px; border-top: 1px solid var(--dc-gray-200); }
.kv-grid {
  display: grid; grid-template-columns: 110px 1fr; gap: 10px 18px;
  font-family: var(--font-sans); font-size: 13px;
}
.kv-grid .k {
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  font-size: 10px; font-weight: 600;
}
.kv-grid .v { color: var(--fg-1); }

/* Side rail on detail — action block */
.action-card {
  background: #fff; border: 2px solid var(--dc-brown); padding: 22px 24px;
}
.action-card__eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;
}
.action-card__title {
  font-family: var(--font-display); font-size: 20px; font-weight: 600;
  color: var(--fg-1); line-height: 1.2; margin-bottom: 8px;
}
.action-card__sub {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3); font-style: italic; line-height: 1.6; margin-bottom: 18px;
}
.action-card__quote {
  display: grid; grid-template-columns: 1fr auto;
  padding: 14px 0; margin-bottom: 14px;
  border-top: 1px solid var(--dc-gray-200); border-bottom: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans); font-size: 13px;
}
.action-card__quote .l { color: var(--fg-3); align-self: center; }
.action-card__quote .v {
  font-family: var(--font-sans); font-size: 26px; font-weight: 300; color: var(--fg-1);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.action-card__rows { display: flex; flex-direction: column; gap: 8px; }
.action-card__rows .row {
  display: flex; justify-content: space-between; font-family: var(--font-sans);
  font-size: 12px; color: var(--fg-2);
}
.action-card__rows .row strong { color: var(--fg-1); font-weight: 500; }
.action-card__actions { margin-top: 18px; display: flex; flex-direction: column; gap: 8px; }
.action-card__actions .btn { width: 100%; }

/* Activity compact card on detail side */
.side-activity { background: #fff; border: 1px solid var(--dc-gray-300); }
.side-activity .activity-row { padding: 12px 20px; }
.side-activity .activity-row .text { font-size: 12px; }

/* Stage progress ribbon at top of detail */
.stage-ribbon {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff; border: 1px solid var(--dc-gray-300);
}
.ribbon-cell {
  padding: 16px 14px; border-right: 1px solid var(--dc-gray-200);
  position: relative;
}
.ribbon-cell:last-child { border-right: none; }
.ribbon-cell .let {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--fg-3); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;
}
.ribbon-cell .ttl {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--fg-2); line-height: 1.3;
}
.ribbon-cell.is-done .let, .ribbon-cell.is-done .ttl { color: var(--fg-1); }
.ribbon-cell.is-done { background: #FBF7F1; }
.ribbon-cell.is-done::before {
  content: '✓'; position: absolute; top: 10px; right: 10px;
  width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--dc-brown); color: #fff; border-radius: 50%; font-size: 10px;
}
.ribbon-cell.is-current { background: var(--dc-black); color: #fff; }
.ribbon-cell.is-current .let { color: #D4A94A; }
.ribbon-cell.is-current .ttl { color: #fff; font-weight: 600; }
.ribbon-cell .sub {
  font-family: var(--font-sans); font-size: 11px; color: var(--fg-3);
  margin-top: 4px; line-height: 1.4;
}
.ribbon-cell.is-current .sub { color: rgba(255,255,255,0.7); }

/* Quote banner (free quotes always) */
.quote-banner {
  display: flex; gap: 14px; align-items: center;
  background: #FBF7F1; border: 1px solid var(--dc-gray-300);
  padding: 14px 20px; margin-bottom: 24px;
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); line-height: 1.5;
}
.quote-banner__ico {
  width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--dc-brown); color: #fff; border-radius: 50%; flex-shrink: 0;
}
.quote-banner strong { color: var(--fg-1); font-weight: 600; }

/* Itemized quote table */
.quote-table {
  border: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans);
}
.quote-table__row {
  display: grid;
  grid-template-columns: 2.5fr 0.6fr 0.9fr 0.9fr;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--dc-gray-200);
  font-size: 13px; color: var(--fg-2); line-height: 1.5;
}
.quote-table__row:last-child { border-bottom: none; }
.quote-table__row .r { text-align: right; font-variant-numeric: tabular-nums; color: var(--fg-1); }
.quote-table__row strong { color: var(--fg-1); font-weight: 600; }
.quote-table__row--head {
  background: var(--dc-gray-100);
  font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--fg-3); font-weight: 600;
}
.quote-table__row--head .r { color: var(--fg-3); }
.quote-table__row--sub { background: #FBF9F5; font-size: 12px; color: var(--fg-3); }
.quote-table__row--total {
  background: var(--dc-black); color: #fff;
  font-size: 14px;
}
.quote-table__row--total .r, .quote-table__row--total strong { color: #fff; }
.quote-actions {
  display: flex; gap: 10px; justify-content: flex-end; padding-top: 14px;
}

/* Share popover */
.share-pop {
  background: #fff; border: 1px solid var(--dc-black);
  padding: 22px 26px; margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(26,26,26,0.08);
}
.share-pop__head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.share-pop__head strong {
  font-family: var(--font-display); font-size: 18px; color: var(--fg-1); font-weight: 600;
}
.share-pop__head button {
  background: none; border: 1px solid var(--dc-gray-300); width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--fg-2);
}
.share-pop__sub {
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); line-height: 1.5;
  margin: 0 0 14px;
}
.share-pop__url {
  display: flex; gap: 10px; align-items: center;
  background: var(--dc-gray-100); border: 1px solid var(--dc-gray-300);
  padding: 8px 10px 8px 14px; margin-bottom: 14px;
}
.share-pop__rows {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
}
.share-pop__row {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); cursor: pointer;
}

/* Modification request inline form */
.mod-form {
  border-top: 1px solid var(--dc-gray-200);
  padding: 18px 22px;
  background: #FBF7F1;
}
.mod-form__head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 4px;
}
.mod-form__head strong {
  font-family: var(--font-display); font-size: 16px; color: var(--fg-1); font-weight: 600;
}
.mod-form__head button {
  background: none; border: 1px solid var(--dc-gray-300); width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--fg-2);
}
.mod-form__sub {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); line-height: 1.5;
  margin: 0 0 12px;
}
.mod-form textarea {
  width: 100%; padding: 10px 12px; font-family: var(--font-sans); font-size: 13px;
  border: 1px solid var(--dc-gray-300); background: #fff; resize: vertical; line-height: 1.5;
  color: var(--fg-1); margin-bottom: 10px;
}
.mod-form__attach {
  display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
}
.mod-form__attach .attach-btn {
  background: none; border: 1px dashed var(--dc-gray-300); padding: 6px 12px;
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2);
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
}
.mod-form__actions {
  display: flex; gap: 10px; justify-content: flex-end;
}

/* Section sub-heading inside order form */
.osec__sub-h {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  margin: 18px 0 12px; padding-top: 14px; border-top: 1px solid var(--dc-gray-200);
}
.osec__sub-h:first-child { padding-top: 0; border-top: none; margin-top: 0; }

/* Metal row card */
.metal-row {
  border: 1px solid var(--dc-gray-200); padding: 14px 16px; margin-bottom: 12px;
  background: var(--dc-cream);
}
.metal-row__head {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}
.metal-row__head .ml-num {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--fg-3); text-transform: uppercase; letter-spacing: 1.5px;
}
.metal-row__head .rm {
  background: none; border: none; cursor: pointer;
  font-family: var(--font-sans); font-size: 12px; color: var(--dc-red, #B23B2E);
}

/* Callout (info hint within sections) */
.callout {
  display: flex; gap: 10px; align-items: flex-start;
  background: #FBF7F1; border-left: 2px solid var(--dc-brown);
  padding: 10px 14px; margin: 12px 0 0;
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); line-height: 1.5;
}

/* CAD hero — 3D iframe variant */
.cad-hero__3d {
  aspect-ratio: 16/11;
  position: relative;
}
.cad-hero__3d .hero-3d--exit {
  background: rgba(26,26,26,0.88) !important;
}

</style>
  <style>/* Pages: Orders list, History, Submit 3D, Accounting, Admin */

/* ================ ORDERS LIST + HISTORY ================ */
.orders-tabs {
  display: flex; gap: 0; border-bottom: 1px solid var(--dc-gray-300);
  margin-bottom: 0;
}
.orders-tabs__tab {
  padding: 14px 22px; background: none; border: none; cursor: pointer;
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  color: var(--fg-3); border-bottom: 2px solid transparent;
  display: inline-flex; align-items: center; gap: 8px;
  transition: color 160ms ease, border-color 160ms ease;
}
.orders-tabs__tab:hover { color: var(--fg-1); }
.orders-tabs__tab.is-active { color: var(--fg-1); border-bottom-color: var(--dc-brown); }
.orders-tabs__tab .count {
  font-family: var(--font-mono); font-size: 10px;
  background: var(--dc-gray-100); color: var(--fg-2);
  padding: 2px 7px; border-radius: 2px; letter-spacing: 0.5px;
}
.orders-tabs__tab.is-active .count { background: var(--dc-brown); color: #fff; }

.orders-toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 0 22px;
  border-bottom: 1px solid var(--dc-gray-200);
  margin-bottom: 24px;
}
.orders-toolbar .search {
  flex: 1; max-width: 360px;
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; background: #fff;
  border: 1px solid var(--dc-gray-300); border-radius: 2px;
}
.orders-toolbar .search input {
  all: unset; flex: 1; font-family: var(--font-sans); font-size: 13px; color: var(--fg-1);
}
.orders-toolbar .filter {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; background: #fff; border: 1px solid var(--dc-gray-300);
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-1); cursor: pointer;
  border-radius: 2px;
}
.orders-toolbar .filter:hover { border-color: var(--dc-brown); }
.orders-toolbar .filter.is-on { background: var(--dc-black); color: #fff; border-color: var(--dc-black); }
.orders-toolbar .spacer { flex: 1; }

/* Active orders — card grid (smaller, denser per spec) */
.orders-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
}
@media (max-width: 1280px) { .orders-grid { grid-template-columns: repeat(3, 1fr); } }
.order-card {
  background: #fff; border: 1px solid var(--dc-gray-300);
  display: flex; flex-direction: column; cursor: pointer;
  text-decoration: none;
  transition: border-color 180ms ease, transform 180ms ease;
}
.order-card:hover { border-color: var(--dc-brown); }
.order-card__img {
  aspect-ratio: 4/3;
  background: #EFEAE2 center/cover no-repeat;
  position: relative; border-bottom: 1px solid var(--dc-gray-200);
}
.order-card__img .b1 { position: absolute; top: 10px; left: 10px; }
.order-card__img .b2 { position: absolute; top: 10px; right: 10px; }
.order-card__body { padding: 12px 14px 12px; display: flex; flex-direction: column; gap: 3px; }
.order-card__po {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px;
  color: var(--dc-brown);
}
.order-card__title {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  color: var(--fg-2); line-height: 1.3;
}
.order-card__spec {
  font-family: var(--font-sans); font-size: 12px; color: var(--fg-3);
  font-style: italic; margin-top: 2px;
}
.order-card__foot {
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--dc-gray-200);
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--font-sans); font-size: 12px;
}
.order-card__foot .l { color: var(--fg-1); font-weight: 500; font-variant-numeric: tabular-nums; }
.order-card__foot .r { color: var(--fg-3); font-style: italic; }

/* Shipped orders — full-width archival rows (NOT same as active) */
.shipped-list { background: #fff; border: 1px solid var(--dc-gray-300); }
.shipped-row {
  display: grid;
  grid-template-columns: 56px 1.4fr 1.2fr 110px 110px 130px 60px;
  gap: 16px; align-items: center;
  padding: 14px 22px; border-top: 1px solid var(--dc-gray-200);
  cursor: pointer;
  transition: background 160ms ease;
}
.shipped-row:first-child { border-top: none; }
.shipped-row:hover { background: #FBF7F1; }
.shipped-row .img {
  width: 56px; height: 56px; background: #EFEAE2 center/cover no-repeat;
  border: 1px solid var(--dc-gray-300);
}
.shipped-row .name { font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--fg-1); line-height: 1.3; }
.shipped-row .po   { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-top: 3px; letter-spacing: 0.5px; }
.shipped-row .spec { font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); font-style: italic; line-height: 1.4; }
.shipped-row .when { font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); }
.shipped-row .when strong { color: var(--fg-1); display: block; font-weight: 500; font-size: 13px; }
.shipped-row .track { font-family: var(--font-mono); font-size: 11px; color: var(--dc-brown); border-bottom: 1px dotted currentColor; }
.shipped-row .total { font-family: var(--font-sans); font-size: 14px; color: var(--fg-1); font-variant-numeric: tabular-nums; text-align: right; font-weight: 500; }
.shipped-row .reorder {
  text-align: right;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 1.5px;
  cursor: pointer; border: none; background: none;
}
.shipped-row .reorder:hover { text-decoration: underline; }

/* ================ SUBMIT 3D ================ */
.submit3d-hero {
  background: #fff; border: 1px solid var(--dc-gray-300);
  display: grid; grid-template-columns: 1.1fr 1fr; gap: 0;
  margin-bottom: 28px;
}
.submit3d-hero__left {
  padding: 36px 40px;
  border-right: 1px solid var(--dc-gray-200);
}
.submit3d-hero__left .eyebrow {
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;
}
.submit3d-hero__left h2 {
  font-family: var(--font-display); font-size: 32px; font-weight: 600;
  color: var(--fg-1); line-height: 1.1; letter-spacing: -0.005em; margin: 0 0 10px;
}
.submit3d-hero__left h2 em { font-style: italic; color: var(--dc-brown); }
.submit3d-hero__left p {
  font-family: var(--font-sans); font-size: 14px; color: var(--fg-2); line-height: 1.6;
  max-width: 380px; margin: 0;
}
.submit3d-hero__list {
  margin-top: 22px; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 14px;
}
.submit3d-hero__list li {
  display: grid; grid-template-columns: 28px 1fr; gap: 12px; align-items: flex-start;
  font-family: var(--font-sans); font-size: 13px; color: var(--fg-2); line-height: 1.5;
}
.submit3d-hero__list li strong { color: var(--fg-1); font-weight: 500; }
.submit3d-hero__list li .n {
  width: 24px; height: 24px; border: 1px solid var(--dc-brown); color: var(--dc-brown);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
}
.submit3d-hero__right {
  padding: 36px 40px; background: var(--dc-gray-100);
  display: flex; flex-direction: column;
}
.big-drop {
  flex: 1; min-height: 260px;
  border: 2px dashed var(--dc-gray-300);
  background: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 32px; cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}
.big-drop:hover { border-color: var(--dc-brown); background: #FBF7F1; }
.big-drop__icon { color: var(--dc-brown); }
.big-drop__title { font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--fg-1); }
.big-drop__sub { font-family: var(--font-sans); font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; line-height: 1.5; }
.big-drop__btn {
  margin-top: 8px;
  font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--dc-brown);
  text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
}

/* recent submissions table */
.subm-table { background: #fff; border: 1px solid var(--dc-gray-300); }
.subm-row {
  display: grid;
  grid-template-columns: 32px 1fr 110px 130px 110px;
  gap: 14px; align-items: center; padding: 12px 22px;
  border-top: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans); font-size: 13px;
}
.subm-row:first-child { border-top: none; }
.subm-row .ico { color: var(--dc-brown); }
.subm-row .n { font-weight: 500; color: var(--fg-1); }
.subm-row .meta { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }
.subm-row .when { color: var(--fg-2); }
.subm-row .stat { color: var(--fg-3); font-style: italic; font-size: 12px; }
.subm-row .stat--ok { color: #2D6A4F; font-style: normal; font-weight: 500; }

/* ================ ACCOUNTING ================ */
.acct-hero {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  background: #fff; border: 1px solid var(--dc-gray-300);
  margin-bottom: 28px;
}
.acct-tile {
  padding: 26px 28px;
  border-right: 1px solid var(--dc-gray-200);
  display: flex; flex-direction: column; gap: 8px;
}
.acct-tile:last-child { border-right: none; }
.acct-tile .eyebrow {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  color: var(--dc-brown); text-transform: uppercase; letter-spacing: 2px;
}
.acct-tile .v {
  font-family: var(--font-sans); font-size: 36px; font-weight: 300;
  color: var(--fg-1); line-height: 1; font-variant-numeric: tabular-nums;
}
.acct-tile .v--alert { color: var(--dc-red); }
.acct-tile .n { font-family: var(--font-sans); font-size: 12px; color: var(--fg-3); font-style: italic; }

/* Alert variant — emphasizes overdue */
.acct-tile--alert {
  background: linear-gradient(180deg, #FCEFEC 0%, #fff 70%);
}
.acct-tile--alert .eyebrow { color: var(--dc-red); }
.acct-tile--alert .v { color: var(--dc-red); }
.acct-tile--alert .n { color: var(--dc-red); font-weight: 500; font-style: normal; }

/* Overdue banner — sits above the hero tiles when overdue > 0 */
.acct-overdue-banner {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 16px; align-items: center;
  background: var(--dc-red); color: #fff;
  padding: 16px 22px;
  margin-bottom: 18px;
  border: 1px solid var(--dc-red);
}
.acct-overdue-banner__ico {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.16);
  color: #fff;
}
.acct-overdue-banner__title {
  font-family: var(--font-display); font-size: 17px; font-weight: 600;
  color: #fff; line-height: 1.2;
}
.acct-overdue-banner__sub {
  font-family: var(--font-sans); font-size: 12px; color: rgba(255,255,255,0.82);
  margin-top: 3px;
}
.acct-overdue-banner .btn {
  background: #fff; color: var(--dc-red); border-color: #fff;
}
.acct-overdue-banner .btn:hover { background: #FBF7F1; color: var(--dc-red); border-color: #fff; }

.invoice-list { background: #fff; border: 1px solid var(--dc-gray-300); }
.invoice-row {
  display: grid;
  grid-template-columns: 80px 1fr 110px 110px 110px 110px 80px;
  gap: 16px; align-items: center;
  padding: 14px 22px;
  border-top: 1px solid var(--dc-gray-200);
  font-family: var(--font-sans); font-size: 13px;
}
.invoice-row:first-child { border-top: none; }
.invoice-row:hover { background: #FBF7F1; cursor: pointer; }
.invoice-row .num { font-family: var(--font-mono); font-size: 12px; color: var(--dc-brown); letter-spacing: 0.5px; }
.invoice-row .desc { color: var(--fg-1); }
.invoice-row .desc small { display: block; color: var(--fg-3); font-size: 11px; margin-top: 2px; font-style: italic; }
.invoice-row .when { color: var(--fg-2); }
.invoice-row .total { font-variant-numeric: tabular-nums; font-weight: 500; color: var(--fg-1); }
.invoice-row--alert {
  background: #FDF6F4;
  border-left: 3px solid var(--dc-red);
  padding-left: 17px;
}
.invoice-row--alert .num { color: var(--dc-red); font-weight: 600; }
.invoice-row--alert .total { color: var(--dc-red); }

/* Locked field tag — used in Admin company profile */
.field label .locked {
  font-family: var(--font-sans); font-size: 10px; font-weight: 500;
  color: var(--fg-3); font-style: italic;
  margin-left: 4px; text-transform: none; letter-spacing: 0;
}
.field input:disabled {
  background: var(--dc-gray-050); color: var(--fg-2); cursor: not-allowed;
}

/* ================ ADMIN ================ */
.admin-grid { display: grid; grid-template-columns: 220px 1fr; gap: 28px; align-items: start; }
.admin-side {
  background: #fff; border: 1px solid var(--dc-gray-300);
  padding: 8px 0; position: sticky; top: 88px;
}
.admin-side__link {
  display: block; padding: 11px 18px;
  font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--fg-2);
  cursor: pointer; border-left: 3px solid transparent;
  transition: all 160ms ease; background: none; border: none; width: 100%; text-align: left;
  border-left: 3px solid transparent;
}
.admin-side__link:hover { color: var(--fg-1); background: #FBF7F1; }
.admin-side__link.is-active {
  color: var(--fg-1); background: #FBF7F1; border-left-color: var(--dc-brown);
}
.admin-card {
  background: #fff; border: 1px solid var(--dc-gray-300); margin-bottom: 24px;
}
.admin-card__head {
  padding: 18px 24px; border-bottom: 1px solid var(--dc-gray-200);
}
.admin-card__head h3 {
  font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--fg-1); margin: 0;
}
.admin-card__head p {
  font-family: var(--font-sans); font-size: 12px; font-style: italic; color: var(--fg-3);
  margin: 4px 0 0;
}
.admin-card__body { padding: 22px 24px; }
.admin-card__body .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

.team-row {
  display: grid;
  grid-template-columns: 36px 1fr 1fr 110px 80px;
  gap: 14px; align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--dc-gray-200);
}
.team-row:last-child { border-bottom: none; }
.team-row .av {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--dc-brown); color: #fff;
  font-family: var(--font-sans); font-size: 11px; font-weight: 600;
}
.team-row .n { font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: var(--fg-1); }
.team-row .e { font-family: var(--font-sans); font-size: 12px; color: var(--fg-3); margin-top: 2px; }
.team-row .role { font-family: var(--font-sans); font-size: 12px; color: var(--fg-2); }
.team-row .last { font-family: var(--font-sans); font-size: 11px; color: var(--fg-3); font-style: italic; }
.team-row .menu { color: var(--fg-3); cursor: pointer; text-align: right; }
.team-row .menu:hover { color: var(--dc-brown); }
</style>
  <style>
    body { background: #ECE8E0; font-family: 'IBM Plex Sans', sans-serif; }
    .frame {
      width: 1440px; overflow: hidden;
      background: var(--dc-gray-050); position: relative;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .frame .portal { min-height: 100%; }
    .frame .portal__main { padding: 36px 48px 56px; }
  </style>
</head>
<body>
  

  <div id="root"></div>

  <script src="400d1436-e964-4d0c-be65-2a1c223a372c" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="22518e49-cfc4-458e-9b2c-5e9ced810f39" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
  <script src="b0f2e4e8-02bf-40ea-ba37-3120d3cf4435" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
  <script src="f11b800b-4cf6-49b6-8364-7808ce8b216a"></script>

  <script type="text/babel" src="0ed5a535-a1c9-481e-9ea7-801c5d15bcf6"></script>
  <script type="text/babel" src="8a69b1ae-c21c-440c-8e58-992f6101c3f4"></script>
  <script type="text/babel" src="b60d2a69-a672-4529-a71b-c185b4cdacf7"></script>
  <script type="text/babel" src="7c10878b-e0f8-42a2-86c2-81ca5d07a59a"></script>
  <script type="text/babel" src="f98294fe-c6e8-4f00-90a6-b165f021d300"></script>
  <script type="text/babel" src="4a71d184-be8b-4dd0-83d5-4d5fb856edce"></script>

  <script type="text/babel">
    const { useState, useEffect } = React;
    const { DesignCanvas, DCSection, DCArtboard } = window;
    const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor } = window;
    const { Topbar, Sidebar, DashUtility, OrdersList, HistoryScreen } = window;

    const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      "sidebar": "light",
      "accent": "#8B7355"
    }/*EDITMODE-END*/;

    const Frame = ({ children, height, sidebar, label, current }) => (
      <div className="frame" data-screen-label={label} style={{height}}>
        <div className="portal" style={{ '--sidebar-w': '232px', height }}>
          <Topbar />
          <Sidebar current={current} dark={sidebar === 'dark'} />
          <main className="portal__main">{children}</main>
        </div>
      </div>
    );

    const App = () => {
      const [tw, setTw] = useTweaks(TWEAK_DEFAULTS);
      const [edit, setEdit] = useState(false);

      useEffect(() => {
        const id = setInterval(() => { if (window.lucide) window.lucide.createIcons(); }, 200);
        return () => clearInterval(id);
      }, []);
      useEffect(() => {
        document.documentElement.style.setProperty('--dc-brown', tw.accent);
      }, [tw.accent]);

      return (
        <>
          <DesignCanvas
            title="Dia-Co Portal · Dashboard, Orders, History"
            subtitle="Three screens for review — drag to reorder, click any board to focus.">

            <DCSection id="dashboard" title="Dashboard B · Utility">
              <DCArtboard id="dash-utility" label="Dashboard B — utility direction" width={1440} height={1180}>
                <Frame height={1180} sidebar={tw.sidebar} current="dashboard" label="01 Dashboard">
                  <DashUtility />
                </Frame>
              </DCArtboard>
            </DCSection>

            <DCSection id="orders" title="Orders list">
              <DCArtboard id="orders-list" label="Orders list — Active vs Shipped" width={1440} height={1200}>
                <Frame height={1200} sidebar={tw.sidebar} current="orders" label="02 Orders list">
                  <OrdersList />
                </Frame>
              </DCArtboard>
            </DCSection>

            <DCSection id="history" title="History">
              <DCArtboard id="history-view" label="History — past shipped orders by month" width={1440} height={1280}>
                <Frame height={1280} sidebar={tw.sidebar} current="history" label="03 History">
                  <HistoryScreen />
                </Frame>
              </DCArtboard>
            </DCSection>

          </DesignCanvas>

          <TweaksPanel title="Tweaks" open={edit} onOpenChange={setEdit}>
            <TweakSection title="Navigation">
              <TweakRadio
                label="Sidebar style"
                value={tw.sidebar}
                onChange={v => setTw({ sidebar: v })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark',  label: 'Dark' }
                ]}
              />
            </TweakSection>
            <TweakSection title="Brand">
              <TweakColor label="Accent color" value={tw.accent} onChange={v => setTw({ accent: v })} />
            </TweakSection>
          </TweaksPanel>
        </>
      );
    };

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>


</body></html>



## ==================== FILE: orders_and_history.jsx ====================


/* global React */
const { useState } = React;
const { Icon, Badge, Button, IMG, fmt$ } = window;

// ================ ORDERS LIST ================
// Active orders use PO + Rep (no piece descriptions per spec)
const ORDERS_ACTIVE = [
  { id: 'C10605', po: 'PO-10605',     rep: 'Priya A.',  img: IMG.ring_solitaire,  stage: 'A · Designing',  stageName: 'CAD ready · review',     ship: 'Apr 28', kind: 'review',     quote: 1872.40 },
  { id: 'C4409',  po: 'PO-4409',      rep: 'Jordan D.', img: IMG.ring_band,       stage: 'A · Designing',  stageName: 'CAD draft in progress',  ship: 'May 02', kind: 'review',     quote: null    },
  { id: 'C4408',  po: 'PO-4408-RJR',  rep: 'Priya A.',  img: IMG.ring_pave,       stage: 'A · Designing',  stageName: 'Mod requested by Dia-Co',ship: 'May 04', kind: 'mod',        quote: 845.00  },
  { id: 'C264',   po: 'PO-264',       rep: 'Ramesh B.', img: IMG.ring_eternity,   stage: 'A · Designing',  stageName: 'CAD v2 ready',           ship: 'May 06', kind: 'review',     quote: 748.00  },
  { id: 'C263',   po: 'PO-MK-2401',   rep: 'Ramesh B.', img: IMG.ring_signet,     stage: 'B · Production', stageName: 'Finishing',              ship: 'Apr 28', kind: 'production', quote: 2150.00 },
  { id: 'C262',   po: 'PO-AR-118',    rep: 'Jordan D.', img: IMG.tennis_bracelet, stage: 'B · Production', stageName: 'Casting',                ship: 'May 02', kind: 'production', quote: 4860.00 },
  { id: 'C261',   po: 'PO-PS-77',     rep: 'Priya A.',  img: IMG.ring_pave,       stage: 'B · Production', stageName: 'Setting',                ship: 'May 04', kind: 'production', quote: 1640.00 },
  { id: 'C260',   po: 'PO-ET-2026',   rep: 'Samira M.', img: IMG.pendant,         stage: 'B · Production', stageName: 'Mounting',               ship: 'May 11', kind: 'late',       quote: 5033.40, lateBy: 3 }
];

const ORDERS_SHIPPED = [
  { id: 'C259', po: 'PO-LM-44',  rep: 'Priya A.',  img: IMG.ring_solitaire, shipped: 'Apr 22', track: '1Z999AA10123456784', total: 1640.00 },
  { id: 'C258', po: 'PO-RO-12',  rep: 'Jordan D.', img: IMG.ring_band,      shipped: 'Apr 22', track: '1Z999AA10123456771', total:  920.50 },
  { id: 'C257', po: 'PO-DM-9',   rep: 'Ramesh B.', img: IMG.grillz,         shipped: 'Apr 18', track: '1Z999AA10123456765', total: 1280.00 },
  { id: 'C256', po: 'PO-YK-5',   rep: 'Samira M.', img: IMG.ring_cocktail,  shipped: 'Apr 14', track: '1Z999AA10123456752', total: 2240.40 },
  { id: 'C255', po: 'PO-JH-3',   rep: 'Priya A.',  img: IMG.pendant,        shipped: 'Apr 11', track: '1Z999AA10123456748', total:  865.20 },
  { id: 'C254', po: 'PO-254',    rep: 'Jordan D.', img: IMG.tennis_bracelet,shipped: 'Apr 04', track: '1Z999AA10123456739', total: 3120.00 },
  { id: 'C253', po: 'PO-253',    rep: 'Ramesh B.', img: IMG.ring_eternity,  shipped: 'Mar 29', track: '1Z999AA10123456722', total:  720.00 }
];

const OrdersList = () => {
  const [tab, setTab] = useState('active');
  const [filter, setFilter] = useState('all');

  const filtered = tab === 'active'
    ? (filter === 'all' ? ORDERS_ACTIVE
        : filter === 'review' ? ORDERS_ACTIVE.filter(o => o.kind === 'review' || o.kind === 'mod')
        : filter === 'production' ? ORDERS_ACTIVE.filter(o => o.kind === 'production')
        : filter === 'late' ? ORDERS_ACTIVE.filter(o => o.kind === 'late')
        : ORDERS_ACTIVE)
    : ORDERS_SHIPPED;

  return (
    <div>
      <div className="order-head">
        <div>
          <div className="order-head__eyebrow">Workspace</div>
          <h1 className="order-head__title">Orders</h1>
          <div className="order-head__sub">Everything in flight, plus what's already shipped — kept visually distinct so you don't lose your place.</div>
        </div>
        <div className="order-head__actions">
          <Button variant="sec" icon="upload">Submit 3D file</Button>
          <Button icon="plus">New order</Button>
        </div>
      </div>

      <div className="orders-tabs">
        <button className={`orders-tabs__tab ${tab==='active'?'is-active':''}`} onClick={()=>{setTab('active'); setFilter('all');}}>
          Active <span className="count">{ORDERS_ACTIVE.length}</span>
        </button>
        <button className={`orders-tabs__tab ${tab==='shipped'?'is-active':''}`} onClick={()=>setTab('shipped')}>
          Shipped <span className="count">{ORDERS_SHIPPED.length}</span>
        </button>
        <button className="orders-tabs__tab">Drafts <span className="count">2</span></button>
        <button className="orders-tabs__tab">Cancelled <span className="count">1</span></button>
      </div>

      <div className="orders-toolbar">
        <div className="search">
          <Icon name="search" size={14}/>
          <input placeholder={`Search ${tab} orders by PO or rep…`}/>
        </div>
        {tab === 'active' && (
          <>
            <button className={`filter ${filter==='all'?'is-on':''}`}     onClick={()=>setFilter('all')}>All stages</button>
            <button className={`filter ${filter==='review'?'is-on':''}`}  onClick={()=>setFilter('review')}>Stage A · Designing · {ORDERS_ACTIVE.filter(o=>o.kind==='review'||o.kind==='mod').length}</button>
            <button className={`filter ${filter==='production'?'is-on':''}`} onClick={()=>setFilter('production')}>Stage B · Production · {ORDERS_ACTIVE.filter(o=>o.kind==='production').length}</button>
            <button className={`filter ${filter==='late'?'is-on':''}`}    onClick={()=>setFilter('late')}>Late · {ORDERS_ACTIVE.filter(o=>o.kind==='late').length}</button>
          </>
        )}
        {tab === 'shipped' && (
          <>
            <button className="filter is-on">Last 90 days</button>
            <button className="filter">2025</button>
            <button className="filter">All time</button>
          </>
        )}
        <div className="spacer"></div>
        <button className="filter"><Icon name="download" size={12}/> Export</button>
      </div>

      {tab === 'active' ? (
        <div className="orders-grid">
          {filtered.map(o => {
            const kindBadge = o.kind === 'mod'
              ? <Badge kind="alert" dot>Mod requested</Badge>
              : o.kind === 'review'
                ? <Badge kind="warn" dot>Needs review</Badge>
                : o.kind === 'late'
                  ? <Badge kind="alert" dot>Late · +{o.lateBy}d</Badge>
                  : <Badge kind="ok" dot>On track</Badge>;
            const stageLetter = o.stage.charAt(0);
            return (
              <a key={o.id} href="#" className="order-card" onClick={e => e.preventDefault()}>
                <div className="order-card__img" style={{ backgroundImage: `url(${o.img})` }}>
                  <span className="b1">{kindBadge}</span>
                  <span className="b2"><Badge kind="dark">Stage {stageLetter}</Badge></span>
                </div>
                <div className="order-card__body">
                  <div className="order-card__po">{o.id} · {o.po}</div>
                  <div className="order-card__title">Rep: {o.rep}</div>
                  <div className="order-card__spec">{o.stageName}</div>
                  <div className="order-card__foot">
                    <span className="l">{o.quote ? fmt$(o.quote) : 'Quote pending'}</span>
                    <span className="r">Ship {o.ship}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="shipped-list">
          {filtered.map(o => (
            <div key={o.id} className="shipped-row">
              <div className="img" style={{ backgroundImage: `url(${o.img})` }} />
              <div>
                <div className="name">{o.po}</div>
                <div className="po">{o.id} · Rep: {o.rep}</div>
              </div>
              <div className="spec">{o.track.slice(0, 18)}…</div>
              <div className="when">Shipped<strong>{o.shipped}</strong></div>
              <div className="track" title="Track shipment">UPS · 2-day</div>
              <div className="total">{fmt$(o.total)}</div>
              <button className="reorder">Reorder</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================ SUBMIT 3D ================
const Submit3DScreen = () => (
  <div>
    <div className="order-head">
      <div>
        <div className="order-head__eyebrow">Create</div>
        <h1 className="order-head__title">Submit a 3D file.</h1>
        <div className="order-head__sub">Already have CAD? Drop it here for a fast quote — no design questionnaire required.</div>
      </div>
      <div className="order-head__actions">
        <Button variant="ghost">Cancel</Button>
      </div>
    </div>

    <div className="submit3d-hero">
      <div className="submit3d-hero__left">
        <div className="eyebrow">How this works</div>
        <h2>Drop your file. <em>We'll handle the rest.</em></h2>
        <p>Send us your finished 3D file and we'll quote, cast, and ship — with video at every stage.</p>
        <ul className="submit3d-hero__list">
          <li><span className="n">1</span><span><strong>Upload</strong> your STL, 3DM, OBJ, or ZIP. Up to 200&nbsp;MB.</span></li>
          <li><span className="n">2</span><span><strong>Tell us metal &amp; size.</strong> Optional notes for stones, finishing, engraving.</span></li>
          <li><span className="n">3</span><span><strong>Quote in 18&ndash;48 hours.</strong> Approve and we cast.</span></li>
        </ul>
      </div>
      <div className="submit3d-hero__right">
        <div className="big-drop">
          <div className="big-drop__icon"><Icon name="upload-cloud" size={48}/></div>
          <div className="big-drop__title">Drop your file here</div>
          <div className="big-drop__sub">.stl, .3dm, .obj, .zip · up to 200 MB<br/>Multiple files? Drop a zip.</div>
          <span className="big-drop__btn">or browse</span>
        </div>
      </div>
    </div>

    <div className="sec-row">
      <div>
        <span className="sec-eyebrow">Recent submissions</span>
        <h3>Files you've sent</h3>
      </div>
      <span className="sec-row__link">View all →</span>
    </div>
    <div className="subm-table">
      {[
        { n: 'solitaire_v3.stl',         meta: '4.2 MB · STL',  when: '2h ago',     stat: 'Quoted',    ok: true,  to: 'PO-10605' },
        { n: 'channel_band.3dm',         meta: '1.8 MB · 3DM',  when: '1d ago',     stat: 'In review', ok: false, to: 'PO-4409'  },
        { n: 'pendant_halo.zip',         meta: '12.4 MB · ZIP', when: '3d ago',     stat: 'Quoted',    ok: true,  to: 'PO-262'   },
        { n: 'engraved_signet_final.stl',meta: '6.0 MB · STL',  when: '1w ago',     stat: 'Approved',  ok: true,  to: 'C263'     },
        { n: 'bangle_v2.obj',            meta: '3.1 MB · OBJ',  when: '2w ago',     stat: 'Approved',  ok: true,  to: 'C261'     }
      ].map((r, i) => (
        <div key={i} className="subm-row">
          <span className="ico"><Icon name={r.n.endsWith('zip') ? 'archive' : 'box'} size={18}/></span>
          <div>
            <div className="n">{r.n}</div>
            <div className="meta">{r.meta} → {r.to}</div>
          </div>
          <span className="when">{r.when}</span>
          <span className={`stat ${r.ok ? 'stat--ok' : ''}`}>{r.stat}</span>
          <span><Icon name="chevron-right" size={14}/></span>
        </div>
      ))}
    </div>
  </div>
);

// ================ HISTORY (past orders) ================
const HistoryScreen = () => (
  <div>
    <div className="order-head">
      <div>
        <div className="order-head__eyebrow">Workspace</div>
        <h1 className="order-head__title">History</h1>
        <div className="order-head__sub">Every shipped piece, organized by year. Reorder any of them with one click.</div>
      </div>
      <div className="order-head__actions">
        <Button variant="sec" icon="download">Export CSV</Button>
      </div>
    </div>

    <div className="orders-toolbar" style={{ borderBottom: '1px solid var(--dc-gray-200)', paddingTop: 0 }}>
      <div className="search">
        <Icon name="search" size={14}/>
        <input placeholder="Search 912 past orders by PO or rep…"/>
      </div>
      <button className="filter is-on">2026 · 47</button>
      <button className="filter">2025 · 312</button>
      <button className="filter">2024 · 287</button>
      <button className="filter">Earlier · 266</button>
      <div className="spacer"></div>
      <button className="filter"><Icon name="filter" size={12}/> Filter</button>
    </div>

    <div className="sec-row">
      <div>
        <span className="sec-eyebrow">April 2026</span>
        <h3>This month — 8 shipped</h3>
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>
        Total billed: $14,236.10
      </span>
    </div>
    <div className="shipped-list" style={{ marginBottom: 28 }}>
      {ORDERS_SHIPPED.slice(0, 5).map(o => (
        <div key={o.id} className="shipped-row">
          <div className="img" style={{ backgroundImage: `url(${o.img})` }} />
          <div>
            <div className="name">{o.po}</div>
            <div className="po">{o.id} · Rep: {o.rep}</div>
          </div>
          <div className="spec">{o.track.slice(0, 18)}…</div>
          <div className="when">Shipped<strong>{o.shipped}</strong></div>
          <div className="track">UPS · 2-day</div>
          <div className="total">{fmt$(o.total)}</div>
          <button className="reorder">Reorder</button>
        </div>
      ))}
    </div>

    <div className="sec-row">
      <div>
        <span className="sec-eyebrow">March 2026</span>
        <h3>Last month — 11 shipped</h3>
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>
        Total billed: $19,412.84
      </span>
    </div>
    <div className="shipped-list">
      {ORDERS_SHIPPED.slice(5).map(o => (
        <div key={o.id} className="shipped-row">
          <div className="img" style={{ backgroundImage: `url(${o.img})` }} />
          <div>
            <div className="name">{o.po}</div>
            <div className="po">{o.id} · Rep: {o.rep}</div>
          </div>
          <div className="spec">{o.track.slice(0, 18)}…</div>
          <div className="when">Shipped<strong>{o.shipped}</strong></div>
          <div className="track">UPS · 2-day</div>
          <div className="total">{fmt$(o.total)}</div>
          <button className="reorder">Reorder</button>
        </div>
      ))}
    </div>
  </div>
);

// ================ ACCOUNTING ================
// Per spec: lead with overdue red treatment, payment portal CTA prominent.
// Demo shows ONE overdue invoice so the red treatment is visible (hero designs
// for the worst case — empty state would defeat the purpose of the screen).
const AccountingScreen = () => {
  const [acctTab, setAcctTab] = useState('open');
  const overdueAmount = 4186.40;
  const overdueCount = 1;

  return (
    <div>
      <div className="order-head">
        <div>
          <div className="order-head__eyebrow">Account</div>
          <h1 className="order-head__title">Accounting</h1>
          <div className="order-head__sub">Invoices, payments, and your line of credit at a glance.</div>
        </div>
        <div className="order-head__actions">
          <Button variant="sec" icon="download">Statement</Button>
          <Button icon="credit-card">Pay invoice</Button>
        </div>
      </div>

      {/* Overdue alert banner — only when overdue > 0 */}
      {overdueAmount > 0 && (
        <div className="acct-overdue-banner">
          <span className="acct-overdue-banner__ico"><Icon name="alert-triangle" size={20}/></span>
          <div className="acct-overdue-banner__body">
            <div className="acct-overdue-banner__title">{fmt$(overdueAmount)} overdue across {overdueCount} invoice</div>
            <div className="acct-overdue-banner__sub">INV-2691 was due Apr 22 · please settle to keep your account in good standing.</div>
          </div>
          <Button icon="credit-card">Pay overdue now</Button>
        </div>
      )}

      <div className="acct-hero">
        <div className={`acct-tile ${overdueAmount > 0 ? 'acct-tile--alert' : ''}`}>
          <span className="eyebrow">Overdue</span>
          <span className="v">{fmt$(overdueAmount)}</span>
          <span className="n">{overdueCount} invoice · oldest 2d late</span>
        </div>
        <div className="acct-tile">
          <span className="eyebrow">Outstanding</span>
          <span className="v">$14,325.80</span>
          <span className="n">3 open invoices</span>
        </div>
        <div className="acct-tile">
          <span className="eyebrow">Due May 03</span>
          <span className="v">$4,186.40</span>
          <span className="n">8 days from now</span>
        </div>
        <div className="acct-tile">
          <span className="eyebrow">Credit line</span>
          <span className="v">$35,674</span>
          <span className="n">available · of $50,000</span>
        </div>
      </div>

      <div className="orders-tabs">
        <button className={`orders-tabs__tab ${acctTab==='open'?'is-active':''}`} onClick={()=>setAcctTab('open')}>Open <span className="count">3</span></button>
        <button className={`orders-tabs__tab ${acctTab==='paid'?'is-active':''}`} onClick={()=>setAcctTab('paid')}>Paid <span className="count">47</span></button>
        <button className={`orders-tabs__tab ${acctTab==='credits'?'is-active':''}`} onClick={()=>setAcctTab('credits')}>Credits <span className="count">2</span></button>
        <button className={`orders-tabs__tab ${acctTab==='all'?'is-active':''}`} onClick={()=>setAcctTab('all')}>All</button>
      </div>

      <div className="orders-toolbar" style={{ paddingTop: 14 }}>
        <div className="search">
          <Icon name="search" size={14}/>
          <input placeholder="Search invoices…"/>
        </div>
        <button className="filter is-on">2026</button>
        <button className="filter">All time</button>
        <div className="spacer"></div>
        <button className="filter"><Icon name="download" size={12}/> Export</button>
      </div>

      <div className="invoice-list">
        {[
          { num: 'INV-2691', desc: 'PO-4409',                sub: 'C4409 · Rep: Jordan D.',         date: 'Mar 22', due: 'Apr 22', total:  4186.40, status: 'alert', label: 'Overdue · 2d' },
          { num: 'INV-2698', desc: 'PO-10605',               sub: 'C10605 · Rep: Priya A.',         date: 'Apr 24', due: 'May 03', total:  1872.40, status: 'warn',  label: 'Due 8d' },
          { num: 'INV-2685', desc: 'PO-AR-118, PO-PS-77, PO-ET-2026', sub: 'C262, C261, C260',     date: 'Apr 11', due: 'May 11', total: 11533.40, status: 'stage', label: 'Open' },
          { num: 'INV-2679', desc: 'PO-YK-5',                sub: 'C256 · Rep: Samira M.',          date: 'Apr 04', due: 'Apr 04', total:  2240.40, status: 'ok',    label: 'Paid' },
          { num: 'INV-2671', desc: 'PO-254',                 sub: 'C254 · Rep: Jordan D.',          date: 'Mar 28', due: 'Mar 28', total:  3120.00, status: 'ok',    label: 'Paid' },
          { num: 'INV-2665', desc: 'PO-253',                 sub: 'C253 · Rep: Ramesh B.',          date: 'Mar 21', due: 'Mar 21', total:   720.00, status: 'ok',    label: 'Paid' }
        ].map(i => (
          <div key={i.num} className={`invoice-row ${i.status === 'alert' ? 'invoice-row--alert' : ''}`}>
            <span className="num">{i.num}</span>
            <div className="desc">{i.desc}<small>{i.sub}</small></div>
            <span className="when">{i.date}</span>
            <span className="when">Due {i.due}</span>
            <span className="total">{fmt$(i.total)}</span>
            <Badge kind={i.status} dot>{i.label}</Badge>
            {i.status === 'alert' || i.status === 'warn' || i.status === 'stage'
              ? <Button size="sm">Pay</Button>
              : <Button variant="ghost" size="sm" icon="download">PDF</Button>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ================ ADMIN ================
const AdminScreen = () => {
  const [section, setSection] = useState('company');
  return (
    <div>
      <div className="order-head">
        <div>
          <div className="order-head__eyebrow">Account</div>
          <h1 className="order-head__title">Admin</h1>
          <div className="order-head__sub">Manage your company profile, team, and shipping defaults.</div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-side">
          {[
            { k: 'company', l: 'Company profile' },
            { k: 'team',    l: 'Team & access' },
            { k: 'ship',    l: 'Shipping defaults' },
            { k: 'pay',     l: 'Payment methods' },
            { k: 'notif',   l: 'Notifications' },
            { k: 'api',     l: 'API & integrations' }
          ].map(s => (
            <button key={s.k}
              className={`admin-side__link ${section===s.k?'is-active':''}`}
              onClick={()=>setSection(s.k)}>{s.l}</button>
          ))}
        </div>
        <div>
          {section === 'company' && (
            <>
              <div className="admin-card">
                <div className="admin-card__head">
                  <h3>Company profile</h3>
                  <p>Submit a change request to update legal name, EIN, or resale certificate.</p>
                </div>
                <div className="admin-card__body">
                  <div className="row-2">
                    <div className="field"><label>Legal name <span className="locked">(locked)</span></label><input defaultValue="Aurum & Co. LLC" disabled/></div>
                    <div className="field"><label>DBA</label><input defaultValue="Aurum & Co."/></div>
                  </div>
                  <div className="row-2">
                    <div className="field"><label>Resale certificate <span className="locked">(locked)</span></label><input defaultValue="CA-RC-487-2098" disabled/></div>
                    <div className="field"><label>EIN <span className="locked">(locked)</span></label><input defaultValue="84-•••••42" disabled/></div>
                  </div>
                  <div className="field"><label>Logo for engraving</label>
                    <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',border:'1px solid var(--dc-gray-200)',background:'var(--dc-gray-050)'}}>
                      <div style={{width:40,height:40,background:'#fff',border:'1px solid var(--dc-gray-300)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:14,fontWeight:600,color:'var(--dc-brown)'}}>A&Co</div>
                      <div style={{fontSize:12,color:'var(--fg-2)',flex:1}}>aurum-mark.svg · uploaded Mar 4</div>
                      <button className="btn btn--sec btn--sm">Replace</button>
                    </div>
                  </div>
                  <div style={{marginTop:14, display:'flex', gap:8}}>
                    <Button variant="sec" icon="edit-3" size="sm">Submit change request</Button>
                    <span style={{fontSize:11, color:'var(--fg-3)', fontStyle:'italic', alignSelf:'center'}}>
                      Locked fields require Dia-Co review · 1 business day
                    </span>
                  </div>
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-card__head"><h3>Account manager</h3><p>Your dedicated Dia-Co contact.</p></div>
                <div className="admin-card__body">
                  <div style={{display:'flex',alignItems:'center',gap:18}}>
                    <div className="av" style={{width:56,height:56,borderRadius:'50%',background:'var(--dc-black)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-sans)',fontSize:14,fontWeight:600}}>VL</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--fg-1)'}}>Vivek Lugani</div>
                      <div style={{fontSize:12,color:'var(--fg-3)',fontStyle:'italic',marginTop:2}}>Founder &amp; account manager · responds within 2h</div>
                    </div>
                    <Button variant="sec" icon="message-circle">Message</Button>
                    <Button variant="sec" icon="phone">Call</Button>
                  </div>
                </div>
              </div>
            </>
          )}
          {section === 'team' && (
            <div className="admin-card">
              <div className="admin-card__head" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div><h3>Team &amp; access</h3><p>Invite teammates and control what they can see.</p></div>
                <Button icon="plus">Invite</Button>
              </div>
              <div className="admin-card__body" style={{padding:'4px 24px 22px'}}>
                {[
                  { i:'RB', n:'Ramesh Bhatia',     e:'ramesh@aurum.co',   r:'Owner',     last:'Now' },
                  { i:'PA', n:'Priya Aggarwal',    e:'priya@aurum.co',    r:'Manager',   last:'2h ago' },
                  { i:'JD', n:'Jordan D.',         e:'jordan@aurum.co',   r:'Sales',     last:'Yesterday' },
                  { i:'SM', n:'Samira M.',         e:'samira@aurum.co',   r:'Accounting',last:'3d ago' },
                  { i:'LK', n:'Leo K. (pending)',  e:'leo@aurum.co',      r:'Sales',     last:'Invited Apr 22' }
                ].map(p => (
                  <div key={p.e} className="team-row">
                    <span className="av">{p.i}</span>
                    <div><div className="n">{p.n}</div><div className="e">{p.e}</div></div>
                    <div className="role">{p.r}</div>
                    <div className="last">Last seen {p.last}</div>
                    <div className="menu"><Icon name="more-horizontal" size={16}/></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section === 'ship' && (
            <div className="admin-card">
              <div className="admin-card__head"><h3>Shipping defaults</h3><p>Used when "Ship to me" is selected on a new order.</p></div>
              <div className="admin-card__body">
                <div className="row-2">
                  <div className="field"><label>Recipient</label><input defaultValue="Aurum & Co. — receiving"/></div>
                  <div className="field"><label>Phone</label><input defaultValue="(626) 555-0188"/></div>
                </div>
                <div className="field"><label>Address</label><input defaultValue="612 S Hill St, Suite 1108"/></div>
                <div className="row-2">
                  <div className="field"><label>City</label><input defaultValue="Los Angeles"/></div>
                  <div className="field"><label>State / ZIP</label><input defaultValue="CA · 90014"/></div>
                </div>
                <div className="field"><label>Default carrier</label>
                  <div className="pills">
                    <button className="pill is-active">UPS 2-day</button>
                    <button className="pill">UPS overnight</button>
                    <button className="pill">FedEx priority</button>
                    <button className="pill">USPS Express</button>
                  </div>
                </div>
                <div className="yesno">
                  <span className="yesno__label">Require signature on delivery</span>
                  <div className="yesno__group">
                    <button className="yesno__btn is-on">Yes</button>
                    <button className="yesno__btn">No</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {section === 'pay' && (
            <div className="admin-card">
              <div className="admin-card__head"><h3>Payment methods</h3><p>Your account is on Net 30 terms.</p></div>
              <div className="admin-card__body">
                {[
                  { k:'ACH',  n:'Wells Fargo · ••3491', d:'Default · verified', def:true },
                  { k:'Card', n:'Visa · ••8842',         d:'Expires 09/27',     def:false },
                  { k:'Wire', n:'Citibank · intl',       d:'For invoices >$25k',def:false }
                ].map(p => (
                  <div key={p.n} style={{display:'grid',gridTemplateColumns:'80px 1fr auto',gap:16,alignItems:'center',padding:'14px 0',borderBottom:'1px solid var(--dc-gray-200)'}}>
                    <span style={{fontFamily:'var(--font-sans)',fontSize:10,fontWeight:600,color:'var(--dc-brown)',textTransform:'uppercase',letterSpacing:1.5}}>{p.k}</span>
                    <div><div style={{fontSize:13,fontWeight:500,color:'var(--fg-1)'}}>{p.n}{p.def && <Badge kind="warn" >Default</Badge>}</div><div style={{fontSize:11,color:'var(--fg-3)',fontStyle:'italic',marginTop:2}}>{p.d}</div></div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                ))}
                <Button variant="sec" icon="plus" size="sm">Add method</Button>
              </div>
            </div>
          )}
          {section === 'notif' && (
            <div className="admin-card">
              <div className="admin-card__head"><h3>Notifications</h3><p>Choose what we email you about.</p></div>
              <div className="admin-card__body">
                {[
                  { l: 'CAD ready for review',          on: true },
                  { l: 'Stage updates (every change)',  on: false },
                  { l: 'Stage updates (only delays)',   on: true },
                  { l: 'Order shipped + tracking',      on: true },
                  { l: 'Invoices and statements',       on: true },
                  { l: 'Weekly summary email',          on: false },
                  { l: 'New messages from your AM',     on: true }
                ].map((r, i) => (
                  <div key={i} className="yesno" style={{justifyContent:'space-between',marginBottom:14}}>
                    <span className="yesno__label">{r.l}</span>
                    <div className="yesno__group">
                      <button className={`yesno__btn ${r.on?'is-on':''}`}>On</button>
                      <button className={`yesno__btn ${!r.on?'is-on':''}`}>Off</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section === 'api' && (
            <div className="admin-card">
              <div className="admin-card__head"><h3>API &amp; integrations</h3><p>For chains and high-volume retailers.</p></div>
              <div className="admin-card__body">
                <div className="field"><label>API key</label>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{flex:1,fontFamily:'var(--font-mono)'}} defaultValue="dia_live_••••••••••••••3jx9"/>
                    <Button variant="sec" size="sm" icon="copy">Copy</Button>
                    <Button variant="sec" size="sm">Rotate</Button>
                  </div>
                </div>
                <div className="field"><label>Webhook URL</label><input placeholder="https://yourshop.com/dia-webhook"/></div>
                <p style={{fontSize:12,color:'var(--fg-3)',fontStyle:'italic',marginTop:8}}>Events: order.created, cad.ready, stage.changed, order.shipped, invoice.due.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.OrdersList = OrdersList;
window.Submit3DScreen = Submit3DScreen;
window.HistoryScreen = HistoryScreen;
window.AccountingScreen = AccountingScreen;
window.AdminScreen = AdminScreen;
window.ORDERS_ACTIVE = ORDERS_ACTIVE;
window.ORDERS_SHIPPED = ORDERS_SHIPPED;




## ==================== FILE: topbar_sidebar.jsx ====================


/* global React */
const { useState } = React;

// ----- Icon wrapper -----
const Icon = ({ name, size = 16 }) => (
  <i data-lucide={name} style={{ width: size, height: size, display: 'inline-flex' }}></i>
);

// ----- Badge -----
const Badge = ({ kind = 'stage', children, dot }) => (
  <span className={`badge badge--${kind}`}>
    {dot && <span className="dot"></span>}
    {children}
  </span>
);

// ----- Button -----
const Button = ({ variant = 'primary', size, children, onClick, icon }) => {
  const cls = ['btn'];
  if (variant === 'sec') cls.push('btn--sec');
  if (variant === 'ghost') cls.push('btn--ghost');
  if (variant === 'danger') cls.push('btn--danger');
  if (size === 'sm') cls.push('btn--sm');
  if (size === 'lg') cls.push('btn--lg');
  return (
    <button className={cls.join(' ')} onClick={onClick}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

// ----- Topbar -----
const Topbar = () => (
  <div className="topbar">
    <img className="topbar__wordmark" src="assets/logo-wordmark.png" alt="Dia-Co, Inc." />
    <div className="topbar__search">
      <Icon name="search" size={14} />
      <input placeholder="Search orders, POs, styles…" defaultValue="" />
    </div>
    <div className="topbar__actions">
      <button className="topbar__iconbtn" title="Help"><Icon name="circle-help" size={18} /></button>
      <button className="topbar__iconbtn" title="Notifications">
        <Icon name="bell" size={18} />
        <span className="dot"></span>
      </button>
      <div className="topbar__company">
        <span className="topbar__company-name">Aurum <span className="dc-amp">&amp;</span> Co.</span>
        <span className="topbar__company-role">Owner · CA</span>
      </div>
      <div className="avatar">RB</div>
    </div>
  </div>
);

// ----- Sidebar -----
const SIDEBAR_NAV = [
  { section: 'Workspace', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { key: 'orders', label: 'Orders', icon: 'package', count: 11 },
    { key: 'history', label: 'History', icon: 'archive' }
  ]},
  { section: 'Create', items: [
    { key: 'new', label: 'New order', icon: 'plus-square' },
    { key: 'submit3d', label: 'Submit 3D file', icon: 'upload' }
  ]},
  { section: 'Account', items: [
    { key: 'accounting', label: 'Accounting', icon: 'receipt', count: 3, alert: true },
    { key: 'admin', label: 'Admin', icon: 'settings' }
  ]}
];
const Sidebar = ({ current = 'dashboard', dark = false }) => (
  <aside className={`sidebar ${dark ? 'sidebar--dark' : ''}`}>
    <div className="sidebar__brand">
      <span className="sidebar__brand-mark"><img src="assets/logo-mark.png" alt="" /></span>
      <span className="sidebar__brand-text">Dia-Co</span>
    </div>
    {SIDEBAR_NAV.map(group => (
      <React.Fragment key={group.section}>
        <div className="sidebar__section">{group.section}</div>
        {group.items.map(it => (
          <button
            key={it.key}
            className={`sidebar__link ${current === it.key ? 'is-active' : ''} ${it.alert ? 'is-alert' : ''}`}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.count != null && <span className="count">{it.count}</span>}
          </button>
        ))}
      </React.Fragment>
    ))}
    <div className="sidebar__foot">
      <strong>Aurum <span className="dc-amp">&amp;</span> Co.</strong><br/>
      Independent jeweler · CA<br/>
      <span style={{ color: 'var(--dc-brown)' }}>AM: Arti Rautela</span>
    </div>
  </aside>
);

Object.assign(window, { Icon, Badge, Button, Topbar, Sidebar });




## ==================== FILE: dash_utility.jsx ====================


/* global React, IMG, ATTENTION, PRODUCTION, DESIGNING, SHIPPED_RECENT, SHIP_TODAY, ACTIVITY, FINANCIAL, fmt$, fmt$0 */
// Direction B — UTILITY dashboard, revised per Web Modifications doc
const { Icon, Badge, Button } = window;

const StagePill = ({ stage, sub, late }) => (
  <div className="mini-track">
    <span className={`mini-track__label ${late ? 'is-late' : ''}`}>
      <strong>{stage}</strong>{sub ? ` · ${sub}` : ''}
    </span>
  </div>
);

const DashUtility = () => {
  const [ordersTab, setOrdersTab] = React.useState('all');

  const all = [...DESIGNING, ...PRODUCTION];
  const byTab = {
    all: all,
    design: DESIGNING,
    production: PRODUCTION,
    shipped: SHIPPED_RECENT
  };
  const ordersForTab = byTab[ordersTab];

  return (
    <div>
      <div className="ut-greet">
        <div>
          <div className="ut-greet__title">Good morning, <em>Ramesh.</em></div>
          <div className="ut-greet__sub">Friday, April 24 · 11 active orders · 4 awaiting you</div>
        </div>
        <div className="ut-greet__actions">
          <div className="ut-search">
            <Icon name="search" size={14}/>
            <input placeholder="Search orders by PO, rep, status…"/>
          </div>
          <Button variant="sec" icon="upload">Submit 3D file</Button>
          <Button icon="plus">New order</Button>
        </div>
      </div>

      {/* Top KPIs — Avg turnaround removed per spec */}
      <div className="ut-kpis">
        <div className="ut-kpi is-attention">
          <span className="ut-kpi__label"><Icon name="alert-circle" size={12}/> Needs review</span>
          <span className="ut-kpi__value ut-kpi__value--alert">4</span>
          <span className="ut-kpi__note">oldest 4d</span>
        </div>
        <div className="ut-kpi">
          <span className="ut-kpi__label"><Icon name="hammer" size={12}/> In production</span>
          <span className="ut-kpi__value">4</span>
          <span className="ut-kpi__note">on the bench</span>
        </div>
        <div className="ut-kpi">
          <span className="ut-kpi__label"><Icon name="truck" size={12}/> Shipping today</span>
          <span className="ut-kpi__value">3</span>
          <span className="ut-kpi__note">UPS pickup 4pm</span>
        </div>
        <div className="ut-kpi">
          <span className="ut-kpi__label"><Icon name="clock" size={12}/> Delayed</span>
          <span className="ut-kpi__value ut-kpi__value--alert">1</span>
          <span className="ut-kpi__note">PO-ET-2026 · +3d</span>
        </div>
        <div className="ut-kpi">
          <span className="ut-kpi__label"><Icon name="package" size={12}/> Lifetime</span>
          <span className="ut-kpi__value">912</span>
          <span className="ut-kpi__note">since 2018</span>
        </div>
      </div>

      <div className="ut-grid">
        <div className="stack gap-24">

          {/* NEEDS YOUR ATTENTION */}
          <div className="ut-queue">
            <div className="ut-queue__head">
              <div className="t">Needs your attention <span className="count">{ATTENTION.length}</span></div>
              <button className="ut-queue__expand">View all <Icon name="arrow-right" size={12}/></button>
            </div>
            {ATTENTION.map(o => (
              <div key={o.id} className="ut-queue-row">
                <div className="img" style={{ backgroundImage: `url(${o.img})` }} />
                <div className={`bar ${o.kind === 'mod' ? '' : 'bar--warn'}`}></div>
                <div>
                  <div className="piece">{o.po}</div>
                  <div className="piece-po">Rep: {o.rep}</div>
                </div>
                <div className="reason">
                  <strong>{o.reason}</strong><br/>
                  <span style={{ fontSize: 11, color: 'var(--dc-red)', fontWeight: 500 }}>
                    Waiting {o.daysWaiting} {o.daysWaiting===1?'day':'days'}
                  </span>
                </div>
                <div className="qty">
                  Quote
                  <strong>{o.quote ? fmt$(o.quote) : '—'}</strong>
                </div>
                <Button size="sm" variant={o.kind === 'mod' ? 'sec' : 'primary'}>
                  {o.kind === 'mod' ? 'Respond' : 'Review'}
                </Button>
              </div>
            ))}
          </div>

          {/* ORDERS — replaces "In production" */}
          <div className="ut-scoreboard">
            <div className="ut-score-head">
              <span className="t">Orders</span>
              <div className="ut-queue__tabs">
                <button className={`ut-queue__tab ${ordersTab==='all'?'is-active':''}`} onClick={()=>setOrdersTab('all')}>All <span className="ct">{all.length}</span></button>
                <button className={`ut-queue__tab ${ordersTab==='design'?'is-active':''}`} onClick={()=>setOrdersTab('design')}>Design <span className="ct">{DESIGNING.length}</span></button>
                <button className={`ut-queue__tab ${ordersTab==='production'?'is-active':''}`} onClick={()=>setOrdersTab('production')}>Production <span className="ct">{PRODUCTION.length}</span></button>
                <button className={`ut-queue__tab ${ordersTab==='shipped'?'is-active':''}`} onClick={()=>setOrdersTab('shipped')}>Shipped · 7d <span className="ct">{SHIPPED_RECENT.length}</span></button>
              </div>
              <button className="ut-queue__expand">View all orders <Icon name="arrow-right" size={12}/></button>
            </div>
            <div className="ut-score-pieces">
              {ordersForTab.map(p => (
                <div key={p.id} className="ut-piece-row">
                  <div className="img" style={{ backgroundImage: `url(${p.img})` }} />
                  <div>
                    <div className="n">{p.po}</div>
                    <div className="po">Rep: {p.rep}</div>
                  </div>
                  {ordersTab === 'shipped' ? (
                    <div className="ship">Shipped<strong>{p.shipped}</strong></div>
                  ) : (
                    <StagePill stage={p.stage || 'Designing'} sub={p.sub} late={p.late} />
                  )}
                  {ordersTab === 'production' && (
                    <div className={`ship ${p.late ? 'late' : ''}`}>
                      {p.late ? 'Late' : 'Ship'}
                      <strong>{p.ship}{p.late ? ` · +${p.late}d` : ''}</strong>
                    </div>
                  )}
                  {ordersTab === 'design' && (
                    <div className="ship">{p.quote ? 'Quote' : 'Quote'}<strong>{p.quote ? fmt$(p.quote) : '—'}</strong></div>
                  )}
                  {ordersTab === 'all' && p.stage === 'Production' && (
                    <div className={`ship ${p.late ? 'late' : ''}`}>{p.late?'Late':'Ship'}<strong>{p.ship}</strong></div>
                  )}
                  {ordersTab === 'all' && !p.stage && (
                    <div className="ship">Quote<strong>{p.quote ? fmt$(p.quote) : '—'}</strong></div>
                  )}
                  {ordersTab === 'shipped' && (
                    <div className="ship">Total<strong>{fmt$(p.total)}</strong></div>
                  )}
                  <div className="qty"><Icon name="chevron-right" size={14}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="stack gap-24">
          <div className="ut-fin">
            <div className="ut-fin__head">
              <span>Accounting</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--fg-3)', fontWeight: 400 }}>
                {FINANCIAL.openInvoices} open invoices
              </span>
            </div>
            <div className="ut-fin__big">
              <div className="cell">
                <span className="eyebrow">Outstanding</span>
                <span className="v">{fmt$(FINANCIAL.outstanding)}</span>
                <span className="n">Due {FINANCIAL.nextInvoiceDue}</span>
              </div>
              <div className="cell">
                <span className="eyebrow">Overdue</span>
                <span className="v" style={{ color: 'var(--fg-3)' }}>{fmt$(FINANCIAL.overdue)}</span>
                <span className="n">All current</span>
              </div>
            </div>
            <div className="ut-fin__rows">
              <div className="ed-fin-row"><span className="l">Due this period</span><span className="v">{fmt$(FINANCIAL.dueThisPeriod)}</span></div>
              <div className="ed-fin-row"><span className="l">Credit used</span><span className="v">{fmt$0(FINANCIAL.creditUsed)} / {fmt$0(FINANCIAL.creditLimit)}</span></div>
              <div className="credit-bar"><div className="credit-bar__fill" style={{ width: '28.7%' }}></div></div>
              <div className="credit-bar__labels">
                <span>28.7% used</span>
                <span>{fmt$0(FINANCIAL.creditRemaining)} available</span>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button icon="credit-card">Make a payment</Button>
              <Button variant="sec" size="sm">View invoices</Button>
            </div>
          </div>

          <div className="ut-activity">
            <div className="ut-activity__head">
              <span>Activity</span>
              <span className="filter">
                <span className="is-on">All</span>
                <span>Orders</span>
                <span>Messages</span>
              </span>
            </div>
            {ACTIVITY.slice(0, 6).map((a, i) => (
              <div key={i} className="activity-row">
                <span className={`ico ${a.tone === 'red' ? 'ico--red' : a.tone === 'green' ? 'ico--green' : ''}`}>
                  <Icon name={a.icon} size={14}/>
                </span>
                <div>
                  <div className="text">
                    <span className="ref">{a.ref}</span> · {a.text}
                    {a.sub && <span className="sub">{a.sub}</span>}
                  </div>
                </div>
                <span className="time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.DashUtility = DashUtility;




## ==================== FILE: shared_fixtures.jsx ====================


/* global React */
// Shared fixtures — STAGES: Designing, Production, QC, Shipping
// Names are POs (filled out by the partner). Each order has an assigned Rep.

window.IMG = {
  ring_solitaire:  window.__resources.img_ring_solitaire,
  ring_eternity:   window.__resources.img_ring_eternity,
  ring_signet:     window.__resources.img_ring_signet,
  tennis_bracelet: window.__resources.img_tennis_bracelet,
  pendant:         window.__resources.img_pendant,
  grillz:          window.__resources.img_grillz,
  ring_cocktail:   window.__resources.img_ring_cocktail,
  ring_pave:       window.__resources.img_ring_pave,
  ring_band:       window.__resources.img_ring_band
};

// Canonical 4-stage system
window.STAGES = ['Designing', 'Production', 'QC', 'Shipping'];

// Designing sub-states (used in narrow places like progress bar)
window.DESIGN_SUBS = ['Order entry', 'Designing', 'CAD review', 'Design request'];

// Orders that need attention — names are POs, no piece descriptions
window.ATTENTION = [
  { id: 'C10605', po: 'PO-10605',     rep: 'Priya A.', img: window.IMG.ring_solitaire,
    reason: 'CAD ready for your approval', quote: 1872.40, kind: 'review',  daysWaiting: 1 },
  { id: 'C4409',  po: 'PO-4409',      rep: 'Jordan D.',img: window.IMG.ring_band,
    reason: 'CAD draft — needs review',    quote: null,    kind: 'review',  daysWaiting: 2 },
  { id: 'C4408',  po: 'PO-4408-RJR',  rep: 'Priya A.', img: window.IMG.ring_pave,
    reason: 'Mod requested by Dia-Co',     quote: 845.00,  kind: 'mod',     daysWaiting: 3 },
  { id: 'C264',   po: 'PO-264',       rep: 'Ramesh B.',img: window.IMG.ring_eternity,
    reason: 'CAD revision v2 ready',       quote: 748.00,  kind: 'review',  daysWaiting: 4 }
];

// Orders in production
window.PRODUCTION = [
  { id: 'C263', po: 'PO-MK-2401',  rep: 'Ramesh B.', img: window.IMG.ring_signet,    stage: 'Production', sub: 'Finishing',    ship: 'Apr 28' },
  { id: 'C262', po: 'PO-AR-118',   rep: 'Jordan D.', img: window.IMG.tennis_bracelet,stage: 'Production', sub: 'Casting',      ship: 'May 02' },
  { id: 'C261', po: 'PO-PS-77',    rep: 'Priya A.',  img: window.IMG.ring_pave,      stage: 'Production', sub: 'Setting',      ship: 'May 04' },
  { id: 'C260', po: 'PO-ET-2026',  rep: 'Samira M.', img: window.IMG.pendant,        stage: 'Production', sub: 'Mounting',     ship: 'May 11', late: 3 }
];

// Orders in design
window.DESIGNING = [
  { id: 'C10605', po: 'PO-10605',     rep: 'Priya A.',  img: window.IMG.ring_solitaire,sub: 'CAD review',  quote: 1872.40 },
  { id: 'C4409',  po: 'PO-4409',      rep: 'Jordan D.', img: window.IMG.ring_band,     sub: 'Designing',   quote: null    },
  { id: 'C4408',  po: 'PO-4408-RJR',  rep: 'Priya A.',  img: window.IMG.ring_pave,     sub: 'Mod request', quote: 845.00  },
  { id: 'C264',   po: 'PO-264',       rep: 'Ramesh B.', img: window.IMG.ring_eternity, sub: 'CAD review',  quote: 748.00  }
];

// Recently shipped (last 7 days)
window.SHIPPED_RECENT = [
  { id: 'C259', po: 'PO-LM-44',  rep: 'Priya A.',  img: window.IMG.ring_solitaire, shipped: 'Apr 24', track: '1Z999AA10123456784', total: 1640.00 },
  { id: 'C258', po: 'PO-RO-12',  rep: 'Jordan D.', img: window.IMG.ring_band,      shipped: 'Apr 23', track: '1Z999AA10123456771', total:  920.50 },
  { id: 'C257', po: 'PO-DM-9',   rep: 'Ramesh B.', img: window.IMG.grillz,         shipped: 'Apr 22', track: '1Z999AA10123456765', total: 1280.00 },
  { id: 'C256', po: 'PO-YK-5',   rep: 'Samira M.', img: window.IMG.ring_cocktail,  shipped: 'Apr 20', track: '1Z999AA10123456752', total: 2240.40 }
];

window.SHIP_TODAY = [
  { id: 'C259', po: 'PO-LM-44'  },
  { id: 'C258', po: 'PO-RO-12'  },
  { id: 'C257', po: 'PO-DM-9'   }
];

window.ACTIVITY = [
  { icon: 'file-check',     tone: 'brown', ref: 'PO-10605',  text: 'CAD v1 uploaded for your review.',   sub: 'By Priya A. · 3 renders + interactive model',     time: '2h ago' },
  { icon: 'truck',          tone: 'green', ref: 'PO-YK-5',   text: 'Shipped via UPS · tracking 1Z999…84.', sub: 'Expected delivery Apr 26',                       time: '5h ago' },
  { icon: 'video',          tone: 'brown', ref: 'PO-MK-2401',text: 'Post-casting inspection video added.', sub: '18.4 MB · 01:12',                                time: 'yesterday' },
  { icon: 'message-circle', tone: 'brown', ref: 'Priya A.',  text: 'Replied on PO-264 thread.',           sub: '4 messages unread',                              time: 'yesterday' },
  { icon: 'alert-triangle', tone: 'red',   ref: 'PO-ET-2026',text: 'Ship date moved to May 11 · stone re-source.', sub: 'Original: May 08',                       time: '2d ago' },
  { icon: 'calendar-clock', tone: 'brown', ref: 'PO-PS-77',  text: 'Setting stage started.',              sub: 'Stage: Production · Setting',                    time: '2d ago' },
  { icon: 'check-circle',   tone: 'green', ref: 'PO-AR-118', text: 'Wax approved — moving to casting.',   sub: 'QC by R. Patel',                                 time: '3d ago' }
];

window.FINANCIAL = {
  outstanding: 14_325.80,
  dueThisPeriod: 4_186.40,
  overdue: 0,
  creditLimit: 50_000,
  creditUsed: 14_325.80,
  get creditRemaining() { return this.creditLimit - this.creditUsed; },
  nextInvoiceDue: 'May 03',
  openInvoices: 3
};

window.fmt$  = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
window.fmt$0 = (n) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Interactive model URL (per spec)
window.MODEL_URL = 'https://www.your-jewelry.com/?id=V9dmk0bjQQiERwIXeUTPWA';


