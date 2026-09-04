"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/paths";

type Mode = "list" | "free";
type Settings = { mode: Mode; title: string; year: string; description: string };
type SettingsResponse = { draft: Settings; active: Settings };

const emptySettings: Settings = { mode: "list", title: "", year: "", description: "" };

export default function FormSettingsPage() {
  const [draft, setDraft] = useState<Settings>(emptySettings);
  const [active, setActive] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(appPath("/api/admin/settings"));
      const data = await response.json().catch(() => null) as SettingsResponse | { error?: string } | null;
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok) throw new Error(data && "error" in data ? data.error : "Pengaturan tidak dapat dimuat.");
      const settings = data as SettingsResponse;
      setDraft(settings.draft);
      setActive(settings.active);
      setUnauthorized(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pengaturan tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(field: keyof Settings, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setNotice("");
    setError("");
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(appPath("/api/admin/settings"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => null) as SettingsResponse | { error?: string } | null;
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok) throw new Error(data && "error" in data ? data.error : "Pengaturan tidak dapat disimpan.");
      const settings = data as SettingsResponse;
      setDraft(settings.draft);
      setActive(settings.active);
      setNotice("Draft pengaturan berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pengaturan tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    setActivating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(appPath("/api/admin/settings/activate"), { method: "POST" });
      const data = await response.json().catch(() => null) as Settings | { error?: string } | null;
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok) throw new Error(data && "error" in data ? data.error : "Pengaturan tidak dapat diaktifkan.");
      setActive(data as Settings);
      setNotice("Pengaturan berhasil diaktifkan.");
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Pengaturan tidak dapat diaktifkan.");
    } finally {
      setActivating(false);
    }
  }

  if (unauthorized) return <StatePanel title="Sesi admin berakhir" message="Silakan masuk kembali untuk mengatur form." actionLabel="Ke halaman login" onAction={() => { window.location.href = appPath("/admin/login"); }} />;

  return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="border-b border-blue-100 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Panel Admin</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Pengaturan Form</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Atur mode identitas dan informasi yang tampil pada halaman pengumpulan foto.</p>
      </header>

      {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</p>}
      {loading && <p role="status" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Memuat pengaturan...</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <form onSubmit={saveDraft} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Draft</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Konfigurasi form</h2>
          </div>

          <fieldset disabled={loading || saving || activating} className="space-y-6">
            <legend className="mb-2 text-sm font-bold text-slate-700">Mode identitas</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300">
              <input type="radio" name="mode" value="list" checked={draft.mode === "list"} onChange={() => updateDraft("mode", "list")} className="mt-1 accent-blue-600" />
              <span><span className="block font-bold text-slate-800">Sesuai daftar</span><span className="mt-1 block text-sm text-slate-500">Peserta memilih kelas dan nama dari data siswa.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300">
              <input type="radio" name="mode" value="free" checked={draft.mode === "free"} onChange={() => updateDraft("mode", "free")} className="mt-1 accent-blue-600" />
              <span><span className="block font-bold text-slate-800">Nama bebas</span><span className="mt-1 block text-sm text-slate-500">Peserta mengetik nama sendiri tanpa memilih kelas.</span></span>
            </label>
          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Judul</span><input required maxLength={160} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500 focus:ring-2" /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Tahun</span><input required maxLength={4} value={draft.year} onChange={(event) => updateDraft("year", event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500 focus:ring-2" /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Deskripsi</span><textarea maxLength={500} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500 focus:ring-2" /></label>
          </div>
          </fieldset>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="submit" disabled={loading || saving || activating} className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan Draft"}</button>
            <button type="button" disabled={loading || saving || activating} onClick={() => void activate()} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{activating ? "Mengaktifkan..." : "Aktifkan"}</button>
          </div>
        </form>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">Aktif</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Konfigurasi yang tampil</h2>
          {active && <div className="mt-6 space-y-5"><SettingValue label="Mode" value={active.mode === "list" ? "Sesuai daftar" : "Nama bebas"} /><SettingValue label="Judul" value={active.title} /><SettingValue label="Tahun" value={active.year} /><SettingValue label="Deskripsi" value={active.description || "Tidak ada deskripsi."} /></div>}
          {!active && !loading && <p className="mt-6 text-sm text-slate-500">Pengaturan aktif belum tersedia.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">{value}</p></div>;
}

function StatePanel({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel: string; onAction: () => void }) {
  return <section className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100"><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{message}</p><button type="button" onClick={onAction} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">{actionLabel}</button></div></section>;
}
