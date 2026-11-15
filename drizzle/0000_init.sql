CREATE SCHEMA IF NOT EXISTS "molodoy";
--> statement-breakpoint
CREATE TYPE "molodoy"."appointment_source" AS ENUM('online', 'phone', 'walk_in');--> statement-breakpoint
CREATE TYPE "molodoy"."appointment_status" AS ENUM('booked', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "molodoy"."barber_level" AS ENUM('barber', 'pro', 'top');--> statement-breakpoint
CREATE TYPE "molodoy"."media_kind" AS ENUM('photo', 'video', 'tiktok');--> statement-breakpoint
CREATE TYPE "molodoy"."post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "molodoy"."role" AS ENUM('owner', 'manager', 'barber');--> statement-breakpoint
CREATE TYPE "molodoy"."service_category" AS ENUM('hair', 'beard', 'combo', 'extra');--> statement-breakpoint
CREATE TABLE "molodoy"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"location_id" integer NOT NULL,
	"barber_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"price" integer NOT NULL,
	"status" "molodoy"."appointment_status" DEFAULT 'booked' NOT NULL,
	"source" "molodoy"."appointment_source" DEFAULT 'online' NOT NULL,
	"note" text,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."barbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"level" "molodoy"."barber_level" DEFAULT 'barber' NOT NULL,
	"location_id" integer NOT NULL,
	"photo" text,
	"bio" jsonb,
	"instagram" text,
	"working_hours" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barbers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"address" jsonb NOT NULL,
	"phone" text NOT NULL,
	"map_embed_url" text,
	"map_link" text,
	"photo" text,
	"opens_at" text DEFAULT '10:00' NOT NULL,
	"closes_at" text DEFAULT '20:00' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."media" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "molodoy"."media_kind" NOT NULL,
	"src" text NOT NULL,
	"poster" text,
	"caption" jsonb,
	"barber_id" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "molodoy"."posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"excerpt" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"cover" text,
	"status" "molodoy"."post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"category" "molodoy"."service_category" NOT NULL,
	"duration_min" integer NOT NULL,
	"price_barber" integer,
	"price_pro" integer,
	"price_top" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "molodoy"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "molodoy"."time_off" (
	"id" serial PRIMARY KEY NOT NULL,
	"barber_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "molodoy"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "molodoy"."role" NOT NULL,
	"location_id" integer,
	"barber_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_barber_id_unique" UNIQUE("barber_id")
);
--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "molodoy"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "molodoy"."barbers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "molodoy"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "molodoy"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."barbers" ADD CONSTRAINT "barbers_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "molodoy"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."media" ADD CONSTRAINT "media_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "molodoy"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "molodoy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."time_off" ADD CONSTRAINT "time_off_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "molodoy"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."users" ADD CONSTRAINT "users_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "molodoy"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "molodoy"."users" ADD CONSTRAINT "users_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "molodoy"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_barber_starts_idx" ON "molodoy"."appointments" USING btree ("barber_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_location_starts_idx" ON "molodoy"."appointments" USING btree ("location_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "molodoy"."appointments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "appointments_starts_idx" ON "molodoy"."appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "barbers_location_idx" ON "molodoy"."barbers" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "time_off_barber_idx" ON "molodoy"."time_off" USING btree ("barber_id","starts_at");