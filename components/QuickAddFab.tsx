'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ACTIONS: { label: string; hint: string; icon: string; href: string }[] = [
  { label: 'Student', hint: 'Add a new student', icon: 'person_add', href: '/students?add=1' },
  { label: 'Staff', hint: 'Add a new staff member', icon: 'badge', href: '/staff?add=1' },
  { label: 'Batch', hint: 'Create a new batch', icon: 'flag', href: '/batches?add=1' },
  { label: 'Exam', hint: 'Schedule a new exam', icon: 'quiz', href: '/exams?add=1' },
  { label: 'Expense', hint: 'Record an expense', icon: 'payments', href: '/expenses?add=1' },
  { label: 'Enquiry', hint: 'Add a new enquiry', icon: 'contact_support', href: '/enquiries?add=1' },
  { label: 'Fee', hint: 'Collect a fee payment', icon: 'account_balance_wallet', href: '/fees?add=1' },
];

export default function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}
      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="bg-surface-container rounded-xl shadow-lg border border-outline-variant/40 overflow-hidden w-64 mb-1">
            <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Add New</span>
              <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  router.push(a.href);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-high text-left"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">{a.icon}</span>
                <span>
                  <span className="block text-sm font-medium text-on-surface">{a.label}</span>
                  <span className="block text-[11px] text-on-surface-variant">{a.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Quick add"
        >
          <span className="material-symbols-outlined text-[28px]">{open ? 'close' : 'add'}</span>
        </button>
      </div>
    </>
  );
}
