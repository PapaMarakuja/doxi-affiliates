import type { Metadata } from "next";
import DashboardContent from "@/src/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | Doxi Afiliados",
  description: "Acompanhe suas vendas e comissões como afiliado Doxi Wear.",
};

export default function DashboardPage() {
  return <DashboardContent />;
}
