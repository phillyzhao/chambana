import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const MISSION_ADMIN_COOKIE = "chambana_mission_admin";
export const MISSION_ADMIN_MAX_AGE = 60 * 60 * 8;

export function validMissionAdminSecret(
  input: unknown,
  secret: string | undefined,
) {
  if (
    !secret ||
    secret.length < 32 ||
    typeof input !== "string" ||
    input.length > 512
  )
    return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(input), digest(secret));
}

export function createMissionAdminToken(secret: string, now = Date.now()) {
  if (secret.length < 32)
    throw new Error("Mission administration is not configured.");
  const expires = Math.floor(now / 1000) + MISSION_ADMIN_MAX_AGE;
  const payload = `mission-admin-v1.${expires}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyMissionAdminToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!secret || secret.length < 32 || !token) return false;
  const match =
    /^mission-admin-v1\.(\d{10})\.([a-f0-9]{48})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const seconds = Math.floor(now / 1000);
  const expires = Number(match[1]);
  if (expires <= seconds || expires > seconds + MISSION_ADMIN_MAX_AGE)
    return false;
  const expected = createHmac("sha256", secret)
    .update(token.slice(0, token.lastIndexOf(".")))
    .digest();
  return timingSafeEqual(expected, Buffer.from(match[3], "hex"));
}
