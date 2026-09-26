import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAppVersion } from "../lib/app-version.mjs";

describe("resolveAppVersion", () => {
  it("prefers the release tag from the Docker build", () => {
    assert.equal(
      resolveAppVersion({ releaseTag: "v0.2.0", releaseCommit: "e700c8b1234", gitTag: "v0.1.0", gitCommit: "abc1234" }),
      "v0.2.0"
    );
  });

  it("falls back to the short release commit when the tag is the Docker default", () => {
    assert.equal(resolveAppVersion({ releaseTag: "dev", releaseCommit: "e700c8b1234567890" }), "e700c8b");
  });

  it("ignores the Docker placeholder commit and uses local git instead", () => {
    assert.equal(
      resolveAppVersion({ releaseTag: "dev", releaseCommit: "unknown", gitTag: "", gitCommit: "abc1234" }),
      "abc1234"
    );
  });

  it("uses an exact git tag before the git hash", () => {
    assert.equal(resolveAppVersion({ gitTag: "v0.3.0\n", gitCommit: "abc1234" }), "v0.3.0");
  });

  it("shortens a full git hash", () => {
    assert.equal(resolveAppVersion({ gitCommit: "abc1234def5678" }), "abc1234");
  });

  it("returns dev when nothing is known", () => {
    assert.equal(resolveAppVersion({}), "dev");
    assert.equal(resolveAppVersion({ releaseTag: " ", releaseCommit: "", gitTag: undefined, gitCommit: "" }), "dev");
  });
});
