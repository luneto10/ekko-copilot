import type { WorkIqSource } from '@workiq/types';
import type { KeyNote } from './types';

/**
 * Renderer-side MOCK of a Work IQ follow-up search. Real grounding for the
 * initial key note happens in the main process; follow-up questions inside a
 * note's chat are mocked here so the UX stays fast and self-contained.
 */

/** Human-friendly pill label per known topic/intent. */
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

/** Suggested follow-up questions, tuned per topic to feel context-aware. */
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

/** A small pool of believable grounding files for mocked follow-ups. */
const FALLBACK_SOURCES: WorkIqSource[] = [
  { title: 'Account Notes — Contoso.docx', url: 'https://contoso.sharepoint.com/sites/sales/notes', kind: 'sharepoint' },
  { title: 'Re: Follow-up from discovery call', url: 'https://outlook.office.com/mail/followup', kind: 'email' },
];

/** Resolve the pill label from a topic/intent, falling back to the raw query. */
export function topicLabel(topic: string | undefined, query: string): string {
  if (topic && TOPIC_LABEL[topic]) return TOPIC_LABEL[topic];
  if (topic) return topic.charAt(0).toUpperCase() + topic.slice(1);
  const trimmed = query.trim();
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed || 'Note';
}

/** Suggested follow-ups for a topic. */
export function suggestionsFor(topic: string | undefined): string[] {
  return (topic && TOPIC_SUGGESTIONS[topic]) || GENERIC_SUGGESTIONS;
}

/**
 * Mocked Work IQ follow-up: returns a quick grounded-sounding answer plus a
 * couple of source files. Reuses the note's own files when available.
 */
export async function mockFollowUp(
  question: string,
  note: KeyNote,
): Promise<{ answer: string; sources: WorkIqSource[] }> {
  // Quick, as requested — a short simulated search.
  await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 350));

  const topic = note.topic.toLowerCase();
  const answer =
    `Based on the ${note.topic} materials, here's what I found for "${question.trim()}": ` +
    `the documents confirm our standard position and give you a concrete number to quote. ` +
    `Lead with the value, then reference the attached file if they push back.`;

  const sources = note.sources.length > 0 ? note.sources.slice(0, 2) : FALLBACK_SOURCES;
  void topic;
  return { answer, sources };
}
