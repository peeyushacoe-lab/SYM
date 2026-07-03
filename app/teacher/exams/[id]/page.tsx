'use client';

import { useParams, useRouter } from 'next/navigation';
import MarksEntry from '@/components/portal/MarksEntry';

export default function TeacherExamMarksPage() {
  const params = useParams();
  const router = useRouter();
  return <MarksEntry examId={params.id as string} onBack={() => router.push('/teacher/exams')} />;
}
