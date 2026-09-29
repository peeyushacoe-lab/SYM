'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

type Step = 'scope' | 'pick-target' | 'details';
type Scope = 'batch' | 'course' | 'students';

const CATEGORY_OPTIONS = ['Miscellaneous', 'Library Fine', 'Exam Fee', 'Transport', 'Uniform', 'Books', 'Other'];

export default function AddChargeWizard({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>('scope');
  const [scope, setScope] = useState<Scope>('batch');
  const [batches, setBatches] = useState<{ id: number; name: string }[]>([]);
  const [courses, setCourses] = useState<{ name: string }[]>([]);
  const [batchId, setBatchId] = useState('');
  const [course, setCourse] = useState('');

  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [category, setCategory] = useState('Miscellaneous');
  const [customCategory, setCustomCategory] = useState('');
  const [feeType, setFeeType] = useState('OneTime');
  const [amount, setAmount] = useState('');
  const [partialSupported, setPartialSupported] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ count: number } | null>(null);

  function resetAll() {
    setStep('scope');
    setScope('batch');
    setBatchId('');
    setCourse('');
    setSearch('');
    setStudents([]);
    setSelectedIds(new Set());
    setCategory('Miscellaneous');
    setCustomCategory('');
    setFeeType('OneTime');
    setAmount('');
    setPartialSupported(false);
    setFromDate(new Date().toISOString().slice(0, 10));
    setError('');
    setResult(null);
  }

  useEffect(() => {
    if (!open) return;
    resetAll();
    fetch('/api/batches').then((r) => r.json()).then((d) => setBatches(d.items || []));
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(d.items || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Only the "specific students" scope needs the searchable student list.
  useEffect(() => {
    if (step !== 'pick-target' || scope !== 'students') return;
    setLoadingStudents(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      fetch(`/api/students?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setStudents(d.items || []);
          setLoadingStudents(false);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [step, scope, search]);

  function toggleStudent(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const body: any = {
        scope,
        category,
        custom_category: customCategory,
        fee_type: feeType,
        amount: Number(amount),
        partial_supported: partialSupported ? 1 : 0,
        from_date: fromDate,
      };
      if (scope === 'batch') body.batch_id = batchId;
      if (scope === 'course') body.course = course;
      if (scope === 'students') body.student_ids = Array.from(selectedIds);

      const res = await fetch('/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Failed to add charge.');
        setSaving(false);
        return;
      }
      setResult({ count: d.count });
      setSaving(false);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      setSaving(false);
    }
  }

  const targetChosen = scope === 'batch' ? !!batchId : scope === 'course' ? !!course : selectedIds.size > 0;

  const title =
    step === 'scope' ? 'Add charge — apply to?' :
    step === 'pick-target' ? (scope === 'batch' ? 'Add charge — choose batch' : scope === 'course' ? 'Add charge — choose course' : 'Add charge — choose students') :
    'Add charge — details';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {result ? (
        <div className="space-y-4">
          <div className="bg-surface-container-high rounded-lg px-3 py-3 text-sm text-on-surface">
            Charge added for <b>{result.count}</b> student{result.count === 1 ? '' : 's'}.
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onDone();
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {step === 'scope' && (
            <div className="flex flex-wrap -mx-1.5">
              <div className="min-w-0 box-border px-1.5 mb-2 w-full text-[13px] text-on-surface-variant">
                Who should this charge apply to?
              </div>
              {(['batch', 'course', 'students'] as Scope[]).map((s) => (
                <div key={s} className="min-w-0 box-border px-1.5 mb-3 w-full sm:w-1/3">
                  <button
                    type="button"
                    onClick={() => { setScope(s); setStep('pick-target'); }}
                    className="btn btn-outline w-full !py-3"
                  >
                    {s === 'batch' ? 'Whole batch' : s === 'course' ? 'Whole course' : 'Specific students'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 'pick-target' && scope === 'batch' && (
            <div>
              <label className="label">Batch</label>
              <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select...</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setStep('scope')}>Back</button>
                <button type="button" disabled={!targetChosen} className="btn btn-primary" onClick={() => setStep('details')}>Next</button>
              </div>
            </div>
          )}

          {step === 'pick-target' && scope === 'course' && (
            <div>
              <label className="label">Course</label>
              <select className="input" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="">Select...</option>
                {courses.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setStep('scope')}>Back</button>
                <button type="button" disabled={!targetChosen} className="btn btn-primary" onClick={() => setStep('details')}>Next</button>
              </div>
            </div>
          )}

          {step === 'pick-target' && scope === 'students' && (
            <div>
              <input
                className="input mb-3"
                placeholder="Search by name, roll number, or registration number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="border border-outline-variant/50 rounded-lg max-h-72 overflow-y-auto">
                {loadingStudents ? (
                  <div className="px-4 py-6 text-center text-sm text-textSecondary">Loading...</div>
                ) : students.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-textSecondary">No students found.</div>
                ) : (
                  students.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 px-4 py-2.5 border-b border-outline-variant/25 last:border-0 hover:bg-surface-container-low/70 cursor-pointer"
                    >
                      <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleStudent(s.id)} />
                      <span>
                        <div className="text-sm font-medium text-text">{s.name}</div>
                        <div className="text-[11px] text-textSecondary">
                          Roll: {s.roll_number || '-'} · {s.batch_name || s.course || '-'} · {s.mobile}
                        </div>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="text-[11px] text-textSecondary mt-2">{selectedIds.size} selected</div>
              <div className="flex justify-between mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setStep('scope')}>Back</button>
                <button type="button" disabled={!targetChosen} className="btn btn-primary" onClick={() => setStep('details')}>Next</button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {error && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>}
              <div className="flex flex-wrap -mx-1.5">
                <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                  <label className="label">Charge category</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {category === 'Other' && (
                  <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                    <label className="label">Custom category name</label>
                    <input className="input" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. Sports Fee" />
                  </div>
                )}
                <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                  <label className="label">Charge type</label>
                  <select className="input" value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                    <option value="OneTime">One-time</option>
                    <option value="Monthly">Monthly (recurring)</option>
                    <option value="Quarterly">Quarterly (recurring)</option>
                  </select>
                </div>
                <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                  <label className="label">Amount (Rs.)</label>
                  <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                  <label className="label">Effective from</label>
                  <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2 flex items-end">
                  <label className="flex items-center gap-2 text-sm text-on-surface">
                    <input type="checkbox" checked={partialSupported} onChange={(e) => setPartialSupported(e.target.checked)} />
                    Allow partial payment
                  </label>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setStep('pick-target')}>Back</button>
                <button type="button" disabled={saving || !amount} onClick={submit} className="btn btn-primary">
                  {saving ? 'Adding...' : 'Add charge'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
