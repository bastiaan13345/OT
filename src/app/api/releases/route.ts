import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/audio/validate";
import { requestHasValidOrigin } from "@/lib/http/origin";
import { MultipartLimitError, parseMultipartFormData } from "@/lib/http/multipart";
import {
  createReleaseFromUpload,
  ReleaseUploadError,
} from "@/lib/releases/upload";
import { errorMessage, logEvent } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  if (!requestHasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.authInvalidated || !session.user.id) {
    return NextResponse.json(
      { error: "Sign in before creating a release." },
      { status: 401 }
    );
  }
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "A creator account is required to create releases." },
      { status: 403 }
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json(
      { error: "Upload exceeds the 10 MB cover limit." },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await parseMultipartFormData(request, MAX_MULTIPART_BYTES);
  } catch (error) {
    if (error instanceof MultipartLimitError) {
      return NextResponse.json(
        { error: "Upload exceeds the 10 MB cover limit." },
        { status: 413 }
      );
    }
    logEvent("warn", "upload.release.parse_failed", {
      message: errorMessage(error),
      requestId,
    });
    return NextResponse.json(
      { error: "The release form was incomplete. Please try again." },
      { status: 400 }
    );
  }

  try {
    const result = await createReleaseFromUpload(formData, session);
    revalidatePath("/admin");
    revalidatePath("/admin/releases");
    revalidatePath("/browse");
    logEvent("info", "upload.release.completed", {
      releaseId: result.releaseId,
      userId: session.user.id,
      requestId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReleaseUploadError) {
      logEvent("warn", "upload.release.rejected", {
        status: error.status,
        userId: session.user.id,
        requestId,
      });
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    logEvent("error", "upload.release.failed", {
      message: errorMessage(error),
      userId: session.user.id,
      requestId,
    });
    return NextResponse.json(
      { error: "Release upload failed. Please try again." },
      { status: 500 }
    );
  }
}
