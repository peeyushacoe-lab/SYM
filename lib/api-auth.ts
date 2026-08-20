import { NextResponse } from 'next/server';
import { getSessionFromCookies, Role, SessionUser } from './auth';

export async function requireRole(
  ...roles: Role[]
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
  }
  // Super admin is a superset of admin (management): any endpoint open to
  // management is open to superadmin as well.
  const allowed =
    roles.length === 0 ||
    roles.includes(session.role) ||
    (session.role === 'superadmin' && roles.includes('management'));
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) };
  }
  return { session };
}
