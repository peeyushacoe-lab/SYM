'use client';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableGrid({
  slots,
  showBatch = false,
  onDelete,
}: {
  slots: any[];
  showBatch?: boolean;
  onDelete?: (id: number) => void;
}) {
  const today = (new Date().getDay() + 6) % 7;

  if (!slots.length) {
    return <div className="card text-sm text-textSecondary">No timetable has been set up yet.</div>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {DAY_NAMES.map((day, idx) => {
        const daySlots = slots.filter((s) => s.day === idx);
        if (!daySlots.length) return null;
        return (
          <div key={day} className={`card ${idx === today ? 'border-tertiary' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[13px] font-semibold text-text">{day}</div>
              {idx === today && <span className="badge badge-blue">Today</span>}
            </div>
            <div className="space-y-2">
              {daySlots.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-2 border-l-2 border-tertiary pl-2.5 py-0.5">
                  <div>
                    <div className="text-sm font-medium text-text">{s.subject}</div>
                    <div className="text-xs text-textSecondary">
                      {s.start_time}
                      {s.end_time ? ` - ${s.end_time}` : ''}
                      {showBatch && s.batch_name ? ` · ${s.batch_name}` : ''}
                      {s.teacher_name ? ` · ${s.teacher_name}` : ''}
                    </div>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(s.id)}
                      className="text-danger hover:bg-dangerLight rounded p-0.5"
                      aria-label="Delete slot"
                    >
                      <span className="material-symbols-outlined !text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
