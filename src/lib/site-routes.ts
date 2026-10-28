export const DESKTOP_HOME = "/design-preview?view=desktop";
export const IOS_PREVIEW = "/design-preview";

const retiredPages: Record<string, string> = {
  login: DESKTOP_HOME,
  join: `${DESKTOP_HOME}&screen=groups`,
  missions: `${DESKTOP_HOME}&screen=missions`,
  groups: `${DESKTOP_HOME}&screen=groups`,
  profile: `${DESKTOP_HOME}&screen=profile`,
  people: DESKTOP_HOME,
  leaderboard: DESKTOP_HOME,
  admin: DESKTOP_HOME,
  about: DESKTOP_HOME,
  guidelines: DESKTOP_HOME,
};

/** Map retired paths to fixed previews without carrying beta IDs or queries. */
export function retiredBetaDestination(pathname: string): string | null {
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback/"))
    return DESKTOP_HOME;

  if (!pathname.startsWith("/")) return null;
  const root = pathname.split("/")[1];
  return Object.hasOwn(retiredPages, root) ? retiredPages[root] : null;
}
