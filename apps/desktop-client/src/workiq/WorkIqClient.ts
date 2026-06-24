import type { WorkIqResponse } from '@workiq/types';
import type { SalesIntent } from '../orchestrator/IntentDetector';
import { env } from '../env';
import { RestWorkIqClient } from './RestWorkIqClient';
import { MockWorkIqClient } from './MockWorkIqClient';

export interface WorkIqClient {
  query(text: string, intent: SalesIntent): Promise<WorkIqResponse>;
}

/**
 * Mock by default so the demo runs with zero enterprise dependencies.
 * Set WORKIQ_MODE=real + WORKIQ_API_BASE to hit a live Microsoft Work IQ endpoint
 * through the exact same interface.
 */
export function createWorkIqClient(): WorkIqClient {
  if (env.workIqMode === 'real' && env.workIqApiBase) {
    console.log('[workiq] using REAL REST client');
    return new RestWorkIqClient();
  }
  console.log('[workiq] using MOCK client');
  return new MockWorkIqClient();
}
