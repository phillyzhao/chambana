import { timingSafeEqual } from "node:crypto";
import { serviceDatabase } from "@/lib/supabase";
import { verifySubmission } from "@/lib/verification";
import { operationalEvent } from "@/lib/observability";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") || "";
  const wanted = `Bearer ${expected}`;
  const actualBytes = Buffer.from(actual);
  const wantedBytes = Buffer.from(wanted);
  if (
    !expected ||
    actualBytes.length !== wantedBytes.length ||
    !timingSafeEqual(actualBytes, wantedBytes)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = serviceDatabase();
    const stale = await db
      .from("submissions")
      .update({
        status: "needs_review",
        reason: "Automatic processing was interrupted. Admin review required.",
        lease_token: null,
        lease_until: null,
        updated_at: new Date().toISOString(),
      })
      .or(
        `and(status.eq.uploading,created_at.lt.${new Date(Date.now() - 10 * 60000).toISOString()}),and(status.eq.processing,attempts.gte.3,lease_until.lt.${new Date().toISOString()})`,
      );
    if (stale.error)
      return Response.json({ error: "Queue unavailable" }, { status: 503 });
    const queue = await db
      .from("submissions")
      .select("id")
      .or(
        `status.eq.pending,and(status.eq.processing,lease_until.lt.${new Date().toISOString()})`,
      )
      .lt("attempts", 3)
      .order("created_at")
      .limit(2);
    if (queue.error)
      return Response.json({ error: "Queue unavailable" }, { status: 503 });
    const results = await Promise.allSettled(
      (queue.data || []).map((s) => verifySubmission(s.id)),
    );
    const cleanup = await db
      .from("request_limits")
      .delete()
      .lt("expires_at", new Date(Date.now() - 86400000).toISOString());
    if (cleanup.error) operationalEvent("rate_limit_cleanup_failed");
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) operationalEvent("queue_processing_failed");
    return Response.json(
      {
        processed: results.filter((r) => r.status === "fulfilled").length,
        failed,
      },
      { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    operationalEvent("queue_unavailable");
    return Response.json({ error: "Queue unavailable" }, { status: 503 });
  }
}
