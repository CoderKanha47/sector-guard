import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

export function generateAccessCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += randomInt(10).toString();
  return code;
}

export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(code), salt, 64).toString('hex');
  return `sg$${salt}$${hash}`;
}

export function verifyAccessCode(code: string, stored: string): boolean {
  if (!stored) return false;
  const [prefix, salt, hash] = stored.split('$');
  if (prefix === 'sg' && salt && hash) {
    try {
      const expected = Buffer.from(hash, 'hex');
      const received = scryptSync(String(code), salt, 64);
      return received.length === expected.length && timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  }
  return safeEqual(String(code), stored);
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}