'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/Badge';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherBatchPage() {
  const params = useParams();
  const id = params.id as string;
  const [date, setDate] = useState(today());
  const [batch, setBatch] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  async function load() {
    setError('');
    const res = await fetch(`/api/teacher/batches/${id}?date=${date}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load batch.');
      return;
    }
    setBatch(data.batch);
    setStudents(data.students || []);
    const map: Record<number, string> = {};
    (data.students || []).forEach((s: any) => (map[s.id] = 'Present'));
    (data.attendance || []).forEach((a: any) => (map[a.student_id] = a.status));
    setStatusMap(map);
  }

  async function handleSaveAttendance() {
    setSaving(true);
    setSaved(false);
    const records = students.map((s) => ({ student_id: s.id, status: statusMap[s.id] || 'Present' }));
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: id, date, records }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (error) return <div className="card text-sm text-danger">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-medium text-text">{batch?.name || 'Loading...'}</h1>
          <p className="text-xs text-textSecondary mt-0.5">{batch?.course} - {batch?.timing}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={handleSaveAttendance} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save attendance'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2 mb-3">
          Attendance saved for {date}.
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Name</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Roll no.</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No students in this batch.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">{s.roll_number || '-'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      {['Present', 'Absent', 'Leave'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setStatusMap({ ...statusMap, [s.id]: opt })}
                          className={`text-xs px-2.5 py-1 rounded-md border transition ${
                            statusMap[s.id] === opt
                              ? opt === 'Present'
                                ? 'bg-accentLight text-accent border-accentBorder'
                                : opt === 'Absent'
                                ? 'bg-dangerLight text-danger border-dangerBorder'
                                : 'bg-warningLight text-warning border-warningBorder'
                              : 'bg-white text-textSecondary border-border'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
