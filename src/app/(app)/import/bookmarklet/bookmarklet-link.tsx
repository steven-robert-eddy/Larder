"use client";

import { useEffect, useRef } from "react";

/**
 * React 19 blocks `javascript:` hrefs passed through JSX as a security
 * precaution (it can't tell a legitimate bookmarklet from an XSS vector).
 * This one is deliberate and developer-controlled, so it's set directly
 * via the DOM instead, bypassing that check.
 */
export function BookmarkletLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", href);
  }, [href]);

  return (
    <a ref={ref} className={className}>
      {children}
    </a>
  );
}
