import { describe, expect, it } from "vitest";
import { parseRegistration } from "./registration";

function validForm() {
  const form = new FormData();
  form.set("name", "Beta Listener");
  form.set("email", " Listener@Example.com ");
  form.set("password", "long-enough-password");
  return form;
}

describe("parseRegistration", () => {
  it("immediately approves listener accounts", () => {
    expect(parseRegistration(validForm())).toEqual({
      name: "Beta Listener",
      email: "listener@example.com",
      password: "long-enough-password",
      role: "LISTENER",
      approved: true,
    });
  });

  it("requires approval for creator accounts", () => {
    const form = validForm();
    form.set("role", "CREATOR");

    expect(parseRegistration(form)).toEqual({
      name: "Beta Listener",
      email: "listener@example.com",
      password: "long-enough-password",
      role: "CREATOR",
      approved: false,
    });
  });

  it("rejects attempts to register with elevated privileges", () => {
    const form = validForm();
    form.set("role", "ADMIN");

    expect(() => parseRegistration(form)).toThrow("listener or creator");
  });

  it("rejects malformed identity fields", () => {
    const form = validForm();
    form.set("email", "not-an-email");
    expect(() => parseRegistration(form)).toThrow("valid email");
  });
});
