import type { Profile } from "@/src/types";

export interface ProfileValidationErrors {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  pix_key?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-()+]{7,20}$/;

export function validateProfileUpdate(
  values: Partial<Pick<Profile, "name" | "contact_email" | "contact_phone" | "pix_key">>
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (values.name !== undefined) {
    const name = values.name?.trim() ?? "";
    if (name.length === 0) {
      errors.name = "O nome não pode estar em branco.";
    } else if (name.length < 2) {
      errors.name = "O nome deve ter pelo menos 2 caracteres.";
    } else if (name.length > 120) {
      errors.name = "O nome deve ter no máximo 120 caracteres.";
    }
  }

  if (values.contact_email) {
    if (!EMAIL_REGEX.test(values.contact_email)) {
      errors.contact_email = "Informe um e-mail válido.";
    }
  }

  if (values.contact_phone) {
    if (!PHONE_REGEX.test(values.contact_phone)) {
      errors.contact_phone = "Informe um telefone válido (apenas números e símbolos).";
    }
  }

  if (values.pix_key) {
    const pix = values.pix_key.trim();
    if (pix.length < 5) {
      errors.pix_key = "A chave Pix deve ter pelo menos 5 caracteres.";
    } else if (pix.length > 140) {
      errors.pix_key = "A chave Pix deve ter no máximo 140 caracteres.";
    }
  }

  return errors;
}

export function hasValidationErrors(errors: ProfileValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
