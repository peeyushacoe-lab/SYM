import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM role_permissions ORDER BY role, module_key').all();
  return NextResponse.json({ items });
}

// Body: { role: 'teacher' | 'student', permissions: [{ module_key, can_view }] }
export async function PUT(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.role || !Array.isArray(data.permissions)) {
    return NextResponse.json({ error: 'role and permissions[] are required.' }, { status: 400 });
  }
  const db = getDb();
  for (const p of data.permissions) {
    await db
      .prepare(
        `INSERT INTO role_permissions (role, module_key, can_view, can_edit)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (role, module_key) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit`
      )
      .run(data.role, p.module_key, p.can_view ? 1 : 0, p.can_edit === false ? 0 : 1);
  }
  return NextResponse.json({ ok: true });
}
