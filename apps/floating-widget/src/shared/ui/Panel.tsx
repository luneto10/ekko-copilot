import type { ReactNode } from 'react';
import { GLASS_SURFACE } from '@/shared/theme';

interface PanelProps {
  /** Heading shown in the title bar. Omit for a bare (title-less) surface. */
  title?: ReactNode;
  /** Optional right-aligned slot in the title bar (status, buttons…). */
  action?: ReactNode;
  /** Panel body. */
  children: ReactNode;
  /** Extra classes for the outer surface. */
  className?: string;
  /** Extra classes for the scrollable body (e.g. `space-y-2`, `prose-copilot`). */
  bodyClassName?: string;
}

/**
 * Reusable translucent panel — a titled, scrollable glass surface.
 *
 * Feature panels compose this instead of re-declaring the same Tailwind classes,
 * which keeps every panel visually consistent and the styling in one place.
 *
 * @example
 * <Panel title="Live Feed" bodyClassName="space-y-2 text-sm">
 *   …content…
 * </Panel>
 */
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
