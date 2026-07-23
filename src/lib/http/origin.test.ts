import { describe, expect, it } from "vitest";

import { requestHasValidOrigin } from "./origin";

function request(headers: Record<string, string>) {
  return new Request("https://app.example.test/api/releases", { headers });
}

describe("requestHasValidOrigin", () => {
  it("allows requests without an Origin header", () => {
    expect(requestHasValidOrigin(request({ host: "app.example.test" }))).toBe(true);
  });

  it("allows matching forwarded and direct hosts", () => {
    expect(requestHasValidOrigin(request({ origin: "https://public.example.test", "x-forwarded-host": "public.example.test, proxy.internal" }))).toBe(true);
    expect(requestHasValidOrigin(request({ origin: "https://app.example.test", host: "app.example.test" }))).toBe(true);
  });

  it("rejects mismatched or malformed origins", () => {
    expect(requestHasValidOrigin(request({ origin: "https://other.example.test", host: "app.example.test" }))).toBe(false);
    expect(requestHasValidOrigin(request({ origin: "not-a-url", host: "app.example.test" }))).toBe(false);
  });

  it("uses the trimmed first forwarded host value", () => {
    expect(requestHasValidOrigin(request({
      origin: "https://public.example.test",
      host: "ignored.example.test",
      "x-forwarded-host": " public.example.test , proxy.internal",
    }))).toBe(true);
  });
});
