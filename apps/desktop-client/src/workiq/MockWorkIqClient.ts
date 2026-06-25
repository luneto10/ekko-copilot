import type { WorkIqResponse, WorkIqSource } from '@workiq/types';
import type { SalesIntent } from '../orchestrator/IntentDetector';
import { IntentDetector } from '../orchestrator/IntentDetector';
import type { WorkIqClient } from './WorkIqClient';

interface CannedAnswer {
  answer: string;
  sources: WorkIqSource[];
}

const CANNED: Record<SalesIntent, CannedAnswer> = {
  pricing: {
    answer:
      'Standard tier is $32/user/mo; Enterprise is $58/user/mo with volume breaks at 250+ seats. Annual prepay earns a 15% reduction. A custom quote for ~400 seats was drafted last quarter.',
    sources: [
      { title: 'Pricing & Packaging FY26.xlsx', url: 'https://contoso.sharepoint.com/sites/sales/pricing', kind: 'sharepoint' },
      { title: 'Re: Enterprise quote — 400 seats', url: 'https://outlook.office.com/mail/quote-400', kind: 'email' },
    ],
  },
  security: {
    answer:
      'We are SOC 2 Type II and ISO 27001 certified. Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Third-party penetration tests run twice a year; the latest report is available under NDA.',
    sources: [
      { title: 'Security & Compliance Whitepaper.pdf', url: 'https://contoso.sharepoint.com/sites/trust/security', kind: 'document' },
      { title: 'SOC 2 Type II Report (2025)', url: 'https://contoso.sharepoint.com/sites/trust/soc2', kind: 'sharepoint' },
    ],
  },
  sla: {
    answer:
      'Enterprise SLA guarantees 99.9% monthly uptime with service credits beyond 43 min of downtime. P1 incident response is 15 minutes, 24/7.',
    sources: [
      { title: 'Enterprise SLA Addendum.docx', url: 'https://contoso.sharepoint.com/sites/legal/sla', kind: 'sharepoint' },
    ],
  },
  contract: {
    answer:
      'Standard term is 12 months with auto-renewal and a 60-day opt-out window. Multi-year deals (24/36 mo) unlock price-lock and additional discounts. Month-to-month is available on Enterprise only.',
    sources: [
      { title: 'MSA Template v4.docx', url: 'https://contoso.sharepoint.com/sites/legal/msa', kind: 'sharepoint' },
      { title: 'Re: Redlines on contract term', url: 'https://outlook.office.com/mail/redlines-term', kind: 'email' },
    ],
  },
  integration: {
    answer:
      'Native connectors exist for Salesforce, Dynamics 365, Slack, and Teams. A REST API + webhooks cover everything else; average integration go-live is under two weeks.',
    sources: [
      { title: 'Integration Catalog.aspx', url: 'https://contoso.sharepoint.com/sites/product/integrations', kind: 'sharepoint' },
      { title: 'Developer API Reference', url: 'https://developer.contoso.com/api', kind: 'document' },
    ],
  },
  compliance: {
    answer:
      'GDPR compliant with EU data residency available in the West Europe and North Europe regions. HIPAA BAA available on Enterprise. ISO 27701 (privacy) certification completed in 2025.',
    sources: [
      { title: 'GDPR & Data Residency.pdf', url: 'https://contoso.sharepoint.com/sites/trust/gdpr', kind: 'document' },
    ],
  },
  competitor: {
    answer:
      'Versus the incumbent: we win on time-to-value (2 weeks vs ~3 months) and native Teams integration. Their advantage is a larger marketplace. Lead with the embedded workflow story.',
    sources: [
      { title: 'Competitive Battlecard — Us vs Acme.pptx', url: 'https://contoso.sharepoint.com/sites/sales/battlecards', kind: 'sharepoint' },
    ],
  },
  discount: {
    answer:
      'Up to 15% is rep-approved with annual prepay; 16–25% needs director sign-off and a 24-month term. Avoid leading with price — anchor on the ROI model first.',
    sources: [
      { title: 'Discount Approval Matrix.xlsx', url: 'https://contoso.sharepoint.com/sites/sales/discounts', kind: 'sharepoint' },
    ],
  },
};

/** Generic grounding for free-form topics the canned set doesn't cover. */
const GENERIC_SOURCES: WorkIqSource[] = [
  { title: 'Account Notes — Contoso.docx', url: 'https://contoso.sharepoint.com/sites/sales/notes', kind: 'sharepoint' },
  { title: 'Re: Follow-up from discovery call', url: 'https://outlook.office.com/mail/discovery', kind: 'email' },
];

/** Simulated Work IQ grounding with realistic enterprise latency (1.5–3s). */
export class MockWorkIqClient implements WorkIqClient {
  /** Maps a free-form AI topic (or the raw query) onto a canned intent, if any. */
  private readonly detector = new IntentDetector();

  async query(text: string, topic: string): Promise<WorkIqResponse> {
    const latency = 1500 + Math.random() * 1500;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const intent = this.detector.detect(`${topic} ${text}`);
    if (intent) {
      const canned = CANNED[intent];
      return { query: text, answer: canned.answer, sources: canned.sources, topic };
    }

    // Novel topic the AI named that we have no canned answer for — still ground
    // it plausibly so the demo flows for any conversation.
    return {
      query: text,
      answer:
        `Here's what I found on ${topic}: our materials cover this and I've pulled the most ` +
        `relevant files. Confirm the specifics below before you answer the customer.`,
      sources: GENERIC_SOURCES,
      topic,
    };
  }
}
