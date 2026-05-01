import { AuthService } from "@/src/services/auth.service";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const authService = new AuthService();
    const result = await authService.logout();

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    // Limpar cookie de role
    const cookieStore = await cookies();
    cookieStore.delete("doxi-role");

    return Response.json({ data: { message: "Logout realizado com sucesso." } });
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
