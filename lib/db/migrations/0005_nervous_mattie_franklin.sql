CREATE TYPE "site"."lead_status" AS ENUM('new', 'contacted', 'sold', 'dead');--> statement-breakpoint
CREATE TABLE "site"."leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"status" "site"."lead_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"zip" text NOT NULL,
	"zip_city" text,
	"zip_state" text,
	"service_key" text,
	"service_label" text,
	"message" text,
	"page_slug" text,
	"page_kind" text,
	"source_url" text,
	"diverted_from_booking" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_reference_unique" UNIQUE("reference")
);
