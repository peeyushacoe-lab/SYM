'use client';

import { useEffect, useState } from 'react';
import AddChargeWizard from '@/components/AddChargeWizard';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function ChargesPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailBatch, setDetailBatch] = useState<string | null>(null);
  const [detailStudents, setDetailStudents] = useState<any[] | null>(null);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/charges')
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.items || []);
        setLoading(false);
      });
  }

  useEffect(load, []);

  function openDetail(chargeBatch: string) {
    setDetailBatch(chargeBatch);
    setDetailStudents(null);
    fetch(`/api/charges/${chargeBatch}`)
      .then((r) => r.json())
      .then((d) => setDetailStudents(d.students || []));
  }

  async function cancelCharge(chargeBatch: string) {
    if (!confirm('Cancel this charge? Students who already paid something will just stop being billed further; anyone with no payment yet has it removed entirely.')) return;
    setCancelling(true);
    await fetch(`/api/charges/${chargeBatch}`, { method: 'DELETE' });
    setCancelling(false);
    setDetailBatch(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">Charges</h1>
          <p className="text-[13px] text-textSecondary">Miscellaneous, exam, transport, or any other custom charge — applied to a whole batch, a whole course, or hand-picked students.</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="btn btn-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add charge
        </button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Category</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Type</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Amount / student</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Applied to</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Collected</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Due</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">From date</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-textSecondary">Loading...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-textSecondary">No charges added yet.</td></tr>
            ) : (
              groups.map((g) => (
                <tr key={g.charge_batch} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{g.category}</td>
                  <td className="px-4 py-2.5"><span className="badge badge-blue">{g.fee_type}</span></td>
                  <td className="px-4 py-2.5">{formatCurrency(g.amount)}</td>
                  <td className="px-4 py-2.5">
                    {g.student_count} student{g.student_count === 1 ? '' : 's'}
                    {g.active_count < g.student_count && (
                      <span className="text-[11px] text-textSecondary"> ({g.active_count} active)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(g.total_collected)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={g.total_due > 0 ? 'red' : 'green'}>{formatCurrency(g.total_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{g.from_date}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(g.charge_batch)} className="btn btn-outline !py-1 !px-2.5 text-xs mr-1.5">
                      View
                    </button>
                    <button onClick={() => cancelCharge(g.charge_batch)} className="btn btn-outline !py-1 !px-2.5 text-xs text-danger">
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddChargeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={() => { setWizardOpen(false); load(); }}
      />

      <Modal open={!!detailBatch} onClose={() => setDetailBatch(null)} title="Charge — students">
        {!detailStudents ? (
          <div className="text-sm text-textSecondary">Loading...</div>
        ) : (
          <div className="space-y-3">
            <div className="border border-outline-variant/50 rounded-lg max-h-80 overflow-y-auto">
              {detailStudents.map((s) => (
                <div key={s.fee_item_id} className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/25 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-text">{s.student_name} {!s.active && <span className="text-[11px] text-textSecondary">(cancelled)</span>}</div>
                    <div className="text-[11px] text-textSecondary">Roll: {s.roll_number || '-'} · {s.batch_name || '-'}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-textSecondary text-[11px]">Paid {formatCurrency(s.total_collected)}</div>
                    <div className={s.total_due > 0 ? 'text-danger font-medium' : 'text-accent font-medium'}>{formatCurrency(s.total_due)} due</div>
                  </div>
                </div>
              ))}
            </div>
            {detailBatch && (
              <div className="flex justify-end">
                <button disabled={cancelling} onClick={() => cancelCharge(detailBatch)} className="btn btn-outline text-danger">
                  {cancelling ? 'Cancelling...' : 'Cancel this charge'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
