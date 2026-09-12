import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  getActiveSettings: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/settings", () => ({ getActiveSettings: mocks.getActiveSettings }));

import { GET } from "@/app/api/status/route";

function queryBuilder<T>(rows: T[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(rows);
  return builder;
}

describe("public status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list status without internal identifiers", async () => {
    mocks.getActiveSettings.mockResolvedValue({
      id: 1,
      mode: "list",
      title: "Event",
      year: "2026",
      description: "Description",
      secret: "private",
    });
    const rows = [{
      name: "List Student",
      className: "X TJKT",
      attendanceNumber: 1,
      status: "uploaded" as const,
      uploadedAt: "2026-09-04T10:00:00.000Z",
      nis: "NIS-001",
      photoPath: "/private/photo.jpg",
    }, {
      name: "Pending Student",
      className: "X TJKT",
      attendanceNumber: 2,
      status: null,
      uploadedAt: null,
    }];
    mocks.db.select.mockReturnValue(queryBuilder(rows));

    const response = await GET(new Request("http://localhost/api/status"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      settings: { mode: "list", title: "Event", year: "2026", description: "Description" },
      mode: "list",
      stats: { total: 2, uploaded: 1, blur: 0, pending: 1, progress: 50 },
      classes: [{
        className: "X TJKT",
        total: 2,
        uploaded: 1,
        blur: 0,
        pending: 1,
        progress: 50,
        students: [
          {
            name: "List Student",
            className: "X TJKT",
            attendanceNumber: 1,
            status: "uploaded",
            uploadedAt: "2026-09-04T10:00:00.000Z",
          },
          {
            name: "Pending Student",
            className: "X TJKT",
            attendanceNumber: 2,
            status: "pending",
            uploadedAt: null,
          },
        ],
      }],
    });
    expect(data.settings).not.toHaveProperty("id");
    expect(data.classes[0].students[0]).not.toHaveProperty("nis");
    expect(data.classes[0].students[0]).not.toHaveProperty("photoPath");
    expect(Object.keys(mocks.db.select.mock.calls[0][0])).toEqual([
      "name",
      "className",
      "attendanceNumber",
      "status",
      "uploadedAt",
    ]);
  });

  it("returns free submissions with only public fields", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "free", title: "Event", year: "2026", description: "Description" });
    const rows = [{
      name: "Free Student",
      status: "blur" as const,
      uploadedAt: "2026-09-04T11:00:00.000Z",
      submissionKey: "secret-key",
      storagePath: "/private/photo.jpg",
      nis: "NIS-002",
    }];
    mocks.db.select.mockReturnValue(queryBuilder(rows));

    const response = await GET(new Request("http://localhost/api/status"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      settings: { mode: "free", title: "Event", year: "2026", description: "Description" },
      mode: "free",
      stats: { total: 1, submitted: 1, blur: 1, progress: 100 },
      submissions: [{ name: "Free Student", status: "blur", uploadedAt: "2026-09-04T11:00:00.000Z" }],
    });
    expect(data.submissions[0]).not.toHaveProperty("submissionKey");
    expect(data.submissions[0]).not.toHaveProperty("storagePath");
    expect(data.submissions[0]).not.toHaveProperty("nis");
    expect(Object.keys(mocks.db.select.mock.calls[0][0])).toEqual(["name", "status", "uploadedAt"]);
  });

  it("returns a generic service error when the database fails", async () => {
    mocks.getActiveSettings.mockRejectedValue(new Error("database credentials leaked"));

    const response = await GET(new Request("http://localhost/api/status"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Status tidak dapat dimuat." });
  });
});
