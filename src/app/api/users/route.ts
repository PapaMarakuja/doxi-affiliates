import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AuthService, type CreateUserPayload } from "@/src/services/auth.service";

export async function POST(request: Request) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json() as CreateUserPayload;

    if (!body.email || !body.password || !body.name) {
      return Response.json(
        { error: "Os campos email, password e name são obrigatórios." },
        { status: 400 }
      );
    }

    if (body.role && !["admin", "affiliate"].includes(body.role)) {
      return Response.json(
        { error: "O campo role deve ser 'admin' ou 'affiliate'." },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.createUser({
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role ?? "affiliate",
    });

    if (result.error || !result.data) {
      return Response.json(
        { error: result.error ?? "Falha ao criar usuário." },
        { status: 422 }
      );
    }

    return Response.json({ data: result.data }, { status: 201 });
  } catch {
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
