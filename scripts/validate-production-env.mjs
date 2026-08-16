import { constants } from "fs";
import { access, mkdir } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { spawnSync } from "child_process";

const errors = [];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} is required.`);
  return value || "";
}

const databaseUrl = required("DATABASE_URL");
const mediaRoot = required("MEDIA_ROOT");
const nextAuthUrl = required("NEXTAUTH_URL");
const nextAuthSecret = required("NEXTAUTH_SECRET");
required("SUPPORT_EMAIL");

if (databaseUrl !== "file:/data/infini.db") {
  errors.push("DATABASE_URL must be file:/data/infini.db.");
}
if (mediaRoot !== "/data/media") {
  errors.push("MEDIA_ROOT must be /data/media.");
}
try {
  if (nextAuthUrl && new URL(nextAuthUrl).protocol !== "https:") {
    errors.push("NEXTAUTH_URL must use HTTPS.");
  }
} catch {
  errors.push("NEXTAUTH_URL must be a valid URL.");
}
if (
  nextAuthSecret.length < 32
  || /(change|example|replace|secret)/i.test(nextAuthSecret)
) {
  errors.push("NEXTAUTH_SECRET must be a non-placeholder value of at least 32 characters.");
}

if (errors.length === 0) {
  const databasePath = databaseUrl.slice("file:".length);
  if (!isAbsolute(databasePath)) {
    errors.push("DATABASE_URL must resolve to an absolute path.");
  } else {
    await mkdir(dirname(databasePath), { recursive: true });
  }
  await mkdir(resolve(mediaRoot), { recursive: true });
  await access(resolve(mediaRoot), constants.R_OK | constants.W_OK).catch(() => {
    errors.push("MEDIA_ROOT must be readable and writable.");
  });
}

for (const [name, fallback] of [["FFMPEG_PATH", "ffmpeg"], ["FFPROBE_PATH", "ffprobe"]]) {
  const binary = process.env[name] || fallback;
  const result = spawnSync(binary, ["-version"], { stdio: "ignore" });
  if (result.status !== 0) errors.push(`${name} binary is unavailable.`);
}

if (errors.length > 0) {
  console.error(JSON.stringify({ event: "startup.validation_failed", errors }));
  process.exit(1);
}

console.info(JSON.stringify({ event: "startup.validation_passed" }));
