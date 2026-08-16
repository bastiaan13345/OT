import { describe, expect, it } from "vitest";
import { withProcessingSlot } from "./processing-limit";

describe("withProcessingSlot", () => {
  it("caps concurrent server-side processing at four", async () => {
    let active = 0;
    let maximum = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });

    const tasks = Array.from({ length: 8 }, () => withProcessingSlot(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await gate;
      active -= 1;
    }));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(maximum).toBe(4);
    release?.();
    await Promise.all(tasks);
  });
});
