import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  computeCredentialVersion,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  SANITY_API_WRITE_TOKEN: process.env.SANITY_API_WRITE_TOKEN,
};

function setEnv(overrides: Record<string, string | undefined>) {
  const env = process.env as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

afterEach(() => {
  setEnv(ORIGINAL_ENV);
});

describe("admin-session tokens", () => {
  it("signs and verifies session tokens with SANITY_API_WRITE_TOKEN fallback in production", async () => {
    setEnv({
      NODE_ENV: "production",
      ADMIN_SESSION_SECRET: undefined,
      SANITY_API_WRITE_TOKEN: "test-sanity-write-token-value",
    });
    const cv = await computeCredentialVersion("sanity:amanda:$2b$12$hash");
    assert.ok(cv);
    const now = 1_800_000_000_000;
    const token = await createAdminSessionToken(cv, now);
    assert.ok(token);

    const verified = await verifyAdminSessionToken(token, now + 10_000);
    assert.ok(verified);
    assert.equal(verified.cv, cv);
  });

  it("rejects legacy unsigned cookie value '1', tampered tokens, and expired tokens", async () => {
    setEnv({
      NODE_ENV: "production",
      ADMIN_SESSION_SECRET: "a-very-long-secret-string-with-more-than-32-chars",
      SANITY_API_WRITE_TOKEN: undefined,
    });
    assert.equal(await verifyAdminSessionToken("1"), null);

    const cv = await computeCredentialVersion("sanity:amanda:hash-v1");
    assert.ok(cv);
    const now = 1_800_000_000_000;
    const token = await createAdminSessionToken(cv, now);
    assert.ok(token);

    const tampered = `${token.slice(0, -2)}aa`;
    assert.equal(await verifyAdminSessionToken(tampered, now + 1000), null);

    // Expired 8 days later (maxAge is 7 days)
    const eightDaysLater = now + 8 * 24 * 60 * 60 * 1000;
    assert.equal(await verifyAdminSessionToken(token, eightDaysLater), null);
  });

  it("produces a different credential version when the password hash changes", async () => {
    setEnv({
      NODE_ENV: "production",
      ADMIN_SESSION_SECRET: "a-very-long-secret-string-with-more-than-32-chars",
    });
    const v1 = await computeCredentialVersion("sanity:amanda:hash-1");
    const v2 = await computeCredentialVersion("sanity:amanda:hash-2");
    assert.ok(v1 && v2);
    assert.notEqual(v1, v2);
  });
});
