import { constants } from "fs";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { ffmpegAvailable } from "@/lib/audio/ffmpeg";
import { mediaRoot } from "@/lib/audio/storage";
import { errorMessage, logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const probePath = join(mediaRoot(), `.health-${process.pid}-${crypto.randomUUID()}`);
  try {
    await mkdir(mediaRoot(), { recursive: true });
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      access(mediaRoot(), constants.R_OK | constants.W_OK),
      ffmpegAvailable().then((available) => {
        if (!available) throw new Error("Audio tools are unavailable.");
      }),
    ]);
    await prisma.$executeRawUnsafe(
      "INSERT INTO HealthProbe (id, checkedAt) VALUES ('runtime', CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET checkedAt = CURRENT_TIMESTAMP"
    );
    await writeFile(probePath, "ok", { flag: "wx" });
    await unlink(probePath);

    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    await unlink(probePath).catch(() => undefined);
    logEvent("error", "health.failed", { message: errorMessage(error) });
    return NextResponse.json(
      { status: "unhealthy" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
