import type { WorkIqSource } from '@workiq/types';
import type { KeyNote } from './types';

const TOPIC_LABEL: Record<string, string> = {
  pricing: 'Pricing',
  security: 'Security',
  sla: 'SLA',
  contract: 'Contract',
  integration: 'Integration',
  compliance: 'Compliance',
  competitor: 'Competitor',
  discount: 'Discount',
};

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  pricing: ['What volume discounts apply?', 'Is annual prepay cheaper?', 'Draft a 400-seat quote?'],
  security: ['Share the SOC 2 report', 'How is data encrypted?', 'When was the last pen test?'],
  sla: ['What are the service credits?', 'P1 response time?', 'Is 99.99% available?'],
  contract: ['Can we do month-to-month?', 'What is the opt-out window?', 'Multi-year discount?'],
  integration: ['Is there a Salesforce connector?', 'Average go-live time?', 'Do you have webhooks?'],
  compliance: ['Is there a HIPAA BAA?', 'EU data residency?', 'GDPR sub-processors?'],
  competitor: ['How do we beat Acme?', 'What is our main edge?', 'Where do we lose?'],
  discount: ['Max rep-approved discount?', 'What needs director sign-off?', 'Best ROI angle?'],
};

const GENERIC_SUGGESTIONS = ['Summarize this for me', 'What should I say next?', 'Show related docs'];

const FALLBACK_SOURCES: WorkIqSource[] = [
  { title: 'Account Notes - Contoso.docx', url: 'https://contoso.sharepoint.com/sites/sales/notes', kind: 'sharepoint' },
  { title: 'Re: Follow-up from discovery call', url: 'https://outlook.office.com/mail/followup', kind: 'email' },
];

const TOPIC_KEYWORDS: Array<[string, string[]]> = [
  ['pricing', ['price', 'pricing', 'cost', 'plan', 'seat', 'user']],
  ['security', ['security', 'soc', 'encryption', 'encrypt']],
  ['sla', ['sla', 'uptime', 'availability', 'credits']],
  ['contract', ['contract', 'term', 'renewal', 'cancel', 'cancellation']],
  ['integration', ['integration', 'integrate', 'api', 'connector', 'salesforce']],
  ['compliance', ['compliance', 'gdpr', 'hipaa', 'residency']],
  ['competitor', ['competitor', 'different', 'alternative', 'compare']],
  ['discount', ['discount', 'approval', 'volume']],
];

function topicKey(topic: string | undefined): string | undefined {
  const value = topic?.trim().toLowerCase();
  if (!value) return undefined;
  if (TOPIC_LABEL[value]) return value;
  return TOPIC_KEYWORDS.find(([, words]) => words.some((word) => value.includes(word)))?.[0];
}

export function topicLabel(topic: string | undefined, query: string): string {
  const key = topicKey(topic);
  if (key) return TOPIC_LABEL[key];
  if (topic) return topic.charAt(0).toUpperCase() + topic.slice(1);
  const trimmed = query.trim();
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed || 'Note';
}

export function suggestionsFor(topic: string | undefined): string[] {
  const key = topicKey(topic);
  return (key && TOPIC_SUGGESTIONS[key]) || GENERIC_SUGGESTIONS;
}

export async function mockFollowUp(
  question: string,
  note: KeyNote,
): Promise<{ answer: string; sources: WorkIqSource[] }> {
  await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 350));

  const answer =
    `I found matching ${note.topic} material for "${question.trim()}". ` +
    `Use the attached source, keep the reply specific, and avoid guessing beyond it.`;

  const sources = note.sources.length > 0 ? note.sources.slice(0, 2) : FALLBACK_SOURCES;
  return { answer, sources };
}
