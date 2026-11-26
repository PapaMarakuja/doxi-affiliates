import { protectAdminRoute } from "@/src/lib/auth/protect";

export default async function NotificacoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectAdminRoute();

  return <>{children}</>;
}
