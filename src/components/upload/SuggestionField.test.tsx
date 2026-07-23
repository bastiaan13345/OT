import { createElement, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SuggestionField } from "./SuggestionField";

const suggestions = ["Ambient", "Rock"];

function SuggestionFieldHarness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState("");

  return createElement(SuggestionField, {
    disabled,
    label: "Genre",
    name: "genre",
    onChange: setValue,
    placeholder: "Choose or type a genre",
    suggestions,
    value,
  });
}

function ReportingSuggestionFieldHarness({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("");

  return createElement(SuggestionField, {
    label: "Genre",
    onChange: (nextValue) => {
      onChange(nextValue);
      setValue(nextValue);
    },
    suggestions,
    value,
  });
}

describe("SuggestionField", () => {
  it("selects a filtered suggestion with ArrowDown and Enter in a controlled field", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    const input = screen.getByRole("combobox", { name: "Genre" });
    await user.type(input, "amb");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("Ambient");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("filters suggestions case-insensitively", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    await user.type(screen.getByRole("combobox", { name: "Genre" }), "RO");

    expect(screen.getByRole("option", { name: "Rock" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Ambient" })).not.toBeInTheDocument();
  });

  it("wraps keyboard navigation through visible suggestions", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    const input = screen.getByRole("combobox", { name: "Genre" });
    await user.click(input);
    await user.keyboard("{ArrowUp}");

    expect(screen.getByRole("option", { name: "Rock" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("option", { name: "Ambient" })).toHaveAttribute("aria-selected", "true");
  });

  it("closes its menu when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    const input = screen.getByRole("combobox", { name: "Genre" });
    await user.click(input);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("selects an exact suggestion with the mouse without losing the selection", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    await user.click(screen.getByRole("combobox", { name: "Genre" }));
    await user.click(screen.getByRole("option", { name: "Rock" }));

    expect(screen.getByRole("combobox", { name: "Genre" })).toHaveValue("Rock");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("passes typed free text to onChange without forcing a suggestion", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(createElement(ReportingSuggestionFieldHarness, { onChange }));

    await user.type(screen.getByRole("combobox", { name: "Genre" }), "Jazz");

    expect(onChange).toHaveBeenLastCalledWith("Jazz");
  });

  it("shows an empty state for an unmatched query", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    await user.type(screen.getByRole("combobox", { name: "Genre" }), "Classical");

    expect(screen.getByText("No matching suggestions")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("links its combobox, listbox, and active option with ARIA", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness));

    const input = screen.getByRole("combobox", { name: "Genre" });
    await user.click(input);
    await user.keyboard("{ArrowDown}");

    const listbox = screen.getByRole("listbox", { name: "Genre suggestions" });
    const activeOption = screen.getByRole("option", { name: "Ambient" });

    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-activedescendant", activeOption.id);
    expect(activeOption).toHaveAttribute("aria-selected", "true");
  });

  it("does not open or emit changes while disabled", async () => {
    const user = userEvent.setup();
    render(createElement(SuggestionFieldHarness, { disabled: true }));

    const input = screen.getByRole("combobox", { name: "Genre" });
    await user.click(input);
    await user.type(input, "Rock");

    expect(input).toBeDisabled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });
});
