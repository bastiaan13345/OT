import { createElement, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SwitchField } from "./SwitchField";

function SwitchFieldHarness({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);

  return createElement(
    "form",
    null,
    createElement(SwitchField, {
      checked,
      disabled,
      label: "Allow downloads",
      name: "allowDownload",
      onChange: setChecked,
    }),
  );
}

describe("SwitchField", () => {
  it("renders an unchecked named switch and serializes a click as on", async () => {
    const user = userEvent.setup();
    const { container } = render(createElement(SwitchFieldHarness));
    const control = screen.getByRole("switch", { name: "Allow downloads" });

    expect(control).toHaveAttribute("aria-checked", "false");
    expect(new FormData(container.querySelector("form")!).get("allowDownload")).toBe("off");

    await user.click(control);

    expect(control).toHaveAttribute("aria-checked", "true");
    expect(new FormData(container.querySelector("form")!).get("allowDownload")).toBe("on");
  });

  it.each([" ", "{Enter}"])("toggles with %s", async (key) => {
    const user = userEvent.setup();
    render(createElement(SwitchFieldHarness));
    const control = screen.getByRole("switch", { name: "Allow downloads" });

    control.focus();
    await user.keyboard(key);

    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("does not change when disabled", async () => {
    const user = userEvent.setup();
    render(createElement(SwitchFieldHarness, { disabled: true }));
    const control = screen.getByRole("switch", { name: "Allow downloads" });

    await user.click(control);
    control.focus();
    await user.keyboard(" ");

    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toBeDisabled();
  });
});
