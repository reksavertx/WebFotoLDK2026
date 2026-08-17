import { describe, expect, it } from "vitest";
import { buildDashboardStats, sortClassesByPending } from "./dashboard";

describe("dashboard statistics", () => {
  it("counts blur photos as already submitted", () => {
    const stats = buildDashboardStats({ total: 100, uploaded: 60, blur: 15, pendingByClass: [] });
    expect(stats.submitted).toBe(75);
    expect(stats.pending).toBe(25);
  });

  it("computes submitted percentage rounded to one decimal", () => {
    const stats = buildDashboardStats({ total: 3, uploaded: 2, blur: 0, pendingByClass: [] });
    expect(stats.submittedPercentage).toBe(66.7);
    expect(stats.pendingPercentage).toBe(33.3);
  });

  it("returns zero percentages when there are no students", () => {
    const stats = buildDashboardStats({ total: 0, uploaded: 0, blur: 0, pendingByClass: [] });
    expect(stats.submittedPercentage).toBe(0);
    expect(stats.pendingPercentage).toBe(0);
  });

  it("sorts classes by pending count descending", () => {
    const sorted = sortClassesByPending([
      { className: "X TJKT", total: 36, pending: 5 },
      { className: "X AKL 2", total: 36, pending: 18 },
      { className: "X DKV 1", total: 36, pending: 9 },
    ]);
    expect(sorted.map((item) => item.className)).toEqual(["X AKL 2", "X DKV 1", "X TJKT"]);
  });
});
