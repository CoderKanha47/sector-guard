import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const configuredSecret = process.env.AUTH_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET must be set in production. Refusing to start with a forgeable dev secret.');
}
const secret = new TextEncoder().encode(configuredSecret || 'dev-fallback-secret-change-in-production');

export interface SessionPayload {
  role: 'admin' | 'employee';
  employeeId?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}