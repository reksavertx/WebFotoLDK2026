import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  getActiveSettings: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/settings", () => ({ getActiveSettings: mocks.getActiveSettings }));

import { GET } from "@/app/api/admin/export/[classId]/route";
import { buildDashboardArchiveEntryName } from "./dashboard";

function queryBuilder<T>(rows: T[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  return builder;
}

describe("admin export view selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ username: "admin" });
    mocks.getActiveSettings.mockResolvedValue({ mode: "free", title: "Event", year: "2026", description: "Description" });
    mocks.db.select.mockImplementation(() => queryBuilder([]));
  });

  it("uses explicit list view even when the active form mode is free", async () => {
    const response = await GET(new Request("http://localhost/api/admin/export/all?view=list"), { params: Promise.resolve({ classId: "all" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("Semua Kelas.zip");
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it("rejects a free view for a class-scoped export", async () => {
    const response = await GET(new Request("http://localhost/api/admin/export/12?view=free"), { params: Promise.resolve({ classId: "12" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "ZIP kelas hanya tersedia untuk submission sesuai daftar." });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("puts both sources in separate folders for an all export", () => {
    expect(buildDashboardArchiveEntryName({ sourceMode: "list", className: "X TJKT" }, "01 - Siswa.jpg", true)).toBe("X TJKT/01 - Siswa.jpg");
    expect(buildDashboardArchiveEntryName({ sourceMode: "free", className: null }, "free-1 - Budi.jpg", true)).toBe("Nama Bebas/free-1 - Budi.jpg");
  });
});
