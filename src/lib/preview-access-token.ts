import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const PREVIEW_ACCESS_COOKIE = "chambana_preview_access";
export const PREVIEW_ACCESS_MAX_AGE = 60 * 60 * 24 * 7;

// This module is server-only: it depends on Node crypto and is never imported
// by a client component. The access code is not an account credential.
export function validPreviewCode(input: unknown) {
  if (typeof input !== "string" || !/^\d{7}$/.test(input.trim())) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(input.trim()), digest("0010110"));
}

export function previewDestination(input: unknown) {
  if (
    typeof input !== "string" ||
    input.length > 2048 ||
    !input.startsWith("/") ||
    /[\\\u0000-\u001f\u007f]/.test(input)
  )
    return "/design-preview";
  try {
    const url = new URL(input, "https://preview.invalid");
    if (
      url.origin !== "https://preview.invalid" ||
      !["/design-preview", "/login"].includes(url.pathname)
    )
      return "/design-preview";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/design-preview";
  }
}

export function createPreviewToken(secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("Preview access is not configured.");
  const expires = Math.floor(now / 1000) + PREVIEW_ACCESS_MAX_AGE;
  const payload = `v1.${expires}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyPreviewToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!secret || secret.length < 32 || !token) return false;
  const match = /^v1\.(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  const seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + PREVIEW_ACCESS_MAX_AGE)
    return false;
  const payload = token.slice(0, token.lastIndexOf("."));
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(match[3], "hex"));
}
