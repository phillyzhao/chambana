import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPhoto } from "../src/lib/verification";
const mission = {
  title: "Campus art",
  proof_criteria: "An outdoor mural in its surroundings.",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Gemini photo integration", () => {
  it("falls back to human review without a key, never automatic approval", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await checkPhoto(Buffer.from("photo"), mission)).decision).toBe(
      "needs_review",
    );
  });
  it("sends image and structured schema, with the key outside the URL", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-secret");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    decision: "approved",
                    confidence: 0.95,
                    reason: "Mural visible",
                    unsafe: false,
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await checkPhoto(Buffer.from("photo"), mission);
    expect(result.decision).toBe("approved");
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain("test-secret");
    expect(options.headers["x-goog-api-key"]).toBe("test-secret");
    const payload = JSON.parse(options.body);
    expect(payload.contents[0].parts[1].inlineData.mimeType).toBe("image/jpeg");
    expect(payload.generationConfig.responseJsonSchema.required).toContain(
      "unsafe",
    );
    expect(payload.systemInstruction.parts[0].text).toContain("untrusted");
  });
  it("rejects malformed JSON and out-of-range confidence", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '{"decision":"approved","confidence":4,"unsafe":false,"reason":"OK"}',
                  },
                ],
              },
            },
          ],
        }),
      ),
    );
    await expect(checkPhoto(Buffer.from("photo"), mission)).rejects.toThrow();
  });
  it("does not treat blocked or empty responses as approval", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ promptFeedback: { blockReason: "SAFETY" } }),
        ),
    );
    await expect(checkPhoto(Buffer.from("photo"), mission)).rejects.toThrow(
      "no complete verdict",
    );
  });
  it("handles provider failure without exposing its response", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("provider error secret", { status: 429 }),
        ),
    );
    await expect(checkPhoto(Buffer.from("photo"), mission)).rejects.toThrow(
      "temporarily unavailable",
    );
  });
  it("rejects a truncated response even if it contains parseable approval JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      decision: "approved",
                      confidence: 1,
                      unsafe: false,
                      reason: "Visible",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      ),
    );
    await expect(checkPhoto(Buffer.from("photo"), mission)).rejects.toThrow(
      "no complete verdict",
    );
  });
});
