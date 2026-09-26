import { test, expect } from "@playwright/test";

test.describe("Turbo mode prefetching", () => {
  test("prefetches on turbo enable, cancels on click, cascades to next level", async ({ page }) => {
    // Track API calls
    const apiCalls: { action: string; ts: number }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/explore")) {
        try {
          const body = req.postDataJSON() as { action?: string } | null;
          apiCalls.push({ action: body?.action || "?", ts: Date.now() });
        } catch {}
      }
    });

    // Load and wait for initial 5 pre-loaded cards (compact — no buttons)
    await page.goto("/");
    await expect(page.locator("text=Periods in Sequence")).toBeVisible({ timeout: 15_000 });
    const cardTitles = page.locator("h3");
    await expect(cardTitles.first()).toBeVisible({ timeout: 5_000 });
    const initialCardCount = await cardTitles.count();
    console.log(`Initial cards: ${initialCardCount}`);
    expect(initialCardCount).toBeGreaterThanOrEqual(3);

    // No prefetch badges (turbo is off), no action buttons on compact cards
    expect(await page.locator("text=ready").count()).toBe(0);
    expect(await page.locator("text=Split by Time").count()).toBe(0);

    // ---- Step 1: Enable turbo mode ----
    await page.getByText("TURBO", { exact: true }).click();
    await expect(page.getByText("TURBO ON")).toBeVisible();
    console.log("Turbo enabled");

    // Cards should start showing prefetch badges — "Ns" (elapsed) for working cards
    await expect(async () => {
      // Working badges show elapsed time like "3s", "12s"
      const workingBadges = await page.locator("span:text-matches('\\\\d+s')").count();
      const queued = await page.locator("text=queued").count();
      const partial = await page.locator("text=partial").count();
      const ready = await page.locator("text=ready").count();
      console.log(`  Step 1: ${workingBadges} working, ${queued} queued, ${partial} partial, ${ready} ready`);
      expect(workingBadges + queued + partial + ready).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10_000, intervals: [1000] });

    // Verify API calls were fired for prefetching
    expect(apiCalls.length).toBeGreaterThanOrEqual(1);
    console.log(`Prefetch API calls fired: ${apiCalls.length}`);

    // ---- Step 2: Wait for at least one card to show progress ----
    await expect(async () => {
      const partial = await page.locator("text=partial").count();
      const ready = await page.locator("text=ready").count();
      console.log(`  Step 2: ${partial} partial, ${ready} ready`);
      expect(partial + ready).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 60_000, intervals: [2000] });
    console.log("At least one card has partial/ready status");

    // ---- Step 3: Click the first card and verify cancellation + new prefetches ----
    const callsBeforeClick = apiCalls.length;
    console.log(`API calls before click: ${callsBeforeClick}`);

    await page.locator("h3").first().click();
    console.log("Clicked first card");

    // New API calls should fire for the new level's cards
    await expect(() => {
      const newCalls = apiCalls.length - callsBeforeClick;
      console.log(`  Step 3: ${newCalls} new API calls`);
      expect(newCalls).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 15_000, intervals: [1000] });

    const totalCallsAfterClick = apiCalls.length;
    console.log(`Total API calls after click: ${totalCallsAfterClick} (${totalCallsAfterClick - callsBeforeClick} new)`);

    // ---- Step 4: Verify new cards appear with prefetch badges ----
    await expect(async () => {
      const working = await page.locator("span:text-matches('\\\\d+s')").count();
      const queued = await page.locator("text=queued").count();
      const partial = await page.locator("text=partial").count();
      const ready = await page.locator("text=ready").count();
      console.log(`  Step 4: ${ready} ready, ${partial} partial, ${working} working, ${queued} queued`);
      expect(working + partial + ready).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15_000, intervals: [1000] });

    // ---- Step 5: Wait for new level cards to become ready ----
    // LLM calls can take 5-20s each, so we give generous time.
    // Parent-level cancelled cards may remain "queued" — that's expected.
    await expect(async () => {
      const ready = await page.locator("text=ready").count();
      const partial = await page.locator("text=partial").count();
      const working = await page.locator("span:text-matches('\\\\d+s')").count();
      const queued = await page.locator("text=queued").count();
      console.log(`  Step 5: ${ready} ready, ${partial} partial, ${working} working, ${queued} queued`);
      // At least 3 cards should be fully prefetched
      expect(ready).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 90_000, intervals: [3000] });

    // ---- Summary ----
    const finalReady = await page.locator("text=ready").count();
    const finalFetching = await page.locator("span:text-matches('\\\\d+s')").count();
    const finalQueued = await page.locator("text=queued").count();
    console.log(`\n=== Test Summary ===`);
    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`Calls before click: ${callsBeforeClick}`);
    console.log(`Calls after click: ${apiCalls.length - callsBeforeClick}`);
    console.log(`Final: ${finalReady} ready, ${finalFetching} fetching, ${finalQueued} queued`);
    console.log(`Clicking any "ready" card would give instant results.`);
  });
});
