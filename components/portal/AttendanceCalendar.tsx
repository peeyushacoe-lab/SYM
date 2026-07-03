'use client';

import { useEffect, useState } from 'react';

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function statusStyle(status?: string) {
  if (status === 'Present') return 'bg-accentLight text-accent border-accentBorder';
  if (status === 'Absent') return 'bg-dangerLight text-danger border-dangerBorder';
  if (status) return 'bg-warningLight text-warning border-warningBorder';
  return 'bg-transparent text-textSecondary border-transparent';
}

export default function AttendanceCalendar({ studentKey }: { studentKey: string }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [days, setDays] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/${studentKey}?section=attendance&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        (d.days || []).forEach((a: any) => (map[a.date] = a.status));
        setDays(map);
        setSummary(d.summary || null);
        setLoading(false);
      });
  }, [studentKey, month]);

  const [year, monthNum] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first

  function shiftMonth(delta: number) {
    const d = new Date(year, monthNum - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthCounts = Object.values(days).reduce(
    (acc, s) => {
      if (s === 'Present') acc.present++;
      else if (s === 'Absent') acc.absent++;
      else acc.leave++;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card !py-3">
            <div className="text-[11px] uppercase text-textSecondary">Overall attendance</div>
            <div className="text-xl font-semibold text-text mt-1">{summary.pct !== null ? `${summary.pct}%` : '-'}</div>
          </div>
          <div className="card !py-3">
            <div className="text-[11px] uppercase text-textSecondary">Days present</div>
            <div className="text-xl font-semibold text-accent mt-1">{summary.present}</div>
          </div>
          <div className="card !py-3">
            <div className="text-[11px] uppercase text-textSecondary">Days absent</div>
            <div className="text-xl font-semibold text-danger mt-1">{summary.absent}</div>
          </div>
          <div className="card !py-3">
            <div className="text-[11px] uppercase text-textSecondary">Leave</div>
            <div className="text-xl font-semibold text-warning mt-1">{summary.leave}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftMonth(-1)} className="btn btn-outline !py-1 !px-2" aria-label="Previous month">
            <span className="material-symbols-outlined !text-[18px]">chevron_left</span>
          </button>
          <div className="text-sm font-semibold text-text">
            {MONTH_NAMES[monthNum - 1]} {year}
          </div>
          <button onClick={() => shiftMonth(1)} className="btn btn-outline !py-1 !px-2" aria-label="Next month">
            <span className="material-symbols-outlined !text-[18px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[11px] font-semibold text-textSecondary py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const dateStr = `${month}-${String(day).padStart(2, '0')}`;
            const status = days[dateStr];
            return (
              <div
                key={dateStr}
                title={status ? `${dateStr}: ${status}` : dateStr}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium border ${statusStyle(status)}`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-borderLight text-xs text-textSecondary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-accentLight border border-accentBorder inline-block" /> Present ({monthCounts.present})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-dangerLight border border-dangerBorder inline-block" /> Absent ({monthCounts.absent})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-warningLight border border-warningBorder inline-block" /> Leave ({monthCounts.leave})
          </span>
          {loading && <span>Loading...</span>}
        </div>
      </div>
    </div>
  );
}
