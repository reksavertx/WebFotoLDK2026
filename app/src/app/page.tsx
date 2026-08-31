"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { parseActiveSettings, parseStudentRows, type PublicSettings, type StudentRow } from "@/lib/public-form";

type ClassRow = { id: number; name: string };
type Mode = PublicSettings["mode"];
type Settings = PublicSettings;

const requirements = [
  { title: "Foto Jelas & Tajam", text: "Gambar tidak blur dan fokus pada wajah", icon: "✓" },
  { title: "Wajah Penuh Terlihat", text: "Dari dagu hingga dahi terlihat jelas", icon: "✓" },
  { title: "Pencahayaan Cukup", text: "Cahaya merata, tidak silau atau gelap", icon: "✓" },
  { title: "Ekspresi Natural", text: "Ekspresi wajah biasa, senyum wajar", icon: "✓" },
];

const restrictions = [
  { title: "Foto Blur/Goyang", text: "Gambar tidak fokus atau bergerak", icon: "!" },
  { title: "Filter & Edit Berat", text: "Tidak pakai filter, beauty mode, atau edit berlebihan", icon: "!" },
  { title: "Aksesoris Penutup", text: "Topi, kacamata hitam, masker wajah", icon: "!" },
  { title: "Background Ramai", text: "Background mengganggu fokus pada wajah", icon: "!" },
];

const tips = [
  ["Cahaya Depan", "Hadap ke sumber cahaya"],
  ["Jarak Optimal", "1-2 meter dari kamera"],
  ["Pose Natural", "Tegak dan menghadap kamera"],
  ["Background Netral", "Polos dan tidak ramai. Beberapa hiasan kecil diperbolehkan selama tidak mengganggu fokus wajah."],
];

export default function HomePage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [settingsChanged, setSettingsChanged] = useState(false);
  const settingsRequest = useRef<AbortController | null>(null);

  const mode = settings?.mode;

  useEffect(() => {
    void loadSettings();
    void fetch("/api/classes").then((r) => r.json()).then(setClasses).catch(() => setClasses([]));
    return () => settingsRequest.current?.abort();
  }, []);

  async function loadSettings() {
    settingsRequest.current?.abort();
    const controller = new AbortController();
    settingsRequest.current = controller;
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const response = await fetch("/api/settings", { signal: controller.signal });
      if (!response.ok) throw new Error("Pengaturan aktif tidak dapat dimuat.");
      const nextSettings = parseActiveSettings(await response.json());
      if (controller.signal.aborted) return;
      setSettings(nextSettings);
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setSettings(null);
      setSettingsError(loadError instanceof Error ? loadError.message : "Pengaturan aktif tidak dapat dimuat.");
    } finally {
      if (settingsRequest.current === controller) setSettingsLoading(false);
    }
  }

  async function retrySettings() {
    await loadSettings();
    setSettingsChanged(false);
  }

  useEffect(() => {
    if (!classId || mode !== "list") { setStudents([]); return; }
    const controller = new AbortController();
    setStudents([]);
    void fetch(`/api/classes/${classId}/students`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Daftar siswa untuk kelas ini tidak dapat dimuat.");
      return parseStudentRows(await response.json());
    }).then((rows) => {
      if (!controller.signal.aborted) setStudents(rows);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted || (loadError instanceof Error && loadError.name === "AbortError")) return;
      setStudents([]);
      setError(loadError instanceof Error ? loadError.message : "Daftar siswa tidak dapat dimuat.");
    });
    return () => controller.abort();
  }, [classId, mode]);

  function chooseFile(next: File | null) {
    setError(""); setMessage(""); setFile(next);
    if (next) setPreview(URL.createObjectURL(next)); else setPreview("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (!settings || !mode) return setError("Pengaturan aktif belum dimuat.");
    if (!file) return setError("Pilih nama dan foto terlebih dahulu.");
    if (mode === "list" && (!classId || !studentId)) return setError("Pilih nama dan foto terlebih dahulu.");
    if (mode === "free" && name.trim().length < 3) return setError("Nama harus terdiri dari 3-160 karakter");
    setLoading(true);
    try {
      const form = new FormData(); form.set("mode", mode); form.set("file", file);
      if (mode === "free") form.set("name", name);
      else { form.set("classId", classId); form.set("studentId", studentId); }
      const response = await fetch("/api/photos/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      if (!response.ok) {
        if (data?.error === "Mode upload tidak sesuai.") {
          setSettingsChanged(true);
          await loadSettings();
          return setError("Mode form berubah di server. Pengaturan terbaru telah dimuat, periksa kembali data lalu kirim ulang.");
        }
        return setError(data?.error ?? "Upload gagal.");
      }
      setMessage(data?.message ?? "Foto berhasil diunggah."); setName(""); setClassId(""); setStudentId(""); setFile(null); setPreview("");
    } catch {
      setError("Upload gagal.");
    } finally {
      setLoading(false);
    }
  }

  if (!settings) return <SettingsState loading={settingsLoading} error={settingsError} onRetry={() => void retrySettings()} />;

  const { title, year, description } = settings;

  return <main className="min-h-screen bg-blue-50 px-4 py-8">
    <section className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-xl shadow-blue-100 sm:p-10">
      <div className="mb-8 text-center">
        <Image src="/logo-sekolah.png" alt="Logo SMK Negeri 1 Batang" width={96} height={96} className="mx-auto mb-4 rounded-2xl object-contain" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">LDK SMK NEGERI 1 BATANG</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-lg font-bold text-blue-700">Tahun {year}</p>
        <p className="mx-auto mt-3 max-w-2xl text-slate-500">{description}</p>
      </div>

      <section aria-labelledby="requirements-title" className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="mb-5"><h2 id="requirements-title" className="text-xl font-black text-slate-900">Persyaratan Foto</h2><p className="mt-1 text-sm text-slate-600">Pastikan foto Anda memenuhi semua persyaratan berikut.</p></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <RequirementGroup title="Yang Diperbolehkan" items={requirements} tone="good" />
          <RequirementGroup title="Yang Tidak Diperbolehkan" items={restrictions} tone="bad" />
        </div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4"><h3 className="font-black text-blue-800">Tips Foto yang Baik</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{tips.map(([title, text]) => <div key={title}><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-sm text-slate-600">{text}</p></div>)}</div></div>
      </section>

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
        {settingsChanged && <div role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"><p>Mode form berubah di server. Pengaturan terbaru sudah dimuat.</p><button type="button" onClick={() => void retrySettings()} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-amber-800 shadow-sm hover:bg-amber-100">Muat ulang pengaturan</button></div>}
        <fieldset disabled={loading || settingsLoading} className="space-y-5">
          {mode === "list" ? <><label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Kelas</span><select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none ring-blue-500 focus:ring-2"><option value="">Pilih kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Nama</span><select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none ring-blue-500 focus:ring-2 disabled:bg-slate-100"><option value="">Pilih nama</option>{students.map((item) => <option key={item.id} value={item.id}>{String(item.attendanceNumber).padStart(2, "0")} - {item.name}{item.status !== "pending" ? " (sudah upload)" : ""}</option>)}</select></label></> : <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Nama</span><input required minLength={3} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500 focus:ring-2" /><span className="mt-2 block text-xs text-slate-500">Nama harus terdiri dari 3-160 karakter.</span></label>}
        <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Foto</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm" /><span className="mt-2 block text-xs text-slate-500">Format JPG, PNG, atau WEBP. Maksimal 5 MB.</span></label>
        {preview && <div className="overflow-hidden rounded-2xl border border-blue-100 bg-slate-50 p-3"><img src={preview} alt="Preview foto" className="mx-auto max-h-80 rounded-xl object-contain" /></div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ {message} Anda masih dapat mengganti foto jika diperlukan.</p>}
          <button disabled={loading || settingsLoading} className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{loading ? "Menyimpan..." : settingsLoading ? "Memuat pengaturan..." : "Submit Foto"}</button>
        </fieldset>
      </form>
    </section>
  </main>;
}

function RequirementGroup({ title, items, tone }: { title: string; items: { title: string; text: string; icon: string }[]; tone: "good" | "bad" }) {
  const good = tone === "good";
  return <div><h3 className={`font-black ${good ? "text-green-700" : "text-red-700"}`}>{title}</h3><div className="mt-3 space-y-3">{items.map((item) => <div key={item.title} className="flex gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${good ? "bg-green-500" : "bg-red-500"}`}>{item.icon}</span><div><p className="text-sm font-bold text-slate-800">{item.title}</p><p className="text-sm leading-5 text-slate-600">{item.text}</p></div></div>)}</div></div>;
}

function SettingsState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-8"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Pengumpulan Foto</p><h1 className="mt-2 text-2xl font-black text-slate-900">Form belum siap</h1>{loading ? <p role="status" className="mt-3 text-sm text-slate-500">Memuat pengaturan form...</p> : <><p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error || "Pengaturan aktif tidak valid."}</p><button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Coba lagi</button></>}</section></main>;
}
