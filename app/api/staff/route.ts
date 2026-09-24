import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { generatePassword } from '@/lib/generatePassword';
import { sendCredentialsEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? await db
        .prepare('SELECT * FROM staff WHERE school_id = ? AND (name ILIKE ? OR designation ILIKE ? OR mobile ILIKE ?) ORDER BY name')
        .all(auth.session.schoolId, `%${search}%`, `%${search}%`, `%${search}%`)
    : await db.prepare('SELECT * FROM staff WHERE school_id = ? ORDER BY name').all(auth.session.schoolId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const staffType = data.staff_type === 'Administrator' ? 'Administrator' : 'Instructor';
  if (staffType === 'Administrator' && !data.email) {
    return NextResponse.json({ error: 'Email is required for Administrator staff (used to send their login).' }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO staff (name, mobile, designation, salary, joining_date, address, remarks, staff_type, email, school_id)
       VALUES (@name, @mobile, @designation, @salary, @joining_date, @address, @remarks, @staff_type, @email, @school_id)`
    )
    .run({
      school_id: auth.session.schoolId,
      name: data.name,
      mobile: data.mobile || null,
      designation: data.designation || null,
      salary: data.salary || 0,
      joining_date: data.joining_date || null,
      address: data.address || null,
      remarks: data.remarks || null,
      staff_type: staffType,
      email: data.email || null,
    });
  const staffId = result.lastInsertRowid as number;

  // Administrator-type staff get their own login (role='staff_admin') so
  // they can mark attendance for every staff member without needing the
  // school admin's own account — scoped to attendance only, nothing else
  // (see requireRole('management', 'staff_admin') in /api/staff-attendance).
  let emailSent = false;
  let emailSkipped = false;
  let generatedUsername: string | undefined;
  let generatedPassword: string | undefined;
  if (staffType === 'Administrator') {
    const username = String(data.email).trim();
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'A login already exists with this email. Use a different email.' }, { status: 400 });
    }
    const plainPassword = generatePassword(data.name);
    const hash = bcrypt.hashSync(plainPassword, 10);
    const userResult = await db
      .prepare('INSERT INTO users (username, password, role, name, mobile, email, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(username, hash, 'staff_admin', data.name, data.mobile || null, data.email, auth.session.schoolId);
    const userId = userResult.lastInsertRowid as number;
    await db.prepare('UPDATE staff SET user_id = ? WHERE id = ?').run(userId, staffId);

    const school = (await db.prepare('SELECT name FROM schools WHERE id = ?').get(auth.session.schoolId)) as any;
    const res = await sendCredentialsEmail({
      to: data.email,
      greetingName: (data.name || '').split(' ')[0] || data.name,
      institute: school?.name || 'your institute',
      role: 'Administrator (Staff Attendance)',
      username,
      password: plainPassword,
    });
    emailSent = res.ok;
    emailSkipped = !!res.skipped;
    generatedUsername = username;
    generatedPassword = plainPassword;
  }

  return NextResponse.json({
    id: staffId,
    username: generatedUsername,
    password: generatedPassword,
    emailSent,
    emailSkipped,
  });
}
