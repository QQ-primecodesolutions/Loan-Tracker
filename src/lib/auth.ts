const APP_PASSWORD = process.env.APP_PASSWORD || 'loan2024';

export const AUTH_COOKIE_NAME = 'loan_auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function checkPassword(password: string): boolean {
  return password === APP_PASSWORD;
}

export async function getSessionToken(): Promise<string> {
  return sha256Hex(APP_PASSWORD);
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  return token === (await getSessionToken());
}
