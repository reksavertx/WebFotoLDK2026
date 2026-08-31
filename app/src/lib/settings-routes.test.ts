import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
const settings = vi.hoisted(() => ({
  getActiveSettings: vi.fn(),
  getSettings: vi.fn(),
  updateDraftSettings: vi.fn(),
  activateSettings: vi.fn(),
  SettingsValidationError: class SettingsValidationError extends Error {},
}));

vi.mock("@/lib/auth", () => auth);
vi.mock("@/lib/settings", () => settings);

import { GET as publicGet } from "@/app/api/settings/route";
import { GET as adminGet, PUT as adminPut } from "@/app/api/admin/settings/route";
import { POST as activatePost } from "@/app/api/admin/settings/activate/route";

describe("settings API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active settings only from the public route", async () => {
    settings.getActiveSettings.mockResolvedValue({ mode: "free", title: "Live event", year: "2026", description: "Live description" });

    const response = await publicGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mode: "free", title: "Live event", year: "2026", description: "Live description" });
  });

  it("rejects an unauthenticated admin settings read", async () => {
    auth.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const response = await adminGet();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(settings.getSettings).not.toHaveBeenCalled();
  });

  it("returns draft and active settings for an authenticated admin", async () => {
    auth.requireAdmin.mockResolvedValueOnce({ username: "admin" });
    settings.getSettings.mockResolvedValueOnce({
      draft: { mode: "free", title: "Draft event", year: "2027", description: "Draft description" },
      active: { mode: "list", title: "Live event", year: "2026", description: "Live description" },
    });

    const response = await adminGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      draft: { mode: "free", title: "Draft event", year: "2027", description: "Draft description" },
      active: { mode: "list", title: "Live event", year: "2026", description: "Live description" },
    });
  });

  it("returns validation errors from the draft update route", async () => {
    auth.requireAdmin.mockResolvedValueOnce({ username: "admin" });
    settings.updateDraftSettings.mockRejectedValueOnce(new settings.SettingsValidationError("Title is required."));

    const response = await adminPut(new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ mode: "list", title: "", year: "2026", description: "" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title is required." });
  });

  it("returns the saved draft and active settings after a valid draft update", async () => {
    auth.requireAdmin.mockResolvedValueOnce({ username: "admin" });
    settings.updateDraftSettings.mockResolvedValueOnce({ mode: "free", title: "Draft event", year: "2027", description: "Draft description" });
    settings.getSettings.mockResolvedValueOnce({
      draft: { mode: "free", title: "Draft event", year: "2027", description: "Draft description" },
      active: { mode: "list", title: "Live event", year: "2026", description: "Live description" },
    });

    const response = await adminPut(new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ mode: "free", title: "Draft event", year: "2027", description: "Draft description" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      draft: { mode: "free", title: "Draft event", year: "2027", description: "Draft description" },
      active: { mode: "list", title: "Live event", year: "2026", description: "Live description" },
    });
  });

  it("requires admin authentication before activation", async () => {
    auth.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const response = await activatePost();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(settings.activateSettings).not.toHaveBeenCalled();
  });

  it("returns the activated settings for an authenticated admin", async () => {
    auth.requireAdmin.mockResolvedValueOnce({ username: "admin" });
    settings.activateSettings.mockResolvedValueOnce({ mode: "free", title: "Live event", year: "2027", description: "Live description" });

    const response = await activatePost();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mode: "free", title: "Live event", year: "2027", description: "Live description" });
  });
});
