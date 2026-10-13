import { cookies } from "next/headers";
import {
  PREVIEW_ACCESS_COOKIE,
  verifyPreviewToken,
} from "@/lib/preview-access-token";

export async function hasPreviewAccess() {
  const token = (await cookies()).get(PREVIEW_ACCESS_COOKIE)?.value;
  return verifyPreviewToken(token, process.env.PREVIEW_ACCESS_SECRET);
}
