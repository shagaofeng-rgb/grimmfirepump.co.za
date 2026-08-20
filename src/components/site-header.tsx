"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const productLinks = [
  ["All products", "/products"],
  ["Fire pump systems", "/fire-pump-systems"],
  ["Water supply boosters", "/water-supply-booster-systems"],
  ["Mobile pumping", "/mobile-water-transfer-dewatering"],
] as const;
const systemLinks = [
  ["EDJ fire pump sets", "/products/edj-fire-pump-set"],
  ["Diesel + jockey packages", "/products/diesel-engine-plus-jockey-pump-set"],
  ["Electric long-shaft pumps", "/products/electric-long-shaft-fire-pump"],
  ["Variable-frequency boosters", "/products/frequency-conversion-water-supply-equipment"],
] as const;
const resourceLinks = [
  ["Industry news", "/news"],
  ["Technical blog", "/blog"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const close = () => { setOpen(false); setOpenMenu(null); };
  const toggleMenu = (menu: string) => setOpenMenu((current) => current === menu ? null : menu);

  return (
    <header className={isHomepage ? "site-header site-header-home" : "site-header"}>
      <div className="wrap nav-wrap">
        <Link href="/" className="logo" onClick={close}>
          <Image src="/brand/grimm-pump-logo.png" alt="GRIMM PUMP" width={44} height={44} />
          <span>
            <strong>{isHomepage ? "GRIMM" : "GRIMM PUMP"}</strong>
            <small>{isHomepage ? "PUMP AFRICA" : "Fire Pump Systems · Africa"}</small>
          </span>
        </Link>
        <button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          Menu
        </button>
        <nav className={open ? "nav open" : "nav"} aria-label="Primary navigation">
          <div className={openMenu === "products" ? "nav-menu expanded" : "nav-menu"}>
            <button className="nav-menu-trigger" type="button" aria-expanded={openMenu === "products"} aria-controls="products-menu" onClick={() => toggleMenu("products")}>Products <span aria-hidden="true">⌄</span></button>
            <div id="products-menu" className="nav-popover">{productLinks.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}</div>
          </div>
          <div className={openMenu === "systems" ? "nav-menu expanded" : "nav-menu"}>
            <button className="nav-menu-trigger" type="button" aria-expanded={openMenu === "systems"} aria-controls="systems-menu" onClick={() => toggleMenu("systems")}>Systems <span aria-hidden="true">⌄</span></button>
            <div id="systems-menu" className="nav-popover">{systemLinks.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}</div>
          </div>
          <Link href="/applications" onClick={close}>Applications</Link>
          <div className={openMenu === "resources" ? "nav-menu expanded" : "nav-menu"}>
            <button className="nav-menu-trigger" type="button" aria-expanded={openMenu === "resources"} aria-controls="resources-menu" onClick={() => toggleMenu("resources")}>Resources <span aria-hidden="true">⌄</span></button>
            <div id="resources-menu" className="nav-popover">{resourceLinks.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}</div>
          </div>
          <Link href="/about" onClick={close}>About</Link>
          <Link href="/contact" className="nav-project-link" onClick={close}>Discuss a project <span aria-hidden="true">→</span></Link>
        </nav>
      </div>
    </header>
  );
}
