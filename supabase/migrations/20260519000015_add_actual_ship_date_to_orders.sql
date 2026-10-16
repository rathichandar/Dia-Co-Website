-- Track the actual date the order shipped, separate from the estimated
-- expected_ship_date. Powers the History page's grouping + the 7-day
-- post-ship grace window on the Active tab.
--
-- We intentionally don't add tracking_number / shipping_carrier /
-- shipping_service yet — those aren't shown on the History row.

alter table orders
  add column if not exists actual_ship_date date;
