CREATE TABLE "site"."page_source" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"wp_post_id" integer,
	"post_title" text NOT NULL,
	"post_content" text NOT NULL,
	"post_modified" text,
	"yoast_title" text,
	"yoast_metadesc" text,
	"yoast_canonical" text,
	"thumbnail_id" integer,
	"phone" text,
	"job_location" text,
	"content_sha256" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_source_slug_unique" UNIQUE("slug")
);
