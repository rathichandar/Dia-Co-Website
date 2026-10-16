-- Add 'stones' as a quote_line_type so stone purchase lines (lab diamond
-- accents, sapphire accents, etc.) have a dedicated category instead of
-- falling through to 'other'. ADD VALUE IF NOT EXISTS makes this idempotent.

alter type quote_line_type add value if not exists 'stones';
