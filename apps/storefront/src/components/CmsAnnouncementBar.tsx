"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_PREFIX = "cms_announcement_dismissed_";

export function CmsAnnouncementBar({
  body,
  linkUrl,
  linkLabel,
  dismissible,
}: {
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  dismissible: boolean;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!body.trim()) return;
    const id = body.slice(0, 80);
    if (dismissible && typeof window !== "undefined") {
      if (window.sessionStorage.getItem(STORAGE_PREFIX + id)) {
        setHidden(true);
        return;
      }
    }
    setHidden(false);
  }, [body, dismissible]);

  if (!body.trim() || hidden) return null;

  return (
    <div className="w-full border-b border-primary/15 bg-primary/5 px-4 py-2 text-center text-xs text-primary sm:text-sm">
      <span className="font-body">{body}</span>
      {linkUrl ? (
        <Link href={linkUrl} className="ml-2 font-semibold underline underline-offset-2">
          {linkLabel ?? "Details"}
        </Link>
      ) : null}
      {dismissible ? (
        <button
          type="button"
          className="ml-3 text-on-surface-variant hover:text-primary"
          aria-label="Dismiss announcement"
          onClick={() => {
            const id = body.slice(0, 80);
            window.sessionStorage.setItem(STORAGE_PREFIX + id, "1");
            setHidden(true);
          }}
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
