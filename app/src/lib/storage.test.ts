import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let temporaryDirectory: string;
let processUpload: typeof import("./storage").processUpload;

beforeAll(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "webfoto-storage-"));
  vi.stubEnv("UPLOAD_DIR", temporaryDirectory);
  ({ processUpload } = await import("./storage"));
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

describe("real upload storage", () => {
  it("converts, rotates, and resizes an in-memory image to a keyed JPEG", async () => {
    const input = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: { r: 30, g: 120, b: 220 } },
    }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const file = new File([new Uint8Array(input)], "portrait-source.jpg", { type: "image/jpeg" });

    const result = await processUpload(file, "safe-key");
    const metadata = await sharp(await fs.readFile(result.absolutePath)).metadata();

    expect(result.storagePath).toBe("safe-key.jpg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1600);
  });

  it("removes a partial output when final file inspection fails", async () => {
    const input = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 30, g: 120, b: 220 } },
    }).jpeg().toBuffer();
    const file = new File([new Uint8Array(input)], "failure-source.jpg", { type: "image/jpeg" });
    const statSpy = vi.spyOn(fs, "stat").mockRejectedValueOnce(new Error("stat failed"));

    try {
      await expect(processUpload(file, "failure-key")).rejects.toThrow("stat failed");
      await expect(fs.access(path.join(temporaryDirectory, "failure-key.jpg"))).rejects.toThrow();
    } finally {
      statSpy.mockRestore();
    }
  });
});
