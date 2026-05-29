export interface LoginFormValues {
  username: string;
  password: string;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
}

const MIN_PASSWORD_LENGTH = 6;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.username || !values.username.trim()) {
    errors.username = "Informe seu usuário.";
  }

  if (!values.password || values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = "A senha deve ter ao menos 6 caracteres.";
  }

  return errors;
}

export function hasErrors(errors: LoginFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
