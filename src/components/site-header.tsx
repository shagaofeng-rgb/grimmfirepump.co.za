"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const close = () => setOpen(false);

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
        <nav className={open ? "nav open" : "nav"}>
          <Link href={isHomepage ? "/products" : "/"} onClick={close}>{isHomepage ? "Products" : "Home"}</Link>
          <Link href={isHomepage ? "/fire-pump-systems" : "/fire-pump-systems"} onClick={close}>{isHomepage ? "Systems" : "Fire Pump Systems"}</Link>
          <Link href={isHomepage ? "/applications" : "/products"} onClick={close}>{isHomepage ? "Projects" : "Products"}</Link>
          <Link href={isHomepage ? "/about" : "/applications"} onClick={close}>{isHomepage ? "Engineering" : "Applications"}</Link>
          <Link href={isHomepage ? "/news" : "/news"} onClick={close}>{isHomepage ? "Resources" : "Technical Resources"}</Link>
          <Link href="/about" onClick={close}>About</Link>
          <Link href="/contact" className="nav-quote" onClick={close}>{isHomepage ? "Request a project review" : "Request a quote →"}</Link>
        </nav>
      </div>
    </header>
  );
}
