import type { AzureOpenAI } from 'openai';
import type { WorkIqResponse, WorkIqSource } from '@workiq/types';
import type { WorkIqClient } from './WorkIqClient';
import type { TokenProvider } from './GraphAuth';
import { answerFromSnippets } from './GraphAnswer';
import {
  buildSearchQuery,
  isRetrievalForbidden,
  rankAndTrim,
  stripGraphText,
  toSource,
  type GraphHit,
  type Grounding,
} from './GraphSearch';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA = 'https://graph.microsoft.com/beta';

export interface GraphWorkIqDeps {
  tokenProvider: TokenProvider;
  openai?: AzureOpenAI | null;
  deployment?: string;
  size?: number;
}

export class GraphWorkIqClient implements WorkIqClient {
  private retrievalDisabled = false;

  constructor(private readonly deps: GraphWorkIqDeps) {}

  async query(text: string, topic: string): Promise<WorkIqResponse> {
    const token = await this.deps.tokenProvider.getToken();

    // Prefer semantic retrieval when licensed; fall back to Graph Search for demo tenants.
    let grounding: Grounding | null = null;
    if (!this.retrievalDisabled) {
      try {
        const retrieved = await this.retrieve(token, text || topic);
        if (retrieved.snippets.length > 0) {
          grounding = retrieved;
          console.log('[workiq] grounded via Copilot Retrieval API (semantic)');
        }
      } catch (err) {
        const message = String(err);
        if (isRetrievalForbidden(err)) {
          this.retrievalDisabled = true;
          console.log(
            '[workiq] Copilot Retrieval not licensed; using Graph Search for this session.',
          );
        } else {
          console.log(
            `[workiq] Copilot Retrieval unavailable, using Graph Search: ${message.slice(0, 140)}`,
          );
        }
      }
    }
    if (!grounding) {
      grounding = await this.keywordSearch(token, buildSearchQuery(topic, text));
    }

    const answer = await answerFromSnippets(this.deps, text, grounding.snippets);
    return { query: text, answer, sources: grounding.sources, topic };
  }

  private async retrieve(token: string, query: string): Promise<Grounding> {
    const response = await fetch(`${GRAPH_BETA}/copilot/retrieval`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryString: query,
        dataSource: 'sharePoint',
        maximumNumberOfResults: this.deps.size ?? 5,
      }),
    });
    if (!response.ok) {
      throw new Error(`Copilot retrieval ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    const data = (await response.json()) as {
      retrievalHits?: Array<{
        webUrl?: string;
        extracts?: Array<{ text?: string }>;
        resourceMetadata?: { title?: string };
      }>;
    };
    const hits = data.retrievalHits ?? [];
    const sources: WorkIqSource[] = hits.map((hit) => ({
      title: hit.resourceMetadata?.title ?? hit.webUrl ?? 'Document',
      url: hit.webUrl ?? '#',
      kind: 'sharepoint',
    }));
    const snippets = hits
      .flatMap((hit) => (hit.extracts ?? []).map((extract) => stripGraphText(extract.text ?? '')))
      .filter((s) => s.length > 0);
    return { sources, snippets };
  }

  private async keywordSearch(token: string, searchQuery: string): Promise<Grounding> {
    const candidates = 8;
    const results = await Promise.allSettled([
      this.search(token, searchQuery, 'driveItem', candidates),
      this.search(token, searchQuery, 'message', candidates),
    ]);

    const hits: GraphHit[] = [];
    const errors: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') hits.push(...result.value);
      else errors.push(String(result.reason));
    }
    if (hits.length === 0 && errors.length === results.length) {
      throw new Error(errors.join(' | '));
    }

    const items = hits.map((hit) => ({
      source: toSource(hit),
      text: stripGraphText(hit.summary ?? ''),
    }));
    const ranked = rankAndTrim(items, searchQuery, this.deps.size ?? 4);
    return {
      sources: ranked.map((item) => item.source),
      snippets: ranked.map((item) => item.text).filter((s) => s.length > 0),
    };
  }

  private async search(
    token: string,
    text: string,
    entityType: 'driveItem' | 'message' | 'listItem',
    size: number,
  ): Promise<GraphHit[]> {
    const response = await fetch(`${GRAPH_BASE}/search/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ entityTypes: [entityType], query: { queryString: text }, from: 0, size }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Graph search (${entityType}) ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as {
      value?: Array<{ hitsContainers?: Array<{ hits?: GraphHit[] }> }>;
    };
    return data.value?.[0]?.hitsContainers?.[0]?.hits ?? [];
  }

}
