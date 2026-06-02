/**
 * serverSync.ts
 *
 * Syncs the shared catalog portion of the localStorage store with the API server.
 *
 * Flow:
 *   - On every page load: fetchAndApplyServerStore() pulls the latest snapshot
 *     and overwrites localStorage so every device always shows admin changes.
 *
 *   - In the admin panel: pushToServer() / schedulePushToServer() send the
 *     current catalog to the server so other devices can fetch it.
 *
 * Per-user data (cart, orders, reviews, analytics, behavior) is never synced.
 */

const SYNC_KEYS = [
  "store_restaurants",
  "store_branches",
  "store_categories",
  "store_menu_items",
  "store_offers",
  "store_coupons",
  "store_banners",
  "store_app_settings",
  "store_modifier_groups",
  "store_modifier_options",
  "store_add_ons",
  "store_item_modifier_links",
  "store_branch_item_overrides",
  "store_branch_cat_overrides",
] as const;

// Always point to the same origin — works in dev (via proxy) and production.
const STORE_ENDPOINT = `${window.location.origin}/api/store`;

/**
 * Fetch catalog snapshot from server and apply to localStorage.
 * Returns true when at least one key changed (caller should dispatch).
 */
export async function fetchAndApplyServerStore(): Promise<boolean> {
  try {
    const res = await fetch(STORE_ENDPOINT, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return false;

    const snapshot = (await res.json()) as Record<string, unknown>;
    if (!snapshot || typeof snapshot !== "object") return false;

    let changed = false;
    for (const key of SYNC_KEYS) {
      if (!(key in snapshot)) continue;
      const incoming = JSON.stringify(snapshot[key]);
      if (localStorage.getItem(key) !== incoming) {
        localStorage.setItem(key, incoming);
        changed = true;
      }
    }
    return changed;
  } catch {
    return false;
  }
}

/**
 * Push all catalog keys from localStorage to the server immediately.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 * Only works when the admin is logged in (token in sessionStorage).
 */
export async function pushToServer(): Promise<{ ok: boolean; error?: string }> {
  const token = sessionStorage.getItem("admin_token");
  if (!token) {
    return { ok: false, error: "Not logged in as admin" };
  }

  const snapshot: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key);
    snapshot[key] = raw ? (JSON.parse(raw) as unknown) : [];
  }

  try {
    const res = await fetch(STORE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(snapshot),
    });

    if (res.ok) {
      return { ok: true };
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      error: body.error ?? `Server error ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Debounced auto-push (2.5 s) used by AdminLayout on every store mutation. */
let _timer: ReturnType<typeof setTimeout> | null = null;

export function schedulePushToServer(): void {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => void pushToServer(), 2500);
}
