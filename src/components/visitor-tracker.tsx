"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function VisitorTracker() { const pathname = usePathname(); useEffect(() => { const eventType = pathname.startsWith("/products/") ? "product_view" : "page_view"; void fetch("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: pathname, eventType }) }); const tracked = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }; if (eventType === "product_view") { tracked.dataLayer?.push({ event: eventType, path: pathname }); tracked.gtag?.("event", eventType, { path: pathname }); } }, [pathname]); return null; }
