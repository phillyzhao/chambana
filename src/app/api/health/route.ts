export const dynamic = "force-dynamic";

// Application liveness only; the retired beta database is not a dependency.
export async function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
