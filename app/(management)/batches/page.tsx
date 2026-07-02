'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import Modal from '@/components/Modal';

function BatchStudentsModal({ batch, onClose }: { batch: any; onClose: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students?batch_id=${batch.id}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.items || []);
        setLoading(false);
      });
  }, [batch.id]);

  return (
    <Modal open onClose={onClose} title={`Students in ${batch.name}`} width="max-w-2xl">
      <div className="flex justify-end mb-3">
        <a href={`/api/export?type=batch-students&batch_id=${batch.id}`} className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Excel
        </a>
      </div>
      {loading ? (
        <div className="text-sm text-on-surface-variant py-6 text-center">Loading...</div>
      ) : students.length === 0 ? (
        <div className="text-sm text-on-surface-variant py-6 text-center">No students in this batch yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 text-left">
              {['Name', 'Mobile', 'Roll no.', 'Course', 'Admission'].map((h) => (
                <th key={h} className="py-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-outline-variant/25 last:border-0">
                <td className="py-2">{s.name}</td>
                <td className="py-2">{s.mobile}</td>
                <td className="py-2">{s.roll_number || '-'}</td>
                <td className="py-2">{s.course || '-'}</td>
                <td className="py-2">{s.admission_date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default function BatchesPage() {
  const [viewBatch, setViewBatch] = useState<any | null>(null);
  const [courseOptions, setCourseOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourseOptions((d.items || []).map((c: any) => ({ value: c.name, label: c.name }))))
      .catch(() => {});
  }, []);

  return (
    <>
      <CrudPage
        title="Batches"
        subtitle="Manage course batches and schedules"
        endpoint="/api/batches"
        searchPlaceholder="Search batches..."
        addLabel="Add batch"
        columns={[
          { key: 'name', label: 'Batch name' },
          { key: 'course', label: 'Course' },
          { key: 'timing', label: 'Timing' },
          { key: 'student_count', label: 'Students' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'start_date', label: 'Start date' },
        ]}
        fields={[
          { name: 'name', label: 'Batch name', required: true },
          { name: 'course', label: 'Course', type: 'select', options: courseOptions },
          { name: 'timing', label: 'Timing (e.g. 9-11 AM)' },
          { name: 'capacity', label: 'Capacity', type: 'number' },
          { name: 'start_date', label: 'Start date', type: 'date' },
          { name: 'end_date', label: 'End date', type: 'date' },
          { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
        ]}
        extraActions={(row) => (
          <button onClick={() => setViewBatch(row)} className="text-tertiary text-xs font-medium hover:underline">
            Students
          </button>
        )}
      />
      {viewBatch && <BatchStudentsModal batch={viewBatch} onClose={() => setViewBatch(null)} />}
    </>
  );
}
