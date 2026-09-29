export function Avatar({
  id,
  name,
  hasAvatar,
  large = false,
}: {
  id: string;
  name: string;
  hasAvatar: boolean;
  large?: boolean;
}) {
  return hasAvatar ? (
    // Same-origin route serves only normalized public profile photos.
    <img
      className={`profile-avatar ${large ? "large" : ""}`}
      src={`/api/avatars/${id}`}
      alt={`${name}'s profile picture`}
      width={large ? 96 : 40}
      height={large ? 96 : 40}
    />
  ) : (
    <span
      className={`profile-avatar avatar-initial ${large ? "large" : ""}`}
      aria-label={`${name}'s profile`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
