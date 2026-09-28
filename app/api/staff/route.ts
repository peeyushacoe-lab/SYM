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
  const query = `SELECT s.*, b.name as batch_name,
      COALESCE((SELECT array_agg(ss.subject_id) FROM staff_subjects ss WHERE ss.staff_id = s.id), '{}') as subject_ids
    FROM staff s LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.school_id = ?${search ? ' AND (s.name ILIKE ? OR s.designation ILIKE ? OR s.mobile ILIKE ?)' : ''}
    ORDER BY s.name`;
  const items = search
    ? await db.prepare(query).all(auth.session.schoolId, `%${search}%`, `%${search}%`, `%${search}%`)
    : await db.prepare(query).all(auth.session.schoolId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const staffType = data.staff_type === 'Administrator' ? 'Administrator' : 'Instructor';
  // Default on (existing behaviour), so forms that don't send this yet keep working.
  const createAccount = data.create_account === undefined || data.create_account === null ? true : !!Number(data.create_account);
  if (createAccount && !data.email) {
    return NextResponse.json({ error: 'Email is required to create a login (or turn off "Create login account").' }, { status: 400 });
  }

  const db = getDb();

  let batchId: number | null = null;
  let subjectIds: number[] = [];
  if (staffType === 'Instructor') {
    if (data.batch_id) {
      const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
      if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 400 });
      batchId = Number(data.batch_id);
    }
    if (Array.isArray(data.subject_ids) && data.subject_ids.length) {
      const rows = (await db
        .prepare(`SELECT id FROM subjects WHERE school_id = ? AND batch_id = ? AND id = ANY(?)`)
        .all(auth.session.schoolId, batchId, data.subject_ids.map(Number))) as any[];
      subjectIds = rows.map((r) => r.id);
    }
  }

  const result = await db
    .prepare(
      `INSERT INTO staff (name, mobile, designation, salary, joining_date, address, remarks, staff_type, email, batch_id, school_id)
       VALUES (@name, @mobile, @designation, @salary, @joining_date, @address, @remarks, @staff_type, @email, @batch_id, @school_id)`
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
      batch_id: batchId,
    });
  const staffId = result.lastInsertRowid as number;

  if (subjectIds.length) {
    const stmt = db.prepare('INSERT INTO staff_subjects (staff_id, subject_id, school_id) VALUES (?, ?, ?) ON CONFLICT (staff_id, subject_id) DO NOTHING');
    for (const sid of subjectIds) await stmt.run(staffId, sid, auth.session.schoolId);
  }

  // Administrator-type staff get a staff_admin login (attendance-marking
  // only); Instructor-type staff get a teacher login tied to their assigned
  // batch. Either can be skipped by turning off "Create login account" —
  // the staff record is still created either way.
  let emailSent = false;
  let emailSkipped = false;
  let generatedUsername: string | undefined;
  let generatedPassword: string | undefined;

  if (createAccount) {
    const role = staffType === 'Administrator' ? 'staff_admin' : 'teacher';
    const username = String(data.email).trim();
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'A login already exists with this email. Use a different email.' }, { status: 400 });
    }
    const plainPassword = generatePassword(data.name);
    const hash = bcrypt.hashSync(plainPassword, 10);
    const userResult = await db
      .prepare('INSERT INTO users (username, password, role, name, mobile, email, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(username, hash, role, data.name, data.mobile || null, data.email, auth.session.schoolId);
    const userId = userResult.lastInsertRowid as number;
    await db.prepare('UPDATE staff SET user_id = ? WHERE id = ?').run(userId, staffId);

    if (role === 'teacher' && batchId) {
      await db
        .prepare('INSERT INTO teacher_batches (teacher_user_id, batch_id, school_id) VALUES (?, ?, ?) ON CONFLICT (teacher_user_id, batch_id) DO NOTHING')
        .run(userId, batchId, auth.session.schoolId);
    }

    const school = (await db.prepare('SELECT name FROM schools WHERE id = ?').get(auth.session.schoolId)) as any;
    const res = await sendCredentialsEmail({
      to: data.email,
      greetingName: (data.name || '').split(' ')[0] || data.name,
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

  return NextResponse.json({
    id: staffId,
    username: generatedUsername,
    password: generatedPassword,
    emailSent,
    emailSkipped,
  });
}
