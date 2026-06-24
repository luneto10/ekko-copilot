import { useEffect, useState } from 'react';
import type { CopilotTactic, WorkIqResponse } from '@workiq/types';
import { bridge } from '@/shared/bridge';

/**
 * Owns the Copilot panel's state: the async Work IQ lookup (loading query +
 * grounded result) and the latest Wolf Tactic. Subscribes to three channels and
 * tears all of them down on unmount.
 */
export function useCopilot() {
  /** The query currently being searched, or `null` when idle. */
  const [searching, setSearching] = useState<string | null>(null);
  const [workIq, setWorkIq] = useState<WorkIqResponse | null>(null);
  const [tactic, setTactic] = useState<CopilotTactic | null>(null);

  useEffect(() => {
    const unsubscribers = [
      bridge.onWorkIqStatus((status) => setSearching(status.isSearching ? status.query : null)),
      bridge.onWorkIqResult((result) => {
        setWorkIq(result);
        setSearching(null);
      }),
      bridge.onTactic((next) => setTactic(next)),
    ];
    return () => unsubscribers.forEach((off) => off());
  }, []);

  return { searching, workIq, tactic };
}
