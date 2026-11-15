"use client";

import {
  CalendarBlank,
  ChartLineUp,
  GearSix,
  ImagesSquare,
  ListChecks,
  MapPin,
  Scissors,
  Tag,
  Users,
  type Icon,
} from "@phosphor-icons/react";
import type { Role } from "@/db/schema";

export type NavItem = { href: string; key: string; icon: Icon; roles: Role[]; primary?: boolean };

/** `primary` items sit in the phone bottom bar; the rest live under "More". */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "overview", icon: ChartLineUp, roles: ["owner", "manager", "barber"], primary: true },
  { href: "/dashboard/calendar", key: "calendar", icon: CalendarBlank, roles: ["owner", "manager", "barber"], primary: true },
  { href: "/dashboard/appointments", key: "appointments", icon: ListChecks, roles: ["owner", "manager", "barber"], primary: true },
  { href: "/dashboard/clients", key: "clients", icon: Users, roles: ["owner", "manager", "barber"], primary: true },
  { href: "/dashboard/team", key: "team", icon: Scissors, roles: ["owner", "manager"] },
  { href: "/dashboard/services", key: "services", icon: Tag, roles: ["owner", "manager"] },
  { href: "/dashboard/locations", key: "locations", icon: MapPin, roles: ["owner"] },
  { href: "/dashboard/content", key: "content", icon: ImagesSquare, roles: ["owner", "manager"] },
  { href: "/dashboard/settings", key: "settings", icon: GearSix, roles: ["owner"] },
];

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
