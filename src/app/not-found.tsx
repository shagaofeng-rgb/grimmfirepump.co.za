import Link from "next/link";
export default function NotFound() { return <div className="wrap page"><p className="eyebrow">404</p><h1>That page is not available.</h1><p className="page-lead">Please return to the product centre or send the project team an enquiry.</p><Link href="/products" className="cta">Browse products →</Link></div>; }
