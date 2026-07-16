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
