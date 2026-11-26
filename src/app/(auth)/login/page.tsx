import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { AuthShell } from "@/src/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Entrar | Doxi Afiliados",
  description: "Acesse seu painel de afiliado Doxi Wear.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const result = await getAuthenticatedUser();

  if (result.data) {
    redirect("/");
  }

  return (
    <AuthShell
      variant="narrow"
      footer={
        <>
          Quer fazer parte?{" "}
          <Link href="/cadastro" className="cad-footer-link">Cadastre-se</Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
