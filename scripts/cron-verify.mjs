try {
  const origin = new URL(process.env.APP_URL);
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    origin.username ||
    origin.password ||
    !["http:", "https:"].includes(origin.protocol)
  )
    throw new Error();
  const response = await fetch(new URL("/api/cron/verify", origin), {
    headers: { Authorization: `Bearer ${secret}` },
    redirect: "error",
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw new Error();
  const result = await response.json();
  if (result.failed) throw new Error();
  console.log(
    `Verification queue processed ${Number(result.processed) || 0} submissions.`,
  );
  console.log(
    `Notification queue sent ${Number(result.email?.sent) || 0} emails.`,
  );
} catch {
  console.error(
    "Verification/notification queue call failed. Check server logs, APP_URL, CRON_SECRET and SMTP configuration.",
  );
  process.exitCode = 1;
}
