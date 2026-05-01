import { redirect } from "next/navigation";
import { getAuthenticatedUser, logout } from "@/src/lib/auth/session";
import { AuthService } from "@/src/services/auth.service";
import DashboardLayout from "@/src/components/DashboardLayout";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authResult = await getAuthenticatedUser();

  if (!authResult.data) {
    redirect("/login");
  }

  const authService = new AuthService();
  const profileResult = await authService.getProfile();

  if (!profileResult.data) {
    await logout();
    redirect("/login");
  }

  const { user, profile } = profileResult.data;

  return (
    <DashboardLayout user={user} profile={profile}>
      {children}
    </DashboardLayout>
  );
}
