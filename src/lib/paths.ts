/** Keep navigation inside the app and preserve only known UI query parameters. */
export function safePath(input: string) {
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\"))
    return "/missions";
  const url = new URL(input, "https://chambana.invalid");
  if (
    url.origin !== "https://chambana.invalid" ||
    !/^\/(?:groups|missions|profile|people|admin|leaderboard|login|join)(?:\/|$)/.test(
      url.pathname,
    )
  )
    return "/missions";
  const query = new URLSearchParams();
  for (const key of ["group", "code", "q", "mode", "view"]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 120) query.set(key, value);
  }
  return url.pathname + (query.size ? `?${query}` : "");
}

export function withNotice(
  path: string,
  kind: "error" | "message",
  text: string,
) {
  const url = new URL(safePath(path), "https://chambana.invalid");
  url.searchParams.set(kind, text);
  return url.pathname + url.search;
}
