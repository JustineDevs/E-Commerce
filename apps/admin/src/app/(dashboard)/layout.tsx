import { AdminDashboardChrome } from "@/components/AdminDashboardChrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboardChrome>{children}</AdminDashboardChrome>;
}
