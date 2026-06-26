import path from 'node:path';
import type { WorkIqResponse } from '@workiq/types';
import { env, isGraphConfigured, createOpenAiClient } from '../env';
import { RestWorkIqClient } from './RestWorkIqClient';
import { MockWorkIqClient } from './MockWorkIqClient';
import { GraphWorkIqClient } from './GraphWorkIqClient';
import { GraphTokenProvider, StaticTokenProvider, type TokenProvider } from './GraphAuth';

export interface WorkIqClient {
  /**
   * Ground a question against the user's knowledge.
   * @param text  the query to look up
   * @param topic free-form topic label (decided by the AI key-point detector)
   */
  query(text: string, topic: string): Promise<WorkIqResponse>;
}

/** Build the Microsoft Graph client (device-code auth + optional AOAI synthesis). */
function createGraphClient(): WorkIqClient {
  const tokenProvider: TokenProvider = env.graphAccessToken
    ? new StaticTokenProvider(env.graphAccessToken)
    : new GraphTokenProvider(
        env.entraTenantId,
        env.entraClientId,
        env.graphScopes,
        path.join(__dirname, '..', '.msal-cache.json'),
      );
  const openai = createOpenAiClient();
  return new GraphWorkIqClient({ tokenProvider, openai, deployment: env.openAiDeployment });
}

/**
 * Mock by default so the demo runs with zero enterprise dependencies.
 *   WORKIQ_MODE=graph  -> real Microsoft Graph (needs Entra app + consent)
 *   WORKIQ_MODE=real   -> generic REST endpoint (WORKIQ_API_BASE)
 */
export function createWorkIqClient(): WorkIqClient {
  if (env.workIqMode === 'graph' && isGraphConfigured()) {
    console.log('[workiq] using Microsoft Graph client');
    return createGraphClient();
  }
  if (env.workIqMode === 'real' && env.workIqApiBase) {
    console.log('[workiq] using REAL REST client');
    return new RestWorkIqClient();
  }
  console.log('[workiq] using MOCK client');
  return new MockWorkIqClient();
}
