export interface LoginApiResponse {
  success: boolean;
  error?: string;
}

/** Payload sent to the login API endpoint. Always uses a resolved e-mail. */
export interface LoginApiPayload {
  email: string;
  password: string;
}

export async function submitLogin(credentials: LoginApiPayload): Promise<LoginApiResponse> {
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
