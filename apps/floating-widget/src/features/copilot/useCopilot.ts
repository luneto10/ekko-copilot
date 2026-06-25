import { useEffect, useState } from 'react';
import type { CopilotTactic } from '@workiq/types';
import { bridge } from '@/shared/bridge';

/**
 * Owns the latest Wolf Tactic — the real-time coaching nudge. The main process
 * only emits new tactics while the rep is actively listening, so this stops
 * updating once the call ends.
 */
export function useCopilot() {
  const [tactic, setTactic] = useState<CopilotTactic | null>(null);

  useEffect(() => bridge.onTactic((next) => setTactic(next)), []);

  return { tactic };
}
