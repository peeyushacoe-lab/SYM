import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db
    .prepare(
      `SELECT t.*, i.name as item_name, i.unit
       FROM inventory_transactions t
       JOIN inventory_items i ON t.item_id = i.id
       ORDER BY t.txn_date DESC, t.id DESC
       LIMIT 100`
    )
    .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.item_id || !data.type || !data.quantity) {
    return NextResponse.json({ error: 'item_id, type and quantity are required.' }, { status: 400 });
  }
  if (!['In', 'Out'].includes(data.type)) {
    return NextResponse.json({ error: "type must be 'In' or 'Out'." }, { status: 400 });
  }
  const qty = Math.abs(Number(data.quantity));
  const db = getDb();

  const item = (await db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(data.item_id)) as any;
  if (!item) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

  if (data.type === 'Out' && item.quantity < qty) {
    return NextResponse.json({ error: `Only ${item.quantity} ${item.unit} in stock.` }, { status: 400 });
  }

  const newQty = data.type === 'In' ? item.quantity + qty : item.quantity - qty;
  await db.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?').run(newQty, data.item_id);

  const result = await db
    .prepare(`INSERT INTO inventory_transactions (item_id, type, quantity, reason, txn_date, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(data.item_id, data.type, qty, data.reason || null, data.txn_date || new Date().toISOString().slice(0, 10), auth.session.id);

  return NextResponse.json({ id: result.lastInsertRowid, newQty });
}
