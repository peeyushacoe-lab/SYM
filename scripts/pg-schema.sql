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
