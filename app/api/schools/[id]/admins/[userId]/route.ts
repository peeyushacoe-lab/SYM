import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireOwner } from '@/lib/api-auth';

async function findAdmin(db: ReturnType<typeof getDb>, schoolId: string, userId: string) {
  return db
    .prepare("SELECT * FROM users WHERE id = ? AND school_id = ? AND role = 'management'")
    .get(userId, schoolId) as Promise<any>;
}

// Owner-only: edit one of a school's admin accounts (name/mobile/email,
// active toggle, or reset the password directly).
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string; userId: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const existing = await findAdmin(db, params.id, params.userId);
  if (!existing) return NextResponse.json({ error: 'Admin not found for this school.' }, { status: 404 });

  const data = await req.json();
  await db
    .prepare('UPDATE users SET name = @name, mobile = @mobile, email = @email, active = @active WHERE id = @id')
    .run({
      id: params.userId,
      name: data.name ?? existing.name,
      mobile: data.mobile ?? existing.mobile,
      email: data.email ?? existing.email,
      active: data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
    });

  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, params.userId);
  }

  return NextResponse.json({ ok: true });
}

// Owner-only: remove an admin login from a school. Left unrestricted even
// if it's the school's only remaining admin — the Owner can always add a
// replacement via POST /api/schools/[id]/admins right after.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string; userId: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const existing = await findAdmin(db, params.id, params.userId);
  if (!existing) return NextResponse.json({ error: 'Admin not found for this school.' }, { status: 404 });

  await db.prepare('DELETE FROM users WHERE id = ?').run(params.userId);
  return NextResponse.json({ ok: true });
}
