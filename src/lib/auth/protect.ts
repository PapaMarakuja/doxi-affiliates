import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/src/lib/auth/session";

/**
 * Helper para proteção de rotas administrativas no lado do servidor (SSR).
 * Verifica se o usuário está logado e se possui a role "admin".
 * Caso contrário, redireciona para o dashboard principal.
 * 
 * @returns Os dados do perfil do usuário autenticado.
 */
export async function protectAdminRoute() {
  const { data: profile, error } = await getAuthenticatedAdmin();

  if (error || !profile) {
    redirect("/dashboard");
  }

  return { profile };
}
