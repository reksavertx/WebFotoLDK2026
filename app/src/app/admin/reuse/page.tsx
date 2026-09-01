"use client";

import { useEffect, useRef, useState } from "react";

type Preview = { count: number; classes: string[] };
type ResetResult = { deletedSubmissions: number; deletedUploadFiles: number; deletedGeneratedFiles: number; failedFiles: string[] };
type ResetCounts = { submissions: number; uploadFiles: number; generatedFiles: number };

export default function ReusePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [csvConfirmation, setCsvConfirmation] = useState("");
  const [csvError, setCsvError] = useState("");
  const [resetCounts, setResetCounts] = useState<ResetCounts | null>(null);

  useEffect(() => {
    fetch("/api/admin/reuse/clear-photos").then(async (response) => { if (!response.ok) return; setResetCounts(await response.json()); }).catch(() => undefined);
  }, []);

  async function resetPhotos() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/reuse/clear-photos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Data foto tidak dapat dihapus.");
      const result = data as ResetResult;
      setNotice(`${result.deletedSubmissions} record, ${result.deletedUploadFiles} file foto, dan ${result.deletedGeneratedFiles} file ZIP dihapus.${result.failedFiles.length ? ` Gagal: ${result.failedFiles.length} file.` : ""}`);
      setResetCounts({ submissions: 0, uploadFiles: result.failedFiles.length, generatedFiles: 0 });
      setConfirmation(""); setShowReset(false);
    } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "Data foto tidak dapat dihapus."); }
    finally { setBusy(false); }
  }

  async function previewCsv() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setCsvError("Pilih file CSV terlebih dahulu.");
    setBusy(true); setCsvError(""); setPreview(null);
    const form = new FormData(); form.set("file", file);
    try { const response = await fetch("/api/admin/reuse/roster/preview", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setPreview(data); } catch (previewError) { setCsvError(previewError instanceof Error ? previewError.message : "Preview CSV gagal."); } finally { setBusy(false); }
  }

  async function commitCsv() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setCsvError("Pilih file CSV terlebih dahulu.");
    setBusy(true); setCsvError(""); setNotice("");
    const form = new FormData(); form.set("file", file); form.set("confirmation", csvConfirmation);
    try { const response = await fetch("/api/admin/reuse/roster/commit", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setNotice(`${data.count} siswa dari ${data.classes} kelas berhasil diterapkan. Mode form aktif: Sesuai daftar.`); setCsvConfirmation(""); setPreview(null); if (fileRef.current) fileRef.current.value = ""; } catch (commitError) { setCsvError(commitError instanceof Error ? commitError.message : "CSV gagal diterapkan."); } finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl space-y-6"><header className="border-b border-blue-100 pb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Panel Admin</p><h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Gunakan Kembali Web</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Reset foto dan ganti roster siswa untuk event berikutnya. Backup dilakukan manual sebelum reset.</p></header>
    {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}{notice && <p role="status" className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</p>}
    <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">Reset data</p><h2 className="mt-1 text-xl font-black text-slate-900">Hapus Semua Data Foto</h2><p className="mt-2 text-sm text-slate-600">Menghapus semua submission foto dari database, file di <code>data/uploads</code>, dan ZIP di <code>data/generated</code>. Data siswa, admin, dan pengaturan event tidak dihapus.</p>{resetCounts && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">Saat ini: {resetCounts.submissions} submission, {resetCounts.uploadFiles} file foto, {resetCounts.generatedFiles} file ZIP.</p>}<button type="button" onClick={() => setShowReset(true)} className="mt-5 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">Hapus Data Foto</button></section>
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Roster siswa</p><h2 className="mt-1 text-xl font-black text-slate-900">Ganti Data Siswa dengan CSV</h2><p className="mt-2 text-sm text-slate-600">Format wajib: <code>NO,NIS,NISN,NAMA,KELAS</code>. Hapus semua foto terlebih dahulu sebelum menerapkan roster baru.</p><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={() => { setPreview(null); setCsvError(""); }} className="mt-5 w-full rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm" /><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={busy} onClick={() => void previewCsv()} className="rounded-xl border border-blue-200 px-4 py-3 text-sm font-bold text-blue-700 disabled:opacity-60">Preview CSV</button>{preview && <button type="button" disabled={busy || csvConfirmation !== "GANTI DATA"} onClick={() => void commitCsv()} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Terapkan CSV</button>}</div>{preview && <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><p><strong>{preview.count}</strong> siswa valid dari <strong>{preview.classes.length}</strong> kelas.</p><p className="mt-1">Kelas: {preview.classes.join(", ")}</p><label className="mt-4 block"><span className="mb-2 block font-bold">Ketik GANTI DATA untuk menerapkan</span><input value={csvConfirmation} onChange={(event) => setCsvConfirmation(event.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2" /></label></div>}{csvError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{csvError}</p>}</section>
    {showReset && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !busy && setShowReset(false)}><div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><h2 id="reset-title" className="text-xl font-black text-slate-900">Konfirmasi hapus data foto</h2><p className="mt-2 text-sm text-slate-600">Tindakan ini permanen. Ketik <strong>HAPUS</strong> untuk melanjutkan.</p><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2" /><div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setShowReset(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Batal</button><button type="button" disabled={busy || confirmation !== "HAPUS"} onClick={() => void resetPhotos()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Menghapus..." : "Hapus Permanen"}</button></div></div></div>}
  </div></div>;
}
