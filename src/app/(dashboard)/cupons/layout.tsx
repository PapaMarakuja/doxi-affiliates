import { protectAdminRoute } from "@/src/lib/auth/protect";

export default async function CuponsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectAdminRoute();

  return <>{children}</>;
}

