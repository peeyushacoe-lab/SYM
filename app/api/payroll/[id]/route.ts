import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  const run = (await db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(params.id)) as any;
  if (!run) return NextResponse.json({ error: 'Payroll run not found.' }, { status: 404 });

  if (data.status === 'Paid' && run.status !== 'Paid') {
    await db
      .prepare(`UPDATE payroll_runs SET status='Paid', payment_date=?, payment_mode=? WHERE id=?`)
      .run(data.payment_date || new Date().toISOString().slice(0, 10), data.payment_mode || 'Bank Transfer', params.id);
    return NextResponse.json({ ok: true });
  }

  const basic = Number(data.basic_salary) || 0;
  const allowances = Number(data.allowances) || 0;
  const deductions = Number(data.deductions) || 0;
  const net = basic + allowances - deductions;

  await db
    .prepare(
      `UPDATE payroll_runs SET basic_salary=?, allowances=?, deductions=?, net_salary=?, remarks=? WHERE id=?`
    )
    .run(basic, allowances, deductions, net, data.remarks || null, params.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const run = (await db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(params.id)) as any;
  if (!run) return NextResponse.json({ error: 'Payroll run not found.' }, { status: 404 });
  if (run.status === 'Paid') {
    return NextResponse.json({ error: 'Cannot delete a payroll run that has already been paid.' }, { status: 400 });
  }
  await db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
