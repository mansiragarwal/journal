import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    const results: string[] = [];

    // Get the first user
    const { rows: users } = await sql`SELECT id FROM users LIMIT 1`;
    if (users.length === 0) return NextResponse.json({ error: "No users" }, { status: 400 });
    const userId = users[0].id;

    // Deactivate old daily goals that are being removed
    const deactivateDaily = ["10k steps", "Brainstorming 30 mins", "Walk after meals", "Meditate"];
    for (const name of deactivateDaily) {
      const { rowCount } = await sql`
        UPDATE goal_definitions SET active = false
        WHERE user_id = ${userId} AND frequency = 'daily' AND LOWER(name) = LOWER(${name}) AND active = true
      `;
      if (rowCount && rowCount > 0) results.push(`Deactivated daily: ${name}`);
    }

    // Deactivate old weekly goals being removed
    const { rowCount: cleanDeactivated } = await sql`
      UPDATE goal_definitions SET active = false
      WHERE user_id = ${userId} AND frequency = 'weekly' AND LOWER(name) LIKE '%clean%' AND active = true
    `;
    if (cleanDeactivated && cleanDeactivated > 0) results.push("Deactivated weekly: Clean 10 mins");

    // Add new daily goals
    const newDaily = [
      { name: "15k steps", tracking_type: "boolean" },
      { name: "Read before bed", tracking_type: "boolean" },
      { name: "Consistent sleep schedule", tracking_type: "boolean" },
      { name: "Skincare & dental care", tracking_type: "boolean" },
      { name: "30 mins creative time", tracking_type: "boolean" },
    ];
    for (const g of newDaily) {
      const { rows: existing } = await sql`
        SELECT id FROM goal_definitions
        WHERE user_id = ${userId} AND frequency = 'daily' AND LOWER(name) = LOWER(${g.name}) AND active = true
      `;
      if (existing.length === 0) {
        await sql`
          INSERT INTO goal_definitions (user_id, name, frequency, tracking_type)
          VALUES (${userId}, ${g.name}, 'daily', ${g.tracking_type})
        `;
        results.push(`Added daily: ${g.name}`);
      } else {
        results.push(`Already exists daily: ${g.name}`);
      }
    }

    // Update weekly: Weightlifting target 3 -> 2
    const { rowCount: wlUpdated } = await sql`
      UPDATE goal_definitions SET target_value = 2
      WHERE user_id = ${userId} AND frequency = 'weekly' AND LOWER(name) LIKE '%weightlift%' AND active = true
    `;
    if (wlUpdated && wlUpdated > 0) results.push("Updated Weightlifting target: 3 -> 2");

    // Update Yoga to target 1 (if numeric) or keep as boolean
    const { rows: yogaRows } = await sql`
      SELECT id, tracking_type FROM goal_definitions
      WHERE user_id = ${userId} AND frequency = 'weekly' AND LOWER(name) = 'yoga' AND active = true
    `;
    if (yogaRows.length > 0 && yogaRows[0].tracking_type === 'number') {
      await sql`UPDATE goal_definitions SET target_value = 1 WHERE id = ${yogaRows[0].id}`;
      results.push("Updated Yoga target: -> 1");
    }

    // Update Pilates to target 1 (if numeric) or keep as boolean
    const { rows: pilatesRows } = await sql`
      SELECT id, tracking_type FROM goal_definitions
      WHERE user_id = ${userId} AND frequency = 'weekly' AND LOWER(name) = 'pilates' AND active = true
    `;
    if (pilatesRows.length > 0 && pilatesRows[0].tracking_type === 'number') {
      await sql`UPDATE goal_definitions SET target_value = 1 WHERE id = ${pilatesRows[0].id}`;
      results.push("Updated Pilates target: -> 1");
    }

    // Verify final state
    const { rows: finalGoals } = await sql`
      SELECT name, frequency, tracking_type, target_value, active
      FROM goal_definitions WHERE user_id = ${userId} AND active = true
      ORDER BY frequency, sort_order, id
    `;

    return NextResponse.json({ actions: results, active_goals: finalGoals });
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
