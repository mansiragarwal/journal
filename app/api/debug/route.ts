import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

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

  return NextResponse.json(checks, { status: 200 });
}
