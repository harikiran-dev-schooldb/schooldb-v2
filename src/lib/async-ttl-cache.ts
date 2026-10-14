type AsyncTtlCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
};

type CacheEntry<Value> = {
  value: Value;
  expiresAt: number;
};

export function createAsyncTtlCache<Value>({
  ttlMs,
  maxEntries = 250,
}: AsyncTtlCacheOptions) {
  const entries = new Map<string, CacheEntry<Value>>();
  const pending = new Map<string, Promise<Value>>();

  function prune() {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) break;
      entries.delete(oldestKey);
    }
  }

  async function get(
    key: string,
    load: () => Promise<Value>,
    options: { force?: boolean } = {},
  ) {
    const cached = entries.get(key);
    if (!options.force && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (cached) entries.delete(key);

    const inFlight = pending.get(key);
    if (inFlight) return inFlight;

    const request = load()
      .then((value) => {
        entries.set(key, { value, expiresAt: Date.now() + ttlMs });
        prune();
        return value;
      })
      .finally(() => pending.delete(key));

    pending.set(key, request);
    return request;
  }

  return { get };
}
