import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [pendingLeave, openQueries, followUps, recentNotices] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as c FROM leave_requests WHERE status = 'Pending'`).get() as Promise<any>,
    db.prepare(`SELECT COUNT(*) as c FROM queries WHERE status = 'Open'`).get() as Promise<any>,
    db
      .prepare(
        `SELECT COUNT(*) as c FROM enquiries
         WHERE follow_up_date IS NOT NULL AND follow_up_date <= ? AND status NOT IN ('Joined', 'Not Interested')`
      )
      .get(today) as Promise<any>,
    db.prepare(`SELECT COUNT(*) as c FROM notices WHERE created_at >= NOW() - INTERVAL '3 days'`).get() as Promise<any>,
  ]);

  const counts = {
    pendingLeave: Number(pendingLeave?.c || 0),
    openQueries: Number(openQueries?.c || 0),
    followUps: Number(followUps?.c || 0),
    recentNotices: Number(recentNotices?.c || 0),
  };
  const total = counts.pendingLeave + counts.openQueries + counts.followUps + counts.recentNotices;

  return NextResponse.json({ counts, total });
}
