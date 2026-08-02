import { adminIsConfigured } from "@/lib/admin-auth";
import { AdminConsole } from "@/components/admin-console";
export const dynamic = "force-dynamic";
export default function AdminPage() {
  return <div className="admin-page"><AdminConsole configured={adminIsConfigured()} /></div>;
}
