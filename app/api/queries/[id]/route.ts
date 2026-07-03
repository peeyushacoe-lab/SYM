import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// Respond to / close a query (management only)
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const query = db.prepare('SELECT * FROM queries WHERE id = ?').get(params.id) as any;
  if (!query) return NextResponse.json({ error: 'Query not found.' }, { status: 404 });

  const data = await req.json();
  const status = data.status && ['Open', 'Answered', 'Closed'].includes(data.status) ? data.status : 'Answered';

  db.prepare(
    'UPDATE queries SET response = ?, status = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(data.response || query.response, status, auth.session.id, params.id);
  return NextResponse.json({ ok: true });
}
