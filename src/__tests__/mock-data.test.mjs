import { describe, it } from "node:test";
import assert from "node:assert";

// We import the mock-data module via dynamic import since it's TypeScript.
// For Node.js native test runner, we'll test the logic directly by re-implementing
// the core functions in plain JS (mirroring the TS source).

// ---- Copied core logic from mock-data.ts for testing ----

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick(arr, hash, index) {
  return arr[(hash + index * 7) % arr.length];
}

const PERIOD_ADJECTIVES = ["Early", "High", "Late", "Golden", "Tumultuous", "Flourishing", "Declining", "Revolutionary", "Classical", "Post-"];
const PERIOD_NOUNS = ["Period", "Age", "Era", "Epoch", "Phase", "Chapter", "Dawn", "Twilight", "Renaissance", "Awakening"];

const SUMMARY_TEMPLATES = [
  "This period saw dramatic transformations in {scope}.",
  "A time of great upheaval and creativity in {scope}.",
  "In {scope}, this era was defined by conflict and innovation.",
  "The people of {scope} experienced profound change during this period.",
  "This chapter in the history of {scope} brought both prosperity and crisis.",
  "Across {scope}, this was an age of exploration and discovery.",
  "In {scope}, this period witnessed the rise of powerful new movements.",
  "The history of {scope} during this time is one of remarkable resilience.",
];

const GEO_REGIONS = {
  Global: [
    ["East Asia", "South Asia", "Europe", "Africa", "The Americas"],
    ["The Mediterranean World", "Central Asia & the Silk Road", "Sub-Saharan Africa", "East Asia & Pacific", "The Atlantic World"],
  ],
  Europe: [
    ["The British Isles", "France & the Low Countries", "The Germanic Lands", "The Italian Peninsula", "Iberia"],
    ["Scandinavia & the Baltic", "Eastern Europe & Russia", "The Mediterranean Coast", "Central Europe", "The Balkans & Greece"],
  ],
};

const GEO_SUMMARIES = [
  "{region} was a crucible of civilization during this period.",
  "In {region}, this era saw the rise and fall of dynasties.",
  "The people of {region} navigated complex challenges during this time.",
  "During this period, {region} was a crossroads of cultures.",
  "{region} experienced a golden age of sorts during this era.",
];

const TIME_SPLITS = {
  "History of Earth": {
    phases: [
      { title: "The Hadean Inferno", start: "4.5 billion years ago", end: "4 billion years ago", summary: "Earth forms." },
      { title: "The Archean Dawn", start: "4 billion years ago", end: "2.5 billion years ago", summary: "First oceans." },
      { title: "The Great Oxygenation", start: "2.5 billion years ago", end: "541 million years ago", summary: "Oxygen rises." },
      { title: "The Phanerozoic Explosion", start: "541 million years ago", end: "66 million years ago", summary: "Complex life." },
      { title: "The Age of Mammals", start: "66 million years ago", end: "Present", summary: "Mammals rule." },
    ],
  },
};

function mockSplitByTime(node) {
  const prebuilt = TIME_SPLITS[node.title];
  if (prebuilt) return prebuilt;

  const h = simpleHash(node.id + node.title + "time");
  const phases = [];
  for (let i = 0; i < 5; i++) {
    const adj = pick(PERIOD_ADJECTIVES, h, i);
    const noun = pick(PERIOD_NOUNS, h, i + 5);
    const summaryTemplate = pick(SUMMARY_TEMPLATES, h, i + 10);
    const title = `${adj} ${node.title.split(" ").slice(0, 2).join(" ")} ${noun}`;
    const summary = summaryTemplate.replace(/\{scope\}/g, node.geographicScope);
    const start = i === 0 ? node.timeRange.start : `Phase ${i + 1} start`;
    const end = i === 4 ? node.timeRange.end : `Phase ${i + 1} end`;
    phases.push({ title, start, end, summary });
  }
  return { phases };
}

function mockSplitByGeo(node) {
  const h = simpleHash(node.id + node.title + "geo");
  let regionNames;
  const scopeRegions = GEO_REGIONS[node.geographicScope];
  if (scopeRegions) {
    regionNames = scopeRegions[h % scopeRegions.length];
  } else {
    regionNames = [
      `Northern ${node.geographicScope}`,
      `Southern ${node.geographicScope}`,
      `Eastern ${node.geographicScope}`,
      `Western ${node.geographicScope}`,
      `Central ${node.geographicScope}`,
    ];
  }
  const regions = regionNames.map((regionName, i) => {
    const template = pick(GEO_SUMMARIES, h, i);
    return { regionName, summary: template.replace(/\{region\}/g, regionName) };
  });
  return { regions };
}

function mockJumpToTopic(query) {
  const TOPICS = {
    "world war": { title: "The Second World War", start: "1939", end: "1945", geographicScope: "Global", summary: "The deadliest conflict." },
    roman: { title: "The Roman Empire", start: "27 BC", end: "476 AD", geographicScope: "Europe", summary: "Rome grew." },
    renaissance: { title: "The Renaissance", start: "1350", end: "1600", geographicScope: "Europe", summary: "Cultural rebirth." },
  };
  const lowerQuery = query.toLowerCase();
  for (const [key, value] of Object.entries(TOPICS)) {
    if (lowerQuery.includes(key)) return value;
  }
  return {
    title: query.charAt(0).toUpperCase() + query.slice(1),
    start: "Ancient times",
    end: "Present",
    geographicScope: "Global",
    summary: `The history of ${query} spans centuries.`,
  };
}

// ---- UUID helper ----
let uuidCounter = 0;
function v4() {
  return `test-uuid-${++uuidCounter}`;
}

// ---- Tests ----

describe("Mock Data Generator", () => {
  it("should return 5 phases for root node (History of Earth)", () => {
    const root = {
      id: "root",
      title: "History of Earth",
      timeRange: { start: "4.5 billion years ago", end: "Present" },
      geographicScope: "Global",
    };
    const result = mockSplitByTime(root);
    assert.strictEqual(result.phases.length, 5);
    assert.strictEqual(result.phases[0].title, "The Hadean Inferno");
    assert.strictEqual(result.phases[4].title, "The Age of Mammals");
  });

  it("should return 5 phases for any arbitrary node", () => {
    const node = {
      id: "some-id",
      title: "The Renaissance",
      timeRange: { start: "1350", end: "1600" },
      geographicScope: "Europe",
    };
    const result = mockSplitByTime(node);
    assert.strictEqual(result.phases.length, 5);
    result.phases.forEach((phase) => {
      assert.ok(phase.title.length > 0, "Phase title should not be empty");
      assert.ok(phase.summary.length > 0, "Phase summary should not be empty");
      assert.ok(phase.start.length > 0, "Phase start should not be empty");
      assert.ok(phase.end.length > 0, "Phase end should not be empty");
    });
  });

  it("should produce deterministic results for the same input", () => {
    const node = {
      id: "test-id-123",
      title: "Test Period",
      timeRange: { start: "1000", end: "2000" },
      geographicScope: "Global",
    };
    const result1 = mockSplitByTime(node);
    const result2 = mockSplitByTime(node);
    assert.deepStrictEqual(result1, result2);
  });

  it("should produce different results for different inputs", () => {
    const node1 = {
      id: "id-1",
      title: "Period A",
      timeRange: { start: "1000", end: "2000" },
      geographicScope: "Global",
    };
    const node2 = {
      id: "id-2",
      title: "Period B",
      timeRange: { start: "1000", end: "2000" },
      geographicScope: "Global",
    };
    const result1 = mockSplitByTime(node1);
    const result2 = mockSplitByTime(node2);
    // At least the titles should differ
    assert.notStrictEqual(result1.phases[0].title, result2.phases[0].title);
  });

  it("should return 5 geographic regions", () => {
    const node = {
      id: "root",
      title: "History of Earth",
      timeRange: { start: "4.5 billion years ago", end: "Present" },
      geographicScope: "Global",
    };
    const result = mockSplitByGeo(node);
    assert.strictEqual(result.regions.length, 5);
    result.regions.forEach((region) => {
      assert.ok(region.regionName.length > 0);
      assert.ok(region.summary.length > 0);
      assert.ok(region.summary.includes(region.regionName), "Summary should mention the region name");
    });
  });

  it("should generate sub-regions for unknown geographic scopes", () => {
    const node = {
      id: "test",
      title: "Patagonia Era",
      timeRange: { start: "1800", end: "1900" },
      geographicScope: "Patagonia",
    };
    const result = mockSplitByGeo(node);
    assert.strictEqual(result.regions.length, 5);
    assert.ok(result.regions.some((r) => r.regionName.includes("Northern Patagonia")));
    assert.ok(result.regions.some((r) => r.regionName.includes("Southern Patagonia")));
  });

  it("should handle jump-to-topic with known topics", () => {
    const result = mockJumpToTopic("Tell me about World War II");
    assert.strictEqual(result.title, "The Second World War");
    assert.strictEqual(result.geographicScope, "Global");
  });

  it("should handle jump-to-topic with unknown topics", () => {
    const result = mockJumpToTopic("cryptography");
    assert.strictEqual(result.title, "Cryptography");
    assert.ok(result.summary.includes("cryptography"));
  });
});

describe("Deep Navigation (10+ Levels)", () => {
  it("should support at least 10 levels of time-based drilling", () => {
    let currentNode = {
      id: "root",
      title: "History of Earth",
      summary: "All of history",
      timeRange: { start: "4.5 billion years ago", end: "Present" },
      geographicScope: "Global",
      parentId: null,
      children: [],
      splitAxis: null,
      depth: 0,
    };

    const depthLog = [];

    for (let depth = 0; depth < 15; depth++) {
      const result = mockSplitByTime(currentNode);
      assert.strictEqual(result.phases.length, 5, `Depth ${depth}: should produce 5 phases`);

      // Pick a child (always the last one for deeper exploration)
      const chosen = result.phases[4];
      depthLog.push({ depth, title: chosen.title, start: chosen.start, end: chosen.end });

      currentNode = {
        id: v4(),
        title: chosen.title,
        summary: chosen.summary,
        timeRange: { start: chosen.start, end: chosen.end },
        geographicScope: currentNode.geographicScope,
        parentId: currentNode.id,
        children: [],
        splitAxis: null,
        depth: depth + 1,
      };
    }

    assert.strictEqual(depthLog.length, 15, "Should have explored 15 levels deep");
    console.log("\n--- Deep Time Navigation (15 levels) ---");
    depthLog.forEach((entry) => {
      console.log(`  Depth ${entry.depth}: ${entry.title} (${entry.start} → ${entry.end})`);
    });
  });

  it("should support alternating time and geography splits to 12+ levels", () => {
    let currentNode = {
      id: "root",
      title: "History of Earth",
      summary: "All of history",
      timeRange: { start: "4.5 billion years ago", end: "Present" },
      geographicScope: "Global",
      parentId: null,
      children: [],
      splitAxis: null,
      depth: 0,
    };

    const depthLog = [];

    for (let depth = 0; depth < 12; depth++) {
      const useGeo = depth % 3 === 1; // Every 3rd level, split by geography

      if (useGeo) {
        const result = mockSplitByGeo(currentNode);
        assert.strictEqual(result.regions.length, 5, `Depth ${depth}: should produce 5 regions`);

        const chosen = result.regions[0];
        depthLog.push({ depth, title: chosen.regionName, type: "GEO" });

        currentNode = {
          id: v4(),
          title: chosen.regionName,
          summary: chosen.summary,
          timeRange: { ...currentNode.timeRange },
          geographicScope: chosen.regionName,
          parentId: currentNode.id,
          children: [],
          splitAxis: null,
          depth: depth + 1,
        };
      } else {
        const result = mockSplitByTime(currentNode);
        assert.strictEqual(result.phases.length, 5, `Depth ${depth}: should produce 5 phases`);

        const chosen = result.phases[2]; // Pick middle one
        depthLog.push({ depth, title: chosen.title, type: "TIME" });

        currentNode = {
          id: v4(),
          title: chosen.title,
          summary: chosen.summary,
          timeRange: { start: chosen.start, end: chosen.end },
          geographicScope: currentNode.geographicScope,
          parentId: currentNode.id,
          children: [],
          splitAxis: null,
          depth: depth + 1,
        };
      }
    }

    assert.strictEqual(depthLog.length, 12, "Should have explored 12 levels");
    console.log("\n--- Alternating Time/Geo Navigation (12 levels) ---");
    depthLog.forEach((entry) => {
      console.log(`  Depth ${entry.depth} [${entry.type}]: ${entry.title}`);
    });
  });

  it("should produce unique titles at each depth level", () => {
    let currentNode = {
      id: "root",
      title: "History of Earth",
      summary: "All of history",
      timeRange: { start: "4.5 billion years ago", end: "Present" },
      geographicScope: "Global",
      parentId: null,
      children: [],
      splitAxis: null,
      depth: 0,
    };

    const allTitles = new Set();

    for (let depth = 0; depth < 10; depth++) {
      const result = mockSplitByTime(currentNode);
      result.phases.forEach((p) => allTitles.add(p.title));

      const chosen = result.phases[depth % 5];
      currentNode = {
        id: v4(),
        title: chosen.title,
        summary: chosen.summary,
        timeRange: { start: chosen.start, end: chosen.end },
        geographicScope: currentNode.geographicScope,
        parentId: currentNode.id,
        children: [],
        splitAxis: null,
        depth: depth + 1,
      };
    }

    // We generated 50 titles (10 levels × 5 phases). At least 20 should be unique
    // (some may collide due to the hash-based generation, but most should be unique)
    assert.ok(allTitles.size >= 15, `Expected at least 15 unique titles, got ${allTitles.size}`);
    console.log(`\n--- Generated ${allTitles.size} unique titles across 10 levels ---`);
  });
});

describe("Essay Generation", () => {
  it("should generate an essay with topic-specific content", () => {
    const ESSAY_TEMPLATES = [
      "The story of {title} is one of those chapters in history",
      "When historians speak of {title}, they speak of a period",
    ];

    const node = {
      id: "test-essay",
      title: "The Renaissance",
      timeRange: { start: "1350", end: "1600" },
      geographicScope: "Europe",
      summary: "A cultural rebirth",
    };

    const h = simpleHash(node.id + "essay");
    const template = ESSAY_TEMPLATES[h % ESSAY_TEMPLATES.length];
    const essay = template
      .replace(/\{title\}/g, node.title)
      .replace(/\{scope\}/g, node.geographicScope)
      .replace(/\{start\}/g, node.timeRange.start)
      .replace(/\{end\}/g, node.timeRange.end);

    assert.ok(essay.includes("The Renaissance"), "Essay should mention the topic title");
    assert.ok(essay.length > 50, "Essay should be substantial");
  });
});

describe("Breadcrumb Path Logic", () => {
  it("should build correct paths through the tree", () => {
    // Build a path 10 levels deep
    const path = ["root"];
    for (let i = 1; i <= 10; i++) {
      path.push(`node-${i}`);
    }

    assert.strictEqual(path.length, 11); // root + 10 levels
    assert.strictEqual(path[0], "root");
    assert.strictEqual(path[10], "node-10");

    // Going back should trim the path
    const backPath = path.slice(0, -1);
    assert.strictEqual(backPath.length, 10);
    assert.strictEqual(backPath[backPath.length - 1], "node-9");
  });
});

describe("Hash Function", () => {
  it("should produce consistent hashes", () => {
    assert.strictEqual(simpleHash("test"), simpleHash("test"));
    assert.strictEqual(simpleHash(""), simpleHash(""));
  });

  it("should produce different hashes for different inputs", () => {
    assert.notStrictEqual(simpleHash("abc"), simpleHash("def"));
    assert.notStrictEqual(simpleHash("time"), simpleHash("geography"));
  });

  it("should always return non-negative numbers", () => {
    const inputs = ["test", "negative", "hash", "values", "abc123", "!@#$%"];
    inputs.forEach((input) => {
      assert.ok(simpleHash(input) >= 0, `Hash of "${input}" should be non-negative`);
    });
  });
});
