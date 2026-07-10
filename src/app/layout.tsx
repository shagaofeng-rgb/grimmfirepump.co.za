import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://grimmfirepump.co.za"), title: { default: "GRIMM PUMP Africa | Fire water systems", template: "%s | GRIMM PUMP Africa" }, description: "Fire-pump and water-system solutions for African project buyers.", alternates: { canonical: "/" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={geist.variable}><body><SiteHeader /><main>{children}</main><SiteFooter /></body></html>; }
