import Link from "next/link";
import { DESKTOP_HOME } from "@/lib/site-routes";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>A little off the path.</h1>
      <p>We couldn’t find that page.</p>
      <Link className="button" href={DESKTOP_HOME}>
        Open Chambana
      </Link>
    </div>
  );
}
