import { describe, expect, it } from "vitest";
import { buildAdminExportUrl, buildSubmissionStats, normalizeDashboardExportView, resolveDashboardExportSources } from "./dashboard";

describe("submission dashboard statistics", () => {
  it("keeps the all export URL independent of the selected class", () => {
    expect(buildAdminExportUrl("12", true)).toBe("/api/admin/export/all");
  });

  it("uses the selected class for the adaptive export URL", () => {
    expect(buildAdminExportUrl("12")).toBe("/api/admin/export/12");
    expect(buildAdminExportUrl("")).toBe("/api/admin/export/all");
  });

  it("scopes export URLs to the selected dashboard view", () => {
    expect(buildAdminExportUrl("", true, "free")).toBe("/api/admin/export/all?view=free");
    expect(buildAdminExportUrl("", true, "all")).toBe("/api/admin/export/all?view=all");
    expect(buildAdminExportUrl("12", false, "list")).toBe("/api/admin/export/12?view=list");
  });

  it("keeps legacy export URLs on the active mode", () => {
    expect(normalizeDashboardExportView(null, "list")).toBe("list");
    expect(normalizeDashboardExportView(undefined, "free")).toBe("free");
    expect(normalizeDashboardExportView("free", "list")).toBe("free");
  });

  it("selects both datasets for all exports and rejects free class scope", () => {
    expect(resolveDashboardExportSources("all", "all")).toEqual(["list", "free"]);
    expect(resolveDashboardExportSources("all", "free")).toEqual(["free"]);
    expect(resolveDashboardExportSources("12", "list")).toEqual(["list"]);
    expect(resolveDashboardExportSources("12", "free")).toBeNull();
  });

  it("counts uploaded and blur as submitted in list mode", () => {
    expect(buildSubmissionStats({ total: 10, uploaded: 6, blur: 2, pending: 2 }).submitted).toBe(8);
  });

  it("calculates pending totals and percentages", () => {
    expect(buildSubmissionStats({ total: 10, uploaded: 6, blur: 2, pending: 2 })).toMatchObject({
      pending: 2,
      submittedPercentage: 80,
      pendingPercentage: 20,
    });
  });

  it("includes submitted and pending counts for each class", () => {
    expect(buildSubmissionStats({
      total: 10,
      uploaded: 6,
      blur: 2,
      pending: 2,
      byClass: [
        { className: "X TJKT", total: 5, submitted: 4, pending: 1 },
        { className: "X DKV", total: 5, submitted: 4, pending: 1 },
      ],
    }).byClass).toEqual([
      { className: "X TJKT", total: 5, submitted: 4, pending: 1 },
      { className: "X DKV", total: 5, submitted: 4, pending: 1 },
    ]);
  });

  it("does not create class chart rows for free submissions", () => {
    expect(buildSubmissionStats({ total: 3, uploaded: 3, blur: 0, pending: 0 }).byClass).toEqual([]);
  });
});
