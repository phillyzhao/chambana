import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  send: vi.fn(),
  transport: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({ serviceDatabase: mocks.db }));
vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.transport },
}));
import {
  deliverNotifications,
  notificationMessage,
  type Notification,
} from "../src/lib/email";

const event: Notification = {
  id: "event-id",
  user_id: "user-id",
  kind: "group_joined",
  subject_name: "Quad Crew",
  group_id: "group-id",
  attempts: 1,
  lease_token: "lease-id",
};
function database(attempts = 1) {
  const record = vi.fn(async () => ({ data: [{ id: event.id }], error: null }));
  const filters = { eq: vi.fn(), select: record };
  filters.eq.mockReturnValue(filters);
  const update = vi.fn((_fields: Record<string, unknown>) => filters);
  const user = vi.fn(async () => ({
    data: {
      user: { email: "member@illinois.edu", email_confirmed_at: "2026-09-28" },
    },
    error: null,
  }));
  const db = {
    rpc: vi.fn(async () => ({ data: [{ ...event, attempts }], error: null })),
    auth: { admin: { getUserById: user } },
    from: vi.fn(() => ({
      update,
      select: () => ({
        is: () => ({ gte: async () => ({ count: 0, error: null }) }),
      }),
    })),
  };
  mocks.db.mockReturnValue(db);
  return { db, update, filters, record, user };
}
beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "fixture",
    SMTP_PASSWORD: "test-only",
    EMAIL_FROM: "hello@example.com",
    APP_URL: "https://playchambana.com",
  }))
    vi.stubEnv(key, value);
  mocks.transport.mockReturnValue({ sendMail: mocks.send });
  mocks.send.mockResolvedValue({
    accepted: ["member@illinois.edu"],
    rejected: [],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("notification delivery", () => {
  it("leaves events unclaimed when the sender is not configured", async () => {
    vi.stubEnv("SMTP_PASSWORD", "");
    expect(await deliverNotifications()).toEqual({
      sent: 0,
      failed: 0,
      configured: false,
    });
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("sends to the verified account and acknowledges only the held lease", async () => {
    const state = database();
    expect(await deliverNotifications()).toEqual({
      sent: 1,
      failed: 0,
      configured: true,
    });
    expect(state.user).toHaveBeenCalledWith("user-id");
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@illinois.edu",
        subject: "You joined Quad Crew",
        messageId: "<chambana-event-id@example.com>",
      }),
    );
    expect(mocks.transport).toHaveBeenCalledWith(
      expect.objectContaining({
        requireTLS: true,
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
    expect(state.filters.eq).toHaveBeenCalledWith("lease_token", "lease-id");
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sent_at: expect.any(String),
        lease_token: null,
        last_error: null,
      }),
    );
  });
  it("retries rejected delivery without claiming it was sent or retaining raw errors", async () => {
    const state = database();
    mocks.send.mockRejectedValue(new Error("SMTP secret should not be logged"));
    expect((await deliverNotifications()).failed).toBe(1);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_error: "delivery_failed",
        available_at: expect.any(String),
      }),
    );
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("sent_at");
    expect(JSON.stringify(state.update.mock.calls)).not.toContain("secret");
  });
  it("does not send to an unconfirmed account", async () => {
    const state = database();
    state.user.mockResolvedValue({
      data: { user: { email: "member@illinois.edu", email_confirmed_at: "" } },
      error: null,
    });
    expect((await deliverNotifications()).failed).toBe(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("reports a failed queue acknowledgment after SMTP acceptance", async () => {
    const state = database();
    state.record.mockResolvedValue({ data: [], error: null });
    expect((await deliverNotifications()).failed).toBe(1);
  });
  it("uses readable report names and prevents injected subject headers", () => {
    const message = notificationMessage(
      {
        ...event,
        kind: "report_resolved",
        subject_name: "Quad Crew\r\nBcc: nobody",
      },
      "https://playchambana.com",
    );
    expect(message.subject).not.toMatch(/[\r\n]/);
    expect(message.text).toContain("your report about Quad Crew");
    expect(message.text).not.toContain("group-id");
  });
  it("flags exhausted retries for operational follow-up", async () => {
    const state = database(8);
    mocks.send.mockResolvedValue({
      accepted: [],
      rejected: ["member@illinois.edu"],
    });
    expect((await deliverNotifications()).failed).toBe(1);
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_error: "delivery_exhausted" }),
    );
  });
});
