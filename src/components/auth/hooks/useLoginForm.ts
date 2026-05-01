"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoginFormValues, LoginFormErrors } from "../validators/loginValidator";
import { validateLoginForm, hasErrors } from "../validators/loginValidator";
import { submitLogin } from "../services/loginApiClient";

export interface UseLoginFormReturn {
  values: LoginFormValues;
  errors: LoginFormErrors;
  serverError: string | null;
  loading: boolean;
  rememberMe: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRememberMe: (checked: boolean) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const postLoginFlag = "doxi-post-login";

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleRememberMe(checked: boolean) {
    setRememberMe(checked);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const validation = validateLoginForm(values);
    if (hasErrors(validation)) {
      setErrors(validation);
      return;
    }

    setLoading(true);
    try {
      const result = await submitLogin(values);

      if (!result.success) {
        setServerError(result.error ?? "Erro ao realizar login.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(postLoginFlag, "1");
      }

      router.push("/");
      router.refresh();
    } catch {
      setServerError("Falha na conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return {
    values,
    errors,
    serverError,
    loading,
    rememberMe,
    handleChange,
    handleRememberMe,
    handleSubmit,
  };
}
