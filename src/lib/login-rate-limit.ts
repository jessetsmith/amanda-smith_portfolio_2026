import { createHash } from "node:crypto";
import type { SanityClient } from "next-sanity";
import { getWriteClient } from "@/sanity/lib/write-client";

/**
 * Failed-login throttling for /api/admin/login, per IP and per username.
 *
 * Two layers, either of which can block:
 * - in-memory (per serverless instance; catches bursts with no I/O),
 * - a private Sanity document shared by all instances. Its id contains a dot,
 *   so Sanity never serves it without a token, even on a public dataset.
 * Keys are stored as SHA-256 digests, never as raw IPs or usernames.
 */

type Bucket = {
  failures: number;
  windowStart: number;
  lockedUntil: number;
  lockouts: number;
  updatedAt: number;
};

type Buckets = Record<string, Bucket>;

type Policy = {
  maxFailures: number;
  windowMs: number;
  baseLockoutMs: number;
  maxLockoutMs: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** 5 failures in 15 min locks the IP; repeat lockouts double, up to 24 h. */
const IP_POLICY: Policy = {
  maxFailures: 5,
  windowMs: 15 * MINUTE,
  baseLockoutMs: 15 * MINUTE,
  maxLockoutMs: 24 * HOUR,
};

/**
 * Looser per-username limit for attacks spread across IPs. Capped at 1 h so
 * an attacker cannot keep the real admin locked out for long.
 */
const USERNAME_POLICY: Policy = {
  maxFailures: 10,
  windowMs: 15 * MINUTE,
  baseLockoutMs: 15 * MINUTE,
  maxLockoutMs: HOUR,
};

/** Buckets idle this long are forgotten (also resets lockout escalation). */
const BUCKET_TTL_MS = 24 * HOUR;
const MAX_BUCKETS = 200;
const WRITE_RETRIES = 3;

export const LOGIN_THROTTLE_DOC_ID = "adminSecurity.loginThrottle";
const LOGIN_THROTTLE_DOC_TYPE = "adminLoginThrottle";

export type LoginThrottleKey = { field: string; policy: Policy };

export function loginThrottleKeys(ip: string, username: string): LoginThrottleKey[] {
  const digest = (value: string) =>
    `k_${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
  const normalizedUser = username.trim().toLowerCase().slice(0, 128);
  return [
    { field: digest(`ip:${ip}`), policy: IP_POLICY },
    { field: digest(`user:${normalizedUser}`), policy: USERNAME_POLICY },
  ];
}

/** Client IP. On Vercel these headers are set by the platform and cannot be spoofed. */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

function isLive(bucket: Bucket, now: number): boolean {
  return bucket.lockedUntil > now || now - bucket.updatedAt < BUCKET_TTL_MS;
}

function registerFailure(
  bucket: Bucket | undefined,
  policy: Policy,
  now: number,
): Bucket {
  const base: Bucket =
    bucket && isLive(bucket, now)
      ? { ...bucket }
      : { failures: 0, windowStart: now, lockedUntil: 0, lockouts: 0, updatedAt: now };
  if (now - base.windowStart >= policy.windowMs) {
    base.failures = 0;
    base.windowStart = now;
  }
  base.failures += 1;
  base.updatedAt = now;
  if (base.failures >= policy.maxFailures) {
    base.lockouts += 1;
    base.lockedUntil =
      now +
      Math.min(policy.baseLockoutMs * 2 ** (base.lockouts - 1), policy.maxLockoutMs);
    base.failures = 0;
    base.windowStart = now;
  }
  return base;
}

function prune(buckets: Buckets, now: number): Buckets {
  const live = Object.entries(buckets)
    .filter(([, bucket]) => isLive(bucket, now))
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_BUCKETS);
  return Object.fromEntries(live);
}

function lockedForMs(buckets: Buckets, keys: LoginThrottleKey[], now: number): number {
  let remaining = 0;
  for (const { field } of keys) {
    const lockedUntil = buckets[field]?.lockedUntil ?? 0;
    remaining = Math.max(remaining, lockedUntil - now);
  }
  return remaining;
}

export interface LoginThrottleStore {
  read(): Promise<{ buckets: Buckets; rev: string | null }>;
  /** Returns false when the document changed since `rev` (caller retries). */
  write(buckets: Buckets, rev: string | null): Promise<boolean>;
}

function isConflict(err: unknown): boolean {
  const status = (err as { statusCode?: number })?.statusCode;
  return status === 409 || status === 412;
}

export function sanityLoginThrottleStore(client: SanityClient): LoginThrottleStore {
  return {
    async read() {
      const doc = await client.fetch<{ _rev: string; buckets?: Buckets } | null>(
        `*[_id == $id][0]{_rev, buckets}`,
        { id: LOGIN_THROTTLE_DOC_ID },
      );
      return { buckets: doc?.buckets ?? {}, rev: doc?._rev ?? null };
    },
    async write(buckets, rev) {
      try {
        if (rev === null) {
          await client.create({
            _id: LOGIN_THROTTLE_DOC_ID,
            _type: LOGIN_THROTTLE_DOC_TYPE,
            buckets,
          });
        } else {
          await client
            .patch(LOGIN_THROTTLE_DOC_ID)
            .ifRevisionId(rev)
            .set({ buckets })
            .commit();
        }
        return true;
      } catch (err) {
        if (isConflict(err)) return false;
        throw err;
      }
    },
  };
}

export function createLoginRateLimiter(
  store: LoginThrottleStore | null,
  clock: () => number = Date.now,
) {
  let memory: Buckets = {};

  async function updateStore(mutate: (buckets: Buckets, now: number) => Buckets) {
    if (!store) return;
    try {
      for (let attempt = 0; attempt < WRITE_RETRIES; attempt++) {
        const { buckets, rev } = await store.read();
        const now = clock();
        if (await store.write(prune(mutate({ ...buckets }, now), now), rev)) return;
      }
      console.error("[login-rate-limit] gave up after repeated write conflicts");
    } catch (err) {
      console.error("[login-rate-limit] persistent store write failed", err);
    }
  }

  return {
    /** Milliseconds until login is allowed again for these keys (0 = allowed). */
    async retryAfterMs(keys: LoginThrottleKey[]): Promise<number> {
      const now = clock();
      const inMemory = lockedForMs(memory, keys, now);
      if (inMemory > 0 || !store) return inMemory;
      try {
        const { buckets } = await store.read();
        return lockedForMs(buckets, keys, now);
      } catch (err) {
        console.error("[login-rate-limit] persistent store read failed", err);
        return 0;
      }
    },

    async recordFailure(keys: LoginThrottleKey[]): Promise<void> {
      const apply = (buckets: Buckets, now: number) => {
        for (const { field, policy } of keys) {
          buckets[field] = registerFailure(buckets[field], policy, now);
        }
        return buckets;
      };
      memory = prune(apply({ ...memory }, clock()), clock());
      await updateStore(apply);
    },

    async recordSuccess(keys: LoginThrottleKey[]): Promise<void> {
      const clear = (buckets: Buckets) => {
        for (const { field } of keys) delete buckets[field];
        return buckets;
      };
      memory = clear({ ...memory });
      await updateStore(clear);
    },
  };
}

let defaultLimiter: ReturnType<typeof createLoginRateLimiter> | null = null;

export function loginRateLimiter() {
  if (!defaultLimiter) {
    const client = getWriteClient();
    defaultLimiter = createLoginRateLimiter(
      client ? sanityLoginThrottleStore(client) : null,
    );
  }
  return defaultLimiter;
}
