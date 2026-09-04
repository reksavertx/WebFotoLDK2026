import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  getActiveSettings: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/settings", () => ({ getActiveSettings: mocks.getActiveSettings }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));

import { GET } from "@/app/api/admin/submissions/route";
import { buildSubmissionStats, normalizeDashboardView } from "./dashboard";

function queryBuilder<T>(rows: T[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
    then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(rows);
  return builder;
}

describe("admin submissions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ username: "admin" });
    mocks.getActiveSettings.mockResolvedValue({ mode: "list", title: "Event", year: "2026", description: "Description" });
  });

  it("supports all/list/free views independently from active mode", () => {
    expect(normalizeDashboardView("list")).toBe("list");
    expect(normalizeDashboardView("free")).toBe("free");
    expect(normalizeDashboardView("unknown")).toBe("all");
  });

  it("counts a list student without a submission as pending", () => {
    const result = buildSubmissionStats({ total: 2, uploaded: 1, blur: 0, pending: 1, byClass: [] });
    expect(result.pending).toBe(1);
    expect(result.submittedPercentage).toBe(50);
  });

  it("returns independent view data with grouped rows and free photo ids", async () => {
    const listRows = [{
      sourceMode: "list" as const,
      submissionKey: null,
      studentId: "S-001",
      nis: "S-001",
      name: "List Student",
      classId: 7,
      className: "X TJKT",
      attendanceNumber: 1,
      status: null,
      uploadedAt: null,
      photoId: null,
    }];
    const freeRows = [{
      sourceMode: "free" as const,
      submissionKey: "free-1",
      name: "Free Student",
      status: "uploaded" as const,
      uploadedAt: "2026-09-04T10:00:00.000Z",
      photoId: 42,
    }];
    const listStats = [{ total: 1, uploaded: 0, blur: 0, pending: 1 }];
    const listByClass = [{ classId: 7, className: "X TJKT", total: 1, submitted: 0, pending: 1 }];
    const freeStats = [{ total: 1, uploaded: 1, blur: 0 }];
    const results: unknown[][] = [listRows, listStats, listByClass, freeRows, freeStats];
    mocks.db.select.mockImplementation(() => queryBuilder(results.shift() ?? []));

    const response = await GET(new Request("http://localhost/api/admin/submissions?view=all&status=all&classId=7"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      activeMode: "list",
      mode: "list",
      view: "all",
      settings: { mode: "list", title: "Event", year: "2026", description: "Description" },
      stats: {
        total: 2,
        uploaded: 1,
        blur: 0,
        submitted: 1,
        pending: 1,
        submittedPercentage: 50,
        pendingPercentage: 50,
        byClass: [{ className: "X TJKT", total: 1, submitted: 0, pending: 1 }],
      },
      groups: [
        {
          type: "class",
          key: "class:X TJKT",
          classId: 7,
          title: "X TJKT",
          total: 1,
          submitted: 0,
          pending: 1,
          rows: [{ ...listRows[0], status: "pending" }],
        },
        {
          type: "free",
          key: "free",
          classId: null,
          title: "Nama Bebas",
          total: 1,
          submitted: 1,
          pending: 0,
          rows: freeRows,
        },
      ],
      rows: [{ ...listRows[0], status: "pending" }, ...freeRows],
    });
  });

  it("serves free rows even when the active mode is list and omits class data", async () => {
    const freeRows = [{
      sourceMode: "free" as const,
      submissionKey: "free-2",
      name: "Free Student",
      status: "blur" as const,
      uploadedAt: "2026-09-04T11:00:00.000Z",
      photoId: 43,
    }];
    const results: unknown[][] = [freeRows, [{ total: 1, uploaded: 0, blur: 1 }]];
    mocks.db.select.mockImplementation(() => queryBuilder(results.shift() ?? []));

    const response = await GET(new Request("http://localhost/api/admin/submissions?view=free&classId=7&status=blur"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activeMode).toBe("list");
    expect(body.mode).toBe("list");
    expect(body.view).toBe("free");
    expect(body.rows).toEqual(freeRows);
    expect(body.rows[0]).not.toHaveProperty("className");
    expect(body.groups).toMatchObject([{ type: "free", key: "free", classId: null, title: "Nama Bebas", total: 1, submitted: 1, pending: 0 }]);
    expect(mocks.db.select).toHaveBeenCalledTimes(2);
  });

  it("falls back to the active mode when view is omitted", async () => {
    mocks.getActiveSettings.mockResolvedValue({ mode: "free", title: "Event", year: "2026", description: "Description" });
    const freeRows = [{
      submissionKey: "free-3",
      name: "Free Student",
      status: "uploaded" as const,
      uploadedAt: "2026-09-04T12:00:00.000Z",
      photoId: 44,
    }];
    const results: unknown[][] = [freeRows, [{ total: 1, uploaded: 1, blur: 0 }]];
    mocks.db.select.mockImplementation(() => queryBuilder(results.shift() ?? []));

    const response = await GET(new Request("http://localhost/api/admin/submissions?status=all"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ activeMode: "free", mode: "free", view: "free" });
    expect(body.rows).toEqual(freeRows.map((row) => ({ ...row, sourceMode: "free" })));
  });

  it("keeps admin authentication on the view-aware route", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const response = await GET(new Request("http://localhost/api/admin/submissions?view=free"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});
