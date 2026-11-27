-- Prices for the end-to-end tests. CI loads them after the migrations; e2e/prices.spec.ts
-- expects these values.
INSERT INTO "ibja_rate" ("date", "gold_999", "gold_916", "gold_750", "silver_999") VALUES
	('2026-11-25', 99000, 90700, 74300, 148000),
	('2026-11-26', 100000, 91600, 75000, 150000);

INSERT INTO "spot_price" ("metal", "date", "inr_per_troy_oz") VALUES
	('XAU', '2026-11-25', 300000),
	('XAU', '2026-11-26', 301000),
	('XAG', '2026-11-25', 3600),
	('XAG', '2026-11-26', 3610);
