CREATE TYPE "site"."source_status" AS ENUM('NO_SOURCE_PAGE', 'SOURCE_PAGE_EXISTS', 'SOURCE_PAGE_INCOMPLETE', 'SOURCE_PAGE_PUBLISHABLE');--> statement-breakpoint
ALTER TABLE "site"."cities" ADD COLUMN "source_status" "site"."source_status" DEFAULT 'SOURCE_PAGE_EXISTS' NOT NULL;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD COLUMN "review_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD COLUMN "legacy_pricing_copy" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site"."cities" ADD COLUMN "legacy_thumbnail_id" integer;