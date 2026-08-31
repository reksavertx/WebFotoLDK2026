"use client";

import { useEffect, useState } from "react";

type Mode = "list" | "free";
type Settings = { mode: Mode; title: string; year: string; description: string };
type Row = {
  submissionKey: string | null;
  studentId?: string | null;
  nis?: string | null;
  name: string;
  className?: string | null;
  attendanceNumber?: number | null;
  status: "uploaded" | "blur" | "pending";
  uploadedAt: string | null;
  photoId?: number | null;
};
type ClassRow = { id: number; name: string };
type ClassStat = { className: string; total: number; submitted: number; pending: number };
type Stats = {
  total: number;
  uploaded: number;
  blur: number;
  submitted: number;
  pending: number;
  submittedPercentage: number;
  pendingPercentage: number;
  byClass: ClassStat[];
};

const emptyStats: Stats = { total: 0, uploaded: 0, blur: 0, submitted: 0, pending: 0, submittedPercentage: 0, pendingPercentage: 0, byClass: [] };

export default function AdminPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = `status=${status}&classId=${classId}&search=${encodeURIComponent(search)}`;
      const [submissionsResponse, settingsResponse] = await Promise.all([
        fetch(`/api/admin/submissions?${query}`),
        fetch("/api/settings"),
      ]);

      if (submissionsResponse.status === 401) {
        setUnauthorized(true);
        setRows([]);
        return;
      }
      if (!submissionsResponse.ok) throw new Error("Data submission tidak dapat dimuat.");
      if (!settingsResponse.ok) throw new Error("Pengaturan acara tidak dapat dimuat.");

      const data = await submissionsResponse.json();
      const activeSettings = await settingsResponse.json() as Settings;
      setMode(data.mode as Mode);
      setSettings(activeSettings);
      setRows(data.rows as Row[]);
      setStats(data.stats as Stats);
      setUnauthorized(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetch("/api/classes").then(async (response) => response.ok ? response.json() : []).then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    void load();
  }, [classId, status]);

  async function mark(photoId: number | null, next: "blur" | "uploaded") {
    if (!photoId) return;
    setNotice("");
    const response = await fetch(`/api/admin/photos/${photoId}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    if (response.status === 401) return setUnauthorized(true);
    if (!response.ok) return setError("Status foto tidak dapat diperbarui.");
    await load();
  }

  async function copyNames(type: "pending" | "blur") {
    try {
      const response = await fetch(`/api/admin/names?status=${type}`);
      if (response.status === 401) return setUnauthorized(true);
      if (!response.ok) throw new Error("Daftar nama tidak dapat dimuat.");
      await navigator.clipboard.writeText(await response.text());
      setNotice(`Daftar ${type === "pending" ? "belum upload" : "foto blur"} berhasil disalin.`);
    } catch {
      setError("Daftar nama tidak dapat disalin.");
    }
  }

  function exportZip() {
    window.location.href = classId ? `/api/admin/export/${classId}` : "/api/admin/export/all";
  }

  if (unauthorized) return <StatePanel title="Sesi admin berakhir" message="Silakan masuk kembali untuk melihat dashboard." actionLabel="Ke halaman login" onAction={() => { window.location.href = "/admin/login"; }} />;

  const title = settings?.title ?? "Dashboard Admin";
  const year = settings?.year ? ` ${settings.year}` : "";

  return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-blue-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Panel Admin</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{title}{year}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{settings?.description ?? "Pantau pengumpulan foto dan periksa status setiap submission."}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </header>

      {error && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={() => void load()} className="self-start rounded-lg bg-white px-3 py-1.5 font-bold text-red-700 shadow-sm hover:bg-red-100 sm:self-auto">Coba lagi</button></div>}
      {loading && <div role="status" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Memuat data dashboard...</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={mode === "free" ? "Total Submission" : "Total Siswa"} value={stats.total} />
        <Stat label={mode === "free" ? "Submission Masuk" : "Sudah Upload"} value={stats.submitted} color="text-green-600" />
        <Stat label="Foto Blur" value={stats.blur} color="text-amber-600" />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Persentase Upload Keseluruhan</p>
          <div className="mt-4 flex items-center gap-5">
            <Donut submitted={stats.submittedPercentage} />
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-600" /><span className="font-semibold text-slate-700">{stats.submittedPercentage}% sudah upload</span> <span className="text-slate-500">({stats.submitted})</span></p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-200" /><span className="font-semibold text-slate-700">{stats.pendingPercentage}% belum upload</span> <span className="text-slate-500">({stats.pending})</span></p>
            </div>
          </div>
        </div>
        {mode === "free" ? <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-900">Ringkasan Submission</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">Total foto</p><p className="mt-1 text-2xl font-black text-blue-800">{stats.submitted}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">Foto blur</p><p className="mt-1 text-2xl font-black text-amber-800">{stats.blur}</p></div></div></div> : <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-900">Status Per Kelas</p><div className="mt-4 space-y-3">{stats.byClass.length ? stats.byClass.map((row) => <ClassBar key={row.className} row={row} max={Math.max(...stats.byClass.map((item) => item.total))} />) : <p className="text-sm text-slate-500">Belum ada data kelas.</p>}</div></div>}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        {mode !== "free" && <select aria-label="Filter kelas" value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
        <select aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="all">Semua status</option><option value="pending">Belum upload</option><option value="uploaded">Sudah upload</option><option value="blur">Blur</option></select>
        <input aria-label="Cari nama atau NIS" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder={mode === "free" ? "Cari nama submission" : "Cari nama atau NIS"} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" />
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyNames("pending")} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">Copy Belum Upload</button><button type="button" onClick={() => void copyNames("blur")} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Copy Foto Blur</button>{mode !== "free" && <button type="button" onClick={exportZip} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">Download ZIP</button>}<button type="button" onClick={exportZip} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white">Download ZIP Semua</button></div>
      </div>{notice && <p role="status" className="mt-3 text-sm font-semibold text-green-700">{notice}</p>}</section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-blue-50 text-xs uppercase text-blue-800"><tr>{mode !== "free" && <th className="px-4 py-3">Absen</th>}<th className="px-4 py-3">Nama</th>{mode !== "free" && <th className="px-4 py-3">Kelas</th>}<th className="px-4 py-3">Status</th><th className="px-4 py-3">Waktu Upload</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.submissionKey ?? `${row.name}-${index}`}>{mode !== "free" && <td className="px-4 py-3 font-bold">{typeof row.attendanceNumber !== "number" ? "-" : String(row.attendanceNumber).padStart(2, "0")}</td>}<td className="px-4 py-3 font-semibold">{row.submissionKey && row.status !== "pending" ? <button type="button" onClick={() => setPreview(row)} className="font-bold text-blue-700 hover:underline">{row.name}</button> : <span>{row.name}</span>}</td>{mode !== "free" && <td className="px-4 py-3 text-slate-500">{row.className ?? "-"}</td>}<td className="px-4 py-3"><Status status={row.status} /></td><td className="px-4 py-3 text-slate-500">{row.uploadedAt ? new Date(row.uploadedAt).toLocaleString("id-ID") : "-"}</td><td className="px-4 py-3">{row.status === "uploaded" && row.photoId ? <button type="button" onClick={() => void mark(row.photoId ?? null, "blur")} className="font-bold text-amber-700 hover:underline">Tandai Blur</button> : row.status === "blur" && row.photoId ? <button type="button" onClick={() => void mark(row.photoId ?? null, "uploaded")} className="font-bold text-green-700 hover:underline">Tandai Valid</button> : <span className="text-slate-400">-</span>}</td></tr>)}</tbody></table></div>{!loading && !rows.length && <p className="p-10 text-center text-slate-500">{mode === "free" ? "Belum ada submission foto yang cocok." : "Tidak ada siswa yang cocok dengan filter ini."}</p>}</section>
    </div>
    {preview && <PreviewModal row={preview} onClose={() => setPreview(null)} />}
  </div>;
}

function StatePanel({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel: string; onAction: () => void }) {
  return <section className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100"><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{message}</p><button type="button" onClick={onAction} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">{actionLabel}</button></div></section>;
}

function Stat({ label, value, color = "text-blue-600" }: { label: string; value: number; color?: string }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>;
}

function Donut({ submitted }: { submitted: number }) {
  const size = 120;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, submitted / 100));
  return <div role="img" aria-label={`${Math.round(submitted)} persen sudah upload`} className="relative shrink-0" style={{ width: size, height: size }}><svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2563eb" strokeWidth={stroke} strokeDasharray={`${filled * circumference} ${circumference}`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><p className="text-2xl font-black text-blue-700">{Math.round(submitted)}%</p></div></div>;
}

function ClassBar({ row, max }: { row: ClassStat; max: number }) {
  const submittedWidth = row.total ? Math.round((row.submitted / row.total) * 100) : 0;
  const pendingWidth = row.total ? Math.round((row.pending / row.total) * 100) : 0;
  const scale = max ? Math.round((row.total / max) * 100) : 0;
  return <div><div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600"><span>{row.className}</span><span>{row.submitted} masuk <span className="text-slate-400">/ {row.pending} pending</span></span></div><div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100" style={{ width: `${scale}%` }}><div className="flex h-full" style={{ width: "100%" }}><div className="bg-blue-600" style={{ width: `${submittedWidth}%` }} /><div className="bg-amber-400" style={{ width: `${pendingWidth}%` }} /></div></div></div>;
}

function Status({ status }: { status: Row["status"] }) {
  const label = status === "blur" ? "Blur" : status === "uploaded" ? "Sudah upload" : "Belum upload";
  const style = status === "blur" ? "bg-amber-100 text-amber-800" : status === "uploaded" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>;
}

function PreviewModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return <div role="dialog" aria-modal="true" aria-labelledby="preview-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 id="preview-title" className="text-xl font-black text-slate-900">{row.name}</h2><p className="text-sm text-slate-500">{row.className ?? "Submission nama bebas"}{typeof row.attendanceNumber !== "number" ? "" : ` · Absen ${String(row.attendanceNumber).padStart(2, "0")}`} · <Status status={row.status} /></p></div><button type="button" onClick={onClose} aria-label="Tutup preview foto" className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100">Tutup</button></div>
      {imageError || !row.submissionKey ? <div role="alert" className="flex min-h-64 items-center justify-center rounded-xl bg-slate-100 p-6 text-center text-sm font-semibold text-slate-500">Foto tidak dapat ditampilkan.</div> : <img src={`/api/photos/submission/${encodeURIComponent(row.submissionKey)}`} alt={`Foto ${row.name}`} onError={() => setImageError(true)} className="mx-auto max-h-[75vh] rounded-xl object-contain" />}
    </div>
  </div>;
}
