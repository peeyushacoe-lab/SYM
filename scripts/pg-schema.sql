-- Postgres schema for SYM (Shiksha Yogi Management), translated from the
-- original SQLite schema in lib/db.ts. Date/time text columns are kept as
-- TEXT (not DATE/TIMESTAMP) to preserve the app's existing string-prefix
-- (LIKE 'YYYY-MM%') filtering behavior without further query rewrites.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'management',
  name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  course TEXT,
  start_date TEXT,
  end_date TEXT,
  timing TEXT,
  capacity INTEGER DEFAULT 30,
  remarks TEXT,
  advance_fee INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  mobile TEXT NOT NULL,
  alt_mobile TEXT,
  address TEXT,
  dob TEXT,
  gender TEXT,
  qualification TEXT,
  course TEXT,
  batch_id INTEGER REFERENCES batches(id),
  admission_date TEXT,
  roll_number TEXT,
  registration_number TEXT,
  aadhaar TEXT,
  photo TEXT,
  email TEXT,
  remarks TEXT,
  user_id INTEGER REFERENCES users(id),
  fee_category TEXT DEFAULT 'Default',
  fee_type TEXT DEFAULT 'CourseWise',
  fee_amount DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  designation TEXT,
  salary DOUBLE PRECISION DEFAULT 0,
  joining_date TEXT,
  address TEXT,
  remarks TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  mobile TEXT,
  course_interested TEXT,
  qualification TEXT,
  address TEXT,
  enquiry_date TEXT,
  follow_up_date TEXT,
  status TEXT DEFAULT 'Pending',
  remarks TEXT,
  converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  course_fee DOUBLE PRECISION DEFAULT 0,
  amount_paid DOUBLE PRECISION DEFAULT 0,
  remaining_due DOUBLE PRECISION DEFAULT 0,
  payment_date TEXT,
  payment_mode TEXT DEFAULT 'Cash',
  receipt_number TEXT,
  remarks TEXT,
  due_date TEXT,
  fee_type TEXT DEFAULT 'CourseWise',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_date TEXT NOT NULL,
  category TEXT,
  description TEXT,
  amount DOUBLE PRECISION DEFAULT 0,
  payment_mode TEXT DEFAULT 'Cash',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_batches (
  id SERIAL PRIMARY KEY,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id),
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  UNIQUE(teacher_user_id, batch_id)
);

CREATE TABLE IF NOT EXISTS student_guardians (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  guardian_user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(student_id, guardian_user_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  marked_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, student_id, date)
);

CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'All',
  batch_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER,
  student_id INTEGER NOT NULL REFERENCES students(id),
  amount DOUBLE PRECISION NOT NULL,
  method TEXT DEFAULT 'Online',
  status TEXT DEFAULT 'success',
  transaction_ref TEXT,
  paid_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  fee DOUBLE PRECISION DEFAULT 0,
  duration TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  subject TEXT,
  exam_date TEXT,
  max_marks DOUBLE PRECISION DEFAULT 100,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_marks (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  marks DOUBLE PRECISION,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  day INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  subject TEXT NOT NULL,
  teacher_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  response_note TEXT,
  responded_by INTEGER,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  subject TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  attachment_name TEXT,
  attachment_data_url TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_plans (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  planned_date TEXT,
  status TEXT NOT NULL DEFAULT 'Planned',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'Event',
  start_date TEXT NOT NULL,
  end_date TEXT,
  audience TEXT NOT NULL DEFAULT 'All',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grade_bands (
  id SERIAL PRIMARY KEY,
  grade TEXT NOT NULL,
  min_percent DOUBLE PRECISION NOT NULL,
  max_percent DOUBLE PRECISION NOT NULL,
  remarks TEXT
);

INSERT INTO grade_bands (grade, min_percent, max_percent, remarks)
SELECT * FROM (VALUES
  ('A+', 90, 100, 'Outstanding'),
  ('A', 80, 89.99, 'Excellent'),
  ('B+', 70, 79.99, 'Very Good'),
  ('B', 60, 69.99, 'Good'),
  ('C', 50, 59.99, 'Average'),
  ('D', 40, 49.99, 'Below Average'),
  ('F', 0, 39.99, 'Needs Improvement')
) AS v(grade, min_percent, max_percent, remarks)
WHERE NOT EXISTS (SELECT 1 FROM grade_bands);

CREATE TABLE IF NOT EXISTS student_documents (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'Other',
  file_name TEXT NOT NULL,
  mime_type TEXT,
  data_url TEXT NOT NULL,
  uploaded_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  category TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_issues (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  issued_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_date TEXT,
  fine_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Issued',
  issued_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  unit_cost DOUBLE PRECISION DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  location TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  txn_date TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id SERIAL PRIMARY KEY,
  room_number TEXT NOT NULL,
  block TEXT,
  room_type TEXT DEFAULT 'Shared',
  capacity INTEGER NOT NULL DEFAULT 1,
  occupied_count INTEGER NOT NULL DEFAULT 0,
  monthly_fee DOUBLE PRECISION DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  allocated_date TEXT NOT NULL,
  vacated_date TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT,
  driver_mobile TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  route_name TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_assignments (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  pickup_point TEXT,
  monthly_fee DOUBLE PRECISION DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  assigned_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_logs (
  id SERIAL PRIMARY KEY,
  visitor_name TEXT NOT NULL,
  mobile TEXT,
  purpose TEXT,
  to_meet TEXT,
  in_time TEXT NOT NULL,
  out_time TEXT,
  remarks TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
  allowances DOUBLE PRECISION NOT NULL DEFAULT 0,
  deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_date TEXT,
  payment_mode TEXT DEFAULT 'Bank Transfer',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

CREATE TABLE IF NOT EXISTS alumni (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  course TEXT,
  graduation_year TEXT,
  mobile TEXT,
  email TEXT,
  current_occupation TEXT,
  current_organization TEXT,
  address TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_mobile TEXT,
  contact_email TEXT,
  is_main INTEGER DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view INTEGER NOT NULL DEFAULT 1,
  can_edit INTEGER NOT NULL DEFAULT 1,
  UNIQUE(role, module_key)
);

CREATE TABLE IF NOT EXISTS queries (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  raised_by INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  response TEXT,
  responded_by INTEGER,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Tufee-parity additions (dashboard, staff attendance, fee plans,
-- period-based collection, SMS templates). All idempotent.
-- ============================================================

-- Staff daily attendance (colour-coded register)
CREATE TABLE IF NOT EXISTS staff_attendance (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  marked_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- Configurable fee categories (Settings > Fee Category)
CREATE TABLE IF NOT EXISTS fee_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  amount DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO fee_categories (name, amount)
SELECT 'Default Fee', 0 WHERE NOT EXISTS (SELECT 1 FROM fee_categories);

-- Per-student fee plan items (category + type + start + amount + partial)
CREATE TABLE IF NOT EXISTS student_fee_items (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category TEXT,
  fee_type TEXT NOT NULL DEFAULT 'Monthly',
  from_date TEXT,
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  partial_supported INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Editable message templates (Settings > SMS settings)
CREATE TABLE IF NOT EXISTS sms_templates (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO sms_templates (key, template)
SELECT * FROM (VALUES
  ('registration', 'Dear STUDENT_NAME, welcome to INSTITUTE_NAME! Your registration is complete. Batch: BATCH_NAME.'),
  ('fee_reminder', 'Dear STUDENT_NAME, your fee of Rs. AMOUNT for MONTH is due at INSTITUTE_NAME. Kindly pay at the earliest.'),
  ('fee_receipt', 'Dear STUDENT_NAME, we received Rs. AMOUNT (Receipt RECEIPT_NO) at INSTITUTE_NAME. Thank you!'),
  ('attendance', 'Dear Parent, STUDENT_NAME was STATUS today (DATE) at INSTITUTE_NAME.'),
  ('exam', 'Dear STUDENT_NAME, you scored MARKS in EXAM_NAME at INSTITUTE_NAME.'),
  ('enquiry', 'New Enquiry Alert! Student: STUDENT_NAME, Batch: BATCH_NAME, Date: DATE. INSTITUTE_NAME - Enquiry No: MOBILE'),
  ('birthday', 'Happy Birthday STUDENT_NAME! Best wishes from all of us at INSTITUTE_NAME.')
) AS v(key, template)
WHERE NOT EXISTS (SELECT 1 FROM sms_templates);

-- Student active/closed status + fee collection period & discount
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE fees ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_from TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_to TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_item_id INTEGER;

-- Batch-level monthly fee: lets Add Student auto-fill a per-student Monthly
-- fee item from the batch instead of the admin retyping it every time.
ALTER TABLE batches ADD COLUMN IF NOT EXISTS monthly_fee DOUBLE PRECISION DEFAULT 0;

-- ============================================================
-- Multi-school (multi-tenant) support.
--
-- One SYM instance now hosts many schools. A single platform Owner account
-- (role='superadmin', school_id NULL) creates schools and their admin
-- logins; every other account belongs to exactly one school via school_id,
-- and every tenant-data table gets its own school_id column so each query
-- is a simple "AND school_id = ?" rather than a chain of joins back to a
-- parent row. All existing data is backfilled into "School #1" below so
-- nothing already in the database is lost or orphaned.
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schools (id, name)
SELECT 1, 'School #1' WHERE NOT EXISTS (SELECT 1 FROM schools WHERE id = 1);
-- Keep the SERIAL sequence ahead of the manually-inserted id=1 row above.
SELECT setval(pg_get_serial_sequence('schools', 'id'), (SELECT COALESCE(MAX(id), 1) FROM schools));

ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE notices ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE fee_categories ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE academic_events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE library_books ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE library_issues ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE hostel_rooms ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE hostel_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE transport_vehicles ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE transport_assignments ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE grade_bands ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE homework ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_fee_items ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
ALTER TABLE queries ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- Backfill: every row that predates multi-school support belongs to School #1.
UPDATE students SET school_id = 1 WHERE school_id IS NULL;
UPDATE batches SET school_id = 1 WHERE school_id IS NULL;
UPDATE staff SET school_id = 1 WHERE school_id IS NULL;
UPDATE courses SET school_id = 1 WHERE school_id IS NULL;
UPDATE enquiries SET school_id = 1 WHERE school_id IS NULL;
UPDATE fees SET school_id = 1 WHERE school_id IS NULL;
UPDATE expenses SET school_id = 1 WHERE school_id IS NULL;
UPDATE notices SET school_id = 1 WHERE school_id IS NULL;
UPDATE branches SET school_id = 1 WHERE school_id IS NULL;
UPDATE fee_categories SET school_id = 1 WHERE school_id IS NULL;
UPDATE sms_templates SET school_id = 1 WHERE school_id IS NULL;
UPDATE role_permissions SET school_id = 1 WHERE school_id IS NULL;
UPDATE academic_events SET school_id = 1 WHERE school_id IS NULL;
UPDATE library_books SET school_id = 1 WHERE school_id IS NULL;
UPDATE library_issues SET school_id = 1 WHERE school_id IS NULL;
UPDATE inventory_items SET school_id = 1 WHERE school_id IS NULL;
UPDATE inventory_transactions SET school_id = 1 WHERE school_id IS NULL;
UPDATE hostel_rooms SET school_id = 1 WHERE school_id IS NULL;
UPDATE hostel_allocations SET school_id = 1 WHERE school_id IS NULL;
UPDATE transport_vehicles SET school_id = 1 WHERE school_id IS NULL;
UPDATE transport_assignments SET school_id = 1 WHERE school_id IS NULL;
UPDATE alumni SET school_id = 1 WHERE school_id IS NULL;
UPDATE visitor_logs SET school_id = 1 WHERE school_id IS NULL;
UPDATE grade_bands SET school_id = 1 WHERE school_id IS NULL;
UPDATE payments SET school_id = 1 WHERE school_id IS NULL;
UPDATE attendance SET school_id = 1 WHERE school_id IS NULL;
UPDATE exams SET school_id = 1 WHERE school_id IS NULL;
UPDATE exam_marks SET school_id = 1 WHERE school_id IS NULL;
UPDATE timetable_slots SET school_id = 1 WHERE school_id IS NULL;
UPDATE leave_requests SET school_id = 1 WHERE school_id IS NULL;
UPDATE homework SET school_id = 1 WHERE school_id IS NULL;
UPDATE lesson_plans SET school_id = 1 WHERE school_id IS NULL;
UPDATE teacher_batches SET school_id = 1 WHERE school_id IS NULL;
UPDATE student_guardians SET school_id = 1 WHERE school_id IS NULL;
UPDATE student_fee_items SET school_id = 1 WHERE school_id IS NULL;
UPDATE student_documents SET school_id = 1 WHERE school_id IS NULL;
UPDATE payroll_runs SET school_id = 1 WHERE school_id IS NULL;
UPDATE queries SET school_id = 1 WHERE school_id IS NULL;
-- Every existing user becomes School #1 staff EXCEPT the seeded superadmin,
-- who becomes the platform Owner (school_id stays NULL).
UPDATE users SET school_id = 1 WHERE school_id IS NULL AND role != 'superadmin';

-- These three UNIQUE constraints were written back when there was only ever
-- one school; unscoped, they'd wrongly stop two different schools from both
-- having a course called "JEE-MAIN", a "Default Fee" category, or a
-- 'fee_reminder' SMS template key. Re-scope them to (school_id, <col>).
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_name_key;
ALTER TABLE courses ADD CONSTRAINT courses_school_name_key UNIQUE (school_id, name);
ALTER TABLE fee_categories DROP CONSTRAINT IF EXISTS fee_categories_name_key;
ALTER TABLE fee_categories ADD CONSTRAINT fee_categories_school_name_key UNIQUE (school_id, name);
ALTER TABLE sms_templates DROP CONSTRAINT IF EXISTS sms_templates_key_key;
ALTER TABLE sms_templates ADD CONSTRAINT sms_templates_school_key_key UNIQUE (school_id, key);
-- role_permissions' constraint has the same problem (two schools couldn't
-- both have a 'teacher'/'attendance' row) — re-scope the same way.
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_module_key_key;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_school_role_module_key UNIQUE (school_id, role, module_key);

-- ============================================================
-- Subjects master list, staff type/login, and course-based exams.
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  school_id INTEGER REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, name)
);

-- Distinguishes teaching staff from non-teaching administrators. An
-- Administrator-type staff member gets their own login (role='staff_admin')
-- scoped to marking staff attendance only — see /api/staff and the
-- staff_admin role in lib/auth.ts.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_type TEXT NOT NULL DEFAULT 'Instructor';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;

-- Exams used to require a batch. Students can now enrol via a course
-- instead of a batch (see students.course), so an exam must be able to
-- target either one. At least one of batch_id/course is enforced in the
-- API layer (app/api/exams/route.ts), not here, since a plain CHECK can't
-- easily express "at least one of two nullable columns" alongside the
-- existing NOT NULL default for pre-existing rows.
ALTER TABLE exams ALTER COLUMN batch_id DROP NOT NULL;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS course TEXT;
