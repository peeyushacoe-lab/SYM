'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

function contactNumber(row: any): string | null {
  const raw = row.guardian_mobile || row.mobile;
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits || null;
}

function toIntl(num: string) {
  return num.length === 10 ? `91${num}` : num;
}

function waMessage(row: any) {
  const to = row.guardian_name ? row.guardian_name : 'Parent';
  return `Dear ${to}, this is a reminder that Rs. ${Number(row.remaining_due).toLocaleString('en-IN')} fee is due for ${row.student_name}${row.batch_name ? ' (' + row.batch_name + ')' : ''} at Shiksha Yogi. Please clear the dues at your earliest convenience.`;
}

export default function BulkReminderModal({
  open,
  onClose,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  rows: any[];
}) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [sent, setSent] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      const all: Record<number, boolean> = {};
      rows.forEach((r) => (all[r.id] = true));
      setSelected(all);
      setSent({});
    }
  }, [open, rows]);

  if (!open) return null;

  const eligible = rows.filter((r) => contactNumber(r));
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggle = (id: number) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const selectAll = () => {
    const all: Record<number, boolean> = {};
    eligible.forEach((r) => (all[r.id] = true));
    setSelected(all);
  };
  const clearAll = () => setSelected({});

  const send = (row: any) => {
    const num = contactNumber(row);
    if (!num) return;
    const url = `https://wa.me/${toIntl(num)}?text=${encodeURIComponent(waMessage(row))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSent((p) => ({ ...p, [row.id]: true }));
  };

  const sendAllSelected = () => {
    const items = eligible.filter((r) => selected[r.id] && !sent[r.id]);
    items.forEach((row, i) => {
      // Stagger slightly so the browser doesn't block a burst of window.open calls.
      setTimeout(() => send(row), i * 400);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Fee Reminders (WhatsApp)" width="max-w-2xl">
      <div className="space-y-3">
        <p className="text-xs text-textSecondary">
          Each reminder opens a WhatsApp chat pre-filled with the message below — you still need to hit Send
          in WhatsApp for each one (WhatsApp does not allow fully automated bulk sending from the browser).
        </p>
        <div className="flex items-center justify-between">
          <div className="text-xs text-textSecondary">
            {selectedCount} of {eligible.length} selected {rows.length > eligible.length && `(${rows.length - eligible.length} skipped — no mobile number)`}
          </div>
          <div className="flex gap-3">
            <button className="text-xs font-medium text-primary hover:underline" onClick={selectAll}>Select All</button>
            <button className="text-xs font-medium text-textSecondary hover:underline" onClick={clearAll}>Clear</button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border border-outline-variant/40 rounded-lg divide-y divide-outline-variant/25">
          {eligible.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-textSecondary">No due students with a contactable mobile number.</div>
          ) : (
            eligible.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!selected[row.id]}
                  onChange={() => toggle(row.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text truncate">{row.student_name}</div>
                  <div className="text-[11px] text-textSecondary">
                    {row.batch_name || 'No batch'} · Due Rs. {Number(row.remaining_due).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={() => send(row)}
                  className={`btn ${sent[row.id] ? 'btn-outline' : 'btn-primary'} text-xs px-3 py-1.5`}
                >
                  {sent[row.id] ? 'Sent ✓' : 'Send'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-outline">Close</button>
          <button type="button" onClick={sendAllSelected} disabled={selectedCount === 0} className="btn btn-primary">
            Send {selectedCount} via WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
}
