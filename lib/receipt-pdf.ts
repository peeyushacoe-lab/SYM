import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export interface ReceiptRow {
  student_name?: string;
  mobile?: string;
  batch_name?: string;
  payment_date?: string;
  payment_mode?: string;
  course_fee?: number;
  amount_paid?: number;
  remaining_due?: number;
  due_date?: string | null;
  remarks?: string | null;
  receipt_number?: string | null;
}

export function buildReceiptPdf(row: ReceiptRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = path.join(process.cwd(), 'public', 'logo-128.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 38, { width: 46 });
    }
    doc.fillColor('#0c1c2e').fontSize(18).text('SHIKSHA YOGI', 98, 42);
    doc
      .fontSize(10)
      .fillColor('#444748')
      .text(`Fee Receipt${row.receipt_number ? ' · No. ' + row.receipt_number : ''}`, 98, 66);

    doc.moveTo(40, 96).lineTo(370, 96).strokeColor('#2c6291').lineWidth(1.5).stroke();

    const rows: [string, string][] = [
      ['Student', row.student_name || '-'],
      ['Mobile', row.mobile || '-'],
      ['Batch', row.batch_name || '-'],
      ['Payment date', row.payment_date || '-'],
      ['Payment mode', row.payment_mode || '-'],
      ['Total course fee', formatCurrency(row.course_fee || 0)],
      ['Amount paid', formatCurrency(row.amount_paid || 0)],
      ['Remaining due', formatCurrency(row.remaining_due || 0)],
    ];
    if (row.due_date) rows.push(['Next due date', row.due_date]);
    if (row.remarks) rows.push(['Remarks', row.remarks]);

    let y = 116;
    for (const [label, value] of rows) {
      doc.fontSize(10.5).fillColor('#444748').text(label, 40, y, { width: 150 });
      doc.fontSize(10.5).fillColor('#0c1c2e').text(value, 195, y, { width: 175 });
      doc.moveTo(40, y + 18).lineTo(370, y + 18).strokeColor('#dbe6f7').lineWidth(0.5).stroke();
      y += 24;
    }

    y += 30;
    doc
      .fontSize(8.5)
      .fillColor('#444748')
      .text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 40, y)
      .text('SYM - Shiksha Yogi Management', 40, y, { width: 330, align: 'right' });

    y += 50;
    doc.fontSize(11).fillColor('#0c1c2e').text('Manish Singh', 195, y, { width: 175, align: 'right' });
    doc.fontSize(9).fillColor('#444748').text('Centre Incharge', 195, y + 14, { width: 175, align: 'right' });

    doc.end();
  });
}
