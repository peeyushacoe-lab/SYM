'use client';

import { useEffect, useState } from 'react';
import TimetableGrid from '@/components/portal/TimetableGrid';

export default function StudentTimetablePage() {
  const [slots, setSlots] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/portal/me?section=timetable')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setSlots(d.slots || []);
      });
  }, []);

  if (error) return <div className="card text-sm text-textSecondary">{error}</div>;
  if (!slots) return <div className="text-sm text-textSecondary">Loading...</div>;
  return <TimetableGrid slots={slots} />;
}
