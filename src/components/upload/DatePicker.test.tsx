import { createElement, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./DatePicker";

function DatePickerHarness() {
  const [value, setValue] = useState("2026-07-23");

  return createElement(
    "form",
    null,
    createElement(DatePicker, {
      label: "Release date",
      name: "releaseDate",
      value,
      onChange: setValue,
    }),
  );
}

describe("DatePicker", () => {
  it("serializes its ISO value in a form and shows a human-readable trigger", () => {
    const { container } = render(createElement(DatePickerHarness));

    expect(screen.getByRole("button", { name: "Release date" })).toHaveTextContent("23 July 2026");
    expect(new FormData(container.querySelector("form")!).get("releaseDate")).toBe("2026-07-23");
  });

  it("clears an optional date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      createElement(DatePicker, {
        label: "Release date",
        name: "releaseDate",
        value: "2026-07-23",
        onChange,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("opens a dark calendar with grouped cells and a dialog linked to its trigger", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      createElement(DatePicker, {
        label: "Release date",
        name: "releaseDate",
        value: "2026-07-23",
        onChange,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Release date" }));

    const trigger = screen.getByRole("button", { name: "Release date" });
    const dialog = screen.getByRole("dialog", { name: "July 2026" });
    const grid = screen.getByRole("grid", { name: "July 2026" });

    expect(dialog).toHaveClass(
      "bg-surface-900",
    );
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toHaveAttribute("aria-labelledby", `${dialog.id}-label`);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(42);
    expect(
      within(grid)
        .getAllByRole("row")
        .filter((row) => within(row).queryAllByRole("gridcell").length > 0),
    ).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("button", { name: "Sunday, 23 August 2026" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    await user.click(screen.getByRole("button", { name: "Saturday, 1 August 2026" }));

    expect(onChange).toHaveBeenCalledWith("2026-08-01");
  });

  it.each([
    ["{Enter}", "Enter"],
    [" ", "Space"],
  ])("selects the active date with %s", async (key) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      createElement(DatePicker, {
        label: "Release date",
        name: "releaseDate",
        value: "2026-07-23",
        onChange,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Release date" }));
    screen.getByRole("button", { name: "Thursday, 23 July 2026" }).focus();
    await user.keyboard(key);

    expect(onChange).toHaveBeenCalledWith("2026-07-23");
  });

  it("moves the active day with arrow keys and restores trigger focus on Escape", async () => {
    const user = userEvent.setup();
    render(createElement(DatePickerHarness));

    const trigger = screen.getByRole("button", { name: "Release date" });
    await user.click(trigger);

    const selectedDay = screen.getByRole("button", { name: /23 July 2026/ });
    selectedDay.focus();
    fireEvent.keyDown(selectedDay, { key: "ArrowDown" });

    expect(screen.getByRole("button", { name: /30 July 2026/ })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "July 2026" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
