export const AUTH_EMAIL_DOMAIN = "@doxiclub.com";

export function resolveAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}${AUTH_EMAIL_DOMAIN}`;
}

export function extractUsername(email: string): string {
  return email.replace(AUTH_EMAIL_DOMAIN, "");
}
