'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function ChildDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState('');

  function load() {
    fetch(`/api/guardian/child/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }

  useEffect(load, [id]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);
    const res = await fetch('/api/guardian/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee_id: payModal.id, amount: Number(amount) }),
    });
    const result = await res.json();
    setPaying(false);
    if (res.ok) {
      setPayResult(`Payment successful. Reference: ${result.transaction_ref}`);
      setPayModal(null);
      setAmount('');
      load();
    }
  }

  if (error) return <div className="card text-sm text-danger">{error}</div>;
  if (!data) return <div className="text-sm text-textSecondary">Loading...</div>;

  const { student, fees, attendance, attendancePct } = data;

  return (
    <div className="space-y-5">
      {payResult && (
        <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2">{payResult}</div>
      )}

      <div className="card">
        <div className="text-lg font-medium text-text">{student.name}</div>
        <div className="text-sm text-textSecondary mt-1">
          {student.course} - {student.batch_name || 'No batch'} {student.timing ? `(${student.timing})` : ''}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-xs text-textSecondary">Roll no.</div>
            <div className="text-text">{student.roll_number || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Mobile</div>
            <div className="text-text">{student.mobile}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Admission date</div>
            <div className="text-text">{student.admission_date || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Attendance</div>
            <div className="text-text">{attendancePct !== null ? `${attendancePct}%` : 'No data'}</div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-medium text-text">Fee history</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Course fee</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Paid</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Due</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No fee records yet.
                </td>
              </tr>
            ) : (
              fees.map((f: any) => (
                <tr key={f.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{formatCurrency(f.course_fee)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.amount_paid)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(f.remaining_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{f.payment_date || '-'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {f.remaining_due > 0 && (
                      <button
                        onClick={() => {
                          setPayModal(f);
                          setAmount(String(f.remaining_due));
                        }}
                        className="btn btn-primary !py-1 !px-2.5 text-xs"
                      >
                        Pay now
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="text-[13px] font-medium text-text mb-3">Recent attendance</div>
        {attendance.length === 0 ? (
          <div className="text-sm text-textSecondary">No attendance recorded yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {attendance.map((a: any) => (
              <span
                key={a.date}
                title={a.date}
                className={`text-[10px] px-2 py-1 rounded ${
                  a.status === 'Present'
                    ? 'bg-accentLight text-emerald-700'
                    : a.status === 'Absent'
                    ? 'bg-dangerLight text-danger'
                    : 'bg-warningLight text-warning'
                }`}
              >
                {a.date.slice(5)}
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Pay fees">
        <form onSubmit={handlePay} className="space-y-4">
          <p className="text-sm text-textSecondary">
            This is a test-mode payment for demo purposes. A real gateway (e.g. Razorpay) can be connected later.
          </p>
          <div>
            <label className="label">Amount to pay</label>
            <input
              className="input"
              type="number"
              max={payModal?.remaining_due}
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPayModal(null)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={paying} className="btn btn-primary">
              {paying ? 'Processing...' : 'Pay now'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
