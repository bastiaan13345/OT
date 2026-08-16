import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { requestHasValidOrigin } from "@/lib/http/origin";
import { MultipartLimitError, parseMultipartFormData } from "@/lib/http/multipart";
import {
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/audio/validate";
import {
  createTrackFromUpload,
  TrackUploadError,
} from "@/lib/tracks/upload";
import { errorMessage, logEvent } from "@/lib/log";
import { withProcessingSlot } from "@/lib/processing-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + MAX_IMAGE_BYTES + 1024 * 1024;

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  if (!requestHasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.authInvalidated || !session.user.id) {
    return NextResponse.json(
      { error: "Sign in before uploading a track." },
      { status: 401 }
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json(
      { error: "Upload exceeds the 300 MB audio and 10 MB cover limits." },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await parseMultipartFormData(request, MAX_MULTIPART_BYTES);
  } catch (error) {
    if (error instanceof MultipartLimitError) {
      return NextResponse.json(
        { error: "Upload exceeds the 300 MB audio and 10 MB cover limits." },
        { status: 413 }
      );
    }
    logEvent("warn", "upload.track.parse_failed", {
      message: errorMessage(error),
      requestId,
    });
    return NextResponse.json(
      { error: "The upload form was incomplete. Please choose the files again." },
      { status: 400 }
    );
  }

  try {
    const result = await withProcessingSlot(() => createTrackFromUpload(formData, session));
    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath("/admin");
    revalidatePath("/admin/releases");
    logEvent("info", "upload.track.completed", {
      trackId: result.trackId,
      userId: session.user.id,
      requestId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TrackUploadError) {
      logEvent("warn", "upload.track.rejected", {
        status: error.status,
        userId: session.user.id,
        requestId,
      });
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    logEvent("error", "upload.track.failed", {
      message: errorMessage(error),
      userId: session.user.id,
      requestId,
    });
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
