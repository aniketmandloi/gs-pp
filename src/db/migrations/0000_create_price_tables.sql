CREATE TYPE "public"."metal" AS ENUM('XAU', 'XAG');--> statement-breakpoint
CREATE TABLE "ibja_rate" (
	"date" date PRIMARY KEY NOT NULL,
	"gold_999" integer NOT NULL,
	"gold_916" integer NOT NULL,
	"gold_750" integer NOT NULL,
	"silver_999" integer NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_duty" (
	"effective_from" date PRIMARY KEY NOT NULL,
	"rate" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spot_price" (
	"metal" "metal" NOT NULL,
	"date" date NOT NULL,
	"inr_per_troy_oz" double precision NOT NULL,
	CONSTRAINT "spot_price_metal_date_pk" PRIMARY KEY("metal","date")
);
