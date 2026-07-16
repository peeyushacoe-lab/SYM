import PDFDocument from 'pdfkit';

export interface IdCardRow {
  id: number;
  name: string;
  photo?: string | null;
  roll_number?: string | null;
  registration_number?: string | null;
  course?: string | null;
  batch_name?: string | null;
  dob?: string | null;
  mobile?: string | null;
  alt_mobile?: string | null;
  address?: string | null;
}

const INSTITUTE = {
  name: 'SHIKSHA YOGI',
  tagline: 'Computer Education & Training Center',
  address: 'Mahua Road',
  phone: '+91 82929 98867',
};

// CR80 card size in points (85.6mm x 54mm)
const CARD_W = 242.6;
const CARD_H = 153.4;

function dataUrlToBuffer(dataUrl?: string | null): Buffer | null {
  if (!dataUrl) return null;
  const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

export function buildIdCardPdf(student: IdCardRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [CARD_W * 2 + 60, CARD_H + 60], margin: 20 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const frontX = 20;
    const backX = 40 + CARD_W;
    const y = 20;

    // ── FRONT ──
    doc.roundedRect(frontX, y, CARD_W, CARD_H, 10).fillAndStroke('#1E3A8A', '#1E3A8A');
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(INSTITUTE.name, frontX + 14, y + 12, { width: CARD_W - 28 });
    doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica').text(INSTITUTE.tagline, frontX + 14, y + 26, { width: CARD_W - 28 });

    const photoBuf = dataUrlToBuffer(student.photo);
    const photoX = frontX + 14;
    const photoY = y + 44;
    const photoW = 56;
    const photoH = 70;
    if (photoBuf) {
      try {
        doc.image(photoBuf, photoX, photoY, { width: photoW, height: photoH, fit: [photoW, photoH] });
      } catch {
        doc.rect(photoX, photoY, photoW, photoH).fill('#2C4A8F');
      }
    } else {
      doc.rect(photoX, photoY, photoW, photoH).fill('#2C4A8F');
      doc.fillColor('#93C5FD').fontSize(20).text((student.name || '?').charAt(0).toUpperCase(), photoX, photoY + 22, { width: photoW, align: 'center' });
    }
    doc.rect(photoX, photoY, photoW, photoH).strokeColor('#FFFFFF').lineWidth(1).stroke();

    let ty = photoY;
    const tx = photoX + photoW + 12;
    const tw = CARD_W - (tx - frontX) - 12;
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(student.name || '-', tx, ty, { width: tw });
    ty += 16;
    doc.fillColor('#E2E8F0').fontSize(7.5).font('Helvetica');
    doc.text(`Roll No: ${student.roll_number || '-'}`, tx, ty, { width: tw }); ty += 10;
    doc.text(`Course: ${student.course || '-'}`, tx, ty, { width: tw }); ty += 10;
    doc.text(`Batch: ${student.batch_name || '-'}`, tx, ty, { width: tw }); ty += 10;
    doc.text(`DOB: ${student.dob || '-'}`, tx, ty, { width: tw }); ty += 10;

    doc.fillColor('#93C5FD').fontSize(6.5).text(`Valid for academic session · ${new Date().getFullYear()}`, frontX + 14, y + CARD_H - 16, { width: CARD_W - 28 });

    // ── BACK ──
    doc.roundedRect(backX, y, CARD_W, CARD_H, 10).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#1E40AF').fontSize(9).font('Helvetica-Bold').text('STUDENT IDENTITY CARD', backX + 14, y + 12, { width: CARD_W - 28 });
    doc.moveTo(backX + 14, y + 26).lineTo(backX + CARD_W - 14, y + 26).strokeColor('#E2E8F0').lineWidth(0.75).stroke();

    let by = y + 34;
    const backRows: [string, string][] = [
      ['Reg. Number', student.registration_number || '-'],
      ['Mobile', student.mobile || '-'],
      ['Emergency Contact', student.alt_mobile || student.mobile || '-'],
      ['Address', student.address || '-'],
    ];
    doc.font('Helvetica');
    backRows.forEach(([label, value]) => {
      doc.fillColor('#64748B').fontSize(7).text(label, backX + 14, by, { width: 80 });
      doc.fillColor('#0F172A').fontSize(7.5).text(value, backX + 98, by, { width: CARD_W - 112 });
      by += 16;
    });

    by += 6;
    doc.fillColor('#64748B').fontSize(6.5).text(
      `If found, please return to ${INSTITUTE.name}, ${INSTITUTE.address}. Phone: ${INSTITUTE.phone}. This card is the property of the institute.`,
      backX + 14, by, { width: CARD_W - 28 }
    );

    doc.fillColor('#475569').fontSize(7).text('Authorized Signatory', backX + CARD_W - 100, y + CARD_H - 20, { width: 86, align: 'right' });
    doc.moveTo(backX + CARD_W - 100, y + CARD_H - 24).lineTo(backX + CARD_W - 14, y + CARD_H - 24).strokeColor('#94A3B8').lineWidth(0.5).stroke();

    doc.end();
  });
}
