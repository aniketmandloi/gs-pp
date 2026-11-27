import { max } from "drizzle-orm";
import { db } from "@/db";
import { ibjaRate, spotPrice } from "@/db/schema";

export async function GET() {
  const commit = process.env.COMMIT_SHA;
  try {
    const [[spot], [ibja]] = await Promise.all([
      db.select({ date: max(spotPrice.date) }).from(spotPrice),
      db.select({ date: max(ibjaRate.date) }).from(ibjaRate),
    ]);
    return Response.json({
      status: "ok",
      commit,
      latestSpotDate: spot.date,
      latestIbjaDate: ibja.date,
    });
  } catch {
    return Response.json({ status: "error", commit }, { status: 503 });
  }
}
