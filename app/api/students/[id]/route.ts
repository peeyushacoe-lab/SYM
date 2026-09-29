import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { generatePassword } from '@/lib/generatePassword';
import { sendCredentialsEmail } from '@/lib/email';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const item = await db
    .prepare(
      `SELECT s.*, b.name as batch_name, b.start_date as batch_start_date
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ? AND s.school_id = ?`
    )
    .get(params.id, auth.session.schoolId);
  if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.batch_id && !data.course) {
    return NextResponse.json({ error: 'Select either a batch or a course.' }, { status: 400 });
  }
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM students WHERE id = ? AND school_id = ?').get(params.id, auth.session.schoolId)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // "Create login account" only matters if there's no account yet — turning
  // it off never removes an existing login.
  const createAccount = data.create_account === undefined || data.create_account === null ? true : !!Number(data.create_account);
  const wantsNewAccount = createAccount && !existing.user_id;
  if (wantsNewAccount && !data.email && !existing.email) {
    return NextResponse.json({ error: 'Email is required to create a login (or turn off "Create login account").' }, { status: 400 });
  }

  await db.prepare(
    `UPDATE students SET name=@name, father_name=@father_name, mother_name=@mother_name, mobile=@mobile,
     alt_mobile=@alt_mobile, address=@address, dob=@dob, gender=@gender, qualification=@qualification,
     course=@course, batch_id=@batch_id, admission_date=@admission_date, roll_number=@roll_number,
     registration_number=@registration_number, aadhaar=@aadhaar, photo=@photo, email=@email, remarks=@remarks,
     fee_category=@fee_category, fee_type=@fee_type, fee_amount=@fee_amount
     WHERE id=@id AND school_id=@school_id`
  ).run({
    id: params.id,
    school_id: auth.session.schoolId,
    name: data.name,
    father_name: data.father_name || null,
    mother_name: data.mother_name || null,
    mobile: data.mobile,
    alt_mobile: data.alt_mobile || null,
    address: data.address || null,
    dob: data.dob || null,
    gender: data.gender || null,
    qualification: data.qualification || null,
    course: data.course || null,
    batch_id: data.batch_id || null,
    admission_date: data.admission_date || null,
    roll_number: data.roll_number || null,
    registration_number: data.registration_number || null,
    aadhaar: data.aadhaar || null,
    photo: data.photo || null,
    email: data.email || null,
    remarks: data.remarks || null,
    fee_category: data.fee_category || 'Default',
    fee_type: data.fee_type || 'CourseWise',
    fee_amount: data.fee_category === 'Custom' && data.fee_amount ? Number(data.fee_amount) : null,
  });

  // Keep the recurring fee item in sync with batch/fee-type changes. On
  // create (POST /api/students), a Monthly/Quarterly batch fee auto-creates
  // one — editing a student used to silently skip this entirely: switching a
  // student TO Monthly/Quarterly never started billing them, and switching
  // them AWAY from it (or off a batch) left an old item still accruing.
  const wantsRecurringItem = !!data.batch_id && ['Monthly', 'Quarterly'].includes(data.fee_type);
  const existingItem = (await db
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND school_id = ? AND active = 1 ORDER BY id DESC LIMIT 1')
    .get(params.id, auth.session.schoolId)) as any;

  if (!wantsRecurringItem && existingItem) {
    await db.prepare('UPDATE student_fee_items SET active = 0 WHERE id = ?').run(existingItem.id);
  } else if (wantsRecurringItem && !existingItem) {
    const batch = (await db.prepare('SELECT monthly_fee FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId)) as any;
    const amount = Number(data.batch_monthly_fee) > 0 ? Number(data.batch_monthly_fee) : Number(batch?.monthly_fee) || 0;
    if (amount > 0) {
      await db
        .prepare(
          `INSERT INTO student_fee_items (student_id, category, fee_type, from_date, amount, partial_supported, school_id)
           VALUES (@student_id, @category, @fee_type, @from_date, @amount, @partial_supported, @school_id)`
        )
        .run({
          student_id: params.id,
          category: 'Default Fee',
          fee_type: data.fee_type,
          from_date: data.admission_date || existing.admission_date || new Date().toISOString().slice(0, 10),
          amount,
          partial_supported: 1,
          school_id: auth.session.schoolId,
        });
    }
  }

  // No login yet, and "Create login account" is on -> create one now. This
  // is also how a student added with the toggle off can get a login later.
  let emailSent = false;
  let emailSkipped = false;
  let generatedUsername: string | undefined;
  let generatedPassword: string | undefined;
  if (wantsNewAccount) {
    const email = data.email || existing.email;
    const username = String(email).trim();
    const usernameTaken = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!usernameTaken) {
      const plainPassword = generatePassword(data.name || existing.name);
      const hash = bcrypt.hashSync(plainPassword, 10);
      const userResult = await db
        .prepare('INSERT INTO users (username, password, role, name, mobile, email, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(username, hash, 'student', data.name || existing.name, data.mobile || existing.mobile || null, email, auth.session.schoolId);
      await db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(userResult.lastInsertRowid, params.id);

      const school = (await db.prepare('SELECT name FROM schools WHERE id = ?').get(auth.session.schoolId)) as any;
      const res = await sendCredentialsEmail({
        to: email,
        greetingName: (data.name || existing.name || '').split(' ')[0],
        institute: school?.name || 'your institute',
        role: 'Student',
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

  const target = (await db.prepare('SELECT id, user_id FROM students WHERE id = ? AND school_id = ?').get(params.id, auth.session.schoolId)) as any;
  if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Clear every table that has a NOT NULL, non-cascading FK to students(id)
  // before deleting the student itself — otherwise Postgres throws a raw
  // foreign-key-violation 500 the moment the student has any history at all.
  // (student_fee_items, student_documents, library_issues, hostel_allocations,
  // and transport_assignments all have ON DELETE CASCADE already and need no
  // action here; alumni.student_id is ON DELETE SET NULL.)
  // A student deleted while still holding an active hostel room would
  // otherwise leave hostel_rooms.occupied_count permanently inflated — the
  // allocation row itself cascades away, but nothing else decrements the
  // counter the way the normal "vacate" action does.
  const activeAllocations = (await db
    .prepare("SELECT room_id FROM hostel_allocations WHERE student_id = ? AND status != 'Vacated'")
    .all(params.id)) as any[];
  for (const a of activeAllocations) {
    await db.prepare('UPDATE hostel_rooms SET occupied_count = GREATEST(occupied_count - 1, 0) WHERE id = ?').run(a.room_id);
  }
  await db.prepare('DELETE FROM fees WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM payments WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM attendance WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM exam_marks WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM leave_requests WHERE student_id=?').run(params.id);
  await db.prepare('UPDATE queries SET student_id = NULL WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM student_guardians WHERE student_id=?').run(params.id);
  await db.prepare('DELETE FROM students WHERE id=?').run(params.id);
  // Clean up the auto-created student login too, so deleting a student
  // doesn't leave a dangling, unreachable login behind.
  if (target.user_id) {
    await db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'").run(target.user_id);
  }
  return NextResponse.json({ ok: true });
}
