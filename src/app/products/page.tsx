import { ProductCard } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/content-store";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Pump Systems", "Fire-pump, water-supply and mobile-pumping systems for African projects. Final selection is subject to project configuration.", "/products");
export default async function ProductsPage() { const products = await getPublishedProducts(); return <div className="wrap page"><h1>Systems for fire, water and project continuity.</h1><p className="page-lead">Browse the current GRIMM PUMP product range. Final selection should be reviewed against your project flow, pressure, power and installation conditions.</p><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div>; }
