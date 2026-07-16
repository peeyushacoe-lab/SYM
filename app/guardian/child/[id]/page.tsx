'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Tabs from '@/components/Tabs';
import ProfileCard from '@/components/portal/ProfileCard';
import AttendanceCalendar from '@/components/portal/AttendanceCalendar';
import FeesSection from '@/components/portal/FeesSection';
import ResultsSection from '@/components/portal/ResultsSection';
import TimetableGrid from '@/components/portal/TimetableGrid';
import RequestsSection from '@/components/portal/RequestsSection';
import HomeworkPanel from '@/components/portal/HomeworkPanel';

const TABS = [
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'attendance', label: 'Attendance', icon: 'event_available' },
  { key: 'fees', label: 'Fees', icon: 'account_balance_wallet' },
  { key: 'results', label: 'Results', icon: 'grade' },
  { key: 'homework', label: 'Homework', icon: 'assignment' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar_month' },
  { key: 'requests', label: 'Leave & queries', icon: 'forum' },
];

export default function ChildDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tab, setTab] = useState('profile');
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/portal/${id}?section=profile`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStudent(d.student);
      });
  }, [id]);

  if (error) return <div className="card text-sm text-danger">{error}</div>;
  if (!student) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">{student.name}</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          {student.course || 'No course'} · {student.batch_name || 'No batch'}
          {student.timing ? ` (${student.timing})` : ''}
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && <ProfileCard student={student} />}
      {tab === 'attendance' && <AttendanceCalendar studentKey={id} />}
      {tab === 'fees' && <FeesSection studentKey={id} />}
      {tab === 'results' && <ResultsSection studentKey={id} />}
      {tab === 'homework' && <HomeworkPanel batchFilter={student.batch_id} readOnly />}
      {tab === 'timetable' && <ChildTimetable id={id} />}
      {tab === 'requests' && <RequestsSection studentId={id} />}
    </div>
  );
}

function ChildTimetable({ id }: { id: string }) {
  const [slots, setSlots] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`/api/portal/${id}?section=timetable`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []));
  }, [id]);

  if (!slots) return <div className="text-sm text-textSecondary">Loading...</div>;
  return <TimetableGrid slots={slots} />;
}
