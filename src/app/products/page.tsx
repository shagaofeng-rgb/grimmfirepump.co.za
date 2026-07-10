import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/content-store";
export const metadata: Metadata = { title: "Products", description: "Fire-pump, water-supply, mobile-pumping and drainage systems for African projects." };
export default async function ProductsPage() { const products = await getPublishedProducts(); return <div className="wrap page"><p className="eyebrow">PRODUCT CENTRE</p><h1>Systems for fire, water and project continuity.</h1><p className="page-lead">Browse the current GRIMM PUMP product range. Final selection should be reviewed against your project flow, pressure, power and installation conditions.</p><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div>; }
