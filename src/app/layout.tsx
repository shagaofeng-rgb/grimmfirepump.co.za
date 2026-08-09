import type { Metadata } from "next";
import "./globals.css";
import { organizationJsonLd, siteUrl } from "@/lib/seo";
export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: { default: "GRIMM PUMP Africa | Fire Pump Systems", template: "%s | GRIMM PUMP Africa" }, description: "Fire-pump and water-system solutions for African industrial and commercial projects.", openGraph: { type: "website", siteName: "GRIMM PUMP Africa" }, twitter: { card: "summary_large_image" }, icons: { icon: [{ url: "/icon.png", type: "image/png" }], shortcut: ["/icon.png"], apple: [{ url: "/apple-icon.png", type: "image/png" }] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />{children}</body></html>; }
