import { protectAdminRoute } from "@/src/lib/auth/protect";

export default async function GerenciarConquistasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectAdminRoute();

  return <>{children}</>;
}
