export default function StatCard({
  label,
  value,
  tone = 'blue',
  icon,
}: {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'red' | 'amber';
  icon?: string;
}) {
  const tones: Record<string, string> = {
    blue: 'bg-surface-container-high text-tertiary',
    green: 'bg-accentLight text-accent',
    red: 'bg-error-container text-on-error-container',
    amber: 'bg-warningLight text-warning',
  };
  const defaultIcons: Record<string, string> = {
    blue: 'group',
    green: 'trending_up',
    red: 'priority_high',
    amber: 'schedule',
  };
  return (
    <div className="card relative group overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-fixed/30 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
      <div className="relative flex flex-col gap-2">
        <div className={`p-2 rounded-lg w-fit ${tones[tone]}`}>
          <span className="material-symbols-outlined">{icon || defaultIcons[tone]}</span>
        </div>
        <div>
          <p className="text-[12px] font-medium text-on-surface-variant mb-0.5">{label}</p>
          <p className="text-[26px] font-semibold tracking-tight text-on-surface leading-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
