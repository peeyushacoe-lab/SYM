import { NextResponse } from 'next/server';
import { getSessionFromCookies, Role, SessionUser } from './auth';

export async function requireRole(
  ...roles: Role[]
): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
  }
  // The Owner (role='superadmin', schoolId=null) manages the schools list
  // itself via dedicated /api/schools routes (see requireOwner below), not
  // any single school's tenant data — so it does NOT get a blanket pass into
  // 'management'-gated routes the way a real per-school admin does. Without
  // this schoolId guard, every tenant-scoped query keyed off session.schoolId
  // would receive `null` for the Owner and (correctly, but confusingly)
  // return zero rows instead of a clean 403.
  const allowed =
    roles.length === 0 ||
    roles.includes(session.role) ||
    (session.role === 'superadmin' && session.schoolId != null && roles.includes('management'));
  if (!allowed) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) };
  }
  return { session };
}

// For the platform-owner-only /api/schools routes. The Owner is the single
// account with role='superadmin' and schoolId=null.
export async function requireOwner(): Promise<{ session: SessionUser } | { error: NextResponse }> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
  }
  if (session.role !== 'superadmin' || session.schoolId != null) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) };
  }
  return { session };
}
