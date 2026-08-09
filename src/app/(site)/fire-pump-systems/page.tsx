import { SystemCategoryPage } from "@/components/system-category-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Fire Pump Systems", "EDJ, diesel + jockey and long-shaft fire-pump configurations for African industrial and commercial projects.", "/fire-pump-systems");
export default function Page() { return <SystemCategoryPage title="Fire Pump Systems" lead="Fire-pump configurations for industrial, commercial and infrastructure project discussions." categories={["Fire pump systems"]} />; }
