import { describe, expect, it } from "vitest";

import { buildMonthGrid, formatIsoDate, moveIsoDate } from "./date";

describe("local upload date helpers", () => {
  it("formats ISO dates without changing the local calendar day", () => {
    expect(formatIsoDate("2026-07-23", "en-GB")).toBe("23 July 2026");
  });

  it("builds a Monday-first six-week grid", () => {
    const days = buildMonthGrid(2026, 6);

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ isoDate: "2026-06-29", isCurrentMonth: false });
    expect(days[2]).toMatchObject({ isoDate: "2026-07-01", isCurrentMonth: true });
    expect(days[41]).toMatchObject({ isoDate: "2026-08-09", isCurrentMonth: false });
  });

  it("keeps the calendar date local across month and year boundaries", () => {
    expect(buildMonthGrid(2025, 0)[0]).toMatchObject({ isoDate: "2024-12-30" });
    expect(moveIsoDate("2026-01-01", "ArrowLeft")).toBe("2025-12-31");
  });

  it.each([
    ["ArrowLeft", "2026-07-22"],
    ["ArrowRight", "2026-07-24"],
    ["ArrowUp", "2026-07-16"],
    ["ArrowDown", "2026-07-30"],
  ] as const)("moves an ISO date with %s", (key, expected) => {
    expect(moveIsoDate("2026-07-23", key)).toBe(expected);
  });

  it("returns an empty display value and preserves empty or invalid move input", () => {
    expect(formatIsoDate("", "en-GB")).toBe("");
    expect(formatIsoDate("2026-02-30", "en-GB")).toBe("");
    expect(moveIsoDate("", "ArrowDown")).toBe("");
    expect(moveIsoDate("not-a-date", "ArrowDown")).toBe("not-a-date");
    expect(moveIsoDate("2026-07-23", "Enter")).toBe("2026-07-23");
  });
});
