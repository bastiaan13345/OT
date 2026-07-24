"use client";

import { createElement, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

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
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();

    return suggestions.filter((suggestion) => suggestion.toLocaleLowerCase().includes(query));
  }, [suggestions, value]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setActiveSuggestion(null);
      return;
    }

    if (activeSuggestion !== null && !filteredSuggestions.includes(activeSuggestion)) {
      setActiveSuggestion(null);
    }
  }, [activeSuggestion, disabled, filteredSuggestions]);

  const close = () => {
    setIsOpen(false);
    setActiveSuggestion(null);
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
    setActiveSuggestion((current) => {
      const currentIndex = current === null ? -1 : filteredSuggestions.indexOf(current);

      if (currentIndex === -1) {
        return filteredSuggestions[direction === 1 ? 0 : filteredSuggestions.length - 1] ?? null;
      }

      return filteredSuggestions[
        (currentIndex + direction + filteredSuggestions.length) % filteredSuggestions.length
      ] ?? null;
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

    if (event.key === "Enter" && isOpen && activeSuggestion !== null) {
      if (filteredSuggestions.includes(activeSuggestion)) {
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

  const activeIndex = activeSuggestion === null ? -1 : filteredSuggestions.indexOf(activeSuggestion);
  const activeOptionId =
    isOpen && !disabled && activeIndex !== -1 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!isOpen || disabled || activeSuggestion === null || activeIndex === -1) {
      return;
    }

    const activeOption = optionRefs.current.get(activeSuggestion);

    if (typeof activeOption?.scrollIntoView === "function") {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, activeSuggestion, disabled, isOpen]);

  const menu = isOpen && !disabled
    ? createElement(
        "div",
        {
          "aria-label": `${label} suggestions`,
          className:
            "absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-line bg-white p-1 shadow-2xl shadow-black/10",
          id: listboxId,
          role: "listbox",
        },
        filteredSuggestions.length > 0
          ? filteredSuggestions.map((suggestion, index) => {
              const isActive = suggestion === activeSuggestion;

              return createElement(
                "button",
                {
                  "aria-selected": isActive,
                  className: `block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-ink hover:bg-soft hover:text-ink"
                  }`,
                  id: `${listboxId}-option-${index}`,
                  key: `${suggestion}-${index}`,
                  onClick: () => selectSuggestion(suggestion),
                  onPointerDown: (event) => event.preventDefault(),
                  ref: (element: HTMLButtonElement | null) => {
                    if (element) {
                      optionRefs.current.set(suggestion, element);
                    } else {
                      optionRefs.current.delete(suggestion);
                    }
                  },
                  role: "option",
                  tabIndex: -1,
                  type: "button",
                },
                suggestion,
              );
            })
          : createElement(
              "p",
              { className: "px-3 py-2 text-sm text-muted" },
              "No matching suggestions",
            ),
      )
    : null;

  return createElement(
    "div",
    { className: "relative" },
    createElement(
      "label",
      { className: "mb-2 block text-sm font-medium text-ink", htmlFor: inputId, id: labelId },
      label,
    ),
    createElement("input", {
      "aria-activedescendant": activeOptionId,
      "aria-autocomplete": "list",
      "aria-controls": isOpen ? listboxId : undefined,
      "aria-expanded": isOpen && !disabled,
      "aria-labelledby": labelId,
      className:
        "upload-control-focus w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-faint transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      disabled,
      id: inputId,
      name,
      onBlur: () => window.setTimeout(close, 0),
      onChange: (event) => {
        onChange(event.target.value);
        setIsOpen(true);
        setActiveSuggestion(null);
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
