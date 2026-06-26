/**
 * Uploads a few sample sales documents into the signed-in user's OneDrive so
 * Microsoft Graph search returns real FILE hits (not just email).
 *
 *   npm run -w @workiq/desktop-client samples:upload
 *
 * Requires the Entra app to ALSO have the delegated **Files.ReadWrite.All**
 * permission granted + admin-consented (the runtime app is read-only; this is a
 * one-time admin seeding task). Uses the same device-code login as the test.
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { GraphTokenProvider } from './GraphAuth';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const FOLDER = 'WorkIQ Samples';

/** Sample sales collateral, written as Markdown so search indexes the text. */
const SAMPLES: Record<string, string> = {
  // --- Pricing ---
  'Pricing - WorkIQ FY26.md':
    '# WorkIQ Pricing FY26\n\n- Standard tier: $32 per user / month\n- Enterprise tier: $58 per user / month, volume breaks at 250+ seats\n- Annual prepay earns a 15% discount\n- A custom quote for ~400 seats was drafted last quarter\n',
  'Pricing - Discount Approval Matrix.md':
    '# Discount Approval Matrix\n\n- Up to 15%: rep-approved with annual prepay\n- 16-25%: director sign-off and a 24-month term\n- 26%+: VP approval, strategic accounts only\n- Avoid leading with price; anchor on the ROI model first\n',
  'Pricing - ROI Model.md':
    '# ROI Model\n\n- Average customer saves 6 hours/week/user on reconciliation\n- Payback period: under 4 months for a 200-seat deployment\n- 3-year NPV positive at 12% discount rate\n',
  'Pricing - Volume Tiers.md':
    '# Volume Pricing Tiers\n\n- 1-249 seats: list price\n- 250-499 seats: 8% off\n- 500-999 seats: 14% off\n- 1000+ seats: custom enterprise agreement\n',

  // --- Security ---
  'Security - Overview.md':
    '# Security & Compliance Overview\n\n- SOC 2 Type II and ISO 27001 certified\n- Data encrypted at rest (AES-256) and in transit (TLS 1.3)\n- Third-party penetration tests run twice a year; report under NDA\n',
  'Security - SOC 2 Summary.md':
    '# SOC 2 Type II Summary\n\n- Independent audit covering security, availability, confidentiality\n- No exceptions noted in the latest report (2025)\n- Continuous monitoring with annual re-certification\n',
  'Security - Penetration Test Findings.md':
    '# Penetration Test Findings 2025\n\n- Conducted by an independent third party in Q1 and Q3\n- No critical or high findings open\n- All medium findings remediated within 30 days\n',
  'Security - Data Residency.md':
    '# Data Residency\n\n- EU data residency available in West Europe and North Europe\n- US data stored in East US and West US 2\n- Customer-selectable region at provisioning time\n',

  // --- SLA / Support ---
  'SLA - Enterprise.md':
    '# Enterprise SLA\n\n- 99.9% monthly uptime; service credits beyond 43 minutes of downtime\n- P1 incident response: 15 minutes, 24/7\n- Quarterly availability reports provided\n',
  'SLA - Support Tiers.md':
    '# Support Tiers\n\n- Standard: business-hours email, 8-hour response\n- Premier: 24/7 phone + chat, 1-hour P1 response\n- Designated TAM included with Premier\n',

  // --- Contracts ---
  'Contract - MSA Template Summary.md':
    '# MSA Template v4 Summary\n\n- 12-month standard term with auto-renewal\n- 60-day opt-out window before renewal\n- Liability cap at 12 months of fees\n',
  'Contract - Renewal Terms.md':
    '# Renewal Terms\n\n- Auto-renew unless cancelled 60 days prior\n- Multi-year (24/36 mo) unlocks price-lock and discounts\n- Month-to-month available on Enterprise only\n',
  'Contract - Redlines Playbook.md':
    '# Redlines Playbook\n\n- Acceptable: mutual indemnity, 30-day payment terms\n- Escalate: unlimited liability, source-code escrow\n- Standard data processing addendum attached\n',

  // --- Integration ---
  'Integration - Catalog.md':
    '# Integration Catalog\n\n- Native connectors: Salesforce, Dynamics 365, Slack, Teams\n- REST API + webhooks for everything else\n- Average integration go-live under two weeks\n',
  'Integration - API Reference.md':
    '# Developer API Reference\n\n- OAuth 2.0 + API keys\n- Rate limit: 600 requests/minute\n- Webhooks for record create/update/delete events\n',
  'Integration - Teams App.md':
    '# Microsoft Teams Integration\n\n- Embedded tab and bot for in-call workflows\n- Single sign-on via Entra ID\n- Adaptive Cards for approvals\n',

  // --- Compliance ---
  'Compliance - GDPR.md':
    '# GDPR & Data Privacy\n\n- GDPR compliant with EU data residency\n- Data Processing Addendum available\n- Sub-processor list published and versioned\n',
  'Compliance - HIPAA.md':
    '# HIPAA\n\n- HIPAA BAA available on Enterprise\n- PHI encrypted and access-logged\n- Annual risk assessment performed\n',
  'Compliance - ISO 27701.md':
    '# ISO 27701 Privacy\n\n- ISO 27701 (privacy) certification completed in 2025\n- Privacy Information Management System in place\n- Aligned with ISO 27001 controls\n',

  // --- Competitive ---
  'Competitor - Battlecard Acme.md':
    '# Competitive Battlecard - Us vs Acme\n\n- We win on time-to-value: ~2 weeks vs ~3 months\n- Native Microsoft Teams integration\n- Their advantage: larger third-party marketplace\n',
  'Competitor - Battlecard Salesforce.md':
    '# Competitive Battlecard - Us vs Salesforce\n\n- Lower total cost of ownership\n- Faster onboarding, no heavy admin overhead\n- Position embedded workflow over platform breadth\n',
  'Competitor - Win Loss Analysis.md':
    '# Win/Loss Analysis Q2\n\n- Won 62% of competitive deals\n- Top win reason: integration speed\n- Top loss reason: incumbent lock-in\n',

  // --- Case studies ---
  'Case Study - Contoso.md':
    '# Case Study: Contoso\n\n- Reduced month-end close from 9 to 4 days\n- 40-person operations team, ROI in 3 months\n- Expanded from 100 to 400 seats in year one\n',
  'Case Study - Fabrikam.md':
    '# Case Study: Fabrikam\n\n- Consolidated 3 tools into one\n- Cut data reconciliation time by 70%\n- Improved forecast accuracy by 15 points\n',
  'Case Study - Northwind Traders.md':
    '# Case Study: Northwind Traders\n\n- Global rollout across 6 regions\n- Standardized reporting and approvals\n- Saved an estimated $1.2M annually\n',
  'Case Study - Adventure Works.md':
    '# Case Study: Adventure Works\n\n- Manufacturing vertical deployment\n- Integrated with Dynamics 365 in 10 days\n- 99.95% uptime over 12 months\n',

  // --- Product ---
  'Product - Overview.md':
    '# Product Overview\n\n- Real-time data reconciliation across tools\n- AI-assisted insights and recommendations\n- Embedded in Microsoft Teams and Outlook\n',
  'Product - Roadmap FY26.md':
    '# Roadmap FY26\n\n- Q1: Copilot grounding GA\n- Q2: advanced approvals workflow\n- Q3: SAP and Workday connectors\n',
  'Product - Release Notes.md':
    '# Release Notes\n\n- New: configurable dashboards\n- Improved: search latency reduced 30%\n- Fixed: timezone handling in reports\n',

  // --- Onboarding ---
  'Onboarding - Implementation Plan.md':
    '# Implementation Plan\n\n- Week 1: provisioning and SSO\n- Week 2: connector setup and data mapping\n- Week 3: pilot with 20 users\n- Week 4: org-wide rollout\n',
  'Onboarding - Admin Training Guide.md':
    '# Admin Training Guide\n\n- Managing users and roles\n- Configuring connectors\n- Setting up approval workflows and alerts\n',

  // --- Sales process ---
  'Sales - Discovery Questions.md':
    '# Discovery Questions\n\n- Where does your team lose the most time today?\n- How many tools are involved in reconciliation?\n- What is the impact during month-end close?\n',
  'Sales - Objection Handling.md':
    '# Objection Handling\n\n- "Too expensive": reframe on ROI and time saved\n- "We already have a tool": highlight consolidation\n- "Security concerns": share SOC 2 and ISO certs\n',
  'Sales - Proposal Template.md':
    '# Proposal Template\n\n- Executive summary and business case\n- Scope, timeline, and pricing\n- Success criteria and references\n',

  // --- Misc ---
  'Partner Program Overview.md':
    '# Partner Program\n\n- Referral, reseller, and co-sell tiers\n- Deal registration and margin protection\n- Partner enablement and certification\n',
  'Customer References.md':
    '# Customer References\n\n- Contoso (operations), Fabrikam (finance)\n- Northwind (global retail), Adventure Works (manufacturing)\n- Reference calls available on request\n',
};


async function main(): Promise<void> {
  const tenantId = process.env.ENTRA_TENANT_ID ?? '';
  const clientId = process.env.ENTRA_CLIENT_ID ?? '';
  if (!tenantId || !clientId) {
    console.error('\n[upload] Set ENTRA_TENANT_ID and ENTRA_CLIENT_ID in .env first.\n');
    process.exit(1);
  }

  const tokenProvider = new GraphTokenProvider(
    tenantId,
    clientId,
    ['Files.ReadWrite.All'],
    path.resolve(process.cwd(), '.msal-cache.json'),
  );
  const token = await tokenProvider.getToken();

  console.log(`\n[upload] Writing ${Object.keys(SAMPLES).length} files to OneDrive › "${FOLDER}"\n`);
  for (const [name, content] of Object.entries(SAMPLES)) {
    const url = `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(FOLDER)}/${encodeURIComponent(name)}:/content`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/markdown' },
      body: content,
    });
    if (!res.ok) {
      console.error(`  ✗ ${name} — ${res.status}: ${await res.text()}`);
      continue;
    }
    const item = (await res.json()) as { webUrl?: string };
    console.log(`  ✓ ${name}\n     ${item.webUrl ?? '(uploaded)'}`);
  }
  console.log(
    '\n[upload] Done. Note: search indexing can take a few minutes. Then try:\n' +
      '   npm run -w @workiq/desktop-client test:workiq -- "pricing"\n',
  );
}

main().catch((err) => {
  const msg = String(err);
  console.error('\n[upload] FAILED:', msg);
  if (/65001|consent|Forbidden|403|invalid_grant|AADSTS/i.test(msg)) {
    console.error(
      '\n[hint] Add the delegated **Files.ReadWrite.All** permission to your Entra app\n' +
        '       (API permissions → Microsoft Graph → Delegated) and Grant admin consent,\n' +
        '       then re-run. Delete apps/desktop-client/.msal-cache.json to force a fresh login.\n',
    );
  }
  process.exitCode = 1;
});
