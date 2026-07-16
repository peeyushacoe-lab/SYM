import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSessionFromCookies } from '@/lib/auth';

// Any authenticated user can check their own effective permissions.
// A module with no stored row is treated as visible by default (so the
// app behaves exactly as before until management explicitly restricts it).
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  if (session.role === 'management') {
    return NextResponse.json({ role: session.role, permissions: {}, defaultVisible: true });
  }

  const db = getDb();
  const rows = (await db
    .prepare('SELECT module_key, can_view, can_edit FROM role_permissions WHERE role = ?')
    .all(session.role)) as any[];

  const permissions: Record<string, { can_view: boolean; can_edit: boolean }> = {};
  for (const r of rows) {
    permissions[r.module_key] = { can_view: !!r.can_view, can_edit: !!r.can_edit };
  }

  return NextResponse.json({ role: session.role, permissions, defaultVisible: true });
}
