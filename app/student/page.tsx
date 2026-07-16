'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import { gradeFor } from '@/components/portal/ResultsSection';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function StudentHome() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/portal/me?section=summary')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setNotices(d.items || []));
    fetch('/api/academic-events')
      .then((r) => r.json())
      .then((d) => setEvents((d.items || []).filter((e: any) => (e.end_date || e.start_date) >= new Date().toISOString().slice(0, 10))));
  }, []);

  if (error) return <div className="card text-sm text-textSecondary">{error}</div>;
  if (!data) return <div className="text-sm text-textSecondary">Loading...</div>;

  const { student, attendance, totalDue, latestResults, todaySlots } = data;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-lg font-semibold text-text">Welcome back, {student.name.split(' ')[0]}</div>
        <div className="text-sm text-textSecondary mt-1">
          {student.course} · {student.batch_name || 'No batch'} {student.timing ? `(${student.timing})` : ''} · Roll no. {student.roll_number || '-'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/student/attendance" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Attendance</div>
          <div className="text-xl font-semibold text-text mt-1">
            {attendance.pct !== null ? `${attendance.pct}%` : 'No data'}
          </div>
          <div className="text-xs text-textSecondary mt-0.5">{attendance.present} of {attendance.total} days present</div>
        </Link>
        <Link href="/student/fees" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Fee due</div>
          <div className={`text-xl font-semibold mt-1 ${totalDue > 0 ? 'text-danger' : 'text-accent'}`}>
            {formatCurrency(totalDue)}
          </div>
          <div className="text-xs text-textSecondary mt-0.5">{totalDue > 0 ? 'Tap to pay online' : 'All clear'}</div>
        </Link>
        <Link href="/student/results" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Latest result</div>
          {latestResults.length && latestResults[0].marks !== null ? (
            <>
              <div className="text-xl font-semibold text-text mt-1">
                {latestResults[0].marks}/{latestResults[0].max_marks || 100}
              </div>
              <div className="text-xs text-textSecondary mt-0.5 truncate">{latestResults[0].name}</div>
            </>
          ) : (
            <div className="text-sm text-textSecondary mt-2">No results yet</div>
          )}
        </Link>
        <Link href="/student/timetable" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Today&apos;s classes</div>
          <div className="text-xl font-semibold text-text mt-1">{todaySlots.length}</div>
          <div className="text-xs text-textSecondary mt-0.5 truncate">
            {todaySlots.length ? `Next: ${todaySlots[0].subject} at ${todaySlots[0].start_time}` : 'Nothing scheduled'}
          </div>
        </Link>
      </div>

      {latestResults.length > 0 && (
        <div className="card p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-[13px] font-semibold text-text">Recent results</div>
            <Link href="/student/results" className="text-xs text-tertiary font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-borderLight">
            {latestResults.map((r: any) => {
              const hasMarks = r.marks !== null && r.marks !== undefined;
              const pct = hasMarks ? Math.round((r.marks / (r.max_marks || 100)) * 100) : null;
              const g = pct !== null ? gradeFor(pct) : null;
              return (
                <div key={r.exam_id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-text">{r.name}</div>
                    <div className="text-xs text-textSecondary">{r.subject || 'General'} · {r.exam_date || '-'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text">{hasMarks ? `${r.marks}/${r.max_marks || 100}` : 'Awaited'}</span>
                    {g && <Badge tone={g.tone}>{g.grade}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-text mb-2">Upcoming events</div>
          <div className="space-y-2">
            {events.slice(0, 5).map((e) => (
              <div key={e.id} className="card flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text">{e.title}</div>
                  <div className="text-xs text-textSecondary mt-0.5">
                    {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ''}
                  </div>
                </div>
                <Badge tone="blue">{e.event_type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[13px] font-semibold text-text mb-2">Notices</div>
        {notices.length === 0 ? (
          <div className="card text-sm text-textSecondary">No notices yet.</div>
        ) : (
          <div className="space-y-2">
            {notices.slice(0, 5).map((n) => (
              <div key={n.id} className="card">
                <div className="text-sm font-medium text-text">{n.title}</div>
                {n.body && <div className="text-sm text-textSecondary mt-1">{n.body}</div>}
                <div className="text-[11px] text-textSecondary mt-1.5">{(n.created_at || '').slice(0, 10)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
