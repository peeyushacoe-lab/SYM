import PDFDocument from 'pdfkit';
import { gradeForPercent, GradeBand } from './report-card-pdf';

export interface CertificateStudent {
  name: string;
  roll_number?: string | null;
  batch_name?: string | null;
  course?: string | null;
}

export interface CertificateExam {
  name: string;
  subject?: string | null;
  exam_date?: string | null;
  max_marks: number;
}

const INSTITUTE = { name: 'SHIKSHA YOGI', tagline: 'Computer Education & Training Center' };

export function buildCertificatePdf(
  student: CertificateStudent,
  exam: CertificateExam,
  marks: number,
  bands: GradeBand[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const pct = Math.round((marks / (exam.max_marks || 100)) * 100);
    const band = gradeForPercent(pct, bands);

    // Decorative border
    doc.rect(24, 24, W - 48, H - 48).lineWidth(2).strokeColor('#1E40AF').stroke();
    doc.rect(36, 36, W - 72, H - 72).lineWidth(0.75).strokeColor('#94A3B8').stroke();

    doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(26).text(INSTITUTE.name, 0, 70, { align: 'center', width: W });
    doc.fillColor('#64748B').font('Helvetica').fontSize(11).text(INSTITUTE.tagline, 0, 102, { align: 'center', width: W });

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(30).text('CERTIFICATE OF ACHIEVEMENT', 0, 150, { align: 'center', width: W });
    doc.moveTo(W / 2 - 140, 192).lineTo(W / 2 + 140, 192).strokeColor('#1E40AF').lineWidth(1.5).stroke();

    doc.font('Helvetica').fontSize(13).fillColor('#334155').text('This is to certify that', 0, 220, { align: 'center', width: W });

    doc.font('Helvetica-Bold').fontSize(26).fillColor('#1E40AF').text(student.name, 0, 248, { align: 'center', width: W });
    doc.moveTo(W / 2 - 160, 284).lineTo(W / 2 + 160, 284).strokeColor('#CBD5E1').lineWidth(0.75).stroke();

    const target = student.batch_name || student.course || '-';
    const bodyLines = [
      `of ${target}, has appeared in "${exam.name}"${exam.subject ? ` (${exam.subject})` : ''}`,
      `held on ${exam.exam_date || '-'} and has secured ${marks} out of ${exam.max_marks} marks (${pct}%)${
        band ? `, Grade: ${band.grade}` : ''
      }.`,
    ];
    doc.font('Helvetica').fontSize(13).fillColor('#334155').text(bodyLines.join('\n'), 80, 300, {
      align: 'center',
      width: W - 160,
      lineGap: 6,
    });

    const sigY = H - 110;
    doc.fontSize(10).font('Helvetica').fillColor('#64748B');
    doc.text('Date: ' + new Date().toLocaleDateString('en-IN'), 90, sigY + 30);
    doc.text('Examination In-charge', W / 2 - 90, sigY + 30, { width: 180, align: 'center' });
    doc.text('Principal / Director', W - 270, sigY + 30, { width: 180, align: 'center' });
    doc.moveTo(W / 2 - 90, sigY + 22).lineTo(W / 2 + 90, sigY + 22).strokeColor('#94A3B8').lineWidth(0.5).stroke();
    doc.moveTo(W - 270, sigY + 22).lineTo(W - 90, sigY + 22).strokeColor('#94A3B8').lineWidth(0.5).stroke();

    doc.end();
  });
}
