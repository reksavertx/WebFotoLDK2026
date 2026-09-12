import { describe, expect, it } from "vitest";
import { examplePhotoPath, publicStatusApiPath, publicStatusLabel } from "./public-status-ui";

describe("public status UI helpers", () => {
  it("keeps public status requests under the configured app path", () => {
    expect(publicStatusApiPath("/webfoto")).toBe("/webfoto/api/status");
    expect(publicStatusApiPath("")).toBe("/api/status");
  });

  it("keeps example photo URLs under the configured app path", () => {
    expect(examplePhotoPath("good", "/webfoto")).toBe("/webfoto/contoh-foto-benar.png");
    expect(examplePhotoPath("bad", "/webfoto")).toBe("/webfoto/contoh-foto-salah.png");
  });

  it("uses public labels for every upload state", () => {
    expect(publicStatusLabel("uploaded")).toBe("Sudah upload");
    expect(publicStatusLabel("blur")).toBe("Foto blur");
    expect(publicStatusLabel("pending")).toBe("Belum upload");
  });
});
