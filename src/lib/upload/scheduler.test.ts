import { describe, expect, it } from "vitest";

import { moveItem, runBounded } from "./scheduler";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

describe("runBounded", () => {
  it("keeps results in input order when workers complete out of order", async () => {
    let active = 0;
    let maxActive = 0;
    const completionOrder: number[] = [];
    const releases = Array.from({ length: 4 }, createDeferred);
    const started = Array.from({ length: 4 }, createDeferred);

    const resultsPromise = runBounded([1, 2, 3, 4], 2, async (value, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      started[index].resolve();

      await releases[index].promise;

      active -= 1;
      completionOrder.push(value);
      return value * 10;
    });

    await Promise.all([started[0].promise, started[1].promise]);
    releases[1].resolve();
    await started[2].promise;
    releases[0].resolve();
    await started[3].promise;
    releases[3].resolve();
    releases[2].resolve();

    const results = await resultsPromise;

    expect(maxActive).toBe(2);
    expect(completionOrder).toEqual([2, 1, 4, 3]);
    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
      { status: "fulfilled", value: 30 },
      { status: "fulfilled", value: 40 },
    ]);
  });

  it("settles every item when one worker rejects", async () => {
    const results = await runBounded([1, 2, 3], 3, async (value) => {
      if (value === 2) {
        throw new Error("bad file");
      }

      return value * 10;
    });

    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
    ]);
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: new Error("bad file"),
    });
  });

  it("captures a synchronous worker throw without cancelling later items", async () => {
    const results = await runBounded([1, 2], 1, (value) => {
      if (value === 1) {
        throw new Error("sync failure");
      }

      return Promise.resolve(value * 10);
    });

    expect(results[0]).toMatchObject({
      status: "rejected",
      reason: new Error("sync failure"),
    });
    expect(results[1]).toEqual({ status: "fulfilled", value: 20 });
  });

  it.each([
    { requestedLimit: Number.NaN, expectedMax: 1 },
    { requestedLimit: Number.POSITIVE_INFINITY, expectedMax: 4 },
    { requestedLimit: Number.NEGATIVE_INFINITY, expectedMax: 1 },
    { requestedLimit: 99, expectedMax: 4 },
    { requestedLimit: 3.9, expectedMax: 3 },
  ])(
    "normalizes a requested limit of $requestedLimit to $expectedMax concurrent workers",
    async ({ requestedLimit, expectedMax }) => {
      let maxActive = 0;
      let active = 0;

      await runBounded([1, 2, 3, 4, 5], requestedLimit, async (value) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((resolve) => queueMicrotask(resolve));
        active -= 1;
        return value;
      });

      expect(maxActive).toBe(expectedMax);
    },
  );

  it("returns an empty result for empty input", async () => {
    await expect(runBounded([], 4, async (value: number) => value)).resolves.toEqual([]);
  });

  it("floors a fractional limit below two", async () => {
    let maxActive = 0;
    let active = 0;

    await runBounded([1, 2], 1.9, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      active -= 1;
      return value;
    });

    expect(maxActive).toBe(1);
  });
});

describe("moveItem", () => {
  it("moves an item immutably", () => {
    const original = ["a", "b", "c"];

    expect(moveItem(original, 2, 0)).toEqual(["c", "a", "b"]);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("returns an unchanged copy for invalid indices", () => {
    const original = ["a", "b", "c"];
    const result = moveItem(original, -1, 3);

    expect(result).toEqual(original);
    expect(result).not.toBe(original);
  });
});
