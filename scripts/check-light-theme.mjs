import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const groups = {
  core: [
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/components/Navbar.tsx",
  ],
  shared: [
    "src/components/ui/Button.tsx",
    "src/components/ui/Input.tsx",
    "src/components/ui/Badge.tsx",
    "src/components/TrackCard.tsx",
    "src/components/TrackDetailPage.tsx",
    "src/components/home/AlbumCarousel.tsx",
    "src/components/player/AudioPlayer.tsx",
    "src/components/profile/ProfileAvatarField.tsx",
    "src/components/DeleteTrackButton.tsx",
    "src/components/social/AddToPlaylistForm.tsx",
    "src/components/social/CommentForm.tsx",
    "src/components/social/FollowButton.tsx",
    "src/components/social/LikeButton.tsx",
  ],
  public: [
    "src/components/HomePage.tsx",
    "src/components/BrowsePage.tsx",
    "src/components/feed/FeedTrackList.tsx",
    "src/components/feed/HistoryTrackList.tsx",
    "src/components/library/PlaylistControls.tsx",
    "src/app/feed/page.tsx",
    "src/app/history/page.tsx",
    "src/app/library/page.tsx",
    "src/app/artist/[id]/page.tsx",
    "src/app/playlist/[id]/page.tsx",
    "src/app/signup/page.tsx",
  ],
  admin: [
    "src/app/admin/layout.tsx",
    "src/app/admin/login/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/profile/page.tsx",
    "src/app/admin/upload/page.tsx",
    "src/app/admin/analytics/page.tsx",
    "src/app/admin/releases/page.tsx",
    "src/app/admin/studio/[id]/page.tsx",
    "src/components/creator/ABComparePlayer.tsx",
    "src/components/creator/AnalysisPanel.tsx",
    "src/components/creator/ReleaseControls.tsx",
    "src/components/creator/StudioControls.tsx",
    "src/components/creator/VersionRow.tsx",
  ],
  upload: [
    "src/app/admin/settings/page.tsx",
    "src/components/settings/UploadPreferencesForm.tsx",
    "src/components/settings/UploadPresetEditor.tsx",
    "src/components/upload/DatePicker.tsx",
    "src/components/upload/PresetPicker.tsx",
    "src/components/upload/SuggestionField.tsx",
    "src/components/upload/SwitchField.tsx",
  ],
};

const forbidden = [
  /(?:rose|pink|indigo|violet)-\d+/g,
  /bg-surface-(?:600|700|800|900)(?:\/\d+)?/g,
  /bg-\[#(?:0[0-9a-fA-F]{5}|1[0-9a-fA-F]{5}|2[0-9a-fA-F]{5})\]/g,
  /border-white\//g,
  /bg-white\/\[/g,
  /bg-white\/(?:5|10|15|20)(?!\d)/g,
];

function stripJsJsxComments(source) {
  let result = "";
  const expressionBases = [];
  let activeTag = null;
  let jsxDepth = 0;
  let quote = null;

  for (let index = 0; index < source.length;) {
    if (activeTag?.end === index) {
      if (activeTag.closing) {
        jsxDepth = Math.max(0, jsxDepth - 1);
      } else if (!activeTag.selfClosing) {
        jsxDepth += 1;
      }
      activeTag = null;
    }

    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      result += character;
      if (character === "\\") {
        result += next ?? "";
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }

    if (!activeTag && character === "<") {
      const fragment = source.startsWith("<>", index) || source.startsWith("</>", index);
      const tagMatch = source.slice(index).match(/^<\s*(\/?)\s*([A-Za-z][\w.:-]*)\b/);
      if (fragment || tagMatch) {
        const end = findTagEnd(source, index);
        if (end !== -1) {
          const raw = source.slice(index, end);
          activeTag = {
            end,
            closing: fragment ? source.startsWith("</>", index) : tagMatch[1] === "/",
            selfClosing: /\/\s*>$/.test(raw),
          };
        }
      }
    }

    const expressionBase = expressionBases.at(-1);
    const isJavaScriptContext = activeTag
      || jsxDepth === 0
      || expressionBase === jsxDepth;

    if (
      isJavaScriptContext
      && (character === '"' || character === "'" || character === "`")
    ) {
      quote = character;
      result += character;
      index += 1;
      continue;
    }

    if (isJavaScriptContext && character === "/" && next === "/") {
      result += "  ";
      index += 2;
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }

    if (isJavaScriptContext && character === "/" && next === "*") {
      result += "  ";
      index += 2;
      while (index < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          result += "  ";
          index += 2;
          break;
        }
        result += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    if (!activeTag && jsxDepth > 0 && character === "{") {
      expressionBases.push(jsxDepth);
    } else if (!activeTag && expressionBase === jsxDepth && character === "}") {
      expressionBases.pop();
    }

    result += character;
    index += 1;
  }

  return result;
}

function findTagEnd(source, start) {
  let braceDepth = 0;
  let quote = null;

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      braceDepth += 1;
    } else if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (character === ">" && braceDepth === 0) {
      return index + 1;
    }
  }

  return -1;
}

function extractJsxTags(source) {
  const tags = [];
  const expressionBases = [];
  let jsxDepth = 0;
  let quote = null;

  for (let index = 0; index < source.length;) {
    const character = source[index];

    if (quote) {
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }

    const expressionBase = expressionBases.at(-1);
    const isJavaScriptContext = jsxDepth === 0 || expressionBase === jsxDepth;

    if (
      isJavaScriptContext
      && (character === '"' || character === "'" || character === "`")
    ) {
      quote = character;
      index += 1;
      continue;
    }

    if (jsxDepth > 0 && character === "{") {
      expressionBases.push(jsxDepth);
      index += 1;
      continue;
    }

    if (expressionBase === jsxDepth && character === "}") {
      expressionBases.pop();
      index += 1;
      continue;
    }

    if (character !== "<") {
      index += 1;
      continue;
    }

    const fragment = source.startsWith("<>", index) || source.startsWith("</>", index);
    const tagMatch = source.slice(index).match(/^<\s*(\/?)\s*([A-Za-z][\w.:-]*)\b/);
    if (!fragment && !tagMatch) {
      index += 1;
      continue;
    }

    const end = findTagEnd(source, index);
    if (end === -1) break;

    const raw = source.slice(index, end);
    const tag = {
      start: index,
      end,
      raw,
      name: fragment ? "" : tagMatch[2],
      closing: fragment ? source.startsWith("</>", index) : tagMatch[1] === "/",
      selfClosing: /\/\s*>$/.test(raw),
    };
    tags.push(tag);

    if (tag.closing) {
      jsxDepth = Math.max(0, jsxDepth - 1);
    } else if (!tag.selfClosing) {
      jsxDepth += 1;
    }

    index = end;
  }

  return tags;
}

function readStringLiteral(source, start) {
  const quote = source[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;

  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === quote) return { value, end: index + 1 };
    if (quote === "`" && character === "$" && source[index + 1] === "{") return null;
    if (character !== "\\") {
      value += character;
      continue;
    }

    const escaped = source[index + 1];
    if (escaped === undefined) return null;
    const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v" };
    value += escapes[escaped] ?? escaped;
    index += 1;
  }

  return null;
}

function skipWhitespace(source, start) {
  let index = start;
  while (/\s/.test(source[index] ?? "")) index += 1;
  return index;
}

function parseStaticStringTerm(source, start) {
  const index = skipWhitespace(source, start);
  const literal = readStringLiteral(source, index);
  if (literal) return literal;

  if (source[index] !== "(") return null;
  const expression = parseStaticStringExpression(source, index + 1);
  if (!expression) return null;

  const end = skipWhitespace(source, expression.end);
  if (source[end] !== ")") return null;
  return { value: expression.value, end: end + 1 };
}

function parseStaticStringExpression(source, start) {
  const first = parseStaticStringTerm(source, start);
  if (!first) return null;

  let value = first.value;
  let index = first.end;

  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (source[index] !== "+") break;

    const next = parseStaticStringTerm(source, index + 1);
    if (!next) return null;
    value += next.value;
    index = next.end;
  }

  return { value, end: index };
}

function evaluateStaticStringExpression(source) {
  const expression = parseStaticStringExpression(source, 0);
  if (!expression) return null;

  const end = skipWhitespace(source, expression.end);
  if (end !== source.length) return null;

  return expression.value;
}

function findExpressionEnd(source, start) {
  let depth = 1;
  let quote = null;

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function renderStaticJsxText(source) {
  let result = "";

  for (let index = 0; index < source.length;) {
    if (source[index] !== "{") {
      result += source[index];
      index += 1;
      continue;
    }

    const end = findExpressionEnd(source, index);
    if (end === -1) break;
    const staticValue = evaluateStaticStringExpression(source.slice(index + 1, end));
    if (staticValue !== null) result += staticValue;
    index = end + 1;
  }

  return result;
}

function hasOpenTunesTextNode(source, tags) {
  const stack = [];

  for (let index = 0; index < tags.length; index += 1) {
    const tag = tags[index];
    const previous = tags[index - 1];

    if (previous && stack.length > 0) {
      const text = renderStaticJsxText(source.slice(previous.end, tag.start));
      if (text.replace(/\s+/g, "").includes("OpenTunes")) return true;
    }

    if (tag.closing) {
      stack.pop();
    } else if (!tag.selfClosing) {
      stack.push(tag.name);
    }
  }

  return false;
}

export function inspectNavbar(source) {
  const uncommented = stripJsJsxComments(source);
  const tags = extractJsxTags(uncommented);
  const logoCount = tags.filter((tag) => (
    !tag.closing
    && tag.name === "Image"
    && /\bsrc\s*=\s*"\/Infini\.svg"/.test(tag.raw)
  )).length;
  const failures = [];

  if (logoCount !== 2) failures.push("Navbar must render /Infini.svg");
  if (tags.some((tag) => !tag.closing && tag.name === "Music2")) {
    failures.push("Navbar must not render the old Music2 logo");
  }
  if (hasOpenTunesTextNode(uncommented, tags)) {
    failures.push("Navbar must not render the OpenTunes wordmark");
  }

  return failures;
}

export function inspectAuthBrand(source, pageName = "Auth page") {
  const uncommented = stripJsJsxComments(source);
  const tags = extractJsxTags(uncommented);
  const logoCount = tags.filter((tag) => (
    !tag.closing
    && tag.name === "Image"
    && /\bsrc\s*=\s*"\/Infini\.svg"/.test(tag.raw)
  )).length;
  const failures = [];

  if (logoCount !== 1) failures.push(`${pageName} must render exactly one /Infini.svg Image`);
  if (tags.some((tag) => !tag.closing && tag.name === "Music2")) {
    failures.push(`${pageName} must not render the old Music2 logo`);
  }

  return failures;
}

function parseHexColor(value) {
  const digits = value.slice(1);
  if (![3, 4, 6, 8].includes(digits.length) || !/^[0-9a-f]+$/i.test(digits)) return null;

  const expanded = digits.length <= 4
    ? [...digits].map((digit) => digit + digit).join("")
    : digits;
  return [0, 2, 4].map((start) => Number.parseInt(expanded.slice(start, start + 2), 16));
}

function parseRgbChannel(value) {
  if (value.endsWith("%")) {
    const percentage = Number.parseFloat(value);
    return percentage >= 0 && percentage <= 100 ? percentage * 2.55 : null;
  }

  const channel = Number(value);
  return Number.isFinite(channel) && channel >= 0 && channel <= 255 ? channel : null;
}

function isValidAlpha(value) {
  if (value.endsWith("%")) {
    const percentage = Number.parseFloat(value);
    return percentage >= 0 && percentage <= 100;
  }

  const alpha = Number(value);
  return Number.isFinite(alpha) && alpha >= 0 && alpha <= 1;
}

function parseRgbColor(value) {
  const match = value.match(/^(rgba?)\((.*)\)$/i);
  if (!match) return null;

  const body = match[2].replaceAll("_", " ").trim();
  let channelValues;
  let alphaValue;

  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    const expectedLength = match[1].toLowerCase() === "rgba" ? 4 : 3;
    if (parts.length !== expectedLength) return null;
    channelValues = parts.slice(0, 3);
    alphaValue = parts[3];
  } else {
    const slashParts = body.split(/\s*\/\s*/);
    if (slashParts.length > 2) return null;
    channelValues = slashParts[0].trim().split(/\s+/);
    alphaValue = slashParts[1];
  }

  if (channelValues.length !== 3) return null;
  if (alphaValue !== undefined && !isValidAlpha(alphaValue)) return null;

  const channels = channelValues.map(parseRgbChannel);
  if (channels.some((channel) => channel === null)) return null;

  return channels;
}

function isDarkColor(value) {
  const channels = value.startsWith("#") ? parseHexColor(value) : parseRgbColor(value);
  if (!channels) return false;

  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance <= 0.25;
}

export function findForbiddenMatches(source) {
  const matches = [];
  const seenLocations = new Set();

  for (const pattern of forbidden) {
    for (const match of source.matchAll(pattern)) {
      matches.push(match[0]);
      seenLocations.add(`${match.index}:${match[0]}`);
    }
  }

  const arbitraryColor = /bg-\[(#[0-9a-f]+|rgba?\([^\])]+\))\]/gi;
  for (const match of source.matchAll(arbitraryColor)) {
    const location = `${match.index}:${match[0]}`;
    if (isDarkColor(match[1]) && !seenLocations.has(location)) matches.push(match[0]);
  }

  return matches;
}

function runCli() {
  const requested = process.argv[2] ?? "all";
  const files = requested === "all" ? Object.values(groups).flat() : groups[requested];
  if (!files) throw new Error(`Unknown group: ${requested}`);

  const failures = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of findForbiddenMatches(source)) failures.push(`${file}: ${match}`);
  }

  const navbar = readFileSync("src/components/Navbar.tsx", "utf8");
  failures.push(...inspectNavbar(navbar));

  for (const [pageName, file] of [
    ["Signup page", "src/app/signup/page.tsx"],
    ["Admin login page", "src/app/admin/login/page.tsx"],
  ]) {
    failures.push(...inspectAuthBrand(readFileSync(file, "utf8"), pageName));
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Light theme audit passed (${requested}).`);
}

const isDirectInvocation = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectInvocation) runCli();
