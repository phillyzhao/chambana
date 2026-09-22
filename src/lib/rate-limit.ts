import { createHmac } from "node:crypto";
import { serviceDatabase } from "./supabase";
import { operationalEvent } from "./observability";

export async function allowRequest(
  scope: string,
  subject: string,
  limit: number,
  seconds: number,
) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return false;
  const key = createHmac("sha256", secret)
    .update(`${scope}:${subject}`)
    .digest("hex");
  try {
    const { data, error } = await serviceDatabase().rpc(
      "consume_request_limit",
      {
        p_key: key,
        p_limit: limit,
        p_seconds: seconds,
      },
    );
    if (error) operationalEvent("rate_limit_unavailable");
    return !error && data === true;
  } catch {
    operationalEvent("rate_limit_unavailable");
    return false;
  }
}
