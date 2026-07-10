import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/site-data";
export function ProductCard({ product }: { product: Product }) { return <article className="product-card"><div className="product-image"><Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 100vw, 33vw" /></div><div className="product-card-body"><span>{product.category}</span><h3>{product.name}</h3><p>{product.summary}</p><Link href={`/products/${product.slug}`}>View system →</Link></div></article>; }
