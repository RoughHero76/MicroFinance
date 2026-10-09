// Web only: keeps the session token in the browser, locked with a PIN, so a
// closed tab can be reopened with the PIN instead of the password. The PIN
// is stretched with PBKDF2 and the token encrypted with AES-GCM (Web
// Crypto). The PIN itself is never stored.
//
// A PIN is easy to guess if someone copies the stored data and tries every
// number offline, so this keeps casual access out, not a determined
// attacker. Nothing here runs on the phone, which uses its keychain.

export interface SealedToken {
  v: 1;
  iter: number;
  salt: string;
  iv: string;
  data: string;
}

const ITERATIONS = 210000;

// The standard Web Crypto object, typed loosely so this file builds
// without DOM types (the phone build has none).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subtle = () => (globalThis as any).crypto.subtle;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const random = (n: number): Uint8Array => (globalThis as any).crypto.getRandomValues(new Uint8Array(n));

const enc = (text: string): Uint8Array => new TextEncoder().encode(text);

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: string = (globalThis as any).atob(text);
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

async function deriveKey(pin: string, salt: Uint8Array, iterations: number) {
  const base = await subtle().importKey('raw', enc(pin), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    {name: 'PBKDF2', salt, iterations, hash: 'SHA-256'},
    base,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealToken(token: string, pin: string): Promise<SealedToken> {
  const salt = random(16);
  const iv = random(12);
  const key = await deriveKey(pin, salt, ITERATIONS);
  const data = new Uint8Array(await subtle().encrypt({name: 'AES-GCM', iv}, key, enc(token)));
  return {v: 1, iter: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(data)};
}

/** The token, or null when the PIN is wrong (AES-GCM refuses to decrypt). */
export async function unsealToken(sealed: SealedToken, pin: string): Promise<string | null> {
  try {
    const key = await deriveKey(pin, fromBase64(sealed.salt), sealed.iter);
    const plain = await subtle().decrypt({name: 'AES-GCM', iv: fromBase64(sealed.iv)}, key, fromBase64(sealed.data));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export const PIN_LENGTH = 6;
export const MAX_PIN_TRIES = 5;

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
