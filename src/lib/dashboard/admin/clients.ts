import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, clients, locations, services } from "@/db/schema";
import { appointmentScope, type DashboardContext } from "@/lib/dashboard/context";
import { likeTerm } from "./validation";

export const CLIENT_SORTS = ["last", "visits", "spent", "name"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];
export const CLIENTS_PAGE_SIZE = 25;

/** Owners looking at every branch also see clients without bookings; everyone else only clients they served. */
function isScoped(ctx: DashboardContext) {
  return !!(ctx.barber || ctx.locationId || ctx.scope.locationIds);
}

const completed = sql`${appointments.status} = 'completed'`;

function searchWhere(q: string): SQL | undefined {
  if (!q) return undefined;
  // "069 123 456", "+373 69..." and "69123" should all hit +37369123456.
  const digits = q.replace(/\D/g, "").replace(/^0+/, "");
  return or(
    ilike(clients.name, likeTerm(q)),
    ilike(clients.email, likeTerm(q)),
    digits.length >= 3 ? like(clients.phone, `%${digits}%`) : undefined,
  );
}

export async function listClients(ctx: DashboardContext, opts: { q: string; sort: ClientSort; page: number }) {
  const agg = db.$with("agg").as(
    db
      .select({
        clientId: appointments.clientId,
        visits: sql<number>`(count(*) filter (where ${completed}))::int`.as("visits"),
        spent: sql<number>`coalesce(sum(${appointments.price}) filter (where ${completed}), 0)::int`.as("spent"),
        lastVisit: sql<string | null>`max(${appointments.startsAt}) filter (where ${completed})`.as("last_visit"),
        noShows: sql<number>`(count(*) filter (where ${appointments.status} = 'no_show'))::int`.as("no_shows"),
      })
      .from(appointments)
      .where(appointmentScope(ctx))
      .groupBy(appointments.clientId),
  );

  // Left join + "has a row in agg" filter behaves as an inner join for scoped viewers.
  const where = and(isScoped(ctx) ? isNotNull(agg.clientId) : undefined, searchWhere(opts.q));
  const visits = sql<number>`coalesce(${agg.visits}, 0)`;
  const spent = sql<number>`coalesce(${agg.spent}, 0)`;
  const order = {
    last: [sql`${agg.lastVisit} desc nulls last`, desc(clients.id)],
    visits: [sql`${visits} desc`, sql`${agg.lastVisit} desc nulls last`],
    spent: [sql`${spent} desc`, sql`${agg.lastVisit} desc nulls last`],
    name: [asc(clients.name), asc(clients.id)],
  }[opts.sort];

  // Postgres defers this per-row subquery until after ORDER BY/LIMIT, so it only runs for the visible page.
  const favorite = sql<string | null>`(
    select ${barbers.name} from ${appointments}
    inner join ${barbers} on ${barbers.id} = ${appointments.barberId}
    where ${appointments.clientId} = ${clients.id} and ${completed} and ${appointmentScope(ctx) ?? sql`true`}
    group by ${barbers.id}, ${barbers.name}
    order by count(*) desc, max(${appointments.startsAt}) desc
    limit 1
  )`;

  const rowsQuery = db
    .with(agg)
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      visits,
      spent,
      lastVisit: agg.lastVisit,
      noShows: sql<number>`coalesce(${agg.noShows}, 0)`,
      favorite,
    })
    .from(clients)
    .leftJoin(agg, eq(agg.clientId, clients.id))
    .where(where)
    .orderBy(...order)
    .limit(CLIENTS_PAGE_SIZE)
    .offset((opts.page - 1) * CLIENTS_PAGE_SIZE);

  const countQuery = db.with(agg).select({ n: count() }).from(clients).leftJoin(agg, eq(agg.clientId, clients.id)).where(where);

  const [rows, [{ n }]] = await Promise.all([rowsQuery, countQuery]);
  return {
    rows: rows.map((r) => ({ ...r, lastVisit: r.lastVisit ? new Date(r.lastVisit) : null })),
    total: n,
    pages: Math.max(1, Math.ceil(n / CLIENTS_PAGE_SIZE)),
  };
}

export type ClientRow = Awaited<ReturnType<typeof listClients>>["rows"][number];

/** Profile, stats, history and favorite barber. `null` when the client is outside the viewer's scope. */
export async function getClientDetail(ctx: DashboardContext, id: number) {
  const scope = appointmentScope(ctx, eq(appointments.clientId, id));
  const [client, [stats], history, [favorite]] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, id) }),
    db
      .select({
        total: sql<number>`count(*)::int`,
        visits: sql<number>`(count(*) filter (where ${completed}))::int`,
        spent: sql<number>`coalesce(sum(${appointments.price}) filter (where ${completed}), 0)::int`,
        noShows: sql<number>`(count(*) filter (where ${appointments.status} = 'no_show'))::int`,
        firstVisit: sql<string | null>`min(${appointments.startsAt}) filter (where ${completed})`,
        lastVisit: sql<string | null>`max(${appointments.startsAt}) filter (where ${completed})`,
      })
      .from(appointments)
      .where(scope),
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        status: appointments.status,
        price: appointments.price,
        source: appointments.source,
        note: appointments.note,
        service: services.name,
        barber: barbers.name,
        location: locations.name,
      })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .innerJoin(barbers, eq(barbers.id, appointments.barberId))
      .innerJoin(locations, eq(locations.id, appointments.locationId))
      .where(scope)
      .orderBy(desc(appointments.startsAt))
      .limit(200),
    db
      .select({ id: barbers.id, name: barbers.name, photo: barbers.photo })
      .from(appointments)
      .innerJoin(barbers, eq(barbers.id, appointments.barberId))
      .where(and(scope, sql`${appointments.status} <> 'cancelled'`))
      .groupBy(barbers.id)
      .orderBy(sql`count(*) filter (where ${completed}) desc`, sql`count(*) desc`, sql`max(${appointments.startsAt}) desc`)
      .limit(1),
  ]);

  if (!client) return null;
  if (ctx.user.role !== "owner" && stats.total === 0) return null;

  const first = stats.firstVisit ? new Date(stats.firstVisit) : null;
  const last = stats.lastVisit ? new Date(stats.lastVisit) : null;
  const avgGapDays = first && last && stats.visits > 1 ? Math.round((+last - +first) / 86_400_000 / (stats.visits - 1)) : null;

  return {
    client,
    stats: {
      visits: stats.visits,
      spent: stats.spent,
      avgTicket: stats.visits ? Math.round(stats.spent / stats.visits) : 0,
      noShows: stats.noShows,
      firstVisit: first,
      lastVisit: last,
      avgGapDays,
    },
    history,
    favorite: favorite ?? null,
  };
}
