/**
 * Standalone harness to verify that Microsoft Graph pulls REAL data — runs
 * outside Electron so you can test auth + search quickly.
 *
 *   npm run -w @workiq/desktop-client test:workiq -- "pricing for enterprise"
 *
 * On first run it prints a device-code URL: open it, sign in, and the token is
 * cached to `.msal-cache.json` so later runs don't prompt again.
 *
 * Requires in your .env (repo root or apps/desktop-client/.env):
 *   ENTRA_TENANT_ID=...        (your Microsoft Entra tenant GUID or domain)
 *   ENTRA_CLIENT_ID=...        (a public-client app registration)
 *   GRAPH_SCOPES=Files.Read.All Sites.Read.All Mail.Read   (optional override)
 *   AZURE_OPENAI_* (optional)  (enables a synthesized answer over the snippets)
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { GraphTokenProvider, StaticTokenProvider, type TokenProvider } from './GraphAuth';
import { GraphWorkIqClient } from './GraphWorkIqClient';

// Load .env from the desktop-client folder and the monorepo root (cwd is the
// desktop-client workspace when run via `npm run -w`).
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(' ').trim() || 'pricing';
  const scopes = (process.env.GRAPH_SCOPES || 'Files.Read.All Sites.Read.All Mail.Read')
    .split(/\s+/)
    .filter(Boolean);

  // Prefer a pasted token (no app registration); fall back to device-code login.
  let tokenProvider: TokenProvider;
  const staticToken = process.env.GRAPH_ACCESS_TOKEN?.trim();
  if (staticToken) {
    console.log('[test] Using GRAPH_ACCESS_TOKEN (no app registration needed).');
    tokenProvider = new StaticTokenProvider(staticToken);
  } else {
    const tenantId = process.env.ENTRA_TENANT_ID ?? '';
    const clientId = process.env.ENTRA_CLIENT_ID ?? '';
    if (!tenantId || !clientId) {
      console.error(
        '\n[test] No auth configured. Either:\n' +
          '  (a) FAST: paste an Azure CLI Graph token (no app registration):\n' +
          '      $env:GRAPH_ACCESS_TOKEN = (az account get-access-token --resource-type ms-graph --query accessToken -o tsv)\n' +
          '  (b) set ENTRA_TENANT_ID + ENTRA_CLIENT_ID for device-code login.\n',
      );
      process.exit(1);
    }
    tokenProvider = new GraphTokenProvider(
      tenantId,
      clientId,
      scopes,
      path.resolve(process.cwd(), '.msal-cache.json'),
    );
  }

  const openai =
    process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
      ? new AzureOpenAI({
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview',
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini',
        })
      : null;

  const client = new GraphWorkIqClient({
    tokenProvider,
    openai,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  });

  console.log(`\n[test] Querying Microsoft Graph for: "${query}"`);
  console.log(`[test] Scopes: ${scopes.join(', ')}\n`);

  const result = await client.query(query, query);

  console.log('=== ANSWER ===\n' + result.answer + '\n');
  console.log(`=== SOURCES (${result.sources.length}) ===`);
  if (result.sources.length === 0) {
    console.log('  (none — check that your account has matching files and the right permissions)');
  }
  result.sources.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.kind}] ${s.title}`);
    console.log(`     ${s.url}`);
  });
  console.log('');
}

main().catch((err) => {
  const msg = String(err);
  console.error('\n[test] FAILED:', msg);
  if (/403|Forbidden|permission/i.test(msg)) {
    console.error(
      '\n[hint] The token lacks the Graph permissions the Search API needs ' +
        '(Files.Read.All / Sites.Read.All / Mail.Read).\n' +
        '       The Azure CLI token only carries limited scopes, and locked-down corp tenants\n' +
        '       block self-consent. Easiest fix — a free Microsoft 365 Developer tenant where YOU are admin:\n' +
        '         1. https://developer.microsoft.com/microsoft-365/dev-program  (instant sandbox + sample data)\n' +
        '         2. Register a public-client app there; grant + consent Files.Read.All and Mail.Read.\n' +
        '         3. Put ENTRA_TENANT_ID + ENTRA_CLIENT_ID in .env, unset GRAPH_ACCESS_TOKEN, re-run.\n',
    );
  }
  process.exitCode = 1;
});
