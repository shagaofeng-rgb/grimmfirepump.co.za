import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisitorTracker } from "@/components/visitor-tracker";

export default function NewsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><VisitorTracker /><SiteHeader /><main>{children}</main><SiteFooter /></>;
}
