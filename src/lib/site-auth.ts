/** Site password gate — Edge-safe (used from middleware). */

export const AUTH_COOKIE = "sh_auth";
const AUTH_PAYLOAD = "superhistorian-ok";

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const byte of Array.from(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Cookie value derived from SITE_PASSWORD — changing the password invalidates old cookies. */
export async function authCookieValue(password: string): Promise<string> {
  const key = await hmacKey(password);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(AUTH_PAYLOAD));
  return toBase64Url(sig);
}

export async function isValidAuthCookie(
  cookieValue: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!password || !cookieValue) return false;
  const expected = await authCookieValue(password);
  if (cookieValue.length !== expected.length) return false;
  // Constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function sitePassword(): string | undefined {
  const p = process.env.SITE_PASSWORD;
  return p && p.length > 0 ? p : undefined;
}
