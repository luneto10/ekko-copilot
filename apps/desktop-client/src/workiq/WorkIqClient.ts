import type { WorkIqResponse } from '@workiq/types';
import { env } from '../env';
import { RestWorkIqClient } from './RestWorkIqClient';
import { MockWorkIqClient } from './MockWorkIqClient';

export interface WorkIqClient {
  /**
   * Ground a question against the user's knowledge.
   * @param text  the query to look up
   * @param topic free-form topic label (decided by the AI key-point detector)
   */
  query(text: string, topic: string): Promise<WorkIqResponse>;
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
