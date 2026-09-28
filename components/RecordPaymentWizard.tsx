'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

type Step = 'target' | 'pick-target' | 'student' | 'fee';

export default function RecordPaymentWizard({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>('target');
  const [enrollType, setEnrollType] = useState<'batch' | 'course'>('batch');
  const [batches, setBatches] = useState<{ id: number; name: string }[]>([]);
  const [courses, setCourses] = useState<{ name: string }[]>([]);
  const [targetId, setTargetId] = useState<string>(''); // batch id, or course name

  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [student, setStudent] = useState<any | null>(null);

  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [nextReceipt, setNextReceipt] = useState('');
  const [loadingFees, setLoadingFees] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | 'manual' | null>(null);
  const [amountMode, setAmountMode] = useState<'full' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState('');
  const [manualFeeType, setManualFeeType] = useState('CourseWise');
  const [manualCourseFee, setManualCourseFee] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNumber, setReceiptNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function resetAll() {
    setStep('target');
    setEnrollType('batch');
    setTargetId('');
    setSearch('');
    setStudents([]);
    setStudent(null);
    setPendingItems([]);
    setSelectedItemId(null);
    setAmountMode('full');
    setCustomAmount('');
    setManualFeeType('CourseWise');
    setManualCourseFee('');
    setPaymentMode('Cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReceiptNumber('');
    setRemarks('');
    setError('');
  }

  useEffect(() => {
    if (!open) return;
    resetAll();
    fetch('/api/batches').then((r) => r.json()).then((d) => setBatches(d.items || []));
    fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(d.items || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load students in the chosen batch/course whenever we're on that step,
  // debounced against the search box (matches name, mobile, roll number,
  // registration number, or course — see /api/students).
  useEffect(() => {
    if (step !== 'student' || !targetId) return;
    setLoadingStudents(true);
    const q = new URLSearchParams();
    if (enrollType === 'batch') q.set('batch_id', targetId);
    else q.set('course', targetId);
    if (search) q.set('search', search);
    const t = setTimeout(() => {
      fetch(`/api/students?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setStudents(d.items || []);
          setLoadingStudents(false);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [step, targetId, enrollType, search]);

  function pickStudent(s: any) {
    setStudent(s);
    setStep('fee');
    setLoadingFees(true);
    fetch(`/api/students/${s.id}/pending-fees`)
      .then((r) => r.json())
      .then((d) => {
        setPendingItems(d.items || []);
        setNextReceipt(d.nextReceipt || '');
        setReceiptNumber(d.nextReceipt || '');
        setSelectedItemId(d.items && d.items.length ? d.items[0].fee_item_id : 'manual');
        setLoadingFees(false);
      });
  }

  const selectedItem = pendingItems.find((i) => i.fee_item_id === selectedItemId) || null;

  async function submit() {
    setSaving(true);
    setError('');
    try {
      if (selectedItem) {
        const amount = amountMode === 'full' ? selectedItem.amount_due : Number(customAmount);
        if (!amount || amount <= 0) {
          setError('Enter a valid amount.');
          setSaving(false);
          return;
        }
        const res = await fetch(`/api/students/${student.id}/collect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fee_item_id: selectedItem.fee_item_id,
            amount_paid: amount,
            discount: 0,
            payment_mode: paymentMode,
            payment_date: paymentDate,
            receipt_number: receiptNumber,
            remarks,
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setError(d.error || 'Failed to record payment.');
          setSaving(false);
          return;
        }
      } else {
        // No structured fee item pending — fall back to a plain one-off entry
        // against /api/fees, same fields the old flat Record Payment form used.
        const amount = amountMode === 'full' ? Number(manualCourseFee) : Number(customAmount);
        if (!manualCourseFee || !amount || amount <= 0) {
          setError('Enter the course fee and amount paid.');
          setSaving(false);
          return;
        }
        const res = await fetch('/api/fees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: student.id,
            fee_type: manualFeeType,
            course_fee: manualCourseFee,
            amount_paid: amount,
            payment_mode: paymentMode,
            payment_date: paymentDate,
            receipt_number: receiptNumber,
            remarks,
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setError(d.error || 'Failed to record payment.');
          setSaving(false);
          return;
        }
      }
      setSaving(false);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
      setSaving(false);
    }
  }

  const title =
    step === 'target' ? 'Record payment — batch or course?' :
    step === 'pick-target' ? `Record payment — choose ${enrollType}` :
    step === 'student' ? 'Record payment — choose student' :
    'Record payment';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {step === 'target' && (
          <div className="flex flex-wrap -mx-1.5">
            <div className="min-w-0 box-border px-1.5 mb-2 w-full text-[13px] text-on-surface-variant">
              Is this student enrolled via a batch, or a standalone course?
            </div>
            <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <button
                type="button"
                onClick={() => { setEnrollType('batch'); setStep('pick-target'); }}
                className="btn btn-outline w-full !py-3"
              >
                Batch
              </button>
            </div>
            <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <button
                type="button"
                onClick={() => { setEnrollType('course'); setStep('pick-target'); }}
                className="btn btn-outline w-full !py-3"
              >
                Course
              </button>
            </div>
          </div>
        )}

        {step === 'pick-target' && (
          <div>
            <label className="label">{enrollType === 'batch' ? 'Batch' : 'Course'}</label>
            <select
              className="input"
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                if (e.target.value) setStep('student');
              }}
            >
              <option value="">Select...</option>
              {enrollType === 'batch'
                ? batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)
                : courses.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <div className="flex justify-start mt-4">
              <button type="button" className="btn btn-outline" onClick={() => setStep('target')}>Back</button>
            </div>
          </div>
        )}

        {step === 'student' && (
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
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => pickStudent(s)}
                    className="w-full text-left px-4 py-2.5 border-b border-outline-variant/25 last:border-0 hover:bg-surface-container-low/70 transition-colors"
                  >
                    <div className="text-sm font-medium text-text">{s.name}</div>
                    <div className="text-[11px] text-textSecondary">
                      Roll: {s.roll_number || '-'} · Reg: {s.registration_number || '-'} · {s.mobile}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-start mt-4">
              <button type="button" className="btn btn-outline" onClick={() => setStep('pick-target')}>Back</button>
            </div>
          </div>
        )}

        {step === 'fee' && student && (
          <div className="space-y-4">
            <div className="text-sm text-on-surface-variant">
              <b className="text-text">{student.name}</b> — Roll: {student.roll_number || '-'}
            </div>

            {loadingFees ? (
              <div className="text-sm text-textSecondary">Loading pending fees...</div>
            ) : (
              <>
                {error && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>}

                {pendingItems.length > 0 && (
                  <div>
                    <label className="label">Pending fee</label>
                    <div className="space-y-2">
                      {pendingItems.map((it) => (
                        <label
                          key={it.fee_item_id}
                          className={`flex items-center justify-between border rounded-lg px-3 py-2.5 cursor-pointer ${
                            selectedItemId === it.fee_item_id ? 'border-tertiary bg-surface-container-high' : 'border-outline-variant/50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={selectedItemId === it.fee_item_id}
                              onChange={() => { setSelectedItemId(it.fee_item_id); setAmountMode('full'); setCustomAmount(''); }}
                            />
                            <span className="text-sm">
                              {it.category || it.fee_type} ({it.fee_type})
                              {it.period_from && it.period_to && (
                                <span className="text-textSecondary text-[11px]"> · {it.period_from} to {it.period_to}</span>
                              )}
                            </span>
                          </span>
                          <span className="text-sm font-medium text-danger">{formatCurrency(it.amount_due)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {pendingItems.length === 0 && (
                  <div className="bg-surface-container-high rounded-lg px-3 py-2.5 text-sm text-on-surface-variant">
                    No structured fee plan is due for this student right now. You can still record a one-off payment below.
                  </div>
                )}

                {!selectedItem && (
                  <div className="flex flex-wrap -mx-1.5">
                    <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                      <label className="label">Fee type</label>
                      <select className="input" value={manualFeeType} onChange={(e) => setManualFeeType(e.target.value)}>
                        {['Monthly', 'CourseWise', 'OneTime', 'Quarterly', 'Installment'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                      <label className="label">Total course fee *</label>
                      <input type="number" className="input" value={manualCourseFee} onChange={(e) => setManualCourseFee(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Amount to collect</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setAmountMode('full')}
                      className={`btn ${amountMode === 'full' ? 'btn-primary' : 'btn-outline'} !py-1.5 text-xs`}
                    >
                      Full fee {selectedItem ? `(${formatCurrency(selectedItem.amount_due)})` : manualCourseFee ? `(${formatCurrency(Number(manualCourseFee))})` : ''}
                    </button>
                    <button
                      type="button"
                      disabled={!!selectedItem && !selectedItem.partial_supported}
                      onClick={() => setAmountMode('custom')}
                      className={`btn ${amountMode === 'custom' ? 'btn-primary' : 'btn-outline'} !py-1.5 text-xs disabled:opacity-40`}
                      title={selectedItem && !selectedItem.partial_supported ? 'Partial payment is not enabled for this fee item.' : undefined}
                    >
                      Custom fee
                    </button>
                  </div>
                  {amountMode === 'custom' && (
                    <input
                      type="number"
                      className="input"
                      placeholder="Amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex flex-wrap -mx-1.5">
                  <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                    <label className="label">Payment date</label>
                    <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                    <label className="label">Payment mode</label>
                    <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      {['Cash', 'UPI', 'Bank Transfer'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                    <label className="label">Receipt number</label>
                    <input className="input" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder={nextReceipt} />
                  </div>
                  <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
                    <label className="label">Remarks</label>
                    <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" className="btn btn-outline" onClick={() => setStep('student')}>Back</button>
                  <button type="button" disabled={saving} onClick={submit} className="btn btn-primary">
                    {saving ? 'Saving...' : 'Record payment'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
