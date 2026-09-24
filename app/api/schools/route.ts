import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireOwner } from '@/lib/api-auth';
import { generatePassword } from '@/lib/generatePassword';
import { sendCredentialsEmail } from '@/lib/email';

const DEFAULT_SMS_TEMPLATES: [string, string][] = [
  ['registration', 'Dear STUDENT_NAME, welcome to INSTITUTE_NAME! Your registration is complete. Batch: BATCH_NAME.'],
  ['fee_reminder', 'Dear STUDENT_NAME, your fee of Rs. AMOUNT for MONTH is due at INSTITUTE_NAME. Kindly pay at the earliest.'],
  ['fee_receipt', 'Dear STUDENT_NAME, we received Rs. AMOUNT (Receipt RECEIPT_NO) at INSTITUTE_NAME. Thank you!'],
  ['attendance', 'Dear Parent, STUDENT_NAME was STATUS today (DATE) at INSTITUTE_NAME.'],
  ['exam', 'Dear STUDENT_NAME, you scored MARKS in EXAM_NAME at INSTITUTE_NAME.'],
  ['enquiry', 'New Enquiry Alert! Student: STUDENT_NAME, Batch: BATCH_NAME, Date: DATE. INSTITUTE_NAME - Enquiry No: MOBILE'],
  ['birthday', 'Happy Birthday STUDENT_NAME! Best wishes from all of us at INSTITUTE_NAME.'],
];

// Owner-only: list every school with a quick headcount, for the /schools dashboard.
export async function GET() {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db
    .prepare(
      `SELECT s.*,
         (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count,
         (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'management') as admin_count
       FROM schools s ORDER BY s.created_at DESC`
    )
    .all();
  return NextResponse.json({ items });
}

// Body: { name, admin_email, admin_first_name, admin_last_name }
// Creates the school, auto-generates its admin login (username = email,
// password = firstname + random suffix), and emails the credentials.
export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const data = await req.json();

  const schoolName = (data.name || '').trim();
  const adminEmail = (data.admin_email || '').trim().toLowerCase();
  const firstName = (data.admin_first_name || '').trim();
  const lastName = (data.admin_last_name || '').trim();
  if (!schoolName || !adminEmail || !firstName) {
    return NextResponse.json({ error: 'School name, admin email and admin first name are required.' }, { status: 400 });
  }

  const db = getDb();

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(adminEmail);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
  }

  const schoolResult = await db.prepare('INSERT INTO schools (name) VALUES (?)').run(schoolName);
  const schoolId = schoolResult.lastInsertRowid;

  const plainPassword = generatePassword(firstName);
  const passwordHash = bcrypt.hashSync(plainPassword, 10);
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  const userResult = await db
    .prepare(
      `INSERT INTO users (username, password, role, name, email, school_id, active)
       VALUES (@username, @password, 'management', @name, @email, @school_id, 1)`
    )
    .run({
      username: adminEmail,
      password: passwordHash,
      name: fullName,
      email: adminEmail,
      school_id: schoolId,
    });

  // Every school starts with the same default fee category + SMS templates
  // the original single-school seed used, scoped to this school.
  await db
    .prepare('INSERT INTO fee_categories (name, amount, school_id) VALUES (?, 0, ?)')
    .run('Default Fee', schoolId);
  for (const [key, template] of DEFAULT_SMS_TEMPLATES) {
    await db
      .prepare('INSERT INTO sms_templates (key, template, school_id) VALUES (?, ?, ?)')
      .run(key, template, schoolId);
  }

  const emailResult = await sendCredentialsEmail({
    to: adminEmail,
    greetingName: firstName,
    institute: schoolName,
    role: 'School Admin',
    username: adminEmail,
    password: plainPassword,
  });

  return NextResponse.json({
    id: schoolId,
    admin: { id: userResult.lastInsertRowid, username: adminEmail, password: plainPassword },
    emailSent: emailResult.ok,
    emailSkipped: !!emailResult.skipped,
  });
}
