import { MemberAuthError } from "./member-auth";
import { MemberMissionError } from "./member-mission-store";

export function privateJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

/** Cookie-authenticated mutations must originate in this app. */
export async function readSubmissionBody(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([new URL(request.url).origin]);
  if (process.env.APP_URL)
    allowedOrigins.add(new URL(process.env.APP_URL).origin);
  if (!origin || !allowedOrigins.has(origin))
    throw new MemberMissionError(403, "Open Chambana and try again.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new MemberMissionError(400, "Send a valid submission request.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new MemberMissionError(400, "The submission request is empty.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 4096) {
      await reader.cancel();
      throw new MemberMissionError(413, "The submission request is too large.");
    }
    chunks.push(chunk.value);
  }
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new MemberMissionError(400, "Send a valid submission request.");
  }
}

export function submissionErrorResponse(error: unknown) {
  if (error instanceof MemberAuthError || error instanceof MemberMissionError)
    return privateJson({ error: error.message }, error.status);
  return privateJson(
    { error: "That didn’t go through. Please try again." },
    503,
  );
}
