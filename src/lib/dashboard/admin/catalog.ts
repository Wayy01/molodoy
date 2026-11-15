import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locations, services } from "@/db/schema";

/** All services, inactive included, in menu order. */
export function listAllServices() {
  return db.query.services.findMany({ orderBy: [asc(services.sortOrder), asc(services.id)] });
}

/** All branches, inactive included. Owner-only pages. */
export function listAllLocations() {
  return db.query.locations.findMany({ orderBy: [asc(locations.sortOrder), asc(locations.id)] });
}

export function getLocation(id: number) {
  return db.query.locations.findFirst({ where: eq(locations.id, id) });
}
