export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email || !EMAIL_REGEX.test(values.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (!values.password || values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "A senha deve ter ao menos 6 caracteres.";
  }

  return errors;
}

export function hasErrors(errors: LoginFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
