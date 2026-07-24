import { describe, expect, it } from "vitest";

import { MultipartLimitError, parseMultipartFormData } from "./multipart";

function streamRequest(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let index = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) return controller.close();
      controller.enqueue(chunks[index++]);
    },
    cancel() { cancelled = true; },
  });
  const request = new Request("https://example.test/api/releases", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);
  return { request, wasCancelled: () => cancelled };
}

describe("parseMultipartFormData", () => {
  it("parses a normal multipart body while preserving its boundary", async () => {
    const boundary = "release-boundary";
    const payload = new TextEncoder().encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nNight Drive\r\n--${boundary}--\r\n`
    );
    const { request } = streamRequest([payload], {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    });

    const formData = await parseMultipartFormData(request, 10_000);
    expect(formData.get("title")).toBe("Night Drive");
  });

  it.each([
    ["missing", {}],
    ["malformed", { "content-length": "not-a-number" }],
    ["understated", { "content-length": "1" }],
  ])("enforces the byte limit with a %s Content-Length header", async (_name, headers) => {
    const { request, wasCancelled } = streamRequest([
      new Uint8Array(8),
      new Uint8Array(8),
    ], headers);

    await expect(parseMultipartFormData(request, 10)).rejects.toMatchObject({
      name: "MultipartLimitError",
      status: 413,
    });
    expect(wasCancelled()).toBe(true);
  });
});
