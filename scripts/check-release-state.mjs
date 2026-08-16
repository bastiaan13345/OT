import { readFileSync } from "fs";
import { spawnSync } from "child_process";

const failures = [];

function run(command, args) {
  return spawnSync(command, args, { encoding: "utf8" });
}

const trackedState = run("git", ["ls-files", ".env", "prisma/dev.db"]);
if (trackedState.status !== 0) failures.push("Could not inspect tracked local state.");
if (trackedState.stdout.trim()) {
  failures.push(`Local state is still tracked: ${trackedState.stdout.trim()}`);
}

const brandSearch = run("rg", ["-n", "OpenTunes|minnow", "src", "prisma", "package.json"]);
if (brandSearch.status === 0) failures.push(`Legacy branding remains:\n${brandSearch.stdout.trim()}`);
if (brandSearch.status !== 0 && brandSearch.status !== 1) {
  failures.push("Could not run the branding audit.");
}

for (const path of [
  ".env.example",
  "Dockerfile",
  "OPERATIONS.md",
  "compose.beta.yml",
  "prisma/migrations/migration_lock.toml",
  "release-record.example.json",
  "scripts/check-container-release.sh",
]) {
  try {
    readFileSync(path);
  } catch {
    failures.push(`Required release file is missing: ${path}`);
  }
}

function requirePattern(path, pattern, message) {
  const contents = readFileSync(path, "utf8");
  if (!pattern.test(contents)) failures.push(message);
}

requirePattern("Dockerfile", /node:22-bookworm-slim@sha256:/, "Docker base image must remain digest-pinned.");
requirePattern("compose.beta.yml", /INFINI_IMAGE:\?/, "Compose must require an explicit immutable image identifier.");
requirePattern("compose.beta.yml", /mem_limit:\s*2g/, "Compose memory bounds are missing.");
requirePattern("scripts/backup-data.sh", /flock --exclusive --nonblock/, "Backup must enforce the /data runtime lock.");
requirePattern("scripts/docker-entrypoint.sh", /flock --exclusive --nonblock/, "Runtime must exclusively own /data.");
requirePattern("prisma/seed.ts", /NODE_ENV === "production"/, "Demo seeding must fail closed in production.");

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.name !== "infini") failures.push("The package name must be infini.");
if (!packageJson.scripts?.["release:container"]) failures.push("The container release gate is missing.");
const nextMajor = Number(String(packageJson.dependencies?.next || "0").split(".")[0]);
if (nextMajor < 16) failures.push("Next.js must remain on the patched 16.x release line.");

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.info("Release-state audit passed.");
