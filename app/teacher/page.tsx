'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TeacherHome() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/teacher/overview')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-sm text-textSecondary">Loading...</div>;

  const { batches, studentCount, pendingLeaves, todaySlots, recentExams } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/teacher/batches" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">My batches</div>
          <div className="text-xl font-semibold text-text mt-1">{batches.length}</div>
        </Link>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Students</div>
          <div className="text-xl font-semibold text-text mt-1">{studentCount}</div>
        </div>
        <Link href="/teacher/timetable" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Today&apos;s classes</div>
          <div className="text-xl font-semibold text-text mt-1">{todaySlots.length}</div>
        </Link>
        <Link href="/teacher/requests" className="card !py-3 hover:border-tertiary transition block">
          <div className="text-[11px] uppercase text-textSecondary">Pending leaves</div>
          <div className={`text-xl font-semibold mt-1 ${pendingLeaves > 0 ? 'text-warning' : 'text-text'}`}>
            {pendingLeaves}
          </div>
        </Link>
      </div>

      {todaySlots.length > 0 && (
        <div className="card p-0">
          <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Today&apos;s schedule</div>
          <div className="divide-y divide-borderLight">
            {todaySlots.map((s: any) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text">{s.subject}</div>
                  <div className="text-xs text-textSecondary">{s.batch_name}</div>
                </div>
                <div className="text-sm text-textSecondary">
                  {s.start_time}
                  {s.end_time ? ` - ${s.end_time}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[13px] font-semibold text-text mb-2">My batches</div>
        {batches.length === 0 ? (
          <div className="card text-sm text-textSecondary">No batches have been assigned to you yet. Contact management.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {batches.map((b: any) => (
              <Link key={b.id} href={`/teacher/batches/${b.id}`} className="card hover:border-tertiary transition block">
                <div className="text-sm font-semibold text-text">{b.name}</div>
                <div className="text-xs text-textSecondary mt-1">{b.course || 'No course set'}</div>
                <div className="flex items-center justify-between mt-3 text-xs text-textSecondary">
                  <span>{b.timing || 'Timing not set'}</span>
                  <span className="badge badge-blue">{b.student_count} students</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {recentExams.length > 0 && (
        <div className="card p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-[13px] font-semibold text-text">Recent exams</div>
            <Link href="/teacher/exams" className="text-xs text-tertiary font-medium">
              Manage exams
            </Link>
          </div>
          <div className="divide-y divide-borderLight">
            {recentExams.map((e: any) => (
              <Link
                key={e.id}
                href={`/teacher/exams/${e.id}`}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-white/50 transition"
              >
                <div>
                  <div className="text-sm font-medium text-text">{e.name}</div>
                  <div className="text-xs text-textSecondary">
                    {e.batch_name} · {e.exam_date || 'No date'}
                  </div>
                </div>
                <span className={`badge ${e.marks_entered >= e.student_count ? 'badge-green' : 'badge-amber'}`}>
                  {e.marks_entered}/{e.student_count} marked
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
