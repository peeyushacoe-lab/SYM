import PDFDocument from 'pdfkit';

export interface ReportCardExamRow {
  name: string;
  subject: string | null;
  exam_date: string | null;
  marks: number | null;
  max_marks: number;
}

export interface GradeBand {
  grade: string;
  min_percent: number;
  max_percent: number;
  remarks: string | null;
}

export interface ReportCardStudent {
  name: string;
  roll_number?: string | null;
  registration_number?: string | null;
  course?: string | null;
  batch_name?: string | null;
}

const INSTITUTE = { name: 'SHIKSHA YOGI', tagline: 'Computer Education & Training Center' };

export function gradeForPercent(pct: number, bands: GradeBand[]): GradeBand | null {
  return bands.find((b) => pct >= b.min_percent && pct <= b.max_percent) || null;
}

export function buildReportCardPdf(
  student: ReportCardStudent,
  exams: ReportCardExamRow[],
  bands: GradeBand[],
  attendancePct: number | null
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#1E40AF').fontSize(20).font('Helvetica-Bold').text(INSTITUTE.name, 40, 40);
    doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(INSTITUTE.tagline, 40, 64);
    doc.fillColor('#1E40AF').fontSize(14).font('Helvetica-Bold').text('ACADEMIC REPORT CARD', 40, 90);
    doc.moveTo(40, 112).lineTo(555, 112).strokeColor('#E2E8F0').lineWidth(1).stroke();

    let y = 126;
    const info: [string, string][] = [
      ['Student Name', student.name],
      ['Roll Number', student.roll_number || '-'],
      ['Registration No.', student.registration_number || '-'],
      ['Course', student.course || '-'],
      ['Batch', student.batch_name || '-'],
      ['Report Date', new Date().toLocaleDateString('en-IN')],
    ];
    info.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * 270;
      const yy = y + row * 20;
      doc.fillColor('#64748B').fontSize(9).text(label, x, yy, { width: 110 });
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(value, x + 110, yy - 1, { width: 150 });
      doc.font('Helvetica');
    });
    y += Math.ceil(info.length / 2) * 20 + 20;

    // Exam table
    doc.fillColor('#1E40AF').fontSize(11).font('Helvetica-Bold').text('Examination Results', 40, y);
    y += 20;

    const colX = { exam: 40, subject: 180, date: 280, marks: 360, pct: 430, grade: 490 };
    doc.fontSize(9).fillColor('#475569').font('Helvetica-Bold');
    doc.text('Exam', colX.exam, y, { width: 135 });
    doc.text('Subject', colX.subject, y, { width: 95 });
    doc.text('Date', colX.date, y, { width: 75 });
    doc.text('Marks', colX.marks, y, { width: 65 });
    doc.text('%', colX.pct, y, { width: 55 });
    doc.text('Grade', colX.grade, y, { width: 60 });
    y += 14;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
    y += 6;

    let totalPct = 0;
    let gradedCount = 0;
    doc.font('Helvetica').fontSize(9);
    exams.forEach((e) => {
      if (y > 760) { doc.addPage(); y = 40; }
      const hasMarks = e.marks !== null && e.marks !== undefined;
      const pct = hasMarks ? Math.round((e.marks! / (e.max_marks || 100)) * 100) : null;
      const band = pct !== null ? gradeForPercent(pct, bands) : null;
      if (pct !== null) { totalPct += pct; gradedCount += 1; }

      doc.fillColor('#0F172A');
      doc.text(e.name, colX.exam, y, { width: 135 });
      doc.text(e.subject || '-', colX.subject, y, { width: 95 });
      doc.text(e.exam_date || '-', colX.date, y, { width: 75 });
      doc.text(hasMarks ? `${e.marks}/${e.max_marks}` : 'Awaited', colX.marks, y, { width: 65 });
      doc.text(pct !== null ? `${pct}%` : '-', colX.pct, y, { width: 55 });
      doc.text(band ? band.grade : '-', colX.grade, y, { width: 60 });
      y += 16;
    });

    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
    y += 16;

    const overallPct = gradedCount ? Math.round(totalPct / gradedCount) : null;
    const overallBand = overallPct !== null ? gradeForPercent(overallPct, bands) : null;

    doc.fillColor('#1E40AF').fontSize(11).font('Helvetica-Bold').text('Summary', 40, y);
    y += 20;

    const summary: [string, string][] = [
      ['Overall Average', overallPct !== null ? `${overallPct}%` : 'No results yet'],
      ['Overall Grade', overallBand ? `${overallBand.grade}${overallBand.remarks ? ' — ' + overallBand.remarks : ''}` : '-'],
      ['Attendance', attendancePct !== null ? `${attendancePct}%` : 'No data'],
    ];
    summary.forEach(([label, value], i) => {
      doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(label, 40, y + i * 20, { width: 140 });
      doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(value, 180, y + i * 20 - 1, { width: 300 });
    });
    y += summary.length * 20 + 30;

    doc.fontSize(9).font('Helvetica').fillColor('#64748B');
    doc.text('Class Teacher', 100, y, { width: 150, align: 'center' });
    doc.text('Principal / Director', 350, y, { width: 150, align: 'center' });
    doc.moveTo(100, y - 6).lineTo(250, y - 6).strokeColor('#94A3B8').lineWidth(0.5).stroke();
    doc.moveTo(350, y - 6).lineTo(500, y - 6).strokeColor('#94A3B8').lineWidth(0.5).stroke();

    doc.end();
  });
}
