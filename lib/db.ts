import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Vercel's function filesystem is read-only outside of /tmp. The repo ships a
// pre-seeded sym.db as a read-only source; on serverless we copy it into /tmp
// once per instance so better-sqlite3 can open it read-write. Note this means
// writes only persist for the lifetime of that warm instance, not across
// deploys/cold starts - fine for demos, not a substitute for a real database.
const SOURCE_DB_PATH = path.join(process.cwd(), 'sym.db');
const DB_PATH = process.env.VERCEL ? path.join('/tmp', 'sym.db') : SOURCE_DB_PATH;

declare global {
  // eslint-disable-next-line no-var
  var __symDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global.__symDb) {
    if (process.env.VERCEL && !fs.existsSync(DB_PATH)) {
      fs.copyFileSync(SOURCE_DB_PATH, DB_PATH);
    }
    global.__symDb = new Database(DB_PATH);
    global.__symDb.pragma('journal_mode = WAL');
    global.__symDb.pragma('foreign_keys = ON');
    initSchema(global.__symDb);
  }
  return global.__symDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'management',
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course TEXT,
      start_date TEXT,
      end_date TEXT,
      timing TEXT,
      capacity INTEGER DEFAULT 30,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      batch_id INTEGER,
      admission_date TEXT,
      roll_number TEXT,
      registration_number TEXT,
      aadhaar TEXT,
      photo TEXT,
      email TEXT,
      remarks TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT,
      designation TEXT,
      salary REAL DEFAULT 0,
      joining_date TEXT,
      address TEXT,
      remarks TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_fee REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      remaining_due REAL DEFAULT 0,
      payment_date TEXT,
      payment_mode TEXT DEFAULT 'Cash',
      receipt_number TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_date TEXT NOT NULL,
      category TEXT,
      description TEXT,
      amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teacher_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_user_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      UNIQUE(teacher_user_id, batch_id),
      FOREIGN KEY (teacher_user_id) REFERENCES users(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS student_guardians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      guardian_user_id INTEGER NOT NULL,
      UNIQUE(student_id, guardian_user_id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (guardian_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      marked_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(batch_id, student_id, date),
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      audience TEXT NOT NULL DEFAULT 'All',
      batch_id INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_id INTEGER,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'Online',
      status TEXT DEFAULT 'success',
      transaction_ref TEXT,
      paid_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      fee REAL DEFAULT 0,
      duration TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: add due_date to fees if missing
  const feeCols = db.prepare("PRAGMA table_info(fees)").all() as { name: string }[];
  if (!feeCols.some((c) => c.name === 'due_date')) {
    db.exec('ALTER TABLE fees ADD COLUMN due_date TEXT');
  }

  const adminCheck = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminCheck) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      "INSERT INTO users (username, password, role, name) VALUES (?, ?, 'management', 'Administrator')"
    ).run('admin', hash);
  }
}

export default getDb;
