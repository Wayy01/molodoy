-- Two clients hitting "confirm" on the same slot at the same time must not both win.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist ("barber_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');
--> statement-breakpoint
ALTER TABLE "molodoy"."appointments" ADD CONSTRAINT "appointments_valid_range" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "molodoy"."time_off" ADD CONSTRAINT "time_off_valid_range" CHECK ("ends_at" > "starts_at");
