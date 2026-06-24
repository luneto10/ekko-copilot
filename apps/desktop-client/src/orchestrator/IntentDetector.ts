/** High-value sales intents the cold path knows how to ground against Work IQ. */
export type SalesIntent =
  | 'pricing'
  | 'security'
  | 'sla'
  | 'contract'
  | 'integration'
  | 'compliance'
  | 'competitor'
  | 'discount';

const INTENT_KEYWORDS: Record<SalesIntent, string[]> = {
  pricing: ['price', 'pricing', 'cost', 'how much', 'quote', 'budget', 'per seat', 'per user'],
  security: ['security', 'secure', 'encryption', 'soc 2', 'soc2', 'penetration test', 'data breach'],
  sla: ['sla', 'uptime', 'availability', 'downtime', 'service level'],
  contract: ['contract', 'msa', 'renewal', 'terminate', 'termination', 'contract duration', 'lock-in', 'lock in'],
  integration: ['integrate', 'integration', 'api', 'webhook', 'connect to', 'sync with'],
  compliance: ['compliance', 'gdpr', 'hipaa', 'data residency', 'iso 27001', 'fedramp'],
  competitor: ['competitor', 'versus', ' vs ', 'compared to', 'alternative', 'salesforce', 'why you'],
  discount: ['discount', 'cheaper', 'lower price', 'better deal', 'negotiate', 'too expensive'],
};

/** Scans finalized utterances for the first high-value sales trigger. */
export class IntentDetector {
  detect(text: string): SalesIntent | null {
    const haystack = ` ${text.toLowerCase()} `;
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [SalesIntent, string[]][]) {
      if (keywords.some((kw) => haystack.includes(kw))) return intent;
    }
    return null;
  }
}
