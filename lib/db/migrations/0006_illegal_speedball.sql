ALTER TABLE "site"."bookings" ALTER COLUMN "preferred_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "site"."bookings" ALTER COLUMN "time_window" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "site"."bookings" ADD COLUMN "source" text DEFAULT 'booking' NOT NULL;