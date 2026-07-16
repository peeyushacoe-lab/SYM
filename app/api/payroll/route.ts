import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const month = req.nextUrl.searchParams.get('month') || '';
  const db = getDb();
  const items = month
    ? await db
        .prepare(
          `SELECT p.*, s.name as staff_name, s.designation as staff_designation
           FROM payroll_runs p JOIN staff s ON s.id = p.staff_id
           WHERE p.month = ? ORDER BY s.name ASC`
        )
        .all(month)
    : await db
        .prepare(
          `SELECT p.*, s.name as staff_name, s.designation as staff_designation
           FROM payroll_runs p JOIN staff s ON s.id = p.staff_id
           ORDER BY p.month DESC, s.name ASC`
        )
        .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.staff_id) return NextResponse.json({ error: 'Staff is required.' }, { status: 400 });
  if (!data.month) return NextResponse.json({ error: 'Month is required.' }, { status: 400 });
  const db = getDb();

  const existing = await db
    .prepare('SELECT id FROM payroll_runs WHERE staff_id = ? AND month = ?')
    .get(data.staff_id, data.month);
  if (existing) {
    return NextResponse.json({ error: 'A payroll run already exists for this staff member and month.' }, { status: 400 });
  }

  const basic = Number(data.basic_salary) || 0;
  const allowances = Number(data.allowances) || 0;
  const deductions = Number(data.deductions) || 0;
  const net = basic + allowances - deductions;

  const result = await db
    .prepare(
      `INSERT INTO payroll_runs (staff_id, month, basic_salary, allowances, deductions, net_salary, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.staff_id, data.month, basic, allowances, deductions, net, data.remarks || null);

  return NextResponse.json({ id: result.lastInsertRowid });
}
