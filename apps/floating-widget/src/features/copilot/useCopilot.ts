import { useEffect, useState } from 'react';
import type { CopilotTactic } from '@workiq/types';
import { bridge } from '@/shared/bridge';

export function useCopilot() {
  const [tactic, setTactic] = useState<CopilotTactic | null>(null);

  useEffect(() => bridge.onTactic((next) => setTactic(next)), []);

  return { tactic };
}
