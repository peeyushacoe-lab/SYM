'use client';

import { useEffect, useState } from 'react';
import TimetableGrid from '@/components/portal/TimetableGrid';

export default function TeacherTimetablePage() {
  const [slots, setSlots] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/timetable')
      .then((r) => r.json())
      .then((d) => setSlots(d.items || []));
  }, []);

  if (!slots) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-textSecondary">
        Weekly schedule across all your batches. Contact management to change the timetable.
      </p>
      <TimetableGrid slots={slots} showBatch />
    </div>
  );
}
