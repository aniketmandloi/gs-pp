import {
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";

export const metal = pgEnum("metal", ["XAU", "XAG"]);

// One row per calendar day, as goldapi returns it: weekends repeat the previous close.
export const spotPrice = pgTable(
  "spot_price",
  {
    metal: metal().notNull(),
    date: date().notNull(),
    inrPerTroyOz: doublePrecision("inr_per_troy_oz").notNull(),
  },
  (table) => [primaryKey({ columns: [table.metal, table.date] })],
);

// IBJA PM fixing in INR excluding GST: gold per 10 g, silver per kg.
export const ibjaRate = pgTable("ibja_rate", {
  date: date().primaryKey(),
  gold999: integer("gold_999").notNull(),
  gold916: integer("gold_916").notNull(),
  gold750: integer("gold_750").notNull(),
  silver999: integer("silver_999").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const importDuty = pgTable("import_duty", {
  effectiveFrom: date("effective_from").primaryKey(),
  rate: doublePrecision().notNull(),
});
