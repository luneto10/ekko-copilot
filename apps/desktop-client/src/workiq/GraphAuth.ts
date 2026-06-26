import fs from 'node:fs';
import {
  PublicClientApplication,
  type ICachePlugin,
  type TokenCacheContext,
} from '@azure/msal-node';

/** Minimal contract the Work IQ client needs from an auth source. */
export interface TokenProvider {
  getToken(): Promise<string>;
}

/** Persist the MSAL token cache to a JSON file so the user isn't prompted every run. */
function fileCachePlugin(cachePath: string): ICachePlugin {
  return {
    beforeCacheAccess: async (ctx: TokenCacheContext) => {
      if (fs.existsSync(cachePath)) {
        ctx.tokenCache.deserialize(fs.readFileSync(cachePath, 'utf8'));
      }
    },
    afterCacheAccess: async (ctx: TokenCacheContext) => {
      if (ctx.cacheHasChanged) {
        fs.writeFileSync(cachePath, ctx.tokenCache.serialize());
      }
    },
  };
}

/**
 * Acquires a delegated Microsoft Graph access token via the **device-code flow**
 * — the simplest interactive flow for a desktop/CLI: it prints a URL + code to
 * the console, the user signs in once, and the token is cached to disk.
 *
 * Requires an Entra ID **public client** app registration with "Allow public
 * client flows" enabled and the requested Graph delegated permissions consented.
 */
export class GraphTokenProvider implements TokenProvider {
  private readonly pca: PublicClientApplication;

  constructor(
    tenantId: string,
    clientId: string,
    private readonly scopes: string[],
    cachePath?: string,
  ) {
    this.pca = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
      cache: cachePath ? { cachePlugin: fileCachePlugin(cachePath) } : undefined,
    });
  }

  async getToken(): Promise<string> {
    // Try a cached account silently first; fall back to device code.
    const accounts = await this.pca.getTokenCache().getAllAccounts();
    if (accounts.length > 0) {
      try {
        const silent = await this.pca.acquireTokenSilent({
          account: accounts[0],
          scopes: this.scopes,
        });
        if (silent?.accessToken) return silent.accessToken;
      } catch {
        // Silent failed (expired refresh token) — fall through to device code.
      }
    }

    const result = await this.pca.acquireTokenByDeviceCode({
      scopes: this.scopes,
      deviceCodeCallback: (response) => {
        // eslint-disable-next-line no-console
        console.log(`\n[graph-auth] ${response.message}\n`);
      },
    });
    if (!result?.accessToken) throw new Error('Graph auth failed: no access token returned');
    return result.accessToken;
  }
}

/**
 * Uses a pre-acquired Microsoft Graph token (e.g. from
 * `az account get-access-token --resource-type ms-graph`). Handy for testing in
 * tenants where you can't register an app — no Entra app registration needed.
 */
export class StaticTokenProvider implements TokenProvider {
  constructor(private readonly token: string) {}

  async getToken(): Promise<string> {
    if (!this.token) throw new Error('StaticTokenProvider: empty token');
    return this.token;
  }
}
