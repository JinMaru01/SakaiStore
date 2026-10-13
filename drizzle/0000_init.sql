CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'processing', 'delivered', 'failed', 'refunded', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"publisher" varchar(120),
	"tagline" text,
	"description" text,
	"currency_name" varchar(40) DEFAULT 'Diamonds' NOT NULL,
	"image_url" text,
	"accent_color" varchar(16) DEFAULT '#7c5cff' NOT NULL,
	"id_label" varchar(40) DEFAULT 'User ID' NOT NULL,
	"id_pattern" varchar(160),
	"id_help" text,
	"requires_zone" boolean DEFAULT false NOT NULL,
	"zone_label" varchar(40),
	"zone_pattern" varchar(160),
	"zone_options" jsonb,
	"hashtags" text,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"message" text,
	"actor" varchar(32) DEFAULT 'system' NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"game_id" integer,
	"package_id" integer,
	"game_slug" varchar(64) NOT NULL,
	"game_name" varchar(120) NOT NULL,
	"package_name" varchar(120) NOT NULL,
	"player_id" varchar(64) NOT NULL,
	"zone_id" varchar(32),
	"player_name" varchar(120),
	"unit_price_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"promo_code_id" integer,
	"promo_code" varchar(32),
	"payment_method" varchar(24) DEFAULT 'khqr' NOT NULL,
	"khqr" text,
	"khqr_md5" varchar(64),
	"payment_expires_at" timestamp with time zone,
	"payment_ref" varchar(128),
	"payment_payload" jsonb,
	"last_payment_check_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"contact_phone" varchar(32),
	"contact_telegram" varchar(64),
	"customer_telegram_chat_id" varchar(32),
	"customer_note" text,
	"admin_note" text,
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"channel" varchar(24) DEFAULT 'direct' NOT NULL,
	"utm_source" varchar(120),
	"utm_medium" varchar(120),
	"utm_campaign" varchar(120),
	"utm_content" varchar(120),
	"utm_term" varchar(120),
	"click_id" varchar(255),
	"referrer" text,
	"landing_path" text,
	"ip_hash" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_cents" integer,
	"badge" varchar(24),
	"supplier_sku" varchar(64),
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"description" text,
	"type" "promo_type" NOT NULL,
	"value" integer NOT NULL,
	"max_discount_cents" integer,
	"min_order_cents" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"game_id" integer,
	"channel" varchar(24),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_active_sort_idx" ON "games" USING btree ("active","sort_order");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_md5_idx" ON "orders" USING btree ("khqr_md5");--> statement-breakpoint
CREATE INDEX "orders_channel_idx" ON "orders" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "packages_game_idx" ON "packages" USING btree ("game_id","sort_order");