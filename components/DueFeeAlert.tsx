'use client';

import Modal from './Modal';
import Link from 'next/link';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function intl(raw: any): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, '');
  if (!d) return null;
  return d.length === 10 ? `91${d}` : d;
}

function reminderText(row: any) {
  return `Due Fee Reminder\n\nStudent: ${row.student_name}\nBatch: ${row.batch_name || '-'}\nDue Amount: ${formatCurrency(row.remaining_due)}\n\nKindly clear the dues at the earliest.\n- Shiksha Yogi`;
}

// Draws a Tufee-style due-fee reminder card on a canvas and returns a JPG blob
async function buildReminderImage(row: any): Promise<Blob | null> {
  const W = 900;
  const H = 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // title
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 40px Arial';
  ctx.fillText('Due Fee Reminder', 48, 92);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(48, 112, W - 96, 2);

  // student block
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(String(row.student_name || ''), 48, 176);
  ctx.font = '22px Arial';
  ctx.fillStyle = '#4b5563';
  ctx.fillText(`Roll No: ${row.roll_number || '-'}   Mobile: ${row.mobile || '-'}`, 48, 212);

  // table header
  const cols = [48, 360, 620];
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Batch/Class', cols[0], 286);
  ctx.fillText('Due For', cols[1], 286);
  ctx.fillText('Due Amount', cols[2], 286);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(48, 300, W - 96, 2);

  // row
  ctx.fillStyle = '#111827';
  ctx.font = '24px Arial';
  ctx.fillText(String(row.batch_name || '-'), cols[0], 344);
  ctx.fillText(String(row.period_label || row.due_date || 'Pending dues'), cols[1], 344);
  ctx.fillText(formatCurrency(row.remaining_due), cols[2], 344);

  // total
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(48, 380, W - 96, 2);
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Total Due', cols[1], 432);
  ctx.fillText(formatCurrency(row.remaining_due), cols[2], 432);

  // footer
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('SHIKSHA YOGI', 48, 540);
  ctx.font = '20px Arial';
  ctx.fillStyle = '#4b5563';
  ctx.fillText('Thank you. Kindly clear the dues at the earliest.', 48, 574);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

async function shareOrDownloadImage(row: any) {
  const blob = await buildReminderImage(row);
  if (!blob) return;
  const fileName = `due-reminder-${String(row.student_name || 'student').replace(/\s+/g, '-')}.jpg`;

  if (typeof navigator !== 'undefined' && 'canShare' in navigator && typeof File !== 'undefined') {
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    if ((navigator as any).canShare({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: 'Due Fee Reminder', text: reminderText(row) });
        return;
      } catch {
        /* fall through to download */
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DueFeeAlert({ row, open, onClose }: { row: any; open: boolean; onClose: () => void }) {
  if (!row) return null;
  const numbers = [row.mobile, row.guardian_mobile].filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Due Fee Alert">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-on-surface">{row.student_name}</p>
            <p className="text-xs text-on-surface-variant">
              {row.batch_name || '-'}
              {row.due_date ? ` · ${row.due_date}` : ''}
            </p>
          </div>
          <p className="text-[20px] font-semibold text-red-500">{formatCurrency(row.remaining_due)}</p>
        </div>

        {numbers.map((n: string, i: number) => {
          const d = intl(n);
          if (!d) return null;
          return (
            <div key={i} className="flex items-center justify-between border border-outline-variant/40 rounded-lg px-3 py-2">
              <span className="text-sm text-on-surface">{n}</span>
              <span className="flex items-center gap-3">
                <a
                  href={`https://wa.me/${d}?text=${encodeURIComponent(reminderText(row))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp reminder"
                  className="text-green-600"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </a>
                <a href={`sms:+${d}?body=${encodeURIComponent(reminderText(row))}`} title="SMS" className="text-tertiary">
                  <span className="material-symbols-outlined text-[20px]">sms</span>
                </a>
                <a href={`tel:+${d}`} title="Call" className="text-tertiary">
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
              </span>
            </div>
          );
        })}

        <div className="flex gap-2">
          <button onClick={() => shareOrDownloadImage(row)} className="btn btn-outline flex-1">
            <span className="material-symbols-outlined text-[18px]">image</span>
            Reminder image
          </button>
          <Link href={`/students/${row.student_id}`} className="btn btn-primary flex-1 justify-center">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Fee
          </Link>
        </div>
      </div>
    </Modal>
  );
}
