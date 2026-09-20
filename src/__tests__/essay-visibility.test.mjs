import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Mirrors src/lib/path.ts — card actions must select when not on the path tip.
function needsExpandForAction(nodeId, currentPath) {
  return currentPath[currentPath.length - 1] !== nodeId;
}

describe("needsExpandForAction", () => {
  it("is true for grid/prefetch cards that are not the path tip", () => {
    assert.equal(needsExpandForAction("child-a", ["root", "parent"]), true);
  });

  it("is false when already viewing that node", () => {
    assert.equal(needsExpandForAction("parent", ["root", "parent"]), false);
  });
});
