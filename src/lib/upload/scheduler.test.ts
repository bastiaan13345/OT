import { describe, expect, it } from "vitest";

import { moveItem, runBounded } from "./scheduler";

describe("runBounded", () => {
  it("limits concurrent workers and keeps fulfilled results in input order", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await runBounded([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);

      await new Promise<void>((resolve) => queueMicrotask(resolve));

      active -= 1;
      return value * 10;
    });

    expect(maxActive).toBe(2);
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

  it("clamps a fractional low requested limit and returns an empty input unchanged", async () => {
    let maxActive = 0;
    let active = 0;

    const results = await runBounded([1, 2], 1.9, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      active -= 1;
      return value;
    });

    expect(maxActive).toBe(1);
    expect(results).toEqual([
      { status: "fulfilled", value: 1 },
      { status: "fulfilled", value: 2 },
    ]);
    await expect(runBounded([], 4, async (value: number) => value)).resolves.toEqual([]);
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
