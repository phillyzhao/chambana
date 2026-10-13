import { beforeEach, afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  limit: vi.fn(),
  service: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  event: vi.fn(),
}));

vi.mock("../src/lib/supabase", () => ({
  isConfigured: mocks.configured,
  serviceDatabase: mocks.service,
}));
vi.mock("../src/lib/rate-limit", () => ({ allowRequest: mocks.limit }));
vi.mock("../src/lib/observability", () => ({ operationalEvent: mocks.event }));

import { joinWaitlist } from "../src/app/waitlist-actions";

const initial = { status: "idle" as const, message: "" };
function form(email = "Student@Illinois.edu ", website = "") {
  const data = new FormData();
  data.set("email", email);
  data.set("website", website);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-service-key");
  mocks.configured.mockReturnValue(true);
  mocks.limit.mockResolvedValue(true);
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.service.mockReturnValue({ from: mocks.from });
});
afterEach(() => vi.unstubAllEnvs());

it("stores only a normalized campus email without overwriting an existing signup", async () => {
  expect(await joinWaitlist(initial, form())).toMatchObject({
    status: "success",
  });
  expect(mocks.from).toHaveBeenCalledWith("waitlist_signups");
  expect(mocks.upsert).toHaveBeenCalledWith(
    { email: "student@illinois.edu" },
    { onConflict: "email", ignoreDuplicates: true },
  );
  expect(mocks.limit).toHaveBeenNthCalledWith(
    1,
    "waitlist-email",
    "student@illinois.edu",
    3,
    300,
  );
  expect(mocks.limit).toHaveBeenNthCalledWith(
    2,
    "waitlist-global",
    "all",
    30,
    60,
  );
});

it.each([
  "",
  "student@gmail.com",
  "student@illinois.edu.evil.com",
  "not-an-email",
])(
  "rejects invalid or non-campus email %s before accessing storage",
  async (email) => {
    expect(await joinWaitlist(initial, form(email))).toMatchObject({
      status: "error",
    });
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  },
);

it("rejects a populated honeypot without accessing storage", async () => {
  expect(
    await joinWaitlist(initial, form("student@illinois.edu", "spam")),
  ).toMatchObject({ status: "error" });
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.service).not.toHaveBeenCalled();
});

it.each(["public", "service"])(
  "fails honestly when %s storage configuration is absent",
  async (missing) => {
    if (missing === "public") mocks.configured.mockReturnValue(false);
    else vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await joinWaitlist(initial, form())).toMatchObject({
      status: "error",
    });
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  },
);

it.each([1, 2])(
  "stops before storage when rate limit %s refuses the request",
  async (call) => {
    if (call === 1) mocks.limit.mockResolvedValueOnce(false);
    else mocks.limit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await joinWaitlist(initial, form())).toMatchObject({
      status: "error",
      message: expect.stringContaining("wait a few minutes"),
    });
    expect(mocks.service).not.toHaveBeenCalled();
  },
);

it("does not claim success or expose storage details when the migration is missing", async () => {
  mocks.upsert.mockResolvedValue({
    error: { code: "42P01", message: "private backend detail" },
  });
  const result = await joinWaitlist(initial, form());
  expect(result.status).toBe("error");
  expect(result.message).not.toContain("private backend detail");
  expect(mocks.event).toHaveBeenCalledWith("waitlist_storage_unavailable");
});

it("handles a thrown storage error without logging the email or exception", async () => {
  mocks.upsert.mockRejectedValue(new Error("student@illinois.edu"));
  expect(await joinWaitlist(initial, form())).toMatchObject({
    status: "error",
  });
  expect(mocks.event.mock.calls).toEqual([["waitlist_storage_unavailable"]]);
});
