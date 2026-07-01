import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sym-dev-secret-change-me-in-production'
);
export const COOKIE_NAME = 'sym_token';

export type Role = 'management' | 'teacher' | 'guardian' | 'student';

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: Role;
}

export async function signSession(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// For use in Server Components / Route Handlers (reads cookies() store)
export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// For use in middleware (reads from NextRequest)
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const homeForRole: Record<Role, string> = {
  management: '/dashboard',
  teacher: '/teacher',
  guardian: '/guardian',
  student: '/student',
};
