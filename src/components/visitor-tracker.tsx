"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSiteEvent } from "@/lib/client-analytics";

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const eventType = pathname.startsWith("/products/") ? "product_view" : "page_view";
    void trackSiteEvent(eventType, pathname);
    const tracked = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (eventType === "product_view") {
      tracked.dataLayer?.push({ event: eventType, path: pathname });
      tracked.gtag?.("event", eventType, { path: pathname });
    }
  }, [pathname]);

  return null;
}
