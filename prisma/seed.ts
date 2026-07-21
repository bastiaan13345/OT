import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: process.env.ADMIN_EMAIL || "admin@opentunes.io" },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "admin123",
      10
    );

    await prisma.admin.create({
      data: {
        email: process.env.ADMIN_EMAIL || "admin@opentunes.io",
        password: hashedPassword,
      },
    });

    console.log("✅ Admin user created");
  } else {
    console.log("ℹ️  Admin user already exists");
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
          audioUrl: "/uploads/audio/sample.mp3",
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
          audioUrl: "/uploads/audio/sample2.mp3",
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
