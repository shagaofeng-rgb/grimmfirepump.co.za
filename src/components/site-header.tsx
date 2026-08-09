"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="wrap nav-wrap">
        <Link href="/" className="logo" onClick={close}>
          <Image src="/brand/grimm-pump-logo.png" alt="GRIMM PUMP" width={44} height={44} />
          <span>
            <strong>GRIMM PUMP</strong>
            <small>Fire Pump Systems · Africa</small>
          </span>
        </Link>
        <button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          Menu
        </button>
        <nav className={open ? "nav open" : "nav"}>
          <Link href="/" onClick={close}>Home</Link>
          <Link href="/fire-pump-systems" onClick={close}>Fire Pump Systems</Link>
          <Link href="/products" onClick={close}>Products</Link>
          <Link href="/applications" onClick={close}>Applications</Link>
          <Link href="/news" onClick={close}>Technical Resources</Link>
          <Link href="/about" onClick={close}>About</Link>
          <Link href="/contact" className="nav-quote" onClick={close}>Request a quote →</Link>
        </nav>
      </div>
    </header>
  );
}
