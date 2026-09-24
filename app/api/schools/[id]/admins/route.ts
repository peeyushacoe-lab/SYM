import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireOwner } from '@/lib/api-auth';
import { generatePassword } from '@/lib/generatePassword';
import { sendCredentialsEmail } from '@/lib/email';

// Owner-only: list a school's admin (management-role) accounts. The one
// created alongside the school itself is here too — there's nothing special
// about it once it exists.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const school = await db.prepare('SELECT id FROM schools WHERE id = ?').get(params.id);
  if (!school) return NextResponse.json({ error: 'School not found.' }, { status: 404 });

  const items = await db
    .prepare(
      "SELECT id, username, name, email, mobile, active, created_at FROM users WHERE school_id = ? AND role = 'management' ORDER BY created_at"
    )
    .all(params.id);
  return NextResponse.json({ items });
}

// Owner-only: add another admin login to an existing school (a school can
// have more than one — e.g. a principal and an office manager both needing
// full admin access). Mirrors the auto-generated-credentials flow in
// /api/schools' POST, just targeting a school that already exists.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const data = await req.json();

  const db = getDb();
  const school = (await db.prepare('SELECT id, name FROM schools WHERE id = ?').get(params.id)) as any;
  if (!school) return NextResponse.json({ error: 'School not found.' }, { status: 404 });

  const name = (data.name || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ error: 'Admin name and email are required.' }, { status: 400 });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
  }

  const plainPassword = generatePassword(name);
  const hash = bcrypt.hashSync(plainPassword, 10);
  const result = await db
    .prepare(
      `INSERT INTO users (username, password, role, name, mobile, email, school_id, active)
       VALUES (?, ?, 'management', ?, ?, ?, ?, 1)`
    )
    .run(email, hash, name, data.mobile || null, email, params.id);

  const emailResult = await sendCredentialsEmail({
    to: email,
    greetingName: name.split(' ')[0] || name,
    institute: school.name,
    role: 'School Admin',
    username: email,
    password: plainPassword,
  });

  return NextResponse.json({
    id: result.lastInsertRowid,
    username: email,
    password: plainPassword,
    emailSent: emailResult.ok,
    emailSkipped: !!emailResult.skipped,
  });
}
