import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { generatePassword } from '@/lib/generatePassword';
import { sendCredentialsEmail } from '@/lib/email';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM staff WHERE id = ? AND school_id = ?').get(params.id, auth.session.schoolId)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const staffType = data.staff_type === 'Administrator' ? 'Administrator' : 'Instructor';
  if (staffType === 'Administrator' && !data.email && !existing.email) {
    return NextResponse.json({ error: 'Email is required for Administrator staff (used to send their login).' }, { status: 400 });
  }

  await db.prepare(
    'UPDATE staff SET name=@name, mobile=@mobile, designation=@designation, salary=@salary, joining_date=@joining_date, address=@address, remarks=@remarks, staff_type=@staff_type, email=@email WHERE id=@id AND school_id=@school_id'
  ).run({
    id: params.id,
    school_id: auth.session.schoolId,
    name: data.name,
    mobile: data.mobile || null,
    designation: data.designation || null,
    salary: data.salary || 0,
    joining_date: data.joining_date || null,
    address: data.address || null,
    remarks: data.remarks || null,
    staff_type: staffType,
    email: data.email || existing.email || null,
  });

  // Newly promoted to Administrator and no login yet -> create one now,
  // same as the auto-creation on Add Staff.
  let emailSent = false;
  let emailSkipped = false;
  let generatedUsername: string | undefined;
  let generatedPassword: string | undefined;
  if (staffType === 'Administrator' && !existing.user_id) {
    const email = data.email || existing.email;
    const username = String(email).trim();
    const usernameTaken = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!usernameTaken) {
      const plainPassword = generatePassword(data.name || existing.name);
      const hash = bcrypt.hashSync(plainPassword, 10);
      const userResult = await db
        .prepare('INSERT INTO users (username, password, role, name, mobile, email, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(username, hash, 'staff_admin', data.name || existing.name, data.mobile || existing.mobile || null, email, auth.session.schoolId);
      await db.prepare('UPDATE staff SET user_id = ? WHERE id = ?').run(userResult.lastInsertRowid, params.id);

      const school = (await db.prepare('SELECT name FROM schools WHERE id = ?').get(auth.session.schoolId)) as any;
      const res = await sendCredentialsEmail({
        to: email,
        greetingName: (data.name || existing.name || '').split(' ')[0],
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
  }

  return NextResponse.json({ ok: true, username: generatedUsername, password: generatedPassword, emailSent, emailSkipped });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const target = (await db.prepare('SELECT id, user_id FROM staff WHERE id = ? AND school_id = ?').get(params.id, auth.session.schoolId)) as any;
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  await db.prepare('DELETE FROM staff WHERE id=?').run(params.id);
  // Clean up the auto-created staff_admin login too, so deleting an
  // Administrator staff member doesn't leave a dangling, unreachable login.
  if (target.user_id) {
    await db.prepare("DELETE FROM users WHERE id = ? AND role = 'staff_admin'").run(target.user_id);
  }
  return NextResponse.json({ ok: true });
}
