export function missionCountdown(
  mission: { status: string; expires_at: string; available_at: string },
  now: number | null,
) {
  const active = mission.status === "active";
  const prefix = active ? "Ends in " : "Next mission in ";
  if (now === null) return `${prefix}—`;
  const delta =
    new Date(active ? mission.expires_at : mission.available_at).getTime() -
    now;
  if (delta <= 0) return "Ready to refresh";
  const hours = Math.floor(delta / 3600000);
  const minutes = Math.floor((delta % 3600000) / 60000);
  return `${prefix}${hours}h ${minutes}m`;
}
