import { AdminSidebar } from "../../components/AdminSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="ml-64 flex-1">{children}</div>
    </div>
  );
}
