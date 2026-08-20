import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Fire Pump Systems for African Projects",
  "Fire pump packages and water systems for African industrial and commercial projects. Final selection is subject to project configuration.",
  "/",
);

const productFamilies = [
  { title: "EDJ Fire Pump Sets", description: "End-suction fire pumps for electrically driven systems. Designed for a wide range of occupancies and hazards.", image: "/images/home-concept/edj-fire-pump.png", href: "/products/edj-fire-pump-set", action: "View EDJ range" },
  { title: "Diesel + Jockey Packages", description: "Complete fire pump packages with diesel driver and jockey pump. Built, tested and ready for project configuration.", image: "/images/home-concept/diesel-jockey-package.png", href: "/products/diesel-engine-plus-jockey-pump-set", action: "View package configurations" },
  { title: "Booster Systems", description: "Booster sets for pressure boosting and water supply in commercial, industrial and infrastructure applications.", image: "/images/home-concept/booster-system.png", href: "/water-supply-booster-systems", action: "View booster solutions" },
];

const deliverySteps = [
  ["01", "Enquire", "Share your project requirements and application details.", "/images/home-concept/process-enquire.png"],
  ["02", "Engineer", "We review size and propose the right system configuration.", "/images/home-concept/process-engineer.png"],
  ["03", "Confirm & Build", "Documentation is confirmed. Systems are assembled and tested.", "/images/home-concept/process-confirm.png"],
  ["04", "Pack & Ship", "Export packing, customs documentation and shipment arranged.", "/images/home-concept/process-pack.png"],
  ["05", "Deliver & Support", "Delivery to site and support for successful commissioning.", "/images/home-concept/process-deliver.png"],
];

const proofItems = [
  ["Exporting to African markets", "Projects across multiple sectors", "/images/home-concept/proof-export.png"],
  ["Built for duty", "Industrial-grade components and robust assemblies", "/images/home-concept/proof-duty.png"],
  ["Engineered to project", "System sizing, documentation and testing aligned to project requirements", "/images/home-concept/proof-engineering.png"],
  ["Export ready", "Secure packaging and logistics coordination for international delivery", "/images/home-concept/proof-export-ready.png"],
];

export default function Home() {
  return <>
    <section className="reference-hero">
      <Image src="/images/home-concept/hero-fire-pump.png" alt="Red diesel fire-pump system in an industrial test bay" fill priority sizes="100vw" className="reference-hero-image" />
      <div className="reference-hero-shade" />
      <div className="reference-wrap reference-hero-content">
        <h1>Fire Pump Systems for African Projects</h1>
        <div className="reference-rule" />
        <p>Engineered fire protection and water supply equipment. Built for reliability. Ready for export.</p>
        <div className="reference-hero-actions">
          <Link className="reference-primary" href="/contact">Request a project review</Link>
          <Link className="reference-text-action" href="/fire-pump-systems">Explore pump systems</Link>
        </div>
      </div>
    </section>

    <section className="reference-proof">
      <div className="reference-wrap reference-proof-grid">
        {proofItems.map(([title, body, icon]) => <article key={title}><Image src={icon} alt="" width={48} height={48} /><div><h2>{title}</h2><p>{body}</p></div></article>)}
      </div>
    </section>

    <section className="reference-products">
      <div className="reference-wrap">
        <p className="reference-label">Product family selector</p>
        <h2>Systems for Fire Protection and Water Supply</h2>
        <p className="reference-section-intro">Choose a product family to explore typical configurations, key components and application notes.</p>
        <div className="reference-product-grid">
          {productFamilies.map((product) => <article key={product.title} className="reference-product-card">
            <Link href={product.href} className="reference-product-image-link"><Image src={product.image} alt={product.title} width={720} height={540} sizes="(max-width: 760px) 100vw, 33vw" /></Link>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
            <Link href={product.href}>{product.action}</Link>
          </article>)}
        </div>
      </div>
    </section>

    <section className="reference-process">
      <div className="reference-wrap">
        <p className="reference-label">Export process. Built around African projects.</p>
        <div className="reference-process-grid">
          {deliverySteps.map(([number, title, body, icon]) => <article key={number}>
            <Image src={icon} alt="" width={48} height={48} />
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="reference-testing">
      <div className="reference-wrap reference-testing-grid">
        <div>
          <p className="reference-label">Documentation &amp; test</p>
          <h2>Tested Systems. Documented Confidence.</h2>
          <p>Every system is assembled and tested before dispatch. We provide project-specific documentation packages to support approvals, installation and handover.</p>
          <ul>
            <li>Hydrostatic test of pump casing</li>
            <li>Performance test to verified duty</li>
            <li>Factory Acceptance Test (FAT)</li>
            <li>Operation and maintenance manuals</li>
            <li>Spare parts lists and drawings</li>
            <li>Packing lists and certificates of compliance</li>
          </ul>
        </div>
        <Image src="/images/home-concept/test-bay.png" alt="Fire-pump test bay" width={1200} height={800} sizes="(max-width: 900px) 100vw, 60vw" className="reference-test-image" />
      </div>
      <div className="reference-wrap reference-contact-strip">
        <div><h2>Have a project to discuss?</h2><p>Our engineering team is ready to review your requirements.</p></div>
        <Link className="reference-primary" href="/contact">Request a project review</Link>
      </div>
    </section>
  </>;
}
