CREATE TABLE "site"."bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"adapter" text DEFAULT 'mock' NOT NULL,
	"external_id" text,
	"service_key" text NOT NULL,
	"service_label" text NOT NULL,
	"preferred_date" text NOT NULL,
	"time_window" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"zip" text NOT NULL,
	"address" text,
	"notes" text,
	"page_slug" text,
	"page_kind" text,
	"state_code" text,
	"city_id" integer,
	"city_name" text,
	"branch_id" integer,
	"service_id" integer,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "site"."bookings" ADD CONSTRAINT "bookings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "site"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."bookings" ADD CONSTRAINT "bookings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "site"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "site"."services"("id") ON DELETE no action ON UPDATE no action;