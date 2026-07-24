import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { access, copyFile, mkdir, rename, unlink } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { ensureUploadDir, publicUrl } from "../src/lib/audio/storage";

const prisma = new PrismaClient();

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
  const legacyAudioDir = join(process.cwd(), "public/uploads/audio");
  await mkdir(audioDir, { recursive: true });
  await mkdir(legacyAudioDir, { recursive: true });

  const demoAudio = [
    {
      title: "Midnight Dreams",
      legacyUrl: "/uploads/audio/sample.mp3",
      locator: publicUrl("audio", "sample.mp3"),
      fileName: "sample.mp3",
      frequency: 220,
      allowDownload: true,
      coverUrl: "/uploads/covers/sample.jpg",
    },
    {
      title: "Urban Pulse",
      legacyUrl: "/uploads/audio/sample2.mp3",
      locator: publicUrl("audio", "sample2.mp3"),
      fileName: "sample2.mp3",
      frequency: 330,
      allowDownload: false,
      coverUrl: "/uploads/covers/sample2.jpg",
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
      demoAudio.map((demo) =>
        generateDemoAudio(join(audioDir, demo.fileName), demo.frequency)
      )
    );
  } catch {
    console.warn("Demo audio was not generated because ffmpeg is unavailable.");
  }

  // Check if admin already exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@opentunes.io";
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  let admin = existingAdmin;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "admin123",
      10
    );

    admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
      },
    });

    console.log("✅ Admin user created");
  } else {
    console.log("ℹ️  Admin user already exists");
  }

  if (admin) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        name: "OpenTunes Admin",
        email: adminEmail,
        password: admin.password,
        role: "ADMIN",
      },
    });
  }

  const creatorEmail = process.env.CREATOR_EMAIL || "creator@opentunes.io";
  const creator =
    (await prisma.user.findUnique({ where: { email: creatorEmail } })) ||
    (await prisma.user.create({
      data: {
        name: "Producer Name",
        email: creatorEmail,
        password: await bcrypt.hash(process.env.CREATOR_PASSWORD || "creator123", 10),
        role: "CREATOR",
        bio: "Independent producer sharing beats, demos, and release-ready tracks.",
        location: "Amsterdam",
        website: "https://opentunes.local",
      },
    }));

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
          coverUrl: "/uploads/covers/sample.jpg",
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
