import type { Product } from "@/lib/site-data";

type Category = Product["category"];
type Source = { slug: string; name: string; category: Category; image: string };

const sources: Source[] = [
  { slug: "2-electric-plus-jockey-pump-set", name: "Electric + Jockey Pump Set", category: "Fire pump systems", image: "/images/products/2-electric-plus-jockey-pump-set.jpg" },
  { slug: "BDK-Accessories-set", name: "BDK Automatic Pump Control Equipment", category: "Water supply", image: "/images/products/bdk-accessories-set.png" },
  { slug: "CDL-fire-pump-set", name: "CDL Jockey Pump", category: "Fire pump systems", image: "/images/products/cdl-fire-pump-set.jpeg" },
  { slug: "GW-Sewage-Pump-Series-Pump", name: "GW Pipeline Sewage Pump", category: "Drainage", image: "/images/products/gw-sewage-pump-series-pump.png" },
  { slug: "ISG-Water-Supply-Series-pump", name: "ISG Vertical Single-Stage Centrifugal Pump", category: "Water supply", image: "/images/products/isg-water-supply-series-pump.png" },
  { slug: "ISW-Water-Supply-Series-pump", name: "ISW Horizontal Single-Stage Centrifugal Pump", category: "Water supply", image: "/images/products/isw-water-supply-series-pump.png" },
  { slug: "LW-Sewage-Pump-Series-Pump", name: "LW Vertical Sewage Pump", category: "Drainage", image: "/images/products/lw-sewage-pump-series-pump.png" },
  { slug: "Vertical-booster-pump-group", name: "Vertical Booster Pump Set", category: "Water supply", image: "/images/products/vertical-booster-pump-group.png" },
  { slug: "WQK-Sewage-Pump-Series-Pump", name: "WQK Cutting Submersible Sewage Pump", category: "Drainage", image: "/images/products/wqk-sewage-pump-series-pump.png" },
  { slug: "WQP-Sewage-Pump-Series-Pump", name: "WQP Stainless Steel Submersible Sewage Pump", category: "Drainage", image: "/images/products/wqp-sewage-pump-series-pump.png" },
  { slug: "XBD-DL-fire-pump-set", name: "XBD-DL Vertical Multistage Fire Pump", category: "Fire pump systems", image: "/images/products/xbd-dl-fire-pump-set.png" },
  { slug: "XBD-L-fire-pump-set", name: "XBD-L Vertical Single-Stage Fire Pump", category: "Fire pump systems", image: "/images/products/xbd-l-fire-pump-set.jpg" },
  { slug: "YW-Sewage-Pump-Series-Pump", name: "YW Submersible Sewage Pump", category: "Drainage", image: "/images/products/yw-sewage-pump-series-pump.png" },
  { slug: "ZWL-ZXL-Water-Supply-Series-pump", name: "ZWL/ZXL Direct-Drive Self-Priming Pump", category: "Water supply", image: "/images/products/zwl-zxl-water-supply-series-pump.png" },
  { slug: "ZWZX-Water-Supply-Series-pump", name: "ZW/ZX Self-Priming Pump", category: "Water supply", image: "/images/products/zwzx-water-supply-series-pump.png" },
  { slug: "diesel-engine-fire-pump", name: "Diesel Engine Fire Pump", category: "Fire pump systems", image: "/images/products/diesel-engine-fire-pump.png" },
  { slug: "diesel-engine-long-shaft-fire-pump", name: "Diesel Engine Long-Shaft Fire Pump", category: "Fire pump systems", image: "/images/products/diesel-engine-long-shaft-fire-pump.png" },
  { slug: "ej-fire-pump-set", name: "EJ Fire Pump Set", category: "Fire pump systems", image: "/images/products/ej-fire-pump-set.png" },
  { slug: "electric-horizontal-split-end-suction-pump", name: "Electric Horizontal Split Case Fire Pump", category: "Fire pump systems", image: "/images/products/electric-horizontal-split-end-suction-pump.png" },
  { slug: "horizontal-booster-pump-group", name: "Horizontal Booster Pump Group", category: "Water supply", image: "/images/products/horizontal-booster-pump-group.jpg" },
  { slug: "integrated-prefabricated-pump-station-frp", name: "Integrated Prefabricated Pump Station FRP", category: "Drainage", image: "/images/products/integrated-prefabricated-pump-station-frp.jpg" },
  { slug: "submersible-sewage-pump", name: "Submersible Sewage Pump", category: "Drainage", image: "/images/products/submersible-sewage-pump.png" },
  { slug: "vertical-stainless-steel-multistage-pump-jockey-pump", name: "Jockey Pump / Vertical Multistage Fire Pump", category: "Fire pump systems", image: "/images/products/vertical-stainless-steel-multistage-pump-jockey-pump.png" },
];

const applications: Record<Category, string[]> = {
  "Fire pump systems": ["Industrial facilities", "Commercial buildings", "Project fire-water discussions"],
  "Water supply": ["Building services", "Utility water projects", "Pressure management discussions"],
  "Mobile pumping": ["Temporary transfer", "Irrigation", "Emergency drainage"],
  Drainage: ["Wastewater transfer", "Drainage projects", "Site dewatering discussions"],
};

export const africaAdaptedProducts: Product[] = sources.map((source) => ({
  id: `africa-${source.slug.toLowerCase()}`,
  slug: source.slug,
  name: source.name,
  category: source.category,
  summary: `${source.name} for preliminary African project discussions. Final duty point, materials, drive, controls and documentation are subject to project configuration.`,
  applications: applications[source.category],
  highlights: ["Adapted for project-led procurement discussion", "Technical data available on request", "Final selection subject to project configuration"],
  specifications: [{ label: "Product line", value: source.name }, { label: "Technical data", value: "Available on request" }, { label: "Project configuration", value: "Subject to project configuration" }],
  image: source.image,
  published: true,
}));
