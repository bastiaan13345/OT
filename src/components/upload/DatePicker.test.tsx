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

    expect(screen.getByRole("button", { name: "Release date: 23 July 2026" })).toHaveTextContent("23 July 2026");
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

    await user.click(screen.getByRole("button", { name: "Release date: 23 July 2026" }));

    const trigger = screen.getByRole("button", { name: "Release date: 23 July 2026" });
    const dialog = screen.getByRole("dialog", { name: "July 2026" });
    const grid = screen.getByRole("grid", { name: "July 2026" });

    expect(dialog).toHaveClass(
      "bg-white",
    );
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toHaveAttribute("aria-labelledby", `${dialog.id}-label`);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(42);
    expect(
      within(grid)
        .getAllByRole("row")
        .filter((row) => within(row).queryAllByRole("gridcell").length > 0),
    ).toHaveLength(6);
    expect(screen.getByRole("columnheader", { name: "Mon" })).toHaveClass("text-xs", "text-muted");
    expect(screen.getByRole("button", { name: "Monday, 29 June 2026" })).toHaveClass("text-muted");

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

    await user.click(screen.getByRole("button", { name: "Release date: 23 July 2026" }));
    screen.getByRole("button", { name: "Thursday, 23 July 2026" }).focus();
    await user.keyboard(key);

    expect(onChange).toHaveBeenCalledWith("2026-07-23");
  });

  it("moves the active day with arrow keys and restores trigger focus on Escape", async () => {
    const user = userEvent.setup();
    render(createElement(DatePickerHarness));

    const trigger = screen.getByRole("button", { name: "Release date: 23 July 2026" });
    await user.click(trigger);

    const selectedDay = screen.getByRole("button", { name: "Thursday, 23 July 2026" });
    selectedDay.focus();
    fireEvent.keyDown(selectedDay, { key: "ArrowDown" });

    expect(screen.getByRole("button", { name: "Thursday, 30 July 2026" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "July 2026" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps month navigation focus on the button for repeated keyboard navigation", async () => {
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

    await user.click(screen.getByRole("button", { name: "Release date: 23 July 2026" }));
    const nextMonth = screen.getByRole("button", { name: "Next month" });
    await user.click(nextMonth);

    expect(nextMonth).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("grid", { name: "September 2026" })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("synchronizes a controlled value update while open before selecting", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      createElement(DatePicker, {
        label: "Release date",
        name: "releaseDate",
        value: "2026-07-23",
        onChange,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Release date: 23 July 2026" }));
    rerender(
      createElement(DatePicker, {
        label: "Release date",
        name: "releaseDate",
        value: "2026-08-05",
        onChange,
      }),
    );

    expect(screen.getByRole("grid", { name: "August 2026" })).toBeInTheDocument();
    const activeDay = screen.getByRole("button", { name: "Wednesday, 5 August 2026" });
    expect(activeDay).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("2026-08-05");
  });

  it("closes and removes disabled date controls from form serialization", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const renderPicker = (disabled: boolean) =>
      createElement(
        "form",
        null,
        createElement(DatePicker, {
          disabled,
          label: "Release date",
          name: "releaseDate",
          value: "2026-07-23",
          onChange,
        }),
      );
    const { container, rerender } = render(renderPicker(false));

    await user.click(screen.getByRole("button", { name: "Release date: 23 July 2026" }));
    rerender(renderPicker(true));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release date: 23 July 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear date" })).toBeDisabled();
    expect(container.querySelector('input[name="releaseDate"]')).toBeDisabled();
    expect(new FormData(container.querySelector("form")!).get("releaseDate")).toBeNull();
  });

  it("normalizes an invalid controlled value to an empty optional date", async () => {
    const user = userEvent.setup();
    const { container } = render(
      createElement(
        "form",
        null,
        createElement(DatePicker, {
          label: "Release date",
          name: "releaseDate",
          value: "2026-02-30",
          onChange: vi.fn(),
        }),
      ),
    );

    expect(new FormData(container.querySelector("form")!).get("releaseDate")).toBe("");
    const trigger = screen.getByRole("button", { name: "Release date: No date selected" });
    expect(trigger).toHaveTextContent("No date selected");

    await user.click(trigger);

    const activeDay = within(screen.getByRole("grid")).getAllByRole("button").find(
      (button) => button.getAttribute("tabindex") === "0",
    );
    expect(activeDay).toBeDefined();
    expect(activeDay).not.toHaveAccessibleName(/2026-02-30/);
  });

  it("toggles from its trigger and closes when a pointer starts outside", async () => {
    const user = userEvent.setup();
    render(createElement(DatePickerHarness));

    const trigger = screen.getByRole("button", { name: "Release date: 23 July 2026" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
