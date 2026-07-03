'use client';

export interface TabDef {
  key: string;
  label: string;
  icon?: string;
}

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-tertiary text-white shadow-soft'
                : 'text-on-surface-variant hover:bg-white/60 hover:text-on-surface'
            }`}
          >
            {t.icon && <span className="material-symbols-outlined !text-[18px]">{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
