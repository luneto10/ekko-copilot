import type { WorkIqSource } from '@workiq/types';

export interface Grounding {
  sources: WorkIqSource[];
  snippets: string[];
}

export interface GraphHit {
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

export interface RankedItem {
  source: WorkIqSource;
  text: string;
}

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'your', 'our', 'with', 'of', 'to', 'is', 'are', 'in', 'on',
  'how', 'what', 'do', 'does', 'can', 'we', 'a', 'an', 'about', 'details', 'platform', 'per',
  'this', 'that', 'it', 'be', 'have', 'has', 'will', 'would', 'should', 'you',
]);

export function toSource(hit: GraphHit): WorkIqSource {
  const resource = hit.resource ?? {};
  const odataType = resource['@odata.type'] ?? '';
  if (odataType.includes('message')) {
    return { title: resource.subject ?? '(email)', url: resource.webLink ?? '#', kind: 'email' };
  }
  const title = resource.name ?? resource.fields?.title ?? resource.webUrl ?? 'Document';
  return { title, url: resource.webUrl ?? '#', kind: 'sharepoint' };
}

export function stripGraphText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchQuery(topic: string, fallback: string): string {
  const source = (topic || fallback).toLowerCase();
  const terms = source
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  const unique = [...new Set(terms)];
  if (unique.length === 0) return (topic || fallback).trim() || '*';
  return unique.join(' OR ');
}

export function rankAndTrim(items: RankedItem[], query: string, limit: number): RankedItem[] {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length >= 3 && word !== 'or'),
    ),
  ];

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.source.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ item, score: scoreItem(item, terms) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map((scored) => scored.item);
}

export function isRetrievalForbidden(err: unknown): boolean {
  return /403|license|forbidden/i.test(String(err));
}

function scoreItem(item: RankedItem, terms: string[]): number {
  const title = item.source.title.toLowerCase();
  const text = item.text.toLowerCase();
  let score = item.source.kind === 'email' ? 0 : 1;
  for (const term of terms) {
    if (title.includes(term)) score += 4;
    if (text.includes(term)) score += 1;
  }
  return score;
}