'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Tabs from '@/components/Tabs';
import ExamsPanel from '@/components/portal/ExamsPanel';
import TimetableGrid from '@/components/portal/TimetableGrid';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TABS = [
  { key: 'attendance', label: 'Attendance', icon: 'event_available' },
  { key: 'students', label: 'Students', icon: 'school' },
  { key: 'exams', label: 'Exams & marks', icon: 'grade' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar_month' },
];

export default function TeacherBatchPage() {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState('attendance');
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
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{batch?.name || 'Loading...'}</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          {batch?.course} · {batch?.timing}
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'attendance' && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <input type="date" className="input !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
            <button onClick={handleSaveAttendance} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save attendance'}
            </button>
          </div>

          {saved && (
            <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2">
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
      )}

      {tab === 'students' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Roll no.</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Name</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Mobile</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Course</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-textSecondary text-sm">
                    No students in this batch.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5">{s.roll_number || '-'}</td>
                    <td className="px-4 py-2.5 font-medium text-text">{s.name}</td>
                    <td className="px-4 py-2.5">{s.mobile || '-'}</td>
                    <td className="px-4 py-2.5">{s.course || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'exams' && <ExamsPanel detailBase="/teacher/exams" batchFilter={id} />}

      {tab === 'timetable' && <BatchTimetable batchId={id} />}
    </div>
  );
}

function BatchTimetable({ batchId }: { batchId: string }) {
  const [slots, setSlots] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`/api/timetable?batch_id=${batchId}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.items || []));
  }, [batchId]);

  if (!slots) return <div className="text-sm text-textSecondary">Loading...</div>;
  return <TimetableGrid slots={slots} />;
}
