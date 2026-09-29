import { z } from "zod";
import { database, serviceDatabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  try {
    const db = await database();
    const { data, error } = await db
      .from("profiles")
      .select("avatar_path")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Profile unavailable");
    if (!data?.avatar_path?.startsWith(`${id}/`))
      return new Response(null, { status: 404 });
    const image = await serviceDatabase()
      .storage.from("profile-avatars")
      .download(data.avatar_path);
    if (image.error || !image.data) throw new Error("Image unavailable");
    return new Response(image.data, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
