'use client';

import HomeworkPanel from '@/components/portal/HomeworkPanel';

export default function StudentHomeworkPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text">Homework & study materials</h1>
        <p className="text-xs text-textSecondary mt-0.5">Assignments and materials shared by your teachers</p>
      </div>
      <HomeworkPanel readOnly />
    </div>
  );
}
