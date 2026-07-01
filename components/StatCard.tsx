export default function StatCard({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'red' | 'amber';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-primaryLight text-primary',
    green: 'bg-accentLight text-emerald-700',
    red: 'bg-dangerLight text-danger',
    amber: 'bg-warningLight text-warning',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-textSecondary">{label}</div>
          <div className="text-[22px] font-medium text-text mt-1">{value}</div>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <span className="w-2 h-2 rounded-full bg-current" />
        </div>
      </div>
    </div>
  );
}
