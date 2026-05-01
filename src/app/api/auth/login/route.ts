import { AuthService, type LoginCredentials } from "@/src/services/auth.service";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json() as LoginCredentials;

    if (!body.email || !body.password) {
      return Response.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.login({
      email: body.email,
      password: body.password,
    });


    if (result.error || !result.data) {
      return Response.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // Definir cookie de role para otimização do middleware
    const cookieStore = await cookies();
    cookieStore.set("doxi-role", result.data.role, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return Response.json({ data: { userId: result.data.userId, role: result.data.role } });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
