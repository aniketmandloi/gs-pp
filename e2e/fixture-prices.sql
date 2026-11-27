-- Prices for the end-to-end tests. CI loads them after the migrations; e2e/prices.spec.ts
-- expects these values. Spot prices end on 2026-11-20, so the page always shows them as stale.

-- 311,034.768 INR per troy ounce of gold is 100,000 per 10 g; 3,110.34768 of silver is 100,000
-- per kg.
INSERT INTO "spot_price" ("metal", "date", "inr_per_troy_oz")
SELECT spot.metal::metal, day::date, spot.inr_per_troy_oz
FROM generate_series('2025-11-20'::date, '2026-11-20'::date, interval '1 day') AS day
CROSS JOIN (VALUES ('XAU', 311034.768), ('XAG', 3110.34768)) AS spot (metal, inr_per_troy_oz);

INSERT INTO "ibja_rate" ("date", "gold_999", "gold_916", "gold_750", "silver_999")
SELECT day::date, 100000, 91600, 75000, 150000
FROM generate_series('2026-10-01'::date, '2026-11-26'::date, interval '1 day') AS day
WHERE extract(isodow FROM day) < 6;
