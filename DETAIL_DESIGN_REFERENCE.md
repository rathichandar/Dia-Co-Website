# Dia-Co Order Detail Page — Visual Reference

This file contains the design source for the Order Detail page redesign.
It includes the full HTML/CSS source from the Claude Design mockup, plus the OrderDetailScreen React component implementation.

Use this as the source of truth for visual implementation. We are restyling Phase 1's order detail page to match this design system.

## CRITICAL: Scope reminder
- ONLY restyle the order detail page (src/app/orders/[orderId]/page.tsx)
- DO NOT touch the orders list page (already styled this session)
- DO NOT use the NewOrderScreen component — submission form is a separate future task

## Files included:
- detail_reference.html: Full HTML file with all CSS (design tokens + layout + components)
- OrderDetailScreen.jsx: The Order Detail React component (the JSX structure to mirror)
- shared_fixtures.jsx: STAGES enum and other shared data

---


## ==================== FILE: detail_reference.html ====================

<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dia-Co Portal · Order screens</title>

  <!-- Resources referenced in JS strings — inlined by the bundler -->
  
  
  
  
  
  
  
  
  
  
  
  
  
  
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
  src: url("1b37292c-a525-4986-bc06-be317cfbc227") format('truetype-variations');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Playfair Display';
  src: url("fbbb46b2-2fdf-45b5-9378-3e5b3ae9c083") format('truetype-variations');
  font-weight: 400 900;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url("0f8ac14e-c0aa-49d4-b564-0a40ca24afdb") format('truetype-variations');
  font-weight: 100 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url("6284f69a-39bd-4e8b-b5f7-f3f3ae1b9f4f") format('truetype-variations');
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
  src: url("eecf3d90-86a3-476b-85bb-2aa280eba803") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("42921db0-a495-4c1d-bc8c-4699a4f9bd6f") format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* latin-ext */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("eecf3d90-86a3-476b-85bb-2aa280eba803") format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Libre Baskerville';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("42921db0-a495-4c1d-bc8c-4699a4f9bd6f") format('woff2');
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

  <script src="6d821fbb-d4d3-4106-b991-34d6d8c038e4" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="f9821e33-5484-4fc6-b1cd-844bf8659794" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
  <script src="0abe31a7-e141-4dd8-a989-2b82932d5fed" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
  <script src="00b9e13f-82eb-40d6-ac86-d8a76620aedf"></script>

  <script type="text/babel" src="3e142fb7-5464-416c-82c6-37cc63075323"></script>
  <script type="text/babel" src="c321e827-abbd-42f6-a1a1-d10be51cf20d"></script>
  <script type="text/babel" src="d97f9d29-6ef8-4b73-a458-8e009bb79192"></script>
  <script type="text/babel" src="9e9e31b2-9b98-46e4-a59f-85683711f19e"></script>
  <script type="text/babel" src="8c2c4a5d-499e-4818-8460-782852697bb0"></script>
  <script type="text/babel" src="564bb3b3-80b1-48fa-a127-7f2c59639295"></script>

  <script type="text/babel">
    const { useState, useEffect } = React;
    const { DesignCanvas, DCSection, DCArtboard } = window;
    const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor } = window;
    const { Topbar, Sidebar, NewOrderScreen, OrderDetailScreen } = window;

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
            title="Dia-Co Portal · Order screens"
            subtitle="New Order (progressive disclosure) and Order Detail (action-first review). Click an artboard to focus.">

            <DCSection id="new-order" title="New order">
              <DCArtboard id="new-order-flow" label="New order — submit a piece" width={1440} height={2480}>
                <Frame height={2480} sidebar={tw.sidebar} current="new-order" label="New order">
                  <NewOrderScreen />
                </Frame>
              </DCArtboard>
            </DCSection>

            <DCSection id="order-detail" title="Order detail">
              <DCArtboard id="order-detail-view" label="Order detail — CAD review and approval" width={1440} height={2280}>
                <Frame height={2280} sidebar={tw.sidebar} current="orders" label="Order detail">
                  <OrderDetailScreen />
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
                  { value: 'light', label: 'Light (white)' },
                  { value: 'dark',  label: 'Dark (charcoal)' }
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

## ==================== FILE: OrderDetailScreen.jsx ====================

/* global React */
const { useState: useStateOD } = React;
const { Icon: IconOD, Badge: BadgeOD, Button: BtnOD } = window;

// ============================================================
// ORDER DETAIL — single piece review screen
// 4-stage system: A Designing · B Production · C QC · D Shipping
// ============================================================
const OrderDetailScreen = () => {
  const [open, setOpen] = useStateOD({ specs: true, files: false, customer: false, quote: true });
  const [version, setVersion] = useStateOD('v3');
  const [showShare, setShowShare] = useStateOD(false);
  const [showMod, setShowMod] = useStateOD(false);
  const [view3D, setView3D] = useStateOD(false);
  const tog = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const Coll = ({ id, title, count, children }) => (
    <div className={`coll ${open[id] ? 'is-open' : ''}`}>
      <div className="coll__head" onClick={() => tog(id)}>
        <h4>{title} {count && <span style={{color:'var(--fg-3)',fontWeight:400,marginLeft:6}}>· {count}</span>}</h4>
        <span className="chev"><IconOD name="chevron-right" size={16}/></span>
      </div>
      {open[id] && <div className="coll__body">{children}</div>}
    </div>
  );

  return (
    <div>
      <div className="order-head">
        <div>
          <div className="order-head__eyebrow">
            <button className="back"><IconOD name="arrow-left" size={12}/> All orders</button>
            <span>·</span>
            <span style={{fontFamily:'var(--font-mono)'}}>PO-10620</span>
            <span>·</span>
            <span>Rep: Priya A.</span>
          </div>
          <h1 className="order-head__title">
            PO-10620
            <span className="detail-status">
              <span className="dot"></span> Stage A · Designing
            </span>
          </h1>
          <div className="order-head__sub">
            Submitted Mar 14 · Quote ready · <strong style={{color:'var(--dc-brown)',fontStyle:'normal',fontWeight:600}}>Action: review v3 and approve before Tue 4pm</strong>
          </div>
        </div>
        <div className="order-head__actions">
          <BtnOD variant="ghost" icon="share-2" onClick={() => setShowShare(!showShare)}>Share</BtnOD>
          <BtnOD variant="ghost" icon="message-circle">Message Priya</BtnOD>
          <BtnOD variant="ghost" icon="more-horizontal"></BtnOD>
        </div>
      </div>

      {/* Share popover */}
      {showShare && (
        <div className="share-pop">
          <div className="share-pop__head">
            <strong>Share this order with your customer</strong>
            <button onClick={() => setShowShare(false)}><IconOD name="x" size={14}/></button>
          </div>
          <p className="share-pop__sub">A read-only view — no internal notes, no quote details. They can rotate the 3D model and watch any approved videos.</p>
          <div className="share-pop__url">
            <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>https://share.dia-co.com/po-10620/V9dmk0bjQQiERwIXeUTPWA</span>
            <BtnOD size="sm" icon="copy">Copy link</BtnOD>
          </div>
          <div className="share-pop__rows">
            <label className="share-pop__row"><input type="checkbox" defaultChecked/> Show 3D model</label>
            <label className="share-pop__row"><input type="checkbox" defaultChecked/> Show stage progress</label>
            <label className="share-pop__row"><input type="checkbox"/> Allow customer comments</label>
            <label className="share-pop__row"><input type="checkbox"/> Show production videos</label>
          </div>
        </div>
      )}

      {/* 4-stage ribbon: A Designing · B Production · C QC · D Shipping */}
      <div className="stage-ribbon" style={{marginBottom: 20}}>
        {[
          {let:'A', ttl:'Designing',  sub:'CAD review · v3', state:'current'},
          {let:'B', ttl:'Production', sub:'Casting + setting', state:'pending'},
          {let:'C', ttl:'QC',         sub:'Inspection + video', state:'pending'},
          {let:'D', ttl:'Shipping',   sub:'Insured, overnight', state:'pending'}
        ].map((s) => (
          <div key={s.let} className={`ribbon-cell ${s.state==='current'?'is-current':''}`}>
            <div className="let">Stage {s.let}</div>
            <div className="ttl">{s.ttl}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="order-page">
        <div className="order-page__main">
          {/* CAD hero with interactive 3D toggle */}
          <div className="cad-hero">
            {view3D ? (
              <div className="cad-hero__main cad-hero__3d">
                <iframe
                  src="data:text/html;charset=utf-8,%3C!doctype%20html%3E%3Cstyle%3Ehtml%2Cbody%7Bmargin%3A0%3Bheight%3A100%25%3Bbackground%3A%23F5F0E6%3Bfont-family%3Asystem-ui%2Csans-serif%3Bdisplay%3Aflex%3Balign-items%3Acenter%3Bjustify-content%3Acenter%3Btext-align%3Acenter%3Bcolor%3A%23666%7Dp%7Bmax-width%3A360px%3Bline-height%3A1.5%3Bfont-size%3A14px%7D%3C%2Fstyle%3E%3Cp%3EInteractive%203D%20model%20goes%20here%20%E2%80%94%20your-jewelry.com%20viewer%20embed%20requires%20internet.%3C%2Fp%3E"
                  style={{width:'100%',height:'100%',border:0,background:'var(--dc-cream)'}}
                  title="Interactive 3D model"
                />
                <button className="hero-3d hero-3d--exit" onClick={() => setView3D(false)}>
                  <IconOD name="x" size={14}/> Exit 3D
                </button>
              </div>
            ) : (
              <div className="cad-hero__main" style={{backgroundImage:`url(${window.__resources.img_hero_main})`}}>
                <span className="hero-badge">
                  <BadgeOD kind="stage">CAD · v3</BadgeOD>
                </span>
                <button className="hero-3d" onClick={() => setView3D(true)}>
                  <IconOD name="box" size={14}/> View interactive 3D model
                </button>
              </div>
            )}
            <div className="cad-hero__thumbs">
              <div className="cad-hero__thumb" data-n="Side" style={{backgroundImage:`url(${window.__resources.img_thumb_side})`}}></div>
              <div className="cad-hero__thumb" data-n="Top" style={{backgroundImage:`url(${window.__resources.img_thumb_top})`}}></div>
              <div className="cad-hero__thumb" data-n="Profile" style={{backgroundImage:`url(${window.__resources.img_thumb_profile})`}}></div>
              <div className="cad-hero__thumb" data-n="Detail" style={{backgroundImage:`url(${window.__resources.img_thumb_detail})`}}></div>
            </div>
            <div className="cad-hero__meta">
              <div className="cad-hero__version">
                <span style={{color:'var(--fg-3)'}}>Showing</span>
                <select value={version} onChange={e => setVersion(e.target.value)}>
                  <option value="v3">v3 · Mar 18 (latest)</option>
                  <option value="v2">v2 · Mar 16</option>
                  <option value="v1">v1 · Mar 15</option>
                </select>
                <span style={{color:'var(--fg-3)'}}>· Last update Mar 18, 9:42a</span>
              </div>
              <div style={{display:'flex',gap:10}}>
                <BtnOD variant="ghost" size="sm" icon="download">Download .stl</BtnOD>
                <BtnOD variant="ghost" size="sm" icon="git-compare">Compare versions</BtnOD>
              </div>
            </div>
          </div>

          {/* Key specs strip */}
          <div className="key-specs">
            <div className="key-spec"><div className="key-spec__k">PO</div><div className="key-spec__v" style={{fontFamily:'var(--font-mono)'}}>10620</div><div className="key-spec__n">Your reference</div></div>
            <div className="key-spec"><div className="key-spec__k">Rep</div><div className="key-spec__v">Priya A.</div><div className="key-spec__n">CAD team</div></div>
            <div className="key-spec"><div className="key-spec__k">Metal</div><div className="key-spec__v">14k yellow</div><div className="key-spec__n">High polish · 4.2 g</div></div>
            <div className="key-spec"><div className="key-spec__k">Center</div><div className="key-spec__v">1.82 ct round</div><div className="key-spec__n">Customer-supplied</div></div>
            <div className="key-spec"><div className="key-spec__k">Accents</div><div className="key-spec__v">12 × 1.3mm</div><div className="key-spec__n">Hidden halo</div></div>
            <div className="key-spec"><div className="key-spec__k">Size · Qty</div><div className="key-spec__v">6.5 · 1</div><div className="key-spec__n">US</div></div>
          </div>

          {/* Itemized quote — collapsible */}
          <Coll id="quote" title="Itemized quote" count="$1,872.40">
            <div className="quote-table">
              <div className="quote-table__row quote-table__row--head">
                <span>Line item</span><span>Qty</span><span>Unit</span><span className="r">Total</span>
              </div>
              <div className="quote-table__row">
                <span><strong>14k yellow gold casting</strong><br/><span style={{color:'var(--fg-3)',fontSize:12}}>Solitaire mount, knife-edge band</span></span>
                <span>4.2 g</span><span>$108.00 /g</span><span className="r">$453.60</span>
              </div>
              <div className="quote-table__row">
                <span><strong>CAD design &amp; revisions</strong><br/><span style={{color:'var(--fg-3)',fontSize:12}}>3 versions · solitaire setting</span></span>
                <span>1</span><span>$0.00</span><span className="r">$0.00 <em style={{color:'var(--dc-brown)',fontStyle:'normal'}}>(free)</em></span>
              </div>
              <div className="quote-table__row">
                <span><strong>Stone setting — center</strong><br/><span style={{color:'var(--fg-3)',fontSize:12}}>Six-prong, hidden halo basket</span></span>
                <span>1</span><span>$185.00</span><span className="r">$185.00</span>
              </div>
              <div className="quote-table__row">
                <span><strong>Pave setting — accents</strong><br/><span style={{color:'var(--fg-3)',fontSize:12}}>1.3mm melee, customer-supplied</span></span>
                <span>12</span><span>$22.50</span><span className="r">$270.00</span>
              </div>
              <div className="quote-table__row">
                <span><strong>Finishing &amp; high polish</strong></span>
                <span>1</span><span>$85.00</span><span className="r">$85.00</span>
              </div>
              <div className="quote-table__row">
                <span><strong>QC, photography &amp; video</strong></span>
                <span>1</span><span>$0.00</span><span className="r">$0.00 <em style={{color:'var(--dc-brown)',fontStyle:'normal'}}>(included)</em></span>
              </div>
              <div className="quote-table__row">
                <span><strong>Insured shipping</strong><br/><span style={{color:'var(--fg-3)',fontSize:12}}>Drop ship · Pasadena CA · $28,500 declared</span></span>
                <span>1</span><span>$48.40</span><span className="r">$48.40</span>
              </div>
              <div className="quote-table__row quote-table__row--sub">
                <span>Subtotal</span><span></span><span></span><span className="r">$1,042.00</span>
              </div>
              <div className="quote-table__row quote-table__row--sub">
                <span>Memo stones (customer-supplied)</span><span></span><span style={{color:'var(--fg-3)',fontSize:12}}>insured both ways</span><span className="r">$830.40</span>
              </div>
              <div className="quote-table__row quote-table__row--total">
                <span><strong>Total due on completion</strong></span><span></span><span></span><span className="r"><strong>$1,872.40</strong></span>
              </div>
            </div>
            <div className="quote-actions">
              <BtnOD variant="ghost" size="sm" icon="download">Download PDF</BtnOD>
              <BtnOD variant="ghost" size="sm" icon="message-circle">Question this quote</BtnOD>
            </div>
          </Coll>

          {/* Description */}
          <div className="desc-block">
            <div className="eyebrow">Customer description</div>
            <p>
              Six-prong solitaire setting for a 1.82ct round brilliant. Knife-edge band, low profile,
              hidden halo of micro-pave on the basket. Inspired by mid-century design — clean, no
              surprise details. Customer is bringing the center stone and twelve 1.3mm pave.
            </p>
          </div>

          {/* Instruction history — chronological log of every instruction, message, and version */}
          <div className="ihist">
            <div className="ihist__head">
              <h4>Instruction history</h4>
              <span style={{fontFamily:'var(--font-sans)',fontSize:11,color:'var(--fg-3)',fontStyle:'italic'}}>4 messages · 3 versions · sealed log</span>
            </div>
            <div className="ihist__thread">

              <div className="ih-msg">
                <div className="ih-msg__av us">YT</div>
                <div>
                  <div className="ih-msg__head">
                    <span className="ih-msg__name">You</span>
                    <span className="ih-msg__role">Aurum &amp; Co.</span>
                    <span className="ih-msg__time">Mar 14 · 11:08 am</span>
                  </div>
                  <div className="ih-msg__body">
                    <span className="event"><IconOD name="upload" size={12}/> Order submitted with 2 references</span>
                    <p style={{margin:'8px 0 0',fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}>
                      "Six-prong solitaire, knife-edge band, hidden halo. Mid-century clean. Customer bringing the center."
                    </p>
                  </div>
                </div>
              </div>

              <div className="ih-msg">
                <div className="ih-msg__av dc">DC</div>
                <div>
                  <div className="ih-msg__head">
                    <span className="ih-msg__name">Priya A.</span>
                    <span className="ih-msg__role">Dia-Co · CAD team</span>
                    <span className="ih-msg__time">Mar 15 · 4:20 pm</span>
                  </div>
                  <div className="ih-msg__body">
                    <span className="event"><IconOD name="file-plus" size={12}/> CAD v1 delivered</span>
                    <p style={{margin:'8px 0 0',fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}>
                      First pass — sent on a 1.8mm knife-edge. Pave row at 1.3mm tracks the basket on the inside; let us know if you want it visible from the side too.
                    </p>
                  </div>
                </div>
              </div>

              <div className="ih-msg">
                <div className="ih-msg__av us">YT</div>
                <div>
                  <div className="ih-msg__head">
                    <span className="ih-msg__name">You</span>
                    <span className="ih-msg__role">Aurum &amp; Co.</span>
                    <span className="ih-msg__time">Mar 16 · 10:14 am</span>
                  </div>
                  <div className="ih-msg__body">
                    <span className="event"><IconOD name="git-branch" size={12}/> Modification requested</span>
                    <p style={{margin:'8px 0 0',fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}>
                      Looks great. Two changes: drop the band to 1.6mm and pull the prongs down 0.4mm so the stone sits lower. Pave-on-inside is right — keep it hidden.
                    </p>
                  </div>
                </div>
              </div>

              <div className="ih-msg">
                <div className="ih-msg__av dc">DC</div>
                <div>
                  <div className="ih-msg__head">
                    <span className="ih-msg__name">Priya A.</span>
                    <span className="ih-msg__role">Dia-Co · CAD team</span>
                    <span className="ih-msg__time">Mar 18 · 9:42 am</span>
                  </div>
                  <div className="ih-msg__body">
                    <span className="event"><IconOD name="file-plus" size={12}/> CAD v3 delivered · ready for approval</span>
                    <p style={{margin:'8px 0 0',fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}>
                      Band at 1.6mm, prongs down 0.4mm. Profile is noticeably lower — see the side view. Quote holds at $1,872.40 all in.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modification request inline form */}
            {showMod ? (
              <div className="mod-form">
                <div className="mod-form__head">
                  <strong>Request a modification</strong>
                  <button onClick={() => setShowMod(false)}><IconOD name="x" size={14}/></button>
                </div>
                <p className="mod-form__sub">Be specific — Priya will reply with a revised CAD and any quote impact within 24 hours. No re-cast fee while we&apos;re still in Stage A.</p>
                <textarea rows="4" placeholder="e.g. Lower the prong height another 0.2mm and round the inside of the band slightly."></textarea>
                <div className="mod-form__attach">
                  <button className="attach-btn"><IconOD name="paperclip" size={14}/> Attach reference (optional)</button>
                  <span style={{color:'var(--fg-3)',fontSize:12}}>You can mark up the current CAD too.</span>
                </div>
                <div className="mod-form__actions">
                  <BtnOD variant="ghost" size="sm" onClick={() => setShowMod(false)}>Cancel</BtnOD>
                  <BtnOD size="sm" icon="send">Send modification request</BtnOD>
                </div>
              </div>
            ) : (
              <div className="ihist__composer">
                <span className="attach"><IconOD name="paperclip" size={16}/></span>
                <input placeholder="Message Priya about this piece…" />
                <BtnOD variant="ghost" size="sm">Send</BtnOD>
              </div>
            )}
          </div>

          <Coll id="specs" title="Full specifications">
            <div className="kv-grid">
              <div className="k">PO</div><div className="v" style={{fontFamily:'var(--font-mono)'}}>10620</div>
              <div className="k">Submitted</div><div className="v">Mar 14, 2025 · 11:08 am</div>
              <div className="k">Style</div><div className="v">Solitaire, six-prong</div>
              <div className="k">Band</div><div className="v">Knife-edge, 1.6mm at top</div>
              <div className="k">Metal</div><div className="v">14k yellow gold · high polish · est. 4.2g finished</div>
              <div className="k">Center stone</div><div className="v">1.82ct round brilliant — customer-supplied (memo)</div>
              <div className="k">Accents</div><div className="v">12× 1.3mm round melee — customer-supplied</div>
              <div className="k">Setting style</div><div className="v">Hidden halo, prongs notched 0.4mm below original</div>
              <div className="k">Engraving</div><div className="v"><em style={{color:'var(--fg-3)'}}>None</em></div>
              <div className="k">Size</div><div className="v">US 6.5</div>
            </div>
          </Coll>

          <Coll id="customer" title="Customer / drop ship" count="Lauren M.">
            <div className="kv-grid">
              <div className="k">Recipient</div><div className="v">Lauren M.</div>
              <div className="k">Phone</div><div className="v">(626) 555-0148</div>
              <div className="k">Address</div><div className="v">1240 Orange Grove Ave, Pasadena CA 91103</div>
              <div className="k">Insured for</div><div className="v">$28,500 (incl. center stone memo)</div>
            </div>
          </Coll>

          <Coll id="files" title="All attachments" count="6 files">
            <div className="uploaded-list" style={{margin:0}}>
              {[
                {n:'CAD_v3_solitaire.stl',         s:'8.4 MB',  k:'file-text'},
                {n:'CAD_v3_render_main.png',       s:'1.2 MB',  k:'image'},
                {n:'CAD_v3_render_side.png',       s:'1.1 MB',  k:'image'},
                {n:'reference_inspiration.jpg',    s:'2.4 MB',  k:'image'},
                {n:'sketch_main.pdf',              s:'840 KB',  k:'file-text'},
                {n:'GIA_report_4892711.pdf',       s:'620 KB',  k:'file-text'}
              ].map(f => (
                <div key={f.n} className="uploaded-row">
                  <span className="ico"><IconOD name={f.k}/></span>
                  <div><div className="n">{f.n}</div></div>
                  <span className="meta">{f.s}</span>
                  <button className="rm"><IconOD name="download" size={14}/></button>
                </div>
              ))}
            </div>
          </Coll>
        </div>

        {/* Side rail — the main "do something now" surface */}
        <div className="order-page__side">
          <div className="action-card">
            <div className="action-card__eyebrow">Action required</div>
            <div className="action-card__title">Approve CAD v3?</div>
            <div className="action-card__sub">
              Approving moves PO-10620 to Stage&nbsp;B (Production). Quote locks at this point —
              modifications after this incur a re-cast fee.
            </div>

            <div className="action-card__quote">
              <div className="l">Total quoted</div>
              <div className="v">$1,872.40</div>
            </div>

            <div className="action-card__rows">
              <div className="row"><span>Quote validity</span><strong>14 days</strong></div>
              <div className="row"><span>Estimated ship</span><strong>Apr 4 – Apr 8</strong></div>
              <div className="row"><span>Insurance</span><strong>$28,500</strong></div>
            </div>

            <div className="action-card__actions">
              <BtnOD icon="check">Approve and start production</BtnOD>
              <BtnOD variant="sec" icon="git-branch" onClick={() => setShowMod(true)}>Request modification</BtnOD>
              <BtnOD variant="ghost" size="sm">Cancel order</BtnOD>
            </div>
          </div>

          <div className="side-summary">
            <div className="side-summary__head">
              <div className="eyebrow">What happens next</div>
              <div className="tt">Production preview</div>
            </div>
            <div className="side-summary__body" style={{padding:'8px 22px 18px'}}>
              <div className="summary-row"><span className="k">B</span><span className="v"><strong style={{display:'block',color:'var(--fg-1)'}}>Production</strong>Casting, setting, finishing · 7–10 days</span></div>
              <div className="summary-row"><span className="k">C</span><span className="v"><strong style={{display:'block',color:'var(--fg-1)'}}>QC</strong>Inspection &amp; video · 1–2 days</span></div>
              <div className="summary-row"><span className="k">D</span><span className="v"><strong style={{display:'block',color:'var(--fg-1)'}}>Shipping</strong>Insured overnight to Pasadena</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.OrderDetailScreen = OrderDetailScreen;


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

