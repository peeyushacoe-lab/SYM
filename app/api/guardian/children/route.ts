import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getTotalDue } from '@/lib/portal';

export async function GET() {
  const auth = await requireRole('guardian');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const children = (await db
    .prepare(
      `SELECT s.*, b.name as batch_name
       FROM student_guardians sg
       JOIN students s ON sg.student_id = s.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE sg.guardian_user_id = ?
       ORDER BY s.name`
    )
    .all(auth.session.id)) as any[];
  // due_amount used to be a plain SUM(fees.remaining_due), which misses any
  // structured fee item that has accrued dues but hasn't had a first payment
  // collected yet (see lib/portal.ts getFees/getTotalDue) — a guardian could
  // see "Fees clear" for a child who genuinely owes money.
  const items = await Promise.all(
    children.map(async (c) => ({ ...c, due_amount: await getTotalDue(c.id) }))
  );
  return NextResponse.json({ items });
}
