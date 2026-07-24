import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  findForbiddenMatches,
  inspectAuthBrand,
  inspectNavbar,
} from "./check-light-theme.mjs";

const validNavbar = `
  <Image alt="Infini" src="/Infini.svg" />
  <Image
    src="/Infini.svg"
    alt="Infini"
  />
`;

describe("light theme audit", () => {
  it("requires the Infini Image brand on both auth pages", () => {
    for (const file of [
      "src/app/signup/page.tsx",
      "src/app/admin/login/page.tsx",
    ]) {
      expect(inspectAuthBrand(readFileSync(file, "utf8"), file)).toEqual([]);
    }
  });

  it("rejects the old Music2 auth brand", () => {
    const source = `
      <div className="rounded-2xl bg-ink">
        <Music2 className="text-white" />
      </div>
    `;

    expect(inspectAuthBrand(source)).toEqual([
      "Auth page must render exactly one /Infini.svg Image",
      "Auth page must not render the old Music2 logo",
    ]);
  });

  it("accepts exactly one actual Infini Image auth brand", () => {
    const source = '<Image src="/Infini.svg" alt="Infini" width={72} height={72} priority />';

    expect(inspectAuthBrand(source)).toEqual([]);
  });

  it("ignores spoofed auth brands in comments and strings", () => {
    const source = `
      // <Music2 /><Image src="/Infini.svg" />
      /* <Music2 /><Image src="/Infini.svg" /> */
      {/* <Music2 /><Image src="/Infini.svg" /> */}
      const spoof = '<Music2 /><Image src="/Infini.svg" />';
      <Image src="/Infini.svg" alt="Infini" width={72} height={72} />
    `;

    expect(inspectAuthBrand(source)).toEqual([]);
  });

  it("rejects duplicate Infini Image auth brands", () => {
    const source = `
      <Image src="/Infini.svg" alt="Infini" />
      <Image src="/Infini.svg" alt="Infini" />
    `;

    expect(inspectAuthBrand(source)).toEqual([
      "Auth page must render exactly one /Infini.svg Image",
    ]);
  });

  it("rejects Music2 after an apostrophe in rendered JSX text", () => {
    const source = `<Image src="/Infini.svg" />
      <p>You're signed out</p>
      <Music2 />`;

    expect(inspectAuthBrand(source)).toEqual([
      "Auth page must not render the old Music2 logo",
    ]);
  });

  it("rejects a duplicate logo after an apostrophe in rendered JSX text", () => {
    const source = `<Image src="/Infini.svg" />
      <p>Don't</p>
      <Image src="/Infini.svg" />`;

    expect(inspectAuthBrand(source)).toEqual([
      "Auth page must render exactly one /Infini.svg Image",
    ]);
  });

  it("ignores a commented Music2 after an apostrophe in rendered JSX text", () => {
    const source = `<Image src="/Infini.svg" />
      <p>You're signed out</p>
      {/* <Music2 /> */}`;

    expect(inspectAuthBrand(source)).toEqual([]);
  });

  it("ignores a commented duplicate logo after an apostrophe in rendered JSX text", () => {
    const source = `<Image src="/Infini.svg" />
      <p>Don't</p>
      {/* <Image src="/Infini.svg" /> */}`;

    expect(inspectAuthBrand(source)).toEqual([]);
  });

  it("ignores Navbar logo and wordmark text outside actual JSX nodes", () => {
    const source = `
      // <Music2 /> OpenTunes <Image src="/Infini.svg" />
      /* <Music2 /> OpenTunes <Image src="/Infini.svg" /> */
      {/* <Music2 /> OpenTunes <Image src="/Infini.svg" /> */}
      const spoof = '<Music2 /> OpenTunes <Image src="/Infini.svg" />';
      ${validNavbar}
    `;

    expect(inspectNavbar(source)).toEqual([]);
  });

  it("requires exactly two Infini Image nodes in the Navbar", () => {
    expect(inspectNavbar('<Image alt="Infini" src="/Infini.svg" />')).toEqual([
      "Navbar must render /Infini.svg",
    ]);
    expect(inspectNavbar(validNavbar)).toEqual([]);
  });

  it("rejects a whitespace-split OpenTunes Navbar text node", () => {
    const failures = inspectNavbar(`${validNavbar}<span>Open\n  Tunes</span>`);

    expect(failures).toContain("Navbar must not render the OpenTunes wordmark");
  });

  it("rejects OpenTunes rendered by static Navbar string expressions", () => {
    for (const expression of ['{"OpenTunes"}', "{'Open' + 'Tunes'}"]) {
      const failures = inspectNavbar(`${validNavbar}<span>${expression}</span>`);

      expect(failures, expression).toContain(
        "Navbar must not render the OpenTunes wordmark",
      );
    }
  });

  it("rejects OpenTunes rendered by static templates and parenthesized expressions", () => {
    for (const expression of [
      "{`OpenTunes`}",
      '{("OpenTunes")}',
      "{((('Open' + 'Tunes')))}",
    ]) {
      const failures = inspectNavbar(`${validNavbar}<span>${expression}</span>`);

      expect(failures, expression).toContain(
        "Navbar must not render the OpenTunes wordmark",
      );
    }
  });

  it("ignores interpolated and dynamic Navbar expressions", () => {
    const source = `${validNavbar}<span>{\`Open\${name}Tunes\`}{brandName}</span>`;

    expect(inspectNavbar(source)).toEqual([]);
  });

  it("rejects rendered Music2 Navbar nodes", () => {
    const failures = inspectNavbar(`${validNavbar}<Music2 aria-hidden="true" />`);

    expect(failures).toContain("Navbar must not render the old Music2 logo");
  });

  it("catches dark arbitrary hex colors of each CSS length", () => {
    for (const token of [
      "bg-[#111]",
      "bg-[#1118]",
      "bg-[#111111]",
      "bg-[#11111180]",
    ]) {
      expect(findForbiddenMatches(token), token).toContain(token);
    }
  });

  it("catches dark arbitrary rgb and rgba colors", () => {
    for (const token of [
      "bg-[rgb(10,10,10)]",
      "bg-[rgba(10,10,10,0.5)]",
    ]) {
      expect(findForbiddenMatches(token), token).toContain(token);
    }
  });

  it("catches dark arbitrary RGB colors using Tailwind underscore space syntax", () => {
    for (const token of [
      "bg-[rgb(10_10_10)]",
      "bg-[rgb(10_10_10_/_50%)]",
      "bg-[rgba(10_10_10_/_0.5)]",
    ]) {
      expect(findForbiddenMatches(token), token).toContain(token);
    }
  });

  it("ignores non-color arbitrary backgrounds", () => {
    expect(
      findForbiddenMatches("bg-[url('/noise.svg')] bg-[length:10px_20px]"),
    ).toEqual([]);
  });

  it("does not partially match bg-white opacity 50 or 100", () => {
    expect(findForbiddenMatches("bg-white/50 bg-white/100")).toEqual([]);
    expect(
      findForbiddenMatches("bg-white/5 bg-white/10 bg-white/15 bg-white/20"),
    ).toEqual(["bg-white/5", "bg-white/10", "bg-white/15", "bg-white/20"]);
  });

  it("keeps the original forbidden token checks active", () => {
    const source = [
      "rose-500",
      "pink-400",
      "indigo-300",
      "violet-700",
      "bg-surface-600/50",
      "bg-surface-900",
      "bg-[#012345]",
      "border-white/10",
      "bg-white/[0.06]",
    ].join(" ");

    expect(findForbiddenMatches(source)).toEqual([
      "rose-500",
      "pink-400",
      "indigo-300",
      "violet-700",
      "bg-surface-600/50",
      "bg-surface-900",
      "bg-[#012345]",
      "border-white/",
      "bg-white/[",
    ]);
  });
});
