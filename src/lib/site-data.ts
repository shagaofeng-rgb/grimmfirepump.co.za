export type Product = {
  id: string;
  slug: string;
  name: string;
  category: "Fire pump systems" | "Water supply" | "Mobile pumping" | "Drainage";
  summary: string;
  applications: string[];
  highlights: string[];
  specifications: { label: string; value: string }[];
  image: string;
  published: boolean;
};

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  status: "draft" | "review_required" | "published" | "archived";
  publishedAt: string;
  sourceName?: string;
  sourceUrl?: string;
  relatedProductIds: string[];
  sourcePublishedAt?: string;
  sourceAuthor?: string;
  updatedAt?: string;
  keyTakeaways?: string[];
  geoSummary?: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  country: string;
  productInterest: string;
  message: string;
  status: "new" | "contacted" | "qualified" | "quoted" | "closed";
  createdAt: string;
  consentAt: string;
};

export type SiteStore = { products: Product[]; news: NewsArticle[]; leads: Lead[] };

export const seedStore: SiteStore = {
  products: [
    {
      id: "edj-fire-pump-set", slug: "edj-fire-pump-set", name: "EDJ Fire Pump Set", category: "Fire pump systems",
      summary: "Factory-built electric, diesel and jockey pump package for project fire-water requirements.",
      applications: ["Warehouses", "Industrial plants", "Commercial buildings"],
      highlights: ["Electric + diesel + jockey configuration", "Configured around flow and pressure", "Project document path available"],
      specifications: [{ label: "Flow", value: "5–400 L/s" }, { label: "Head", value: "3–15 Bar" }, { label: "Caliber", value: "65–250 mm" }, { label: "Material", value: "HT200, SS304, Bronze" }],
      image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Fedj-fire-pump-set.jpg&w=1200&q=80", published: true,
    },
    {
      id: "diesel-jockey", slug: "diesel-engine-plus-jockey-pump-set", name: "Diesel Engine + Jockey Pump Set", category: "Fire pump systems",
      summary: "Diesel-driven fire-pump and pressure-maintenance configuration for standby-oriented systems.",
      applications: ["Remote projects", "Industrial sites", "Oil & gas support"],
      highlights: ["Diesel main-pump option", "Jockey pressure maintenance", "Configuration support before quotation"],
      specifications: [{ label: "Flow", value: "5–400 L/s" }, { label: "Head", value: "3–15 Bar" }, { label: "Pressure", value: "0.3–1.5 MPa" }],
      image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Fdiesel-engine-plus-jockey-pump-set.jpg&w=1200&q=80", published: true,
    },
    {
      id: "long-shaft-fire-pump", slug: "electric-long-shaft-fire-pump", name: "Electric Long-Shaft Fire Pump", category: "Fire pump systems",
      summary: "Long-shaft fire-pump option for installation conditions that require this pump arrangement.",
      applications: ["Water intake", "Industrial utilities", "Specific installation conditions"],
      highlights: ["Electric long-shaft configuration", "Project application review", "Related diesel option available"],
      specifications: [{ label: "System", value: "Electric long-shaft fire pump" }, { label: "Selection", value: "Subject to project conditions" }],
      image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Felectric-long-shaft-fire-pump.png&w=1200&q=80", published: true,
    },
    {
      id: "water-supply", slug: "frequency-conversion-water-supply-equipment", name: "Frequency Conversion Water Supply Equipment", category: "Water supply",
      summary: "Booster and variable-frequency water supply equipment for building and utility projects.",
      applications: ["Commercial buildings", "Utility projects", "Pressure boosting"],
      highlights: ["Variable-frequency water supply", "Building and utility applications", "Configurable project scope"],
      specifications: [{ label: "Category", value: "Water supply equipment" }, { label: "Use", value: "Building and utility projects" }],
      image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Ffrequency-conversion-water-supply-equipment.jpg&w=1200&q=80", published: true,
    },
    {
      id: "mobile-pump-trailer", slug: "diesel-engine-irrigation-pump-trailer-type", name: "Diesel Engine Pump Trailer", category: "Mobile pumping",
      summary: "Trailer-mounted diesel pumping solution for temporary water transfer, irrigation and emergency drainage.",
      applications: ["Emergency drainage", "Irrigation", "Temporary water transfer"],
      highlights: ["Trailer-mounted format", "Diesel-powered pumping", "Mobile project support"],
      specifications: [{ label: "Category", value: "Mobile pump trailer" }, { label: "Use", value: "Emergency, irrigation and transfer" }],
      image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Fdiesel-engine-irrigation-pump-trailer-type.jpg&w=1200&q=80", published: true,
    },
  ],
  news: [
    {
      id: "africa-project-planning", slug: "fire-water-project-planning-africa", title: "How to start defining a fire-water package for an African project", category: "Procurement guide", status: "published", publishedAt: "2026-07-10T00:00:00.000Z",
      excerpt: "A practical pre-inquiry checklist for project buyers: water source, duty point, power availability, standby needs and documentation.",
      content: ["Fire-pump selection starts with the project conditions rather than a catalogue model. Confirm the required flow, pressure or head, water source, installation environment and available power before asking for a technical proposal.", "For sites where continuity matters, a project team should also state whether a diesel standby package, an electric main pump, a jockey pump or a combined configuration is required. These are engineering questions that should be reviewed against the applicable project specification.", "GRIMM PUMP can use this information to guide the product conversation and identify the relevant technical documents. Final equipment selection remains subject to project review."],
      relatedProductIds: ["edj-fire-pump-set", "diesel-jockey"],
    },
  ],
  leads: [],
};
