import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const items = await getDb().prepare('SELECT * FROM fee_categories ORDER BY name').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const result = await getDb()
    .prepare(
      `INSERT INTO fee_categories (name, amount) VALUES (@name, @amount)
       ON CONFLICT(name) DO UPDATE SET amount = excluded.amount`
    )
    .run({ name: data.name, amount: Number(data.amount) || 0 });
  return NextResponse.json({ id: result.lastInsertRowid });
}
