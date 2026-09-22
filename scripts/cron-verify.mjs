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
} catch {
  console.error(
    "Verification queue call failed. Check the server logs, APP_URL and CRON_SECRET.",
  );
  process.exitCode = 1;
}
