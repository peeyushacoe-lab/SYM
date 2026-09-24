import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const items = await getDb().prepare('SELECT * FROM sms_templates WHERE school_id = ? ORDER BY key').all(auth.session.schoolId);
  return NextResponse.json({ items });
}

// POST { key, template } -> upsert
export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const { key, template } = await req.json();
  if (!key || !template) return NextResponse.json({ error: 'key and template are required.' }, { status: 400 });
  await getDb()
    .prepare(
      `INSERT INTO sms_templates (key, template, school_id) VALUES (@key, @template, @school_id)
       ON CONFLICT(school_id, key) DO UPDATE SET template = excluded.template`
    )
    .run({ key, template, school_id: auth.session.schoolId });
  return NextResponse.json({ ok: true });
}
