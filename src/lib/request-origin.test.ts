import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isSameSiteRequest } from "@/lib/request-origin";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
};

function setEnv(overrides: Record<string, string | undefined>) {
  const env = process.env as Record<string, string | undefined>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://portfolio.bittersweetwoman.com/api/homepage-grid", {
    method: "PUT",
    headers,
  });
}

afterEach(() => {
  setEnv(ORIGINAL_ENV);
});

describe("isSameSiteRequest", () => {
  it("allows production custom domain and www alias over HTTPS", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://portfolio.bittersweetwoman.com",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      true,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://www.portfolio.bittersweetwoman.com",
          host: "www.portfolio.bittersweetwoman.com",
        }),
      ),
      true,
    );
  });

  it("matches x-forwarded-host or host even when :443 default port is present", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://preview-123.example.com",
          "x-forwarded-host": "preview-123.example.com:443",
        }),
      ),
      true,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://preview-456.example.com",
          "x-forwarded-host": "internal-proxy.vercel.internal",
          host: "preview-456.example.com",
        }),
      ),
      true,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://preview-789.example.com",
          "x-forwarded-host": "",
          host: "preview-789.example.com",
        }),
      ),
      true,
    );
  });

  it("falls back to Referer when Origin header is empty string", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "",
          referer: "https://portfolio.bittersweetwoman.com/admin",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      true,
    );
  });

  it("allows Sec-Fetch-Site: same-origin when Origin and Referer are both stripped", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
          "sec-fetch-site": "same-origin",
        }),
      ),
      true,
    );
  });

  it("normalizes VERCEL_* env vars even when prefixed with https://", () => {
    setEnv({
      NODE_ENV: "production",
      VERCEL_BRANCH_URL: "https://portfolio-git-fix-abc.vercel.app/",
    });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://portfolio-git-fix-abc.vercel.app",
          host: "other.internal",
        }),
      ),
      true,
    );
  });

  it("rejects cross-site origins, Origin: null, Sec-Fetch-Site: cross-site, and missing headers", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://evil.example",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      false,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "null",
          "sec-fetch-site": "same-origin",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      false,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "https://portfolio.bittersweetwoman.com",
          "sec-fetch-site": "cross-site",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      false,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      false,
    );
    assert.equal(
      isSameSiteRequest(
        makeRequest({
          origin: "http://portfolio.bittersweetwoman.com",
          "x-forwarded-host": "portfolio.bittersweetwoman.com",
        }),
      ),
      false,
    );
  });
});
