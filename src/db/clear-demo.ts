/** Removes the generated demo clients and appointments, keeping real bookings. `bun run db:clear-demo` */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const a = await sql`DELETE FROM molodoy.appointments WHERE demo = true`;
const c = await sql`DELETE FROM molodoy.clients c WHERE demo = true
  AND NOT EXISTS (SELECT 1 FROM molodoy.appointments a WHERE a.client_id = c.id)`;
console.log(`Removed ${a.count} demo appointments and ${c.count} demo clients.`);
await sql.end();
