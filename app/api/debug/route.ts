import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    // Fix weekly goal logs stored on non-Monday dates
    // Sundays: move forward 1 day to Monday (likely off-by-one from AI)
    // Other days: move back to Monday of that week
    const { rowCount } = await sql`
      UPDATE goal_logs gl
      SET period_date = CASE
        WHEN EXTRACT(DOW FROM gl.period_date) = 0 THEN (gl.period_date + 1)::date
        ELSE date_trunc('week', gl.period_date)::date
      END
      FROM goal_definitions gd
      WHERE gd.id = gl.goal_id
        AND gd.frequency = 'weekly'
        AND EXTRACT(DOW FROM gl.period_date) != 1
    `;
    return NextResponse.json({ fixed: rowCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const checks: Record<string, string> = {};

  checks.AUTH_SECRET = process.env.AUTH_SECRET ? "set" : "MISSING";
  checks.AUTH_URL = process.env.AUTH_URL ?? "MISSING";
  checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? `set (${process.env.GOOGLE_CLIENT_ID.slice(0, 10)}...)` : "MISSING";
  checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "set" : "MISSING";
  checks.POSTGRES_URL = process.env.POSTGRES_URL ? "set" : "MISSING";

  try {
    const { rows } = await sql`SELECT COUNT(*) as count FROM users`;
    checks.db_connection = `ok (${rows[0].count} users)`;
  } catch (err) {
    checks.db_connection = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    const { rows } = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    checks.tables = rows.map((r) => r.tablename).join(", ");
  } catch (err) {
    checks.tables = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    const { rows } = await sql`
      SELECT gl.id, gl.goal_id, gl.period_date, gl.completed, gl.value, gl.updated_at, gd.name, gd.frequency
      FROM goal_logs gl
      JOIN goal_definitions gd ON gd.id = gl.goal_id
      ORDER BY gl.updated_at DESC
      LIMIT 30
    `;
    checks.all_recent_logs = JSON.stringify(rows);
  } catch (err) {
    checks.all_recent_logs = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
