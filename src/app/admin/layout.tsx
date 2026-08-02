import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台 | GRIMM PUMP Africa",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell">{children}</div>;
}
