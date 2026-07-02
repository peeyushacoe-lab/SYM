// One-off demo data seeder for client demos.
// Run with: node scripts/seed-demo.js
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'sym.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function mobile() {
  return '9' + String(randInt(100000000, 999999999));
}

const FIRST_NAMES_M = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Karan', 'Yash', 'Aryan', 'Dev', 'Rahul', 'Amit', 'Suresh', 'Vikram', 'Nikhil', 'Manish'];
const FIRST_NAMES_F = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Priya', 'Neha', 'Pooja', 'Riya', 'Sneha', 'Kavya', 'Isha', 'Anjali', 'Divya', 'Shreya', 'Nisha', 'Meera', 'Simran', 'Tanvi'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Yadav', 'Mishra', 'Pandey', 'Tiwari', 'Chauhan', 'Rathore', 'Joshi', 'Agarwal', 'Saxena', 'Rawat', 'Bisht', 'Negi', 'Thakur', 'Malhotra', 'Kapoor'];

function fullName(male) {
  const first = rand(male ? FIRST_NAMES_M : FIRST_NAMES_F);
  return `${first} ${rand(LAST_NAMES)}`;
}

const now = new Date().toISOString();

console.log('Clearing existing demo data...');
db.exec(`
  DELETE FROM payments;
  DELETE FROM attendance;
  DELETE FROM student_guardians;
  DELETE FROM teacher_batches;
  DELETE FROM notices;
  DELETE FROM fees;
  DELETE FROM expenses;
  DELETE FROM enquiries;
  DELETE FROM students;
  DELETE FROM staff;
  DELETE FROM batches;
  DELETE FROM courses;
  DELETE FROM users WHERE username != 'admin';
`);

// --- Courses ---
const courses = [
  { name: 'NEET', fee: 85000, duration: '1 year' },
  { name: 'NEET PG', fee: 65000, duration: '6 months' },
  { name: 'JEE-MAIN', fee: 75000, duration: '1 year' },
  { name: 'JEE ADVANCE', fee: 95000, duration: '1 year' },
  { name: 'RAILWAY', fee: 15000, duration: '4 months' },
  { name: 'BPSC', fee: 22000, duration: '6 months' },
  { name: 'UPSC', fee: 48000, duration: '1 year' },
  { name: 'SSC', fee: 16000, duration: '4 months' },
  { name: 'NDA', fee: 20000, duration: '6 months' },
  { name: 'CBSE 1-12', fee: 25000, duration: '1 year' },
];
const insCourse = db.prepare('INSERT INTO courses (name, fee, duration, remarks) VALUES (?, ?, ?, ?)');
for (const c of courses) insCourse.run(c.name, c.fee, c.duration, null);
console.log(`Seeded ${courses.length} courses`);

// --- Batches ---
const batches = [
  { name: 'NEET Morning', course: 'NEET', timing: '06:00 AM - 09:00 AM', capacity: 40 },
  { name: 'NEET Evening', course: 'NEET', timing: '04:00 PM - 07:00 PM', capacity: 40 },
  { name: 'NEET PG Batch A', course: 'NEET PG', timing: '07:00 PM - 09:00 PM', capacity: 25 },
  { name: 'JEE-MAIN Morning', course: 'JEE-MAIN', timing: '06:00 AM - 09:00 AM', capacity: 40 },
  { name: 'JEE-MAIN Evening', course: 'JEE-MAIN', timing: '04:00 PM - 07:00 PM', capacity: 40 },
  { name: 'JEE ADVANCE Batch A', course: 'JEE ADVANCE', timing: '09:00 AM - 12:00 PM', capacity: 30 },
  { name: 'RAILWAY Batch A', course: 'RAILWAY', timing: '02:00 PM - 04:00 PM', capacity: 35 },
  { name: 'BPSC Batch A', course: 'BPSC', timing: '10:00 AM - 12:00 PM', capacity: 30 },
  { name: 'UPSC Batch A', course: 'UPSC', timing: '05:00 PM - 08:00 PM', capacity: 25 },
  { name: 'SSC Batch A', course: 'SSC', timing: '12:00 PM - 02:00 PM', capacity: 35 },
  { name: 'NDA Batch A', course: 'NDA', timing: '03:00 PM - 05:00 PM', capacity: 25 },
  { name: 'CBSE 1-12 Batch A', course: 'CBSE 1-12', timing: '08:00 AM - 10:00 AM', capacity: 30 },
];
const insBatch = db.prepare(
  'INSERT INTO batches (name, course, start_date, end_date, timing, capacity, remarks) VALUES (@name, @course, @start_date, @end_date, @timing, @capacity, @remarks)'
);
const batchIds = [];
for (const b of batches) {
  const info = insBatch.run({
    name: b.name,
    course: b.course,
    start_date: daysAgo(randInt(60, 150)),
    end_date: null,
    timing: b.timing,
    capacity: b.capacity,
    remarks: null,
  });
  batchIds.push({ id: info.lastInsertRowid, ...b });
}
console.log(`Seeded ${batches.length} batches`);

// --- Staff (incl. Centre Incharge) ---
const staffList = [
  { name: 'Manish Singh', mobile: mobile(), designation: 'Centre Incharge', salary: 45000, joining_date: daysAgo(400) },
  { name: fullName(true), mobile: mobile(), designation: 'NEET Biology Faculty', salary: 35000, joining_date: daysAgo(300) },
  { name: fullName(true), mobile: mobile(), designation: 'JEE Physics Faculty', salary: 38000, joining_date: daysAgo(280) },
  { name: fullName(false), mobile: mobile(), designation: 'JEE/NEET Chemistry Faculty', salary: 35000, joining_date: daysAgo(260) },
  { name: fullName(true), mobile: mobile(), designation: 'Mathematics Faculty', salary: 32000, joining_date: daysAgo(220) },
  { name: fullName(false), mobile: mobile(), designation: 'UPSC/BPSC GS Faculty', salary: 30000, joining_date: daysAgo(200) },
  { name: fullName(true), mobile: mobile(), designation: 'SSC/Railway Faculty', salary: 26000, joining_date: daysAgo(180) },
  { name: fullName(true), mobile: mobile(), designation: 'Accountant', salary: 22000, joining_date: daysAgo(350) },
  { name: fullName(false), mobile: mobile(), designation: 'Front Desk Executive', salary: 15000, joining_date: daysAgo(150) },
  { name: fullName(false), mobile: mobile(), designation: 'Counselor', salary: 18000, joining_date: daysAgo(120) },
];
const insStaff = db.prepare(
  'INSERT INTO staff (name, mobile, designation, salary, joining_date, address, remarks, user_id) VALUES (@name, @mobile, @designation, @salary, @joining_date, @address, @remarks, @user_id)'
);
for (const s of staffList) {
  insStaff.run({ ...s, address: 'Dehradun, Uttarakhand', remarks: null, user_id: null });
}
console.log(`Seeded ${staffList.length} staff (incl. Centre Incharge Manish Singh)`);

// --- Demo login users (teacher / guardian / student) ---
const insUser = db.prepare(
  'INSERT INTO users (username, password, role, name, mobile, email) VALUES (?, ?, ?, ?, ?, ?)'
);
const teacherHash = bcrypt.hashSync('teacher123', 10);
const guardianHash = bcrypt.hashSync('guardian123', 10);
const studentHash = bcrypt.hashSync('student123', 10);

const teacherUser1 = insUser.run('teacher1', teacherHash, 'teacher', 'Rohit Kumar', mobile(), 'teacher1@shikshayogi.demo');
const teacherUser2 = insUser.run('teacher2', teacherHash, 'teacher', 'Priya Sharma', mobile(), 'teacher2@shikshayogi.demo');
const guardianUser = insUser.run('guardian1', guardianHash, 'guardian', 'Ramesh Chandra', mobile(), 'guardian1@shikshayogi.demo');

// --- Students ---
const insStudent = db.prepare(`
  INSERT INTO students (name, father_name, mother_name, mobile, alt_mobile, address, dob, gender,
    qualification, course, batch_id, admission_date, roll_number, registration_number, aadhaar, photo, email, remarks, user_id)
  VALUES (@name, @father_name, @mother_name, @mobile, @alt_mobile, @address, @dob, @gender,
    @qualification, @course, @batch_id, @admission_date, @roll_number, @registration_number, @aadhaar, @photo, @email, @remarks, @user_id)
`);

const QUALIFICATIONS = ['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Diploma'];
const studentIds = [];
let rollCounter = 1;
const totalStudents = 48;
let demoStudentUserId = null;

for (let i = 0; i < totalStudents; i++) {
  const male = Math.random() > 0.5;
  const name = fullName(male);
  const batch = rand(batchIds);
  const admissionDaysAgo = randInt(5, 180);
  const rollNumber = `SYM/${new Date().getFullYear()}/${String(rollCounter).padStart(3, '0')}`;
  rollCounter++;

  let userId = null;
  if (i === 0) {
    // Wire the very first student to a demo student login + the guardian above
    const su = insUser.run('student1', studentHash, 'student', name, mobile(), 'student1@shikshayogi.demo');
    userId = su.lastInsertRowid;
    demoStudentUserId = userId;
  }

  const info = insStudent.run({
    name,
    father_name: fullName(true),
    mother_name: fullName(false),
    mobile: mobile(),
    alt_mobile: Math.random() > 0.5 ? mobile() : null,
    address: rand(['Dehradun, Uttarakhand', 'Rishikesh, Uttarakhand', 'Haridwar, Uttarakhand', 'Roorkee, Uttarakhand']),
    dob: `${randInt(1998, 2008)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    gender: male ? 'Male' : 'Female',
    qualification: rand(QUALIFICATIONS),
    course: batch.course,
    batch_id: batch.id,
    admission_date: daysAgo(admissionDaysAgo),
    roll_number: rollNumber,
    registration_number: `REG-${new Date().getFullYear()}-${String(rollCounter).padStart(4, '0')}`,
    aadhaar: null,
    photo: null,
    email: null,
    remarks: null,
    user_id: userId,
  });
  studentIds.push({ id: info.lastInsertRowid, name, batchId: batch.id, course: batch.course, admissionDaysAgo });
}
console.log(`Seeded ${totalStudents} students`);

// Link guardian to the demo student
if (demoStudentUserId) {
  db.prepare('INSERT INTO student_guardians (student_id, guardian_user_id) VALUES (?, ?)').run(
    studentIds[0].id,
    guardianUser.lastInsertRowid
  );
}

// Link teachers to batches
db.prepare('INSERT INTO teacher_batches (teacher_user_id, batch_id) VALUES (?, ?)').run(
  teacherUser1.lastInsertRowid,
  batchIds[0].id
);
db.prepare('INSERT INTO teacher_batches (teacher_user_id, batch_id) VALUES (?, ?)').run(
  teacherUser1.lastInsertRowid,
  batchIds[1].id
);
db.prepare('INSERT INTO teacher_batches (teacher_user_id, batch_id) VALUES (?, ?)').run(
  teacherUser2.lastInsertRowid,
  batchIds[2].id
);
console.log('Linked demo teacher/guardian/student accounts');

// --- Fees ---
const insFee = db.prepare(`
  INSERT INTO fees (student_id, course_fee, amount_paid, remaining_due, payment_date, payment_mode, receipt_number, due_date, remarks)
  VALUES (@student_id, @course_fee, @amount_paid, @remaining_due, @payment_date, @payment_mode, @receipt_number, @due_date, @remarks)
`);
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'];
const courseFeeMap = Object.fromEntries(courses.map((c) => [c.name, c.fee]));
let receiptCounter = 1;

for (const s of studentIds) {
  const totalFee = courseFeeMap[s.course] || 15000;
  const fullyPaid = Math.random() > 0.4;
  const amountPaid = fullyPaid ? totalFee : Math.round((totalFee * randInt(30, 80)) / 100 / 100) * 100;
  const remaining = totalFee - amountPaid;
  const paymentDaysAgo = Math.max(0, s.admissionDaysAgo - randInt(0, 5));

  insFee.run({
    student_id: s.id,
    course_fee: totalFee,
    amount_paid: amountPaid,
    remaining_due: remaining,
    payment_date: daysAgo(paymentDaysAgo),
    payment_mode: rand(PAYMENT_MODES),
    receipt_number: `RCPT-${new Date().getFullYear()}-${String(receiptCounter).padStart(4, '0')}`,
    due_date: remaining > 0 ? daysAgo(-randInt(5, 30)) : null,
    remarks: null,
  });
  receiptCounter++;

  // Second installment for some fully-paid-in-installments students
  if (!fullyPaid && Math.random() > 0.5) {
    const second = Math.round(((remaining * randInt(40, 100)) / 100) / 100) * 100;
    insFee.run({
      student_id: s.id,
      course_fee: totalFee,
      amount_paid: amountPaid + second,
      remaining_due: totalFee - (amountPaid + second),
      payment_date: daysAgo(Math.max(0, paymentDaysAgo - randInt(15, 45))),
      payment_mode: rand(PAYMENT_MODES),
      receipt_number: `RCPT-${new Date().getFullYear()}-${String(receiptCounter).padStart(4, '0')}`,
      due_date: totalFee - (amountPaid + second) > 0 ? daysAgo(-randInt(5, 30)) : null,
      remarks: 'Installment 2',
    });
    receiptCounter++;
  }
}
console.log(`Seeded fee records for ${studentIds.length} students`);

// --- Enquiries ---
const ENQUIRY_STATUSES = ['Pending', 'Interested', 'Joined', 'Not Interested', 'Lost'];
const insEnquiry = db.prepare(`
  INSERT INTO enquiries (student_name, mobile, course_interested, qualification, address, enquiry_date, follow_up_date, status, remarks, converted)
  VALUES (@student_name, @mobile, @course_interested, @qualification, @address, @enquiry_date, @follow_up_date, @status, @remarks, @converted)
`);
for (let i = 0; i < 18; i++) {
  const male = Math.random() > 0.5;
  const status = rand(ENQUIRY_STATUSES);
  const enquiryDaysAgo = randInt(1, 90);
  insEnquiry.run({
    student_name: fullName(male),
    mobile: mobile(),
    course_interested: rand(courses).name,
    qualification: rand(QUALIFICATIONS),
    address: rand(['Dehradun, Uttarakhand', 'Rishikesh, Uttarakhand', 'Haridwar, Uttarakhand']),
    enquiry_date: daysAgo(enquiryDaysAgo),
    follow_up_date: daysAgo(Math.max(0, enquiryDaysAgo - randInt(3, 10))),
    status,
    remarks: null,
    converted: status === 'Joined' ? 1 : 0,
  });
}
console.log('Seeded 18 enquiries');

// --- Expenses ---
const EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Marketing', 'Utilities', 'Maintenance', 'Stationery', 'Internet', 'Miscellaneous'];
const insExpense = db.prepare(
  'INSERT INTO expenses (expense_date, category, description, amount, payment_mode, remarks) VALUES (@expense_date, @category, @description, @amount, @payment_mode, @remarks)'
);
const EXPENSE_AMOUNTS = { Rent: 25000, Salaries: 150000, Marketing: 8000, Utilities: 4500, Maintenance: 3000, Stationery: 1500, Internet: 1999, Miscellaneous: 2500 };
for (let m = 0; m < 5; m++) {
  for (const cat of EXPENSE_CATEGORIES) {
    if (cat === 'Miscellaneous' && Math.random() > 0.5) continue;
    insExpense.run({
      expense_date: daysAgo(m * 30 + randInt(1, 10)),
      category: cat,
      description: `${cat} - month ${5 - m}`,
      amount: EXPENSE_AMOUNTS[cat] + randInt(-500, 500),
      payment_mode: rand(PAYMENT_MODES),
      remarks: null,
    });
  }
}
console.log('Seeded ~35 expense records across 5 months');

// --- Notices ---
const insNotice = db.prepare('INSERT INTO notices (title, body, audience, batch_id, created_by) VALUES (?, ?, ?, ?, ?)');
insNotice.run('Independence Day Holiday', 'The institute will remain closed on 15th August for Independence Day.', 'All', null, null);
insNotice.run('Fee Submission Reminder', 'Students with pending dues are requested to clear fees before the 10th of this month.', 'All', null, null);
insNotice.run('New Batch Starting', 'A new Web Development batch is starting next month. Refer your friends!', 'All', null, null);
insNotice.run('Assignment Submission', 'Please submit your pending assignments to your trainer by this Friday.', 'Batch', batchIds[0].id, null);
insNotice.run('Parent-Teacher Meet', 'A parent-teacher meet is scheduled for this Saturday at 11 AM.', 'All', null, null);
console.log('Seeded 5 notices');

// --- Attendance (last 10 weekdays for first 2 batches) ---
const insAttendance = db.prepare(
  'INSERT OR IGNORE INTO attendance (batch_id, student_id, date, status, marked_by) VALUES (@batch_id, @student_id, @date, @status, @marked_by)'
);
const ATT_STATUSES = ['Present', 'Present', 'Present', 'Present', 'Absent', 'Leave'];
for (const batch of batchIds.slice(0, 2)) {
  const batchStudents = studentIds.filter((s) => s.batchId === batch.id);
  let dayOffset = 0;
  let daysMarked = 0;
  while (daysMarked < 10 && dayOffset < 20) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    dayOffset++;
    if (d.getDay() === 0) continue; // skip Sundays
    const dateStr = d.toISOString().slice(0, 10);
    for (const s of batchStudents) {
      insAttendance.run({ batch_id: batch.id, student_id: s.id, date: dateStr, status: rand(ATT_STATUSES), marked_by: null });
    }
    daysMarked++;
  }
}
console.log('Seeded attendance for 2 batches over last ~10 working days');

console.log('\nDemo data seeding complete.');
console.log('Demo logins: admin/admin123 (management), teacher1/teacher123, guardian1/guardian123, student1/student123');
