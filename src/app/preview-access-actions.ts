"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createPreviewToken,
  PREVIEW_ACCESS_COOKIE,
  PREVIEW_ACCESS_MAX_AGE,
  previewDestination,
  validPreviewCode,
} from "@/lib/preview-access-token";

export type PreviewAccessState = { error: string };

export async function unlockPreview(
  _previous: PreviewAccessState,
  form: FormData,
): Promise<PreviewAccessState> {
  if (!validPreviewCode(form.get("code")))
    return { error: "That code isn’t right. Try again." };
  const secret = process.env.PREVIEW_ACCESS_SECRET;
  if (!secret || secret.length < 32)
    return { error: "Access is temporarily unavailable." };
  (await cookies()).set(PREVIEW_ACCESS_COOKIE, createPreviewToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_ACCESS_MAX_AGE,
  });
  redirect(previewDestination(form.get("destination")));
}
