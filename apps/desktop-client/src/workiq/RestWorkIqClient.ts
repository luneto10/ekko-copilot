import type { WorkIqResponse, WorkIqSource } from '@workiq/types';
import type { WorkIqClient } from './WorkIqClient';
import { env } from '../env';

/** Shape we expect back from the Work IQ REST API (adjust to the real contract). */
interface WorkIqApiResponse {
  answer?: string;
  citations?: Array<{ title?: string; url?: string; type?: string }>;
}

/**
 * Real Microsoft Work IQ REST client. Non-blocking POST authenticated with an
 * Azure Entra ID bearer token. Swapped in via WORKIQ_MODE=real. The token here
 * is a placeholder env var; replace getBearerToken() with @azure/identity
 * (e.g. ClientSecretCredential / DefaultAzureCredential) for production.
 */
export class RestWorkIqClient implements WorkIqClient {
  private async getBearerToken(): Promise<string> {
    // Placeholder: a statically provided token. Swap for an Entra ID credential flow.
    return env.workIqBearerToken;
  }

  async query(text: string, topic: string): Promise<WorkIqResponse> {
    const token = await this.getBearerToken();
    const response = await fetch(`${env.workIqApiBase.replace(/\/$/, '')}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: text, topic }),
    });

    if (!response.ok) {
      throw new Error(`Work IQ API ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as WorkIqApiResponse;
    const sources: WorkIqSource[] = (data.citations ?? []).map((c) => ({
      title: c.title ?? 'Untitled',
      url: c.url ?? '#',
      kind: (c.type as WorkIqSource['kind']) ?? 'document',
    }));

    return { query: text, answer: data.answer ?? '', sources, topic };
  }
}
