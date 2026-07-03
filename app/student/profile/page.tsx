'use client';

import { useEffect, useState } from 'react';
import ProfileCard from '@/components/portal/ProfileCard';

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/portal/me?section=profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStudent(d.student);
      });
  }, []);

  if (error) return <div className="card text-sm text-textSecondary">{error}</div>;
  if (!student) return <div className="text-sm text-textSecondary">Loading...</div>;
  return <ProfileCard student={student} />;
}
