CREATE SCHEMA "site";
--> statement-breakpoint
CREATE TYPE "site"."city_kind" AS ENUM('branch', 'coverage');--> statement-breakpoint
CREATE TYPE "site"."faq_scope" AS ENUM('global', 'state', 'city', 'service');--> statement-breakpoint
CREATE TYPE "site"."fate" AS ENUM('publish_verbatim', 'regenerate', 'redirect', 'gone');--> statement-breakpoint
CREATE TYPE "site"."page_kind" AS ENUM('hub', 'state', 'city', 'service', 'legacy');--> statement-breakpoint
CREATE TYPE "site"."page_status" AS ENUM('draft', 'review', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "site"."tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TABLE "site"."branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"state_id" integer NOT NULL,
	"region_id" integer,
	"street" text NOT NULL,
	"street_short" text NOT NULL,
	"city" text NOT NULL,
	"zip" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"photo_key" text,
	"google_place_id" text,
	"rating" numeric(2, 1),
	"rating_count" integer,
	"licenses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "branches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site"."cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"state_id" integer NOT NULL,
	"kind" "site"."city_kind" NOT NULL,
	"branch_id" integer,
	"region_id" integer,
	"lat" double precision,
	"lng" double precision,
	"neighborhoods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"local_specifics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hero_image_key" text,
	"hero_image_alt" text,
	"tier" "site"."tier" DEFAULT 'B' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"legacy_post_id" integer,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site"."faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" "site"."faq_scope" NOT NULL,
	"scope_id" integer,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site"."masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"body" jsonb NOT NULL,
	CONSTRAINT "masters_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "site"."pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "site"."page_kind" NOT NULL,
	"slug" text NOT NULL,
	"city_id" integer,
	"service_id" integer,
	"tier" "site"."tier" NOT NULL,
	"fate" "site"."fate" NOT NULL,
	"status" "site"."page_status" DEFAULT 'draft' NOT NULL,
	"redirect_to" text,
	"legacy_post_id" integer,
	"legacy_url" text,
	"gsc_clicks_12m" integer DEFAULT 0 NOT NULL,
	"lead_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site"."prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_id" integer NOT NULL,
	"service_key" text NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site"."regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site"."service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"tile_image_key" text,
	"tile_image_alt" text,
	"row_key" text,
	"booking_service" text,
	CONSTRAINT "service_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "site"."services" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"name_template" text NOT NULL,
	"card_copy_template" text NOT NULL,
	CONSTRAINT "services_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "site"."states" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"blurb" text NOT NULL,
	"hero_lede" text NOT NULL,
	"intro_heading" text NOT NULL,
	"intro_paragraphs" jsonb NOT NULL,
	"climate_notes" jsonb NOT NULL,
	"editorial" jsonb NOT NULL,
	"detail_accordion" jsonb NOT NULL,
	"photo_key" text,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "states_code_unique" UNIQUE("code"),
	CONSTRAINT "states_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "site"."branches" ADD CONSTRAINT "branches_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "site"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."branches" ADD CONSTRAINT "branches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "site"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "site"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD CONSTRAINT "cities_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "site"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD CONSTRAINT "cities_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "site"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."pages" ADD CONSTRAINT "pages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "site"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."pages" ADD CONSTRAINT "pages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "site"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."prices" ADD CONSTRAINT "prices_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "site"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site"."services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "site"."service_categories"("id") ON DELETE no action ON UPDATE no action;