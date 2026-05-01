import type { LoginFormValues } from "../validators/loginValidator";

export interface LoginApiResponse {
  success: boolean;
  error?: string;
}

export async function submitLogin(credentials: LoginFormValues): Promise<LoginApiResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const body = await res.json();
    return { success: false, error: body.error ?? "Erro ao realizar login." };
  }

  return { success: true };
}
