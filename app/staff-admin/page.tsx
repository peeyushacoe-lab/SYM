'use client';

import StaffAttendanceGrid from '@/components/StaffAttendanceGrid';

// Limited home page for the Administrator staff login: only attendance
// marking, nothing else (see requireRole('management', 'staff_admin') in
// /api/staff-attendance, and the auto-created login in /api/staff).
export default function StaffAdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-medium text-text">Staff Attendance</h1>
        <p className="text-xs text-textSecondary mt-0.5">Mark daily attendance for every staff member.</p>
      </div>
      <StaffAttendanceGrid />
    </div>
  );
}
