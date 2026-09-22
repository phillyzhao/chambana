export function checkEnvironment(
  env,
  { production = false, nodeVersion = process.versions.node } = {},
) {
  const issues = [];
  if (Number(nodeVersion.split(".")[0]) < 24)
    issues.push("Use Node.js 24 or newer.");
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "APP_URL",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "CRON_SECRET",
  ])
    if (!env[name]?.trim()) issues.push(`Missing ${name}.`);
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32)
    issues.push("CRON_SECRET needs at least 32 characters.");
  for (const name of Object.keys(env))
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      /SECRET|SERVICE_ROLE|GEMINI.*KEY/i.test(name)
    )
      issues.push(`Remove server credential from public variable ${name}.`);
  try {
    const url = new URL(env.APP_URL);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      issues.push("APP_URL must be a plain HTTP(S) origin.");
    if (
      production &&
      (url.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      issues.push("Production APP_URL must use a public HTTPS domain.");
  } catch {
    issues.push("Invalid APP_URL.");
  }
  try {
    if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).protocol !== "https:")
      issues.push("Hosted Supabase must use HTTPS.");
  } catch {
    issues.push("Invalid Supabase URL.");
  }
  if (env.GEMINI_MODEL && !/^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL))
    issues.push("Invalid GEMINI_MODEL.");
  if (production && !env.SUPPORT_EMAIL)
    issues.push("Set a monitored SUPPORT_EMAIL before public signups.");
  return issues;
}
if (process.argv[1]?.endsWith("preflight.mjs")) {
  const issues = checkEnvironment(process.env, {
    production: process.argv.includes("--production"),
  });
  issues.forEach((issue) => console.error(issue));
  console.log(
    issues.length
      ? `${issues.length} deployment checks need attention. No secret values printed.`
      : "Environment checks passed. Verify host upload limits, SMTP delivery, DNS/HTTPS, and external scheduling separately.",
  );
  process.exitCode = issues.length ? 1 : 0;
}
