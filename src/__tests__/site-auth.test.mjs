import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

// Node <19 may lack global crypto in some contexts
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const AUTH_PAYLOAD = "superhistorian-ok";

function toBase64Url(buf) {
  return Buffer.from(buf).toString("base64url");
}

async function authCookieValue(password) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(AUTH_PAYLOAD));
  return toBase64Url(sig);
}

describe("site auth cookie", () => {
  it("same password yields same cookie", async () => {
    const a = await authCookieValue("secret");
    const b = await authCookieValue("secret");
    assert.equal(a, b);
  });

  it("different password invalidates cookie", async () => {
    const oldCookie = await authCookieValue("old-pass");
    const newCookie = await authCookieValue("new-pass");
    assert.notEqual(oldCookie, newCookie);
  });
});
