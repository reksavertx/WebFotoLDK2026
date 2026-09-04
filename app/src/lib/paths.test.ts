import { describe, expect, it } from "vitest";
import { appPath } from "./paths";

describe("application base path", () => {
  it("adds the configured subpath to internal absolute paths", () => {
    expect(appPath("/api/admin/login", "/foto" as string)).toBe("/foto/api/admin/login");
  });

  it("does not duplicate an existing base path", () => {
    expect(appPath("/foto/admin", "/foto" as string)).toBe("/foto/admin");
  });

  it("leaves paths unchanged without a base path", () => {
    expect(appPath("/admin", "")).toBe("/admin");
  });
});
