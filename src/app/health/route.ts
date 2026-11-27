import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  const commit = process.env.COMMIT_SHA;
  try {
    await db.execute(sql`select 1`);
  } catch {
    return Response.json({ status: "error", commit }, { status: 503 });
  }
  return Response.json({ status: "ok", commit });
}
