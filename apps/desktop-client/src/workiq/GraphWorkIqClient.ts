import type { AzureOpenAI } from 'openai';
import type { WorkIqResponse, WorkIqSource } from '@workiq/types';
import type { WorkIqClient } from './WorkIqClient';
import type { TokenProvider } from './GraphAuth';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA = 'https://graph.microsoft.com/beta';

/** Grounding material (files + extracted text) produced by either path. */
interface Grounding {
  sources: WorkIqSource[];
  snippets: string[];
}

/** Subset of a Microsoft Graph search hit we care about. */
interface GraphHit {
  summary?: string;
  resource?: {
    '@odata.type'?: string;
    name?: string;
    subject?: string;
    webUrl?: string;
    webLink?: string;
    fields?: { title?: string };
  };
}

export interface GraphWorkIqDeps {
  /** Supplies a delegated Microsoft Graph access token. */
  tokenProvider: TokenProvider;
  /** Optional Azure OpenAI client to synthesize a concise answer (RAG). */
  openai?: AzureOpenAI | null;
  /** Azure OpenAI deployment name (required if `openai` is set). */
  deployment?: string;
  /** How many search hits to retrieve. */
  size?: number;
}

/**
 * Real Work IQ grounding against the user's Microsoft 365 content via the
 * **Microsoft Graph Search API** (`POST /search/query`), then an optional Azure
 * OpenAI pass to turn the retrieved snippets into a concise answer.
 *
 * Dependency-injected (token + OpenAI) so it's trivial to unit-test or drive
 * from the standalone `testGraph` harness. The factory in `WorkIqClient.ts`
 * builds it from env.
 */
export class GraphWorkIqClient implements WorkIqClient {
  /** Set once a licensing 403 is seen, so we stop re-trying Copilot Retrieval. */
  private retrievalDisabled = false;

  constructor(private readonly deps: GraphWorkIqDeps) {}

  async query(text: string, topic: string): Promise<WorkIqResponse> {
    const token = await this.deps.tokenProvider.getToken();

    // 1) Prefer the SEMANTIC Microsoft 365 Copilot Retrieval API ("Work IQ"),
    //    which understands natural-language questions and grounds on the user's
    //    work content. 2) Fall back to keyword Search if Copilot isn't licensed
    //    or available in the tenant.
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
        // A licensing 403 won't change this session — stop retrying (and logging).
        if (/403|license|forbidden/i.test(message)) {
          this.retrievalDisabled = true;
          console.log(
            '[workiq] Copilot Retrieval not licensed — using Graph Search for this session.',
          );
        } else {
          console.log(
            `[workiq] Copilot Retrieval unavailable, using Graph Search — ${message.slice(0, 140)}`,
          );
        }
      }
    }
    if (!grounding) {
      grounding = await this.keywordSearch(token, buildSearchQuery(topic, text));
    }

    const answer = await this.answerFrom(text, grounding.snippets);
    return { query: text, answer, sources: grounding.sources, topic };
  }

  /**
   * Semantic retrieval via the Microsoft 365 Copilot Retrieval API. Requires a
   * Microsoft 365 Copilot license; throws (so the caller falls back) otherwise.
   */
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
      .flatMap((hit) => (hit.extracts ?? []).map((extract) => stripHtml(extract.text ?? '')))
      .filter((s) => s.length > 0);
    return { sources, snippets };
  }

  /** Keyword Search API fallback (files + mail), merged into one grounding set. */
  private async keywordSearch(token: string, searchQuery: string): Promise<Grounding> {
    // Fetch a few extra candidates, then re-rank + trim for precision.
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
      text: stripHtml(hit.summary ?? ''),
    }));
    const ranked = rankAndTrim(items, searchQuery, this.deps.size ?? 4);
    return {
      sources: ranked.map((item) => item.source),
      snippets: ranked.map((item) => item.text).filter((s) => s.length > 0),
    };
  }

  /** Run a single-entity Graph search and return its hits. */
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

  /** Synthesize a short answer from the snippets (Azure OpenAI), or join them. */
  private async answerFrom(question: string, snippets: string[]): Promise<string> {
    if (snippets.length === 0) {
      return 'No matching documents were found in your Microsoft 365 content for this query.';
    }
    if (!this.deps.openai || !this.deps.deployment) {
      return snippets.slice(0, 3).join('\n\n');
    }
    const completion = await this.deps.openai.chat.completions.create({
      model: this.deps.deployment,
      temperature: 0.2,
      max_tokens: 110,
      messages: [
        {
          role: 'system',
          content:
            'You are a real-time sales copilot. Answer the rep in AT MOST 2 short sentences ' +
            '(or up to 3 terse bullets) using ONLY the provided snippets. Lead with the key ' +
            'number or fact, be direct, and do not list everything you found. No preamble, no ' +
            'filler, no invented facts.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nSnippets:\n${snippets
            .slice(0, 5)
            .map((s, i) => `[${i + 1}] ${s}`)
            .join('\n\n')}`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || snippets[0];
  }
}

/** Map a Graph hit to a Work IQ source chip. */
function toSource(hit: GraphHit): WorkIqSource {
  const resource = hit.resource ?? {};
  const odataType = resource['@odata.type'] ?? '';
  if (odataType.includes('message')) {
    return { title: resource.subject ?? '(email)', url: resource.webLink ?? '#', kind: 'email' };
  }
  const title = resource.name ?? resource.fields?.title ?? resource.webUrl ?? 'Document';
  return { title, url: resource.webUrl ?? '#', kind: 'sharepoint' };
}

/** Strip Graph's `<c0>`/HTML highlight tags and collapse whitespace. */
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Low-signal words to drop when turning a topic/question into a search query. */
const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'your', 'our', 'with', 'of', 'to', 'is', 'are', 'in', 'on',
  'how', 'what', 'do', 'does', 'can', 'we', 'a', 'an', 'about', 'details', 'platform', 'per',
  'this', 'that', 'it', 'be', 'have', 'has', 'will', 'would', 'should', 'you',
]);

/**
 * Turn the distilled topic (e.g. "SOC 2", "Contract term and early cancellation")
 * into a high-recall Graph query by keeping the significant terms and joining
 * them with OR, so a document matching ANY term is returned and then ranked.
 */
function buildSearchQuery(topic: string, fallback: string): string {
  const source = (topic || fallback).toLowerCase();
  const terms = source
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  const unique = [...new Set(terms)];
  if (unique.length === 0) return (topic || fallback).trim() || '*';
  return unique.join(' OR ');
}

/** A scored search result candidate. */
interface RankedItem {
  source: WorkIqSource;
  text: string;
}

/**
 * Tighten a broad OR search: de-duplicate by title, score each result by how
 * many query terms appear in its title (weighted) and snippet, prefer documents
 * over email, drop zero-matches, and keep only the top `limit` — so noise like
 * unrelated docs and repeated email digests doesn't leak through.
 */
function rankAndTrim(items: RankedItem[], query: string, limit: number): RankedItem[] {
  const terms = [
    ...new Set(query.toLowerCase().split(/[^a-z0-9]+/i).filter((w) => w.length >= 3 && w !== 'or')),
  ];

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.source.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => {
      const title = item.source.title.toLowerCase();
      const text = item.text.toLowerCase();
      let score = item.source.kind === 'email' ? 0 : 1; // prefer documents
      for (const term of terms) {
        if (title.includes(term)) score += 2;
        if (text.includes(term)) score += 1;
      }
      return { item, score };
    })
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map((scored) => scored.item);
}
