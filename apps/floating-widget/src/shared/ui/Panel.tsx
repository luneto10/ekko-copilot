import type { ReactNode } from 'react';
import { GLASS_SURFACE } from '@/shared/theme';

interface PanelProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, action, children, className = '', bodyClassName = '' }: PanelProps) {
  return (
    <div className={`flex h-full flex-col ${GLASS_SURFACE} ${className}`}>
      {title != null && (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={`flex-1 overflow-y-auto px-4 py-3 ${bodyClassName}`}>{children}</div>
    </div>
  );
}
