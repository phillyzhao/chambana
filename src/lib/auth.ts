import { safePath } from "./paths";

export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("APP_URL must be an HTTP(S) origin.");
  return url.origin;
}

export function microsoftEnabled() {
  return process.env.AUTH_MICROSOFT_ENABLED === "true";
}

export function microsoftOptions(next: string) {
  return {
    provider: "azure" as const,
    options: {
      scopes: "email",
      redirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(safePath(next))}`,
      queryParams: { prompt: "select_account" },
    },
  };
}
