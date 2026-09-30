'use client';

import { useEffect, useState } from 'react';
import TimetableGrid from '@/components/portal/TimetableGrid';
import CreateTimetableSlotWizard from '@/components/CreateTimetableSlotWizard';

export default function ManagementTimetablePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [schoolSlots, setSchoolSlots] = useState<any[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        setBatches(items);
        if (items.length && !batchId) setBatchId(String(items[0].id));
      });
    loadSchoolWide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSchoolWide() {
    fetch('/api/timetable')
      .then((r) => r.json())
      .then((d) => setSchoolSlots(d.items || []));
  }

  function load() {
    if (!batchId) return;
    fetch(`/api/timetable?batch_id=${batchId}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.items || []));
  }

  useEffect(load, [batchId]);

  async function remove(id: number) {
    await fetch(`/api/timetable/${id}`, { method: 'DELETE' });
    load();
    loadSchoolWide();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-[15px] font-semibold text-text">Full school timetable</div>
        <TimetableGrid slots={schoolSlots} showBatch />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[15px] font-semibold text-text mb-1.5">Batch timetable</div>
            <select className="input !w-auto" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => setWizardOpen(true)} className="btn btn-primary" disabled={!batches.length}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create timetable slot
          </button>
        </div>

        <TimetableGrid slots={slots} onDelete={remove} />
      </div>

      <CreateTimetableSlotWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={() => {
          setWizardOpen(false);
          load();
          loadSchoolWide();
        }}
        batches={batches}
        initialBatchId={batchId}
      />
    </div>
  );
}
