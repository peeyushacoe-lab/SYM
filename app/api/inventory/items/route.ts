import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM inventory_items ORDER BY name ASC').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Item name is required.' }, { status: 400 });
  const db = getDb();
  const qty = Number(data.quantity) || 0;
  const result = await db
    .prepare(
      `INSERT INTO inventory_items (name, category, quantity, unit, unit_cost, reorder_level, location, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.category || null,
      qty,
      data.unit || 'pcs',
      Number(data.unit_cost) || 0,
      Number(data.reorder_level) || 0,
      data.location || null,
      data.remarks || null
    );

  if (qty > 0) {
    await db
      .prepare(`INSERT INTO inventory_transactions (item_id, type, quantity, reason, txn_date) VALUES (?, 'In', ?, 'Initial stock', ?)`)
      .run(result.lastInsertRowid, qty, new Date().toISOString().slice(0, 10));
  }

  return NextResponse.json({ id: result.lastInsertRowid });
}
