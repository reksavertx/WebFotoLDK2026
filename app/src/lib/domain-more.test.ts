import { describe, expect, it } from "vitest";
import { parseStudentCsv, validateImageSignature } from "./domain";

describe("student and image validation", () => {
  it("parses the supplied school CSV format", () => {
    expect(parseStudentCsv("NO,NIS,NISN,NAMA,KELAS\n1,13100,123,ALFA,X TJKT")).toEqual([
      { attendanceNumber: 1, studentId: "13100", nisn: "123", name: "ALFA", className: "X TJKT" },
    ]);
  });

  it("checks image magic bytes", () => {
    expect(validateImageSignature(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg")).toBe(true);
    expect(validateImageSignature(Buffer.from("not image"), "image/jpeg")).toBe(false);
  });
});
