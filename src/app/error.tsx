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
      <p>This page could not load. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
