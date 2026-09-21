"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="empty">
      <h1>We hit a small detour.</h1>
      <p>
        Campus data could not load. Please try again. If this is the first
        setup, check the database connection and migration.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
