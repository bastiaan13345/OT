"use client";

import { createElement, useId } from "react";

type SwitchFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  label: string;
  disabled?: boolean;
};

/** A controlled switch with an explicit hidden form value for server actions. */
export function SwitchField({
  checked,
  onChange,
  name,
  label,
  disabled = false,
}: SwitchFieldProps) {
  const labelId = useId();

  return createElement(
    "div",
    { className: "flex items-center justify-between gap-4" },
    createElement("input", {
      disabled,
      name,
      type: "hidden",
      value: checked ? "on" : "off",
    }),
    createElement("span", { className: "text-sm font-medium text-ink", id: labelId }, label),
    createElement(
      "button",
      {
        "aria-checked": checked,
        "aria-labelledby": labelId,
        className: [
          "upload-control-focus relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-ink bg-ink shadow-lg shadow-black/20"
            : "border-line bg-soft hover:bg-soft",
        ].join(" "),
        disabled,
        onClick: () => onChange(!checked),
        role: "switch",
        type: "button",
      },
      createElement("span", {
        "aria-hidden": true,
        className: [
          "h-6 w-6 rounded-full bg-canvas shadow-sm transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" "),
      }),
    ),
  );
}
