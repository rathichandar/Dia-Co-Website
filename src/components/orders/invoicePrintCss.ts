// Printing the invoice page prints the sheet alone, on Letter with the ERP's 0.1in margins (its .jb-page rules). On
// screen the sheet is a fixed 8.5in × 11in; printed, it takes the printable area instead, so the margins can never
// push it onto a second, blank page.
export const INVOICE_PRINT_CSS = `@media print {
  @page { size: letter; margin: 0.1in; }
  .top-nav-wrap, .inv-bar { display: none !important; }
  html, body, .inv-screen { background: #fff !important; min-height: 0 !important; }
  .inv-scroll { overflow: visible !important; padding: 0 !important; }
  .diaco-design .inv-page { width: auto; min-height: 0; margin: 0; box-shadow: none; border: 0; }
}`
