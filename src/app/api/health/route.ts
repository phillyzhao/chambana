import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new Error("Configuration");
    const db = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    });
    const { error } = await db
      .from("missions")
      .select("id,manual_review")
      .limit(1);
    if (error) throw new Error("Database");
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
