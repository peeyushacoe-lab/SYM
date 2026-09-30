'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { DAY_NAMES } from '@/components/portal/TimetableGrid';

interface Batch {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  batch_id: number;
}

interface Instructor {
  id: number; // staff.id
  user_id: number | null;
  name: string;
}

export default function CreateTimetableSlotWizard({
  open,
  onClose,
  onDone,
  batches,
  initialBatchId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  batches: Batch[];
  initialBatchId?: string;
}) {
  const [step, setStep] = useState(0); // 0=batch,1=subject,2=instructor,3=timing
  const [batchId, setBatchId] = useState('');
  const [day, setDay] = useState('0');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [teacherUserId, setTeacherUserId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lectureOrder, setLectureOrder] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // Reset the whole flow each time the wizard is opened, pre-selecting the
    // batch that's currently in view (if any) so the common case — adding a
    // slot to the batch you're already looking at — needs one less click.
    setStep(0);
    setBatchId(initialBatchId || '');
    setDay('0');
    setSubjectId('');
    setTeacherUserId('');
    setStartTime('');
    setEndTime('');
    setLectureOrder('');
    setError('');
  }, [open, initialBatchId]);

  useEffect(() => {
    if (!batchId) {
      setSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    fetch(`/api/subjects?batch_id=${batchId}`)
      .then((r) => r.json())
      .then((d) => setSubjects(d.items || []))
      .finally(() => setLoadingSubjects(false));
  }, [batchId]);

  useEffect(() => {
    if (!batchId || !subjectId) {
      setInstructors([]);
      return;
    }
    setLoadingInstructors(true);
    fetch(`/api/staff?batch_id=${batchId}&subject_id=${subjectId}`)
      .then((r) => r.json())
      .then((d) => setInstructors((d.items || []).filter((s: any) => s.staff_type === 'Instructor')))
      .finally(() => setLoadingInstructors(false));
  }, [batchId, subjectId]);

  const selectedBatch = batches.find((b) => String(b.id) === batchId);
  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const selectedInstructor = instructors.find((i) => String(i.user_id) === teacherUserId);

  function next() {
    setError('');
    setStep((s) => s + 1);
  }
  function back() {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!startTime) {
      setError('Start time is required.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: Number(batchId),
        day: Number(day),
        subject: selectedSubject ? selectedSubject.name : '',
        teacher_user_id: teacherUserId ? Number(teacherUserId) : null,
        start_time: startTime,
        end_time: endTime || null,
        lecture_order: lectureOrder === '' ? null : Number(lectureOrder),
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(d.error || 'Failed to add slot.');
      return;
    }
    onDone();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create timetable slot">
      <div className="space-y-4">
        {error && <div className="text-sm text-danger">{error}</div>}

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          {['Batch', 'Subject', 'Instructor', 'Timing'].map((label, i) => (
            <div key={label} className={`flex items-center gap-1.5 ${i === step ? 'text-tertiary font-semibold' : ''}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  i <= step ? 'bg-tertiary text-white' : 'bg-surfaceMuted'
                }`}
              >
                {i + 1}
              </span>
              {label}
              {i < 3 && <span className="mx-0.5 text-border">/</span>}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div>
              <label className="label">Batch</label>
              <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select a batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Day</label>
              <select className="input" value={day} onChange={(e) => setDay(e.target.value)}>
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <button className="btn btn-primary" disabled={!batchId} onClick={next}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="text-xs text-textSecondary">
              Batch: <span className="font-medium text-text">{selectedBatch?.name}</span>
            </div>
            <div>
              <label className="label">Subject</label>
              {loadingSubjects ? (
                <div className="text-sm text-textSecondary">Loading subjects...</div>
              ) : subjects.length ? (
                <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select a subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-textSecondary">No subjects set up for this batch yet — add one from the Subjects page.</div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn btn-outline" onClick={back}>
                Back
              </button>
              <button className="btn btn-primary" disabled={!subjectId} onClick={next}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="text-xs text-textSecondary">
              {selectedBatch?.name} · {selectedSubject?.name}
            </div>
            <div>
              <label className="label">Instructor</label>
              {loadingInstructors ? (
                <div className="text-sm text-textSecondary">Loading instructors...</div>
              ) : instructors.length ? (
                <select className="input" value={teacherUserId} onChange={(e) => setTeacherUserId(e.target.value)}>
                  <option value="">Not assigned</option>
                  {instructors
                    .filter((i) => i.user_id)
                    .map((i) => (
                      <option key={i.id} value={i.user_id as number}>
                        {i.name}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="text-sm text-textSecondary">
                  No instructor is assigned to teach this subject in this batch yet — you can still continue without one, or assign one from
                  the Staff page.
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn btn-outline" onClick={back}>
                Back
              </button>
              <button className="btn btn-primary" onClick={next}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-xs text-textSecondary">
              {selectedBatch?.name} · {selectedSubject?.name} · {selectedInstructor?.name || 'No instructor'}
            </div>
            <div className="flex flex-wrap -mx-1.5">
              <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                <label className="label">Start time</label>
                <input type="time" className="input" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                <label className="label">End time</label>
                <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Order of lecture (optional)</label>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="e.g. 1 for 1st period"
                value={lectureOrder}
                onChange={(e) => setLectureOrder(e.target.value)}
              />
              <div className="text-xs text-textSecondary mt-1">
                Lets you number periods (1st, 2nd...) separately from clock time. Leave blank to just sort by start time.
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn btn-outline" onClick={back}>
                Back
              </button>
              <button className="btn btn-primary" disabled={saving} onClick={submit}>
                {saving ? 'Adding...' : 'Add slot'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
