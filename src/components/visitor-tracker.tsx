"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitorTracker() {
  const pathname = usePathname();
  useEffect(() => { void fetch("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: pathname }) }); }, [pathname]);
  return null;
}
