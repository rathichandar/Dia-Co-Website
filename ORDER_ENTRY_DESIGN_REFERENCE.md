# Dia-Co Order Entry Form — Visual Reference

**This file is the SOURCE OF TRUTH for the Order Entry form visual implementation.**

It contains:
1. The complete NewOrderScreen React component (the JSX structure to mirror)
2. The full HTML/CSS for the design system (for class definitions)

## CRITICAL: Adapt, do not blindly copy

The mockup was created BEFORE the current schema. Use this as the VISUAL reference (layout,
typography, spacing, component patterns) but ADAPT to our actual data structure. Differences:

- Mockup has 7 sections (basics/design/metal/stones/addons/dropship/ship); our spec has 9
- Mockup has a Style select (Solitaire/Halo/Three-stone) for rings — we do not (no style categories for custom orders)
- Mockup has Quantity/size in accent stones — we do not (Dia-Co determines during design)
- Mockup has a single center stone — our spec supports multiple
- Mockup has Yes/No for stones — our spec has Yes/No/TBD
- Mockup has Drop ship toggle (boolean) — our spec has three-way shipping (Standard / Different address / Drop ship)
- Mockup has Finished Product as a product type — we have Finish Point as a separate dimension

## Visual treatment to mirror

- `.osec` collapsible section card with number, title, optional/required pill, summary chip when collapsed
- `.osec__num` brown serif numbers (01, 02, 03...)
- `.osec__title` with `.req` (brown) or `.opt` (gray) pill
- `.osec__summary` shows on collapsed state with mini recap
- `.pills` row of `.pill` buttons for single-select (product type)
- `.yesno` Yes/No segmented control for binary toggles (stones)
- `.row-2`, `.row-3` for form field layouts
- `.field` for label + input + hint structure
- `.dropzone` dashed-border file drop area with upload icon
- `.uploaded-list` of `.uploaded-row` for shown files
- `.metal-row` for repeating metal entries
- `.callout` for inline informational notices
- `.side-summary` sticky right rail with `.summary-row` (k/v pairs)
- `.action-card` for "What happens next" panel
- `.submit-bar` sticky bottom bar with recap + actions
- `.quote-banner` cream banner at top of page

---

## Part 1 — The NewOrderScreen React component

Full source of the New Order screen. This is what to mirror visually.

```jsx
/* global React */
const { useState } = React;
const { Icon, Badge, Button } = window;

// Reusable lookups
const PRODUCT_TYPES = ['Ring','Pendant','Earrings','Bracelet','Necklace','Grillz','Finished Product','Other'];
const METAL_KARATS  = ['10k','14k','18k','22k','24k','Platinum 950','Sterling silver'];
const METAL_COLORS  = ['Yellow','White','Rose','Two-tone'];
const METAL_FINISH  = ['High polish','Matte','Brushed','Sandblast','Hammered','Satin','Antiqued'];
const STONE_TYPES   = ['Natural diamond','Lab-grown diamond','Moissanite','Sapphire','Ruby','Emerald','Topaz','CZ','Other colored stone'];
const STONE_SHAPES  = ['Round','Oval','Cushion','Princess','Emerald','Pear','Marquise','Asscher','Heart','Radiant','Trillion'];
const STONE_SUPPLY  = ['Dia-Co supplies','Customer supplies (memo)','Mixed — see notes'];

// ============================================================
// SUBMIT A NEW ORDER — long page with progressive disclosure
// ============================================================
const NewOrderScreen = ({ submitMode = 'new' } = {}) => {
  const [open, setOpen] = useState({
    basics: true, design: true, metal: true, stones: true, addons: false, dropship: false, ship: false
  });
  const [productType, setProductType] = useState('Ring');
  const [hasCenter, setHasCenter] = useState('yes');
  const [centerSupply, setCenterSupply] = useState('Customer supplies (memo)');
  const [accentSupply, setAccentSupply] = useState('Dia-Co supplies');
  const [dropShip, setDropShip] = useState(false);
  const [files] = useState([
    { name: 'reference_inspiration.jpg', size: '2.4 MB', kind: 'image' },
    { name: 'sketch_main.pdf', size: '840 KB', kind: 'file' }
  ]);
  const [metals, setMetals] = useState([
    { karat: '14k', color: 'Yellow', finish: 'High polish' }
  ]);
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));
  const isFinishedProduct = productType === 'Finished Product';

  const Section = ({ id, num, title, sub, summary, required, optional, children }) => (
    <div className={`osec ${open[id] ? 'is-open' : ''}`}>
      <div className="osec__head" onClick={() => toggle(id)}>
        <div className="osec__num">{num}</div>
        <div>
          <div className="osec__title">
            {title}
            {required && <span className="req">Required</span>}
            {optional && <span className="opt">Optional</span>}
          </div>
          {sub && <div className="osec__sub">{sub}</div>}
        </div>
        <div className="osec__summary">{!open[id] && summary}</div>
        <div className="osec__chev"><Icon name="chevron-right" size={18} /></div>
      </div>
      {open[id] && <div className="osec__body">{children}</div>}
    </div>
  );

  const headTitle = submitMode === '3d' ? 'Submit a 3D file.' : 'Submit a new order.';
  const headSub = submitMode === '3d'
    ? <>Already have CAD? Drop it here. We&apos;ll quote it free in 18&ndash;48 hours and cast on approval.</>
    : <>We&apos;ll reply within two hours with feasibility, then a free quote in 18&ndash;48 hours. Drafts auto-save as you go.</>;

  return (
    <div>
      <div className="order-head">
        <div>
          <div className="order-head__eyebrow">
            <button className="back"><Icon name="arrow-left" size={12}/> Back to dashboard</button>
            <span>·</span>
            <span>{submitMode === '3d' ? 'Submit 3D file · Draft' : 'New order · Draft'}</span>
          </div>
          <h1 className="order-head__title">{headTitle}</h1>
          <div className="order-head__sub">{headSub}</div>
        </div>
        <div className="order-head__actions">
          <Button variant="ghost">Cancel</Button>
          <Button variant="sec">Save draft</Button>
        </div>
      </div>

      {/* Free-quote banner */}
      <div className="quote-banner">
        <span className="quote-banner__ico"><Icon name="sparkles" size={16}/></span>
        <div>
          <strong>Quotes are always free.</strong>
          <span> No commitment until you approve. Submit anything — sketch, photo, or CAD.</span>
        </div>
      </div>

      <div className="order-page">
        <div className="order-page__main">

          <Section id="basics" num="01" title="Order basics" required
            summary={<><strong>{productType} · qty 1</strong><em>PO 10620</em></>}>
            <div className="row-2">
              <div className="field">
                <label>Personal PO <span className="opt">(your reference)</span></label>
                <input defaultValue="10620" placeholder="Will appear on every screen as your order name" />
                <span className="hint">Choose something memorable — this is how you'll find this order.</span>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" defaultValue="1" />
              </div>
            </div>
            <div className="field">
              <label>Product type</label>
              <div className="pills">
                {PRODUCT_TYPES.map(t => (
                  <button key={t} className={`pill ${productType===t?'is-active':''}`} onClick={() => setProductType(t)}>{t}</button>
                ))}
              </div>
              {isFinishedProduct && (
                <span className="hint" style={{marginTop:10}}>
                  Finished product — Dia-Co handles design, casting, and finishing.
                  Skip the metal &amp; stone sections; we&apos;ll quote and confirm before production.
                </span>
              )}
            </div>
            {productType === 'Ring' && (
              <div className="row-2">
                <div className="field">
                  <label>Style</label>
                  <select defaultValue="Solitaire">
                    <option>Solitaire</option><option>Halo</option><option>Three-stone</option>
                    <option>Eternity band</option><option>Signet</option><option>Cocktail</option>
                  </select>
                </div>
                <div className="field">
                  <label>Size <span className="opt">(US)</span></label>
                  <input type="number" step="0.25" defaultValue="6.5" />
                </div>
              </div>
            )}
          </Section>

          <Section id="design" num="02" title="Describe the piece" required
            sub="The more we know, the faster we can confirm feasibility."
            summary={<><strong>2 references uploaded</strong><em>Brief description</em></>}>
            <div className="field">
              <label>Description</label>
              <textarea className="describe" rows="4"
                placeholder="Describe the design, inspiration, or attach references…"
                defaultValue="Six-prong solitaire setting for a 1.82ct round brilliant. Knife-edge band, low profile, hidden halo of micro-pave on the basket. Inspired by mid-century design — clean, no surprise details."></textarea>
              <span className="hint">Auto-saved · 14s ago</span>
            </div>

            <div className="dropzone">
              <div className="dropzone__icon"><Icon name="upload-cloud" size={32}/></div>
              <div className="dropzone__title">Drop CAD files or reference images here</div>
              <div className="dropzone__sub">
                <strong>.stl, .3dm, .obj, .zip</strong> up to 200&nbsp;MB · JPG, PNG, PDF references welcome
              </div>
            </div>

            <div className="uploaded-list">
              {files.map(f => (
                <div key={f.name} className="uploaded-row">
                  <span className="ico"><Icon name={f.kind==='image'?'image':'file-text'}/></span>
                  <div><div className="n">{f.name}</div></div>
                  <span className="meta">{f.size}</span>
                  <button className="rm"><Icon name="x" size={14}/></button>
                </div>
              ))}
            </div>
          </Section>

          {!isFinishedProduct && (
            <Section id="metal" num="03" title="Metal" required
              sub="Pick karat, color, and finish for each metal in this piece."
              summary={<>
                <strong>{metals[0].karat} {metals[0].color.toLowerCase()}</strong>
                <em>{metals[0].finish}{metals.length > 1 ? ` · +${metals.length-1} more` : ''}</em>
              </>}>
              {metals.map((m, i) => (
                <div key={i} className="metal-row">
                  <div className="metal-row__head">
                    <span className="ml-num">Metal {i+1}</span>
                    {metals.length > 1 && (
                      <button className="rm" onClick={() => setMetals(metals.filter((_, j) => j !== i))}>Remove</button>
                    )}
                  </div>
                  <div className="row-3">
                    <div className="field">
                      <label>Karat / type</label>
                      <select value={m.karat} onChange={e => setMetals(metals.map((mm, j) => j===i ? {...mm, karat: e.target.value} : mm))}>
                        {METAL_KARATS.map(k => <option key={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Color</label>
                      <select value={m.color} onChange={e => setMetals(metals.map((mm, j) => j===i ? {...mm, color: e.target.value} : mm))}>
                        {METAL_COLORS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Finish</label>
                      <select value={m.finish} onChange={e => setMetals(metals.map((mm, j) => j===i ? {...mm, finish: e.target.value} : mm))}>
                        {METAL_FINISH.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="sec" size="sm" icon="plus" onClick={() => setMetals([...metals, { karat: '14k', color: 'White', finish: 'High polish' }])}>
                Add another metal
              </Button>
            </Section>
          )}

          {!isFinishedProduct && (
            <Section id="stones" num="04" title="Stones" optional
              sub="Tell us what to set, where it's coming from, and any special handling."
              summary={<>
                <strong>{hasCenter==='yes' ? '1 center' : 'No center'} · accents</strong>
                <em>{hasCenter==='yes' ? `${centerSupply.split(' (')[0]}` : 'Pave only'}</em>
              </>}>

              <div className="yesno">
                <span className="yesno__label">Does this piece have a center stone?</span>
                <div className="yesno__group">
                  <button className={`yesno__btn ${hasCenter==='yes'?'is-on':''}`} onClick={()=>setHasCenter('yes')}>Yes</button>
                  <button className={`yesno__btn ${hasCenter==='no'?'is-on':''}`} onClick={()=>setHasCenter('no')}>No</button>
                </div>
              </div>

              {hasCenter === 'yes' && (
                <>
                  <h5 className="osec__sub-h">Center stone</h5>
                  <div className="row-3">
                    <div className="field">
                      <label>Type</label>
                      <select>{STONE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                    </div>
                    <div className="field">
                      <label>Shape</label>
                      <select>{STONE_SHAPES.map(s => <option key={s}>{s}</option>)}</select>
                    </div>
                    <div className="field">
                      <label>Carat / size</label>
                      <input placeholder="e.g. 1.82ct or 7×5mm" defaultValue="1.82ct"/>
                    </div>
                  </div>
                  <div className="row-3">
                    <div className="field">
                      <label>Color / clarity</label>
                      <input placeholder="e.g. F · VS1"/>
                    </div>
                    <div className="field">
                      <label>Cert <span className="opt">(optional)</span></label>
                      <input placeholder="e.g. GIA #4892711"/>
                    </div>
                    <div className="field">
                      <label>Stone supply</label>
                      <select value={centerSupply} onChange={e=>setCenterSupply(e.target.value)}>
                        {STONE_SUPPLY.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {centerSupply.startsWith('Customer') && (
                    <div className="callout">
                      <Icon name="info" size={14}/>
                      <span>You&apos;ll receive shipping instructions and a memo agreement after CAD approval. Insurance handled both ways.</span>
                    </div>
                  )}
                </>
              )}

              <h5 className="osec__sub-h">Accent stones</h5>
              <div className="row-3">
                <div className="field">
                  <label>Type</label>
                  <select defaultValue="Natural diamond">{STONE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div className="field">
                  <label>Quantity &amp; size</label>
                  <input placeholder="e.g. 12 × 1.3mm" defaultValue="12 × 1.3mm"/>
                </div>
                <div className="field">
                  <label>Stone supply</label>
                  <select value={accentSupply} onChange={e=>setAccentSupply(e.target.value)}>
                    {STONE_SUPPLY.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes <span className="opt">(setting style, hidden halo, etc.)</span></label>
                <textarea rows="2" placeholder="Anything special about how the stones should be set"
                  defaultValue="Hidden halo on the basket — pave should not be visible from above. Standard prong setting on accents."></textarea>
              </div>
            </Section>
          )}

          <Section id="addons" num="05" title="Engraving and add-ons" optional
            summary={<em>None</em>}>
            <div className="row-2">
              <div className="field">
                <label>Engraving text <span className="opt">(inside band)</span></label>
                <input placeholder="e.g. 11.04.2024" />
              </div>
              <div className="field">
                <label>Font</label>
                <select><option>Default · script</option><option>Block</option><option>Italic</option></select>
              </div>
            </div>
            <label style={{display:'inline-flex',gap:10,alignItems:'center',fontSize:13,color:'var(--fg-1)',cursor:'pointer'}}>
              <input type="checkbox"/> Engrave my logo (+$15)
            </label>
          </Section>

          <Section id="dropship" num="06" title="Drop ship to customer" optional
            summary={dropShip ? <em>To Lauren M., Pasadena CA</em> : <em>Ship to Aurum &amp; Co.</em>}>
            <label style={{display:'inline-flex',gap:10,alignItems:'center',fontSize:14,color:'var(--fg-1)',cursor:'pointer',marginBottom:18}}>
              <input type="checkbox" checked={dropShip} onChange={e=>setDropShip(e.target.checked)}/> Drop ship to customer
            </label>
            {dropShip && (
              <>
                <div className="row-2">
                  <div className="field"><label>Recipient name</label><input defaultValue="Lauren M."/></div>
                  <div className="field"><label>Phone <span className="opt">(optional)</span></label><input/></div>
                </div>
                <div className="field"><label>Address</label><input defaultValue="1240 Orange Grove Ave"/></div>
                <div className="row-3">
                  <div className="field"><label>City</label><input defaultValue="Pasadena"/></div>
                  <div className="field"><label>State</label><input defaultValue="CA"/></div>
                  <div className="field"><label>ZIP</label><input defaultValue="91103"/></div>
                </div>
              </>
            )}
          </Section>

          <div className="submit-bar">
            <div className="recap">
              <strong>{productType} · {metals[0].karat} {metals[0].color.toLowerCase()} · {metals[0].finish}</strong><br/>
              2 references · {hasCenter==='yes' ? '1 center + ' : ''}12 accents · ship to Aurum &amp; Co.
            </div>
            <div className="actions">
              <Button variant="sec">Save draft</Button>
              <Button icon="send">Submit for free quote</Button>
            </div>
          </div>
        </div>

        <div className="order-page__side">
          <div className="side-summary">
            <div className="side-summary__head">
              <div className="eyebrow">Live summary</div>
              <div className="tt">Your order so far</div>
            </div>
            <div className="side-summary__body">
              <div className="summary-row"><span className="k">PO</span><span className="v">PO-10620</span></div>
              <div className="summary-row"><span className="k">Type</span><span className="v">{productType}</span></div>
              {!isFinishedProduct && <div className="summary-row"><span className="k">Metal</span><span className="v">{metals.map(m => `${m.karat} ${m.color.toLowerCase()}`).join(', ')}</span></div>}
              {!isFinishedProduct && <div className="summary-row"><span className="k">Finish</span><span className="v">{metals[0].finish}</span></div>}
              {!isFinishedProduct && <div className="summary-row"><span className="k">Center</span><span className="v">{hasCenter==='yes' ? '1.82ct round' : <em>None</em>}</span></div>}
              {!isFinishedProduct && <div className="summary-row"><span className="k">Accents</span><span className="v">12 × 1.3mm</span></div>}
              <div className="summary-row"><span className="k">Files</span><span className="v">2 attached</span></div>
              <div className="summary-row"><span className="k">Ship to</span><span className="v">{dropShip ? 'Customer (Pasadena CA)' : 'Aurum & Co.'}</span></div>
            </div>
          </div>

          <div className="action-card">
            <div className="action-card__eyebrow">What happens next</div>
            <div className="action-card__title">Three steps to a quote.</div>
            <ol style={{margin:'14px 0 0',padding:0,listStyle:'none',display:'flex',flexDirection:'column',gap:14}}>
              <li style={{fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}><strong style={{color:'var(--fg-1)'}}>0–2 hours.</strong> Confirmation we received your files.</li>
              <li style={{fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}><strong style={{color:'var(--fg-1)'}}>18–48 hours.</strong> CAD review and free quote.</li>
              <li style={{fontSize:13,color:'var(--fg-2)',lineHeight:1.6}}><strong style={{color:'var(--fg-1)'}}>On approval.</strong> Production begins. Every stage on video.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

window.NewOrderScreen = NewOrderScreen;

```

---

## Part 2 — Full HTML/CSS context

Below is the complete HTML file from the bundle. This contains the design tokens, base components,
and ALL CSS class definitions for the design system. Use it as a reference for the CSS values to apply.

```html
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
```
