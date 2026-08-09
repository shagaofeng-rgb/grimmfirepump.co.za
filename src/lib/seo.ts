import type { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grimmfirepump.co.za";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function pageMetadata(title: string, description: string, path: string, options: Pick<Metadata, "robots"> = {}): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description, siteName: "GRIMM PUMP Africa" },
    twitter: { card: "summary_large_image", title, description },
    robots: options.robots,
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Grimm Water Treatment (Zhejiang) Co.,Ltd.",
  alternateName: "GRIMM PUMP Africa",
  url: siteUrl,
  email: "Cain@grimmfirepump.com",
  sameAs: ["https://www.grimmfirepump.com/"],
};
