import { SystemCategoryPage } from "@/components/system-category-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Water Supply & Booster Systems", "Variable-frequency water supply and booster equipment for building and utility projects.", "/water-supply-booster-systems");
export default function Page() { return <SystemCategoryPage title="Water Supply & Booster Systems" lead="Variable-frequency water supply equipment for building and utility projects." categories={["Water supply"]} />; }
