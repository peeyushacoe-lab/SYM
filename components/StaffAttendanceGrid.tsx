'use client';

import { useCallback, useEffect, useState } from 'react';

const STATUSES = ['Present', 'Absent', 'Leave', 'Holiday'];
const COLOR: Record<string, string> = {
  Present: 'bg-green-500 text-white',
  Absent: 'bg-red-500 text-white',
  Leave: 'bg-amber-500 text-white',
  Holiday: 'bg-blue-500 text-white',
};
const SHORT: Record<string, string> = { Present: 'P', Absent: 'A', Leave: 'L', Holiday: 'H' };

function monthDays(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function StaffAttendanceGrid() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [staff, setStaff] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/staff-attendance?month=${month}`);
    const data = await res.json();
    setStaff(data.staff || []);
    const map: Record<string, string> = {};
    (data.records || []).forEach((r: any) => (map[`${r.staff_id}|${r.date}`] = r.status));
    setRecords(map);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function cycle(staffId: number, date: string) {
    const key = `${staffId}|${date}`;
    const current = records[key];
    const idx = current ? STATUSES.indexOf(current) : -1;
    const next = idx + 1 >= STATUSES.length ? '' : STATUSES[idx + 1];
    setRecords((r) => {
      const copy = { ...r };
      if (next) copy[key] = next;
      else delete copy[key];
      return copy;
    });
    await fetch('/api/staff-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, date, status: next }),
    });
  }

  const days = monthDays(month);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">event_available</span>
          Staff Attendance
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            {STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] ${COLOR[s]}`}>{SHORT[s]}</span>
                {s}
              </span>
            ))}
          </div>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input !w-auto text-sm" />
        </div>
      </div>
      {loading ? (
        <div className="p-6 text-sm text-on-surface-variant">Loading attendance...</div>
      ) : staff.length === 0 ? (
        <div className="p-6 text-sm text-on-surface-variant">No staff yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface-container-low px-3 py-2 text-left text-[11px] font-medium text-on-surface-variant min-w-[140px]">
                  Staff
                </th>
                {Array.from({ length: days }, (_, i) => (
                  <th key={i} className="px-1 py-2 text-[10px] font-medium text-on-surface-variant text-center min-w-[26px]">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/20">
                  <td className="sticky left-0 bg-surface px-3 py-1.5 text-on-surface whitespace-nowrap">
                    {s.name}
                    {s.designation ? <span className="text-on-surface-variant"> · {s.designation}</span> : null}
                  </td>
                  {Array.from({ length: days }, (_, i) => {
                    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
                    const status = records[`${s.id}|${date}`];
                    return (
                      <td key={i} className="p-0.5 text-center">
                        <button
                          onClick={() => cycle(s.id, date)}
                          title={`${s.name} · ${date}${status ? ' · ' + status : ''}`}
                          className={`w-6 h-6 rounded-full text-[10px] font-semibold transition ${
                            status
                              ? COLOR[status]
                              : `border ${date === today ? 'border-primary' : 'border-outline-variant/50'} text-on-surface-variant hover:border-primary`
                          }`}
                        >
                          {status ? SHORT[status] : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 py-2 text-[11px] text-on-surface-variant border-t border-outline-variant/20">
        Click a circle to cycle: Present → Absent → Leave → Holiday → clear.
      </div>
    </div>
  );
}
