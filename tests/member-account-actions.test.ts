import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  database: vi.fn(),
  service: vi.fn(),
  limit: vi.fn(),
  send: vi.fn(),
  verify: vi.fn(),
  signOut: vi.fn(),
  getAccount: vi.fn(),
  requireAccount: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  revalidate: vi.fn(),
  event: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../src/lib/supabase", () => ({
  isConfigured: mocks.configured,
  database: mocks.database,
  serviceDatabase: mocks.service,
}));
vi.mock("../src/lib/rate-limit", () => ({ allowRequest: mocks.limit }));
vi.mock("../src/lib/observability", () => ({ operationalEvent: mocks.event }));
vi.mock("../src/lib/member-auth", async (original) => ({
  ...(await original<object>()),
  getMemberAccount: mocks.getAccount,
  requireMemberAccount: mocks.requireAccount,
}));
import {
  requestMemberCode,
  verifyMemberCode,
  saveMemberProfile,
  signOutMember,
} from "../src/app/account/actions";

const profile = {
  name: "Student",
  handle: "student",
  interests: ["Outdoors" as const],
};
const account = {
  id: "server-verified-user",
  email: "student@illinois.edu",
  profile: null,
};
const user = {
  id: account.id,
  email: account.email,
  email_confirmed_at: "2026-11-11T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_URL", "https://playchambana.com");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
  vi.stubEnv("CHAMBANA_EMAIL_OTP_ENABLED", "true");
  mocks.configured.mockReturnValue(true);
  mocks.limit.mockResolvedValue(true);
  mocks.send.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ data: { user }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.database.mockResolvedValue({
    auth: {
      signInWithOtp: mocks.send,
      verifyOtp: mocks.verify,
      signOut: mocks.signOut,
    },
  });
  mocks.getAccount.mockResolvedValue(account);
  mocks.requireAccount.mockResolvedValue(account);
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.service.mockReturnValue({ from: mocks.from });
});
afterEach(() => vi.unstubAllEnvs());

describe("member sign-in actions", () => {
  it("sends to a normalized campus email with the fixed new callback", async () => {
    expect(await requestMemberCode(" Student@Illinois.edu ")).toEqual({
      ok: true,
    });
    expect(mocks.send).toHaveBeenCalledWith({
      email: account.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://playchambana.com/account/callback",
      },
    });
    expect(mocks.limit).toHaveBeenCalledWith(
      "member-login-email",
      account.email,
      3,
      300,
    );
  });
  it.each(["", "other@gmail.com", "student@illinois.edu.evil.test"])(
    "rejects invalid email %s without sending",
    async (email) => {
      expect(await requestMemberCode(email)).toMatchObject({ ok: false });
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it("fails closed when the shared rate limiter refuses or is unavailable", async () => {
    mocks.limit.mockResolvedValue(false);
    expect(await requestMemberCode(account.email)).toMatchObject({ ok: false });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(await verifyMemberCode(account.email, "123456")).toMatchObject({
      ok: false,
    });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("does not claim an email was sent when the provider fails", async () => {
    mocks.send.mockResolvedValue({
      error: { message: "private address and key" },
    });
    const result = await requestMemberCode(account.email);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("private address");
  });
  it("uses real provider verification even for the old demo code", async () => {
    mocks.verify.mockResolvedValue({
      data: { user: null },
      error: { message: "expired" },
    });
    expect(await verifyMemberCode(account.email, "123456")).toMatchObject({
      ok: false,
    });
    expect(mocks.verify).toHaveBeenCalledWith({
      email: account.email,
      token: "123456",
      type: "email",
    });
  });
  it.each(["294193", "29419382"])(
    "returns the verified account after a successful code: %s",
    async (code) => {
      expect(await verifyMemberCode(account.email, code)).toEqual({
        ok: true,
        account,
      });
      expect(mocks.verify).toHaveBeenCalledWith({
        email: account.email,
        token: code,
        type: "email",
      });
    },
  );
  it.each([
    { ...user, email_confirmed_at: null },
    { ...user, email: "other@illinois.edu" },
    { ...user, email: "student@gmail.com" },
  ])(
    "clears a session for an ineligible or mismatched verified identity",
    async (candidate) => {
      mocks.verify.mockResolvedValue({
        data: { user: candidate },
        error: null,
      });
      expect(await verifyMemberCode(account.email, "294193")).toMatchObject({
        ok: false,
      });
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mocks.getAccount).not.toHaveBeenCalled();
    },
  );
  it("never sends invalid code formats to Auth", async () => {
    expect(await verifyMemberCode(account.email, "x")).toMatchObject({
      ok: false,
    });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});

describe("email-code readiness gate", () => {
  it.each([undefined, "false", "1", "TRUE"])(
    "prevents sending and verification unless explicitly enabled: %s",
    async (setting) => {
      vi.stubEnv("CHAMBANA_EMAIL_OTP_ENABLED", setting);
      for (const result of [
        await requestMemberCode(account.email),
        await verifyMemberCode(account.email, "29419382"),
      ]) {
        expect(result).toEqual({
          ok: false,
          error:
            "Sign-in is temporarily unavailable. Please try again shortly.",
        });
      }
      expect(mocks.send).not.toHaveBeenCalled();
      expect(mocks.verify).not.toHaveBeenCalled();
      expect(mocks.database).not.toHaveBeenCalled();
      expect(mocks.limit).not.toHaveBeenCalled();
      expect(mocks.getAccount).not.toHaveBeenCalled();
    },
  );
});

describe("member profile persistence", () => {
  it("uses only server-verified identity and allowed profile fields", async () => {
    const input = {
      ...profile,
      id: "attacker-selected-user",
      nuts: 10000,
      handle: "STUDENT",
    };
    expect(await saveMemberProfile(input)).toEqual({
      ok: true,
      account: { ...account, profile },
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      { id: account.id, ...profile },
      { onConflict: "id" },
    );
  });
  it("requires a verified account before writing", async () => {
    mocks.requireAccount.mockRejectedValue(new Error("Sign in"));
    expect(await saveMemberProfile(profile)).toMatchObject({ ok: false });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("reports a username conflict without changing another profile", async () => {
    mocks.upsert.mockResolvedValue({ error: { code: "23505" } });
    expect(await saveMemberProfile(profile)).toMatchObject({
      ok: false,
      error: expect.stringContaining("username is taken"),
    });
  });
  it("rejects invalid handles and unrecognized interests", async () => {
    expect(
      await saveMemberProfile({ ...profile, handle: "<script>" }),
    ).toMatchObject({ ok: false });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("signs out only this device and refreshes the member page", async () => {
    expect(await signOutMember()).toEqual({ ok: true });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/app");
  });
});
