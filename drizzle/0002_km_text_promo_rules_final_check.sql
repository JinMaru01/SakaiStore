ALTER TABLE "games" ADD COLUMN "tagline_km" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "description_km" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "id_help_km" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_final_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD COLUMN "description_km" text;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD COLUMN "first_order_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_promo_status_idx" ON "orders" USING btree ("promo_code_id","status");