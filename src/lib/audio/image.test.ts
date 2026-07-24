import { describe, expect, it } from "vitest";

import { validateImageMagic } from "./image";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (value: string) => new TextEncoder().encode(value);

describe("validateImageMagic", () => {
  it.each([
    ["cover.jpg", bytes(0xff, 0xd8, 0xff, 0xe0)],
    ["cover.png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ["cover.gif", ascii("GIF89a")],
    ["cover.webp", new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")])],
    ["cover.avif", new Uint8Array([0, 0, 0, 24, ...ascii("ftypavif")])],
  ])("accepts a real %s signature", async (name, contents) => {
    await expect(validateImageMagic(new File([contents], name))).resolves.toEqual({ ok: true });
  });

  it("accepts the AVIS ISO-BMFF brand", async () => {
    await expect(validateImageMagic(new File([new Uint8Array([0, 0, 0, 24, ...ascii("ftypavis")])], "cover.avif"))).resolves.toEqual({ ok: true });
  });

  it("rejects arbitrary bytes and mismatched extensions", async () => {
    await expect(validateImageMagic(new File([ascii("not an image")], "cover.jpg"))).resolves.toMatchObject({ ok: false });
    await expect(validateImageMagic(new File([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)], "cover.jpg"))).resolves.toMatchObject({ ok: false });
  });
});
