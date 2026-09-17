CREATE TABLE "site"."contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"page_slug" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
