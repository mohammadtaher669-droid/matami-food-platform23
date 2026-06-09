/**
 * API client with automatic access-token refresh. Two token scopes coexist:
 * "staff" (admin/super panels) and "customer" (storefront account) — each kept
 * in memory + sessionStorage and refreshed via the shared httpOnly cookie.
 */

export type TokenScope = "staff" | "customer";

const tokens: Record<TokenScope, string | null> = {
  staff: sessionStorage.getItem("matami_staff_token"),
  customer: sessionStorage.getItem("matami_customer_token"),
};

export function setToken(scope: TokenScope, token: string | null): void {
  tokens[scope] = token;
  if (token) sessionStorage.setItem(`matami_${scope}_token`, token);
  else sessionStorage.removeItem(`matami_${scope}_token`);
}

export function getToken(scope: TokenScope): string | null {
  return tokens[scope];
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(scope: TokenScope): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string; user?: unknown; customer?: unknown };
      if (!data.accessToken) return false;
      setToken(data.customer ? "customer" : "staff", data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  const ok = await refreshing;
  return ok && tokens[scope] != null;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  scope?: TokenScope | null;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const scope = opts.scope === undefined ? inferScope(path) : opts.scope;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (scope && tokens[scope]) headers["Authorization"] = `Bearer ${tokens[scope]}`;
    return fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  };

  let res = await doFetch();
  if (res.status === 401 && scope) {
    const refreshed = await tryRefresh(scope);
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 401 && scope) setToken(scope, null);
    throw new ApiRequestError(res.status, data.error ?? `Request failed (${res.status})`, data.code ?? "error");
  }
  return (await res.json()) as T;
}

function inferScope(path: string): TokenScope | null {
  if (path.startsWith("/api/admin") || path.startsWith("/api/super")) return "staff";
  if (path.startsWith("/api/public/me") || path.includes("/reviews")) return "customer";
  return path.startsWith("/api/public") ? "customer" : null;
}

/** Extra headers helper for super admins operating on a tenant. */
export function tenantHeaders(restaurantId: string | null): Record<string, string> {
  return restaurantId ? { "X-Restaurant-Id": restaurantId } : {};
}
