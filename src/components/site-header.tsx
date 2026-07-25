"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="wrap nav-wrap">
    <Link href="/" className="logo" onClick={() => setOpen(false)}><Image src="/brand/grimm-pump-logo.png" alt="GRIMM PUMP logo" width={42} height={42} priority /><span><b>GRIMM PUMP</b><small>Fire Pump Systems · Africa</small></span></Link>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">{open ? "×" : "☰"}</button>
    <nav className={open ? "nav open" : "nav"} aria-label="Main navigation">
      <Link href="/" onClick={() => setOpen(false)}>Home</Link><Link href="/products" onClick={() => setOpen(false)}>Products</Link><Link href="/applications" onClick={() => setOpen(false)}>Applications</Link><Link href="/news" onClick={() => setOpen(false)}>News & insights</Link><Link href="/about" onClick={() => setOpen(false)}>About</Link><Link href="/contact" className="nav-quote" onClick={() => setOpen(false)}>Request a quote →</Link>
    </nav>
  </div></header>;
}
