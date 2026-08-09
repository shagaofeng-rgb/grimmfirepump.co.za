import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/content-store";

export async function SystemCategoryPage({ title, lead, categories }: { title: string; lead: string; categories: string[] }) {
  const products = (await getPublishedProducts()).filter((product) => categories.includes(product.category));
  return <div className="wrap page"><p className="eyebrow">GRIMM PUMP Africa</p><h1>{title}</h1><p className="page-lead">{lead} Published information supports initial discussion only; final scope is subject to project configuration.</p><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div><section className="related"><h2>Start a configuration review</h2><p>Provide duty point, water source, power availability, installation conditions and required documentation.</p><Link href="/contact" className="cta">Request project review →</Link></section></div>;
}
