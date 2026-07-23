import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/audio/validate";
import { requestHasValidOrigin } from "@/lib/http/origin";
import {
  createReleaseFromUpload,
  ReleaseUploadError,
} from "@/lib/releases/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;

export async function POST(request: Request) {
  if (!requestHasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
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
    formData = await request.formData();
  } catch (error) {
    console.error("Could not parse release upload form", error);
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
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReleaseUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Unhandled release upload error", error);
    return NextResponse.json(
      { error: "Release upload failed. Please try again." },
      { status: 500 }
    );
  }
}
