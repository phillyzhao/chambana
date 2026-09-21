import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>A little off the path.</h1>
      <p>We couldn’t find that page.</p>
      <Link className="button" href="/groups">
        Explore groups
      </Link>
    </div>
  );
}
