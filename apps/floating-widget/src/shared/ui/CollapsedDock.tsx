import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { bridge } from '@/shared/bridge';
import { NO_DRAG_REGION } from '@/shared/electron';

interface CollapsedDockProps {
  isListening: boolean;
  onToggle: () => void;
  onExpand: () => void;
}
export function CollapsedDock({ isListening, onToggle, onExpand }: CollapsedDockProps) {
  const lastY = useRef<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastY.current = e.screenY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lastY.current === null) return;
    const dy = e.screenY - lastY.current;
    if (dy !== 0) {
      lastY.current = e.screenY;
      bridge.moveDock(dy);
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastY.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-end text-slate-100">
      <div className="relative flex items-center">
        {/* Expand tab: a small tab on the left holding the chevron. */}
        <button
          type="button"
          style={NO_DRAG_REGION}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onExpand}
          title="Open WorkIQ"
          aria-label="Open WorkIQ"
          className="glass-surface dock-hover-solid absolute left-0 top-1/2 z-0 flex h-[52px] w-6 -translate-x-[11px] -translate-y-1/2 items-center justify-start rounded-l-md border border-r-0 border-white/10 pl-0.5 text-slate-200 shadow-lg transition hover:bg-white/10"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          title="Drag to move up or down"
          className="glass-surface dock-hover-solid relative z-10 flex h-14 w-14 cursor-grab items-center justify-center rounded-2xl border border-white/10 shadow-2xl active:cursor-grabbing"
        >
          <button
            type="button"
            style={NO_DRAG_REGION}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggle}
            title={isListening ? 'Stop recording' : 'Start recording'}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <span
              className={`bg-rose-500 transition-all duration-300 ${
                isListening
                  ? 'h-5 w-5 rounded-md shadow-[0_0_12px_3px_rgba(244,63,94,0.75)]'
                  : 'h-3 w-3 rounded-full'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
