import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { access, copyFile, mkdir, rename, unlink } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { ensureUploadDir, publicUrl } from "../src/lib/audio/storage";

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed data is disabled when NODE_ENV=production.");
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generateDemoAudio(path: string, frequency: number) {
  if (await fileExists(path)) return;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${frequency}:sample_rate=44100:duration=20`,
      "-af",
      "afade=t=in:d=0.4,afade=t=out:st=19:d=1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      path,
    ]);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))
    );
  });
}

async function generateDemoCover(path: string, color: string) {
  if (await fileExists(path)) return;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=1200x1200`,
      "-frames:v",
      "1",
      path,
    ]);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))
    );
  });
}

async function moveLegacyDemoAudio(privatePath: string, legacyPath: string) {
  const privateExists = await fileExists(privatePath);
  const legacyExists = await fileExists(legacyPath);
  if (!legacyExists) return;

  if (!privateExists) {
    try {
      await rename(legacyPath, privatePath);
      return;
    } catch {
      await copyFile(legacyPath, privatePath);
    }
  }

  await unlink(legacyPath).catch(() => {});
}

async function main() {
  const audioDir = await ensureUploadDir("audio");
  const coverDir = await ensureUploadDir("covers");
  const legacyAudioDir = join(process.cwd(), "public/uploads/audio");
  await mkdir(audioDir, { recursive: true });
  await mkdir(legacyAudioDir, { recursive: true });

  const demoAudio = [
    {
      title: "Midnight Dreams",
      legacyUrl: "/uploads/audio/sample.mp3",
      locator: publicUrl("audio", "sample.mp3"),
      fileName: "sample.mp3",
      coverFileName: "sample.jpg",
      frequency: 220,
      color: "0x202020",
      allowDownload: true,
      coverUrl: publicUrl("covers", "sample.jpg"),
    },
    {
      title: "Urban Pulse",
      legacyUrl: "/uploads/audio/sample2.mp3",
      locator: publicUrl("audio", "sample2.mp3"),
      fileName: "sample2.mp3",
      coverFileName: "sample2.jpg",
      frequency: 330,
      color: "0x505050",
      allowDownload: false,
      coverUrl: publicUrl("covers", "sample2.jpg"),
    },
  ];

  await Promise.all(
    demoAudio.map((demo) =>
      moveLegacyDemoAudio(
        join(audioDir, demo.fileName),
        join(legacyAudioDir, demo.fileName)
      )
    )
  );

  try {
    await Promise.all(
      demoAudio.flatMap((demo) => [
        generateDemoAudio(join(audioDir, demo.fileName), demo.frequency),
        generateDemoCover(join(coverDir, demo.coverFileName), demo.color),
      ])
    );
  } catch {
    console.warn("Demo audio was not generated because ffmpeg is unavailable.");
  }

  const configuredCreatorEmail = process.env.CREATOR_EMAIL?.trim().toLowerCase();
  const configuredCreatorPassword = process.env.CREATOR_PASSWORD;
  if (Boolean(configuredCreatorEmail) !== Boolean(configuredCreatorPassword)) {
    throw new Error("Set both CREATOR_EMAIL and CREATOR_PASSWORD, or neither.");
  }

  const creatorEmail = configuredCreatorEmail || "demo-creator@infini.invalid";
  const creatorPassword = configuredCreatorPassword || randomBytes(48).toString("base64url");
  const creator =
    (await prisma.user.findUnique({ where: { email: creatorEmail } })) ||
    (await prisma.user.create({
      data: {
        name: "Producer Name",
        email: creatorEmail,
        password: await bcrypt.hash(creatorPassword, 10),
        role: "CREATOR",
        approved: true,
        bio: "Independent producer sharing beats, demos, and release-ready tracks.",
        location: "Amsterdam",
        website: "https://infini.invalid",
      },
    }));

  await prisma.user.update({
    where: { id: creator.id },
    data: { approved: true },
  });

  await prisma.track.updateMany({
    where: { creatorId: null },
    data: { creatorId: creator.id },
  });

  // Create some sample tracks
  const trackCount = await prisma.track.count();

  if (trackCount === 0) {
    await prisma.track.createMany({
      data: [
        {
          title: "Midnight Dreams",
          artist: "Producer Name",
          genre: "Electronic",
          description: "A dreamy electronic track perfect for late night sessions",
          audioUrl: publicUrl("audio", "sample.mp3"),
          coverUrl: demoAudio[0].coverUrl,
          duration: 245,
          featured: true,
          plays: 1523,
          album: "Night Sessions",
          tags: "dreamy, synth, late night",
          license: "Standard streaming",
          allowDownload: true,
          price: 0,
          creatorId: creator.id,
        },
        {
          title: "Urban Pulse",
          artist: "Producer Name",
          genre: "Hip Hop",
          description: "Hard-hitting beats with modern production",
          audioUrl: publicUrl("audio", "sample2.mp3"),
          coverUrl: demoAudio[1].coverUrl,
          duration: 198,
          featured: true,
          plays: 892,
          album: "Beat Pack Vol. 1",
          tags: "beats, drums, city",
          license: "Royalty-free beat lease",
          allowDownload: false,
          price: 29,
          creatorId: creator.id,
        },
      ],
    });
    console.log("✅ Sample tracks created");
  }

  for (const demo of demoAudio) {
    await prisma.track.updateMany({
      where: {
        OR: [
          { audioUrl: demo.legacyUrl },
          { audioUrl: demo.locator },
          { title: demo.title, artist: "Producer Name" },
        ],
      },
      data: {
        duration: 20,
        allowDownload: demo.allowDownload,
        coverUrl: demo.coverUrl,
      },
    });

    await prisma.track.updateMany({
      where: { audioUrl: demo.legacyUrl },
      data: { audioUrl: demo.locator },
    });
  }

  const seededTracks = await prisma.track.findMany({
    where: {
      OR: demoAudio.flatMap((demo) => [
        { audioUrl: demo.legacyUrl },
        { audioUrl: demo.locator },
        { title: demo.title, artist: "Producer Name" },
      ]),
    },
    include: { audioVersions: true },
  });

  for (const track of seededTracks) {
    const demo = demoAudio.find(
      (item) =>
        item.locator === track.audioUrl ||
        item.legacyUrl === track.audioUrl ||
        (item.title === track.title && track.artist === "Producer Name")
    );
    if (!demo) continue;

    let original = track.audioVersions.find((version) => version.kind === "original");
    if (!original) {
      original = await prisma.audioVersion.create({
        data: {
          trackId: track.id,
          kind: "original",
          label: "Seeded demo original",
          url: demo.locator,
          format: "mp3",
          duration: 20,
          active: !track.audioVersions.some((version) => version.active),
        },
      });
    } else {
      await prisma.audioVersion.updateMany({
        where: {
          trackId: track.id,
          kind: "original",
        },
        data: { url: demo.locator, duration: 20 },
      });
    }

    const active = await prisma.audioVersion.findFirst({
      where: { trackId: track.id, active: true },
      select: { url: true },
    });
    if (active) {
      await prisma.track.update({
        where: { id: track.id },
        data: { audioUrl: active.url },
      });
    } else {
      await prisma.audioVersion.update({
        where: { id: original.id },
        data: { active: true },
      });
      await prisma.track.update({
        where: { id: track.id },
        data: { audioUrl: demo.locator },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
