import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from the desktop-client folder first, then fall back to the monorepo root.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export const env = {
  speechKey: process.env.AZURE_SPEECH_KEY ?? '',
  speechRegion: process.env.AZURE_SPEECH_REGION ?? 'eastus',
  openAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
  openAiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
  openAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini',
  openAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview',
  workIqMode: (process.env.WORKIQ_MODE ?? 'mock').toLowerCase(),
  workIqApiBase: process.env.WORKIQ_API_BASE ?? '',
  workIqBearerToken: process.env.WORKIQ_BEARER_TOKEN ?? '',
  // Microsoft Graph (real Work IQ grounding) — Entra ID public-client app.
  entraTenantId: process.env.ENTRA_TENANT_ID ?? '',
  entraClientId: process.env.ENTRA_CLIENT_ID ?? '',
  graphScopes: (process.env.GRAPH_SCOPES || 'Files.Read.All Sites.Read.All Mail.Read')
    .split(/\s+/)
    .filter(Boolean),
  // Optional pre-acquired Graph token (e.g. `az account get-access-token`),
  // which skips the Entra app registration entirely.
  graphAccessToken: process.env.GRAPH_ACCESS_TOKEN ?? '',
  // How many transcribed words accumulate before memory.md is recompiled.
  memoryFlushWords: Number(process.env.MEMORY_FLUSH_WORDS ?? 25) || 25,
};

export const isSpeechConfigured = () => Boolean(env.speechKey && env.speechRegion);
export const isOpenAiConfigured = () => Boolean(env.openAiEndpoint && env.openAiKey);
export const isGraphConfigured = () =>
  Boolean(env.graphAccessToken || (env.entraTenantId && env.entraClientId));
