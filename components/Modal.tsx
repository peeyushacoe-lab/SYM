'use client';

import { ReactNode } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass-modal relative rounded-xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 sticky top-0 bg-white/85 backdrop-blur-xl rounded-t-xl z-10">
          <h2 className="text-[15px] font-semibold text-on-surface">{title}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors flex items-center" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
