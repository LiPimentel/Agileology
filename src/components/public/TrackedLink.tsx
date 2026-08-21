"use client";

import Link from "next/link";
import { trackClick } from "@/lib/track-click";

/**
 * A normal internal/external link that also fires a "click" analytics
 * event -- used anywhere a Server Component needs a clickable element to
 * be trackable (Server Components can't attach onClick handlers directly;
 * this is the small Client Component boundary that makes just the link
 * itself interactive without converting its whole parent).
 */
export function TrackedLink({
  href,
  label,
  internal,
  newTab,
  className,
  children,
}: {
  href: string;
  label: string;
  internal: boolean;
  newTab?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const onClick = () => trackClick(label);
  if (internal) {
    return (
      <Link href={href} target={newTab ? "_blank" : undefined} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
