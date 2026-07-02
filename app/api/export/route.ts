import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

function sheetResponse(rows: Record<string, any>[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No records' }]);
  // Enable filter dropdowns on the header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  // Reasonable column widths
  const keys = rows.length ? Object.keys(rows[0]) : ['Note'];
  ws['!cols'] = keys.map((k) => ({
    wch: Math.min(40, Math.max(k.length + 2, ...rows.slice(0, 100).map((r) => String(r[k] ?? '').length + 2))),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;

  const type = req.nextUrl.searchParams.get('type') || '';
  const month = req.nextUrl.searchParams.get('month') || '';
  const batchId = req.nextUrl.searchParams.get('batch_id') || '';
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  switch (type) {
    case 'students': {
      const rows = (db
        .prepare(
          `SELECT s.name, s.father_name, s.mother_name, s.mobile, s.alt_mobile, s.address, s.dob, s.gender,
             s.qualification, s.course, b.name as batch, s.admission_date, s.roll_number, s.registration_number,
             s.aadhaar, s.email, s.remarks
           FROM students s LEFT JOIN batches b ON s.batch_id = b.id ORDER BY s.name`
        )
        .all() as Record<string, any>[]).map((r) => ({
        Name: r.name, "Father's Name": r.father_name, "Mother's Name": r.mother_name, Mobile: r.mobile,
        'Alt Mobile': r.alt_mobile, Address: r.address, 'Date of Birth': r.dob, Gender: r.gender,
        Qualification: r.qualification, Course: r.course, Batch: r.batch, 'Admission Date': r.admission_date,
        'Roll No': r.roll_number, 'Registration No': r.registration_number, Aadhaar: r.aadhaar,
        Email: r.email, Remarks: r.remarks,
      }));
      return sheetResponse(rows, 'Students', `student-list-${today}`);
    }
    case 'batch-students': {
      if (!batchId) return NextResponse.json({ error: 'batch_id required' }, { status: 400 });
      const batch = db.prepare('SELECT name FROM batches WHERE id = ?').get(batchId) as any;
      const rows = (db
        .prepare(
          `SELECT s.name, s.mobile, s.roll_number, s.course, s.admission_date
           FROM students s WHERE s.batch_id = ? ORDER BY s.name`
        )
        .all(batchId) as Record<string, any>[]).map((r) => ({
        Name: r.name, Mobile: r.mobile, 'Roll No': r.roll_number, Course: r.course, 'Admission Date': r.admission_date,
      }));
      return sheetResponse(rows, batch?.name || 'Batch', `batch-students-${today}`);
    }
    case 'enquiries': {
      const rows = (db.prepare('SELECT * FROM enquiries ORDER BY enquiry_date DESC').all() as Record<string, any>[]).map((r) => ({
        Name: r.student_name, Mobile: r.mobile, 'Course Interested': r.course_interested,
        Qualification: r.qualification, Address: r.address, 'Enquiry Date': r.enquiry_date,
        'Follow-up Date': r.follow_up_date, Status: r.status, Remarks: r.remarks,
      }));
      return sheetResponse(rows, 'Enquiries', `enquiry-list-${today}`);
    }
    case 'expenses': {
      let q = 'SELECT * FROM expenses WHERE 1=1';
      const p: any[] = [];
      if (month) { q += ' AND expense_date LIKE ?'; p.push(`${month}%`); }
      q += ' ORDER BY expense_date DESC';
      const rows = (db.prepare(q).all(...p) as Record<string, any>[]).map((r) => ({
        Date: r.expense_date, Category: r.category, Description: r.description,
        Amount: r.amount, 'Payment Mode': r.payment_mode, Remarks: r.remarks,
      }));
      return sheetResponse(rows, 'Expenses', `expense-list-${month || today}`);
    }
    case 'due-fees': {
      const rows = (db
        .prepare(
          `SELECT s.name, s.mobile, b.name as batch, f.course_fee, f.amount_paid, f.remaining_due, f.due_date
           FROM fees f LEFT JOIN students s ON f.student_id = s.id LEFT JOIN batches b ON s.batch_id = b.id
           WHERE f.remaining_due > 0 ORDER BY f.remaining_due DESC`
        )
        .all() as Record<string, any>[]).map((r) => ({
        Student: r.name, Mobile: r.mobile, Batch: r.batch, 'Total Fee': r.course_fee,
        'Paid Amount': r.amount_paid, 'Remaining Due': r.remaining_due, 'Due Date': r.due_date,
      }));
      return sheetResponse(rows, 'Due Fees', `due-fee-list-${today}`);
    }
    case 'fees': {
      let q = `SELECT f.*, s.name as student_name, s.mobile, b.name as batch_name
        FROM fees f LEFT JOIN students s ON f.student_id = s.id LEFT JOIN batches b ON s.batch_id = b.id WHERE 1=1`;
      const p: any[] = [];
      if (month) { q += ' AND f.payment_date LIKE ?'; p.push(`${month}%`); }
      q += ' ORDER BY f.payment_date DESC';
      const rows = (db.prepare(q).all(...p) as Record<string, any>[]).map((r) => ({
        Student: r.student_name, Mobile: r.mobile, Batch: r.batch_name, 'Course Fee': r.course_fee,
        'Amount Paid': r.amount_paid, 'Remaining Due': r.remaining_due, 'Payment Date': r.payment_date,
        'Payment Mode': r.payment_mode, 'Receipt No': r.receipt_number, 'Due Date': r.due_date, Remarks: r.remarks,
      }));
      return sheetResponse(rows, 'Fee Collection', `fee-collection-${month || today}`);
    }
    case 'staff': {
      const rows = (db.prepare('SELECT * FROM staff ORDER BY name').all() as Record<string, any>[]).map((r) => ({
        Name: r.name, Mobile: r.mobile, Designation: r.designation, Salary: r.salary,
        'Joining Date': r.joining_date, Address: r.address, Remarks: r.remarks,
      }));
      return sheetResponse(rows, 'Staff', `staff-list-${today}`);
    }
    case 'monthly': {
      const income = db
        .prepare(
          `SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as total
           FROM fees WHERE payment_date IS NOT NULL GROUP BY month ORDER BY month DESC`
        )
        .all() as Record<string, any>[];
      const expense = db
        .prepare(
          `SELECT strftime('%Y-%m', expense_date) as month, SUM(amount) as total
           FROM expenses WHERE expense_date IS NOT NULL GROUP BY month ORDER BY month DESC`
        )
        .all() as Record<string, any>[];
      const months = Array.from(new Set([...income.map((r) => r.month), ...expense.map((r) => r.month)])).sort().reverse();
      const rows = months.map((m) => {
        const inc = income.find((r) => r.month === m)?.total || 0;
        const exp = expense.find((r) => r.month === m)?.total || 0;
        return { Month: m, Income: inc, Expense: exp, Net: inc - exp };
      });
      return sheetResponse(rows, 'Monthly Summary', `monthly-summary-${today}`);
    }
    default:
      return NextResponse.json({ error: 'Unknown export type.' }, { status: 400 });
  }
}
