'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function FeesSection({ studentKey }: { studentKey: string }) {
  const [fees, setFees] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [payModal, setPayModal] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState('');
  const [payError, setPayError] = useState('');

  function load() {
    fetch(`/api/portal/${studentKey}?section=fees`)
      .then((r) => r.json())
      .then((d) => {
        setFees(d.fees || []);
        setPayments(d.payments || []);
      });
  }

  useEffect(load, [studentKey]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);
    setPayError('');
    const res = await fetch('/api/pay', {
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
    } else {
      setPayError(result.error || 'Payment failed.');
    }
  }

  if (!fees) return <div className="text-sm text-textSecondary">Loading...</div>;

  const totalFee = fees.reduce((s, f) => s + (f.course_fee || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.amount_paid || 0), 0);
  const totalDue = fees.reduce((s, f) => s + (f.remaining_due || 0), 0);

  return (
    <div className="space-y-4">
      {payResult && (
        <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2">{payResult}</div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Total fee</div>
          <div className="text-lg sm:text-xl font-semibold text-text mt-1">{formatCurrency(totalFee)}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Paid</div>
          <div className="text-lg sm:text-xl font-semibold text-accent mt-1">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Due</div>
          <div className={`text-lg sm:text-xl font-semibold mt-1 ${totalDue > 0 ? 'text-danger' : 'text-accent'}`}>
            {formatCurrency(totalDue)}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Fee records</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Receipt</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Type</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Course fee</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Paid</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Due</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Mode</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-textSecondary">
                  No fee records yet.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{f.receipt_number || `#${f.id}`}</td>
                  <td className="px-4 py-2.5">
                    <span className="badge badge-blue">{f.fee_type || 'CourseWise'}</span>
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(f.course_fee)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.amount_paid)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(f.remaining_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{f.payment_date || '-'}</td>
                  <td className="px-4 py-2.5">{f.payment_mode || '-'}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <a
                      href={`/api/fees/${f.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline !py-1 !px-2.5 text-xs mr-1.5"
                    >
                      Receipt
                    </a>
                    {f.remaining_due > 0 && (
                      <button
                        onClick={() => {
                          setPayModal(f);
                          setAmount(String(f.remaining_due));
                          setPayResult('');
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

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Online payment history</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Reference</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Amount</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Method</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Status</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-textSecondary">
                  No online payments yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{p.transaction_ref}</td>
                  <td className="px-4 py-2.5">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-2.5">{p.method}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={p.status === 'success' ? 'green' : 'amber'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{(p.created_at || '').slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Pay fees online">
        <form onSubmit={handlePay} className="space-y-4">
          <p className="text-sm text-textSecondary">
            This is a test-mode payment for demo purposes. A real gateway (e.g. Razorpay) can be connected later.
          </p>
          {payError && <div className="text-sm text-danger">{payError}</div>}
          <div>
            <label className="label">Amount to pay (due: {formatCurrency(payModal?.remaining_due || 0)})</label>
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
