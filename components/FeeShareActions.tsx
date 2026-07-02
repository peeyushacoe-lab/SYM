'use client';

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
  if (Number(row.remaining_due) > 0) {
    return `Dear ${to}, this is a reminder that Rs. ${Number(row.remaining_due).toLocaleString('en-IN')} fee is due for ${row.student_name}${row.batch_name ? ' (' + row.batch_name + ')' : ''} at Shiksha Yogi. Please clear the dues at your earliest convenience.`;
  }
  return `Dear ${to}, we have received Rs. ${Number(row.amount_paid).toLocaleString('en-IN')} fee payment for ${row.student_name}${row.batch_name ? ' (' + row.batch_name + ')' : ''} at Shiksha Yogi. Thank you!`;
}

async function shareOrDownloadPdf(row: any) {
  const res = await fetch(`/api/fees/${row.id}/receipt`);
  if (!res.ok) return;
  const blob = await res.blob();
  const fileName = `receipt-${row.receipt_number || row.id}.pdf`;

  const canShareFiles =
    typeof navigator !== 'undefined' && 'canShare' in navigator && typeof File !== 'undefined';
  if (canShareFiles) {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if ((navigator as any).canShare({ files: [file] })) {
      try {
        await (navigator as any).share({
          files: [file],
          title: 'Fee Receipt',
          text: `Fee receipt for ${row.student_name}`,
        });
        return;
      } catch {
        // user cancelled the share sheet or it failed — fall through to a plain download
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

export default function FeeShareActions({ row }: { row: any }) {
  const num = contactNumber(row);
  const tel = num ? `tel:+${toIntl(num)}` : null;
  const wa = num ? `https://wa.me/${toIntl(num)}?text=${encodeURIComponent(waMessage(row))}` : null;

  return (
    <div className="flex items-center gap-2.5 justify-end">
      {tel && (
        <a href={tel} title="Call guardian" className="text-textSecondary hover:text-tertiary">
          <span className="material-symbols-outlined text-[18px]">call</span>
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="Send reminder via WhatsApp"
          className="text-textSecondary hover:text-tertiary"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
        </a>
      )}
      <button
        type="button"
        onClick={() => shareOrDownloadPdf(row)}
        title="Share or download PDF receipt"
        className="text-textSecondary hover:text-tertiary"
      >
        <span className="material-symbols-outlined text-[18px]">ios_share</span>
      </button>
    </div>
  );
}
