export class MultipartLimitError extends Error {
  constructor(message = "Multipart body exceeds the allowed size.") {
    super(message);
    this.name = "MultipartLimitError";
  }

  readonly status = 413;
}

export async function parseMultipartFormData(
  request: Request,
  maxBytes: number
): Promise<FormData> {
  if (!request.body) return request.formData();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new MultipartLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const contentType = request.headers.get("content-type");
  return new Response(body, {
    headers: contentType ? { "content-type": contentType } : undefined,
  }).formData();
}
