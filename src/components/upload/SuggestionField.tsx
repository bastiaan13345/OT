"use client";

import { createElement, KeyboardEvent, useEffect, useId, useMemo, useState } from "react";

type SuggestionFieldProps = {
  label: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
};

/** A controlled free-text combobox with optional matching suggestions. */
export function SuggestionField({
  label,
  value,
  suggestions,
  onChange,
  name,
  id,
  placeholder,
  disabled = false,
}: SuggestionFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `suggestion-field-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const labelId = `${inputId}-label`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();

    return suggestions.filter((suggestion) => suggestion.toLocaleLowerCase().includes(query));
  }, [suggestions, value]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setActiveIndex(null);
      return;
    }

    if (activeIndex !== null && activeIndex >= filteredSuggestions.length) {
      setActiveIndex(null);
    }
  }, [activeIndex, disabled, filteredSuggestions.length]);

  const close = () => {
    setIsOpen(false);
    setActiveIndex(null);
  };

  const selectSuggestion = (suggestion: string) => {
    if (disabled) {
      return;
    }

    onChange(suggestion);
    close();
  };

  const moveActiveSuggestion = (direction: 1 | -1) => {
    if (filteredSuggestions.length === 0) {
      return;
    }

    setIsOpen(true);
    setActiveIndex((current) => {
      if (current === null) {
        return direction === 1 ? 0 : filteredSuggestions.length - 1;
      }

      return (current + direction + filteredSuggestions.length) % filteredSuggestions.length;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveSuggestion(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveSuggestion(-1);
      return;
    }

    if (event.key === "Enter" && isOpen && activeIndex !== null) {
      const activeSuggestion = filteredSuggestions[activeIndex];

      if (activeSuggestion) {
        event.preventDefault();
        selectSuggestion(activeSuggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const activeOptionId =
    isOpen && activeIndex !== null ? `${listboxId}-option-${activeIndex}` : undefined;

  const menu = isOpen
    ? createElement(
        "div",
        {
          "aria-label": `${label} suggestions`,
          className:
            "absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-surface-900 p-1 shadow-2xl shadow-black/50",
          id: listboxId,
          role: "listbox",
        },
        filteredSuggestions.length > 0
          ? filteredSuggestions.map((suggestion, index) => {
              const isActive = index === activeIndex;

              return createElement(
                "button",
                {
                  "aria-selected": isActive,
                  className: `block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-zinc-200 hover:bg-white/10 hover:text-white"
                  }`,
                  id: `${listboxId}-option-${index}`,
                  key: `${suggestion}-${index}`,
                  onClick: () => selectSuggestion(suggestion),
                  onMouseDown: (event) => event.preventDefault(),
                  role: "option",
                  type: "button",
                },
                suggestion,
              );
            })
          : createElement(
              "p",
              { className: "px-3 py-2 text-sm text-zinc-400" },
              "No matching suggestions",
            ),
      )
    : null;

  return createElement(
    "div",
    { className: "relative" },
    createElement(
      "label",
      { className: "mb-2 block text-sm font-medium text-zinc-200", htmlFor: inputId, id: labelId },
      label,
    ),
    createElement("input", {
      "aria-activedescendant": activeOptionId,
      "aria-autocomplete": "list",
      "aria-controls": isOpen ? listboxId : undefined,
      "aria-expanded": isOpen,
      "aria-labelledby": labelId,
      className:
        "upload-control-focus w-full rounded-lg border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      disabled,
      id: inputId,
      name,
      onBlur: () => window.setTimeout(close, 0),
      onChange: (event) => {
        onChange(event.target.value);
        setIsOpen(true);
        setActiveIndex(null);
      },
      onFocus: () => !disabled && setIsOpen(true),
      onKeyDown: handleKeyDown,
      placeholder,
      role: "combobox",
      type: "text",
      value,
    }),
    menu,
  );
}
