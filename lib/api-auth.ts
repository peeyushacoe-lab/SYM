import { NextResponse } from 'next/server';
import { getSessionFromCookies, Role, SessionUser } from './auth';

export async function requireRole(
  ...roles: Role[]
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
  }
  if (roles.length > 0 && !roles.includes(session.role)) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) };
  }
  return { session };
}
