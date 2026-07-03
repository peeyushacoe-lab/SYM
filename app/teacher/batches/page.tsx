'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TeacherBatchesPage() {
  const [batches, setBatches] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/teacher/batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.items || []));
  }, []);

  if (!batches) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-text mb-1">My batches</h1>
      <p className="text-xs text-textSecondary mb-4">
        Select a batch to mark attendance, view students and manage exams.
      </p>

      {batches.length === 0 ? (
        <div className="card text-sm text-textSecondary">No batches have been assigned to you yet. Contact management.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {batches.map((b) => (
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
  );
}
