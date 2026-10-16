-- Seed data for master/reference tables, per SCHEMA.md.

-- Metals (14 rows)
insert into metals (name, short_code, karat, color, base_metal, conversion_factor_from_10kyg, display_order) values
  ('10k Yellow Gold', '10kYG', 10,   'yellow', 'gold',     1.000,  1),
  ('10k White Gold',  '10kWG', 10,   'white',  'gold',     1.000,  2),
  ('10k Rose Gold',   '10kRG', 10,   'rose',   'gold',     1.000,  3),
  ('14k Yellow Gold', '14kYG', 14,   'yellow', 'gold',     1.124,  4),
  ('14k White Gold',  '14kWG', 14,   'white',  'gold',     1.124,  5),
  ('14k Rose Gold',   '14kRG', 14,   'rose',   'gold',     1.124,  6),
  ('18k Yellow Gold', '18kYG', 18,   'yellow', 'gold',     1.345,  7),
  ('18k White Gold',  '18kWG', 18,   'white',  'gold',     1.345,  8),
  ('18k Rose Gold',   '18kRG', 18,   'rose',   'gold',     1.345,  9),
  ('22k Yellow Gold', '22kYG', 22,   'yellow', 'gold',     1.562, 10),
  ('24k Yellow Gold', '24kYG', 24,   'yellow', 'gold',     1.660, 11),
  ('Platinum',        'PT',    null, 'white',  'platinum', 1.808, 12),
  ('Silver',          'SS',    null, 'white',  'silver',   0.905, 13),
  ('Palladium',       'PD',    null, 'white',  'palladium',1.080, 14);

-- Stone types (22 rows)
insert into stone_types (category, name, display_order) values
  ('natural_diamond', 'Natural Diamond',     1),
  ('lab_diamond',     'Lab-Grown Diamond',   2),
  ('color_stone',     'Alexandrite',         3),
  ('color_stone',     'Amethyst',            4),
  ('color_stone',     'Aquamarine',          5),
  ('color_stone',     'Citrine',             6),
  ('color_stone',     'Emerald',             7),
  ('color_stone',     'Garnet',              8),
  ('color_stone',     'Opal',                9),
  ('color_stone',     'Pearl',              10),
  ('color_stone',     'Peridot',            11),
  ('color_stone',     'Ruby',               12),
  ('color_stone',     'Yellow Sapphire',    13),
  ('color_stone',     'Blue Sapphire',      14),
  ('color_stone',     'Tanzanite',          15),
  ('color_stone',     'Blue Topaz',         16),
  ('color_stone',     'White Topaz',        17),
  ('color_stone',     'Yellow Topaz',       18),
  ('color_stone',     'Pink Topaz',         19),
  ('color_stone',     'Pink Tourmaline',    20),
  ('color_stone',     'Black Diamond',      21),
  ('color_stone',     'Other',              22);

-- Stone shapes (17 rows)
insert into stone_shapes (name, short_code, display_order) values
  ('Round',         'RD',   1),
  ('Princess',      'PRN',  2),
  ('Baguette',      'BAG',  3),
  ('Tape Baguette', 'TBG',  4),
  ('Marquise',      'MAR',  5),
  ('Cushion',       'CUS',  6),
  ('Trillion',      'TRL',  7),
  ('Emerald',       'EM',   8),
  ('Oval',          'OV',   9),
  ('Pear',          'PR',  10),
  ('Heart',         'HRT', 11),
  ('Asscher',       'ASH', 12),
  ('Radiant',       'RAD', 13),
  ('Trapezoid',     'TZ',  14),
  ('Half Moon',     'HM',  15),
  ('Cadillac',      'CAD', 16),
  ('Kite',          'KT',  17);

-- Setting styles (9 rows)
insert into setting_styles (name, display_order) values
  ('Prong',         1),
  ('U Pave',        2),
  ('U Prong',       3),
  ('Wall Pave',     4),
  ('Channel',       5),
  ('Bezel',         6),
  ('Single Prong',  7),
  ('French Pave',   8),
  ('Invisible',     9);

-- Product types (9 rows)
insert into product_types (name, short_code, display_order) values
  ('Ring',      'R',  1),
  ('Earring',   'E',  2),
  ('Pendant',   'P',  3),
  ('Necklace',  'N',  4),
  ('Bracelet',  'BR', 5),
  ('Locks',     'L',  6),
  ('Charm',     'CH', 7),
  ('Cufflinks', 'CL', 8),
  ('Other',     'O',  9);
