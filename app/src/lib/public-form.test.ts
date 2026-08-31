import { describe, expect, it } from "vitest";
import { parseActiveSettings, parseStudentRows } from "./public-form";

describe("public form response validation", () => {
  it("accepts a valid active settings response", () => {
    expect(parseActiveSettings({ mode: "free", title: "Event", year: "2027", description: "Upload" })).toEqual({
      mode: "free",
      title: "Event",
      year: "2027",
      description: "Upload",
    });
  });

  it("rejects an invalid active settings response", () => {
    expect(() => parseActiveSettings({ mode: "grid", title: "Event", year: "2027", description: "Upload" })).toThrow("Pengaturan aktif tidak valid.");
  });

  it("rejects a student response that is not an array", () => {
    expect(() => parseStudentRows({ error: "not a list" })).toThrow("Daftar siswa tidak valid.");
  });
});
