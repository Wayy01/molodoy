import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Everything lives in its own schema: the shared database also hosts other apps' tables in `public`.
export const molodoy = pgSchema("molodoy");

export type Localized = { ro: string; ru: string };

/** Indexed by JS `Date#getDay()` (0 = Sunday). `null` = day off. Times are "HH:mm" in Europe/Chisinau. */
export type WeeklyHours = Array<{ start: string; end: string } | null>;

export type SiteSettings = {
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  bookingHorizonDays: number;
  slotStepMin: number;
  /** MDL off a haircut for a phone number that has never visited. */
  firstVisitDiscount: number;
};

export const roleEnum = molodoy.enum("role", ["owner", "manager", "barber"]);
export const levelEnum = molodoy.enum("barber_level", ["barber", "pro", "top"]);
export const appointmentStatusEnum = molodoy.enum("appointment_status", [
  "booked",
  "completed",
  "no_show",
  "cancelled",
]);
export const appointmentSourceEnum = molodoy.enum("appointment_source", ["online", "phone", "walk_in"]);
export const serviceCategoryEnum = molodoy.enum("service_category", ["hair", "beard", "combo", "extra"]);
export const mediaKindEnum = molodoy.enum("media_kind", ["photo", "video", "tiktok"]);
export const postStatusEnum = molodoy.enum("post_status", ["draft", "published"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const locations = molodoy.table("locations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<Localized>().notNull(),
  address: jsonb("address").$type<Localized>().notNull(),
  phone: text("phone").notNull(),
  mapEmbedUrl: text("map_embed_url"),
  mapLink: text("map_link"),
  photo: text("photo"),
  opensAt: text("opens_at").notNull().default("10:00"),
  closesAt: text("closes_at").notNull().default("20:00"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const barbers = molodoy.table(
  "barbers",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    level: levelEnum("level").notNull().default("barber"),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    photo: text("photo"),
    bio: jsonb("bio").$type<Localized>(),
    instagram: text("instagram"),
    workingHours: jsonb("working_hours").$type<WeeklyHours>().notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("barbers_location_idx").on(t.locationId)],
);

export const services = molodoy.table("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>(),
  category: serviceCategoryEnum("category").notNull(),
  durationMin: integer("duration_min").notNull(),
  // null = this tier does not offer the service
  priceBarber: integer("price_barber"),
  pricePro: integer("price_pro"),
  priceTop: integer("price_top"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const clients = molodoy.table("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  notes: text("notes"),
  demo: boolean("demo").notNull().default(false),
  createdAt: createdAt(),
});

export const appointments = molodoy.table(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    barberId: integer("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "restrict" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    price: integer("price").notNull(),
    status: appointmentStatusEnum("status").notNull().default("booked"),
    source: appointmentSourceEnum("source").notNull().default("online"),
    note: text("note"),
    demo: boolean("demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_barber_starts_idx").on(t.barberId, t.startsAt),
    index("appointments_location_starts_idx").on(t.locationId, t.startsAt),
    index("appointments_client_idx").on(t.clientId),
    index("appointments_starts_idx").on(t.startsAt),
  ],
);

export const timeOff = molodoy.table(
  "time_off",
  {
    id: serial("id").primaryKey(),
    barberId: integer("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("time_off_barber_idx").on(t.barberId, t.startsAt)],
);

export const users = molodoy.table("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  // manager: the branch they run. barber: their own chair.
  locationId: integer("location_id").references(() => locations.id, { onDelete: "set null" }),
  barberId: integer("barber_id")
    .unique()
    .references(() => barbers.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const posts = molodoy.table("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: jsonb("title").$type<Localized>().notNull(),
  excerpt: jsonb("excerpt").$type<Localized>().notNull(),
  body: jsonb("body").$type<Localized>().notNull(),
  cover: text("cover"),
  status: postStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = molodoy.table("media", {
  id: serial("id").primaryKey(),
  kind: mediaKindEnum("kind").notNull(),
  // photo/video: file path. tiktok: the TikTok video URL.
  src: text("src").notNull(),
  poster: text("poster"),
  caption: jsonb("caption").$type<Localized>(),
  barberId: integer("barber_id").references(() => barbers.id, { onDelete: "set null" }),
  featured: boolean("featured").notNull().default(false),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const settings = molodoy.table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type Location = typeof locations.$inferSelect;
export type Barber = typeof barbers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Media = typeof media.$inferSelect;
export type BarberLevel = (typeof levelEnum.enumValues)[number];
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
