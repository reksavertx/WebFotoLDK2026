import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  requireAdmin: vi.fn(),
  storagePath: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/storage", () => ({ storagePath: mocks.storagePath }));

import { GET } from "@/app/api/photos/submission/[submissionKey]/route";
import { imageVariant } from "./thumbnail";

let temporaryDirectory: string;
let imagePath: string;

function queryBuilder<T>(rows: T[]) {
  const builder = { from: vi.fn(), where: vi.fn(), limit: vi.fn() };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockResolvedValue(rows);
  return builder;
}

beforeAll(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "webfoto-thumbnail-"));
  imagePath = path.join(temporaryDirectory, "source.jpg");
  await sharp({
    create: { width: 1200, height: 600, channels: 3, background: { r: 30, g: 120, b: 220 } },
  }).jpeg().toFile(imagePath);
});

afterAll(async () => {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ username: "admin" });
  mocks.db.select.mockReturnValue(queryBuilder([{ path: "source.jpg", mimeType: "image/jpeg" }]));
  mocks.storagePath.mockReturnValue(imagePath);
});

describe("submission image variants", () => {
  it("recognizes the thumb variant", () => {
    expect(imageVariant("thumb")).toBe("thumb");
    expect(imageVariant("full")).toBe("full");
  });

  it("returns a real image thumbnail no larger than 240px", async () => {
    const response = await GET(
      new Request("http://localhost/api/photos/submission/key?variant=thumb"),
      { params: Promise.resolve({ submissionKey: "key" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");

    const output = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(output.format).toBe("jpeg");
    expect(output.width).toBeLessThanOrEqual(240);
    expect(output.height).toBeLessThanOrEqual(240);
  });
});
