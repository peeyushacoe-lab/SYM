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
  // "Create login account" only matters if there's no account yet — turning
  // it off never removes an existing login, so an already-linked staff
  // member doesn't need the toggle on to save other field edits.
  const createAccount = data.create_account === undefined || data.create_account === null ? true : !!Number(data.create_account);
  const wantsNewAccount = createAccount && !existing.user_id;
  if (wantsNewAccount && !data.email && !existing.email) {
    return NextResponse.json({ error: 'Email is required to create a login (or turn off "Create login account").' }, { status: 400 });
  }

  let batchId: number | null = existing.batch_id ?? null;
  let subjectIds: number[] = [];
  if (staffType === 'Instructor') {
    if (data.batch_id !== undefined) {
      if (data.batch_id) {
        const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
        if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 400 });
        batchId = Number(data.batch_id);
      } else {
        batchId = null;
      }
    }
    if (Array.isArray(data.subject_ids)) {
      const rows = batchId
        ? ((await db
            .prepare('SELECT id FROM subjects WHERE school_id = ? AND batch_id = ? AND id = ANY(?)')
            .all(auth.session.schoolId, batchId, data.subject_ids.map(Number))) as any[])
        : [];
      subjectIds = rows.map((r) => r.id);
    }
  } else {
    batchId = null;
  }

  await db.prepare(
    'UPDATE staff SET name=@name, mobile=@mobile, designation=@designation, salary=@salary, joining_date=@joining_date, address=@address, remarks=@remarks, staff_type=@staff_type, email=@email, batch_id=@batch_id, staff_number=@staff_number WHERE id=@id AND school_id=@school_id'
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
    batch_id: batchId,
    staff_number: data.staff_number || existing.staff_number || null,
  });

  if (Array.isArray(data.subject_ids)) {
    await db.prepare('DELETE FROM staff_subjects WHERE staff_id = ?').run(params.id);
    if (subjectIds.length) {
      const stmt = db.prepare('INSERT INTO staff_subjects (staff_id, subject_id, school_id) VALUES (?, ?, ?) ON CONFLICT (staff_id, subject_id) DO NOTHING');
      for (const sid of subjectIds) await stmt.run(params.id, sid, auth.session.schoolId);
    }
  }

  // No login yet, and "Create login account" is on (whether that's still
  // true from Add Staff, or was just switched on now) -> create one. This is
  // also how an account can be created retroactively for staff added with
  // the toggle off.
  let emailSent = false;
  let emailSkipped = false;
  let generatedUsername: string | undefined;
  let generatedPassword: string | undefined;
  if (wantsNewAccount) {
    const email = data.email || existing.email;
    const role = staffType === 'Administrator' ? 'staff_admin' : 'teacher';
    const username = String(email).trim();
    const usernameTaken = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!usernameTaken) {
      const plainPassword = generatePassword(data.name || existing.name);
      const hash = bcrypt.hashSync(plainPassword, 10);
      const userResult = await db
        .prepare('INSERT INTO users (username, password, role, name, mobile, email, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(username, hash, role, data.name || existing.name, data.mobile || existing.mobile || null, email, auth.session.schoolId);
      const userId = userResult.lastInsertRowid as number;
      await db.prepare('UPDATE staff SET user_id = ? WHERE id = ?').run(userId, params.id);

      if (role === 'teacher' && batchId) {
        await db
          .prepare('INSERT INTO teacher_batches (teacher_user_id, batch_id, school_id) VALUES (?, ?, ?) ON CONFLICT (teacher_user_id, batch_id) DO NOTHING')
          .run(userId, batchId, auth.session.schoolId);
      }

      const school = (await db.prepare('SELECT name FROM schools WHERE id = ?').get(auth.session.schoolId)) as any;
      const res = await sendCredentialsEmail({
        to: email,
        greetingName: (data.name || existing.name || '').split(' ')[0],
        institute: school?.name || 'your institute',
        role: role === 'staff_admin' ? 'Administrator (Staff Attendance)' : 'Instructor / Teacher',
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
