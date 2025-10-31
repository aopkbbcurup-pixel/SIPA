import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteReportAttachment,
  downloadReportPdf,
  fetchMetadata,
  fetchReportPreview,
  fetchReport,
  getUploadsBaseUrl,
  recalculateReport,
  updateReportStatus,
  uploadReportAttachments,
} from "../lib/reportApi";
import type {
  Attachment,
  AttachmentCategory,
  MetadataResponse,
  Report,
  ReportStatus,
} from "../types/report";
import { useAuthStore } from "../store/auth";

const statusLabel: Record<ReportStatus, string> = {
  draft: "Draft",
  for_review: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const statusBadge: Record<ReportStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  for_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const batasanList = [
  "Penilai Internal tidak melaksanakan penelitian yuridis terhadap keabsahan sertifikat maupun dokumen legal lainnya.",
  "Seluruh informasi dokumen berasal dari Unit Kerja Pemohon dan dianggap sesuai dengan dokumen asli.",
  "Penilaian mengacu pada dokumen salinan dan dicocokkan dengan kondisi fisik di lapangan.",
  "Tidak dilakukan pengukuran ulang terhadap luas tanah maupun bangunan.",
  "Data pembanding diambil dari sumber yang relevan serta memiliki karakteristik lingkungan serupa.",
  "Penilai tidak memeriksa elemen struktur tersembunyi yang tidak terlihat secara fisik.",
  "Penilaian mesin/peralatan (jika ada) mengacu pada bukti pembelian yang disediakan.",
  "Penilaian kebun hanya mencakup tanah dan tanaman yang telah menghasilkan.",
  "Seluruh nilai disajikan dalam mata uang Rupiah.",
  "Dasar nilai meliputi Nilai Pasar, NJOP, Nilai Setelah Safety Margin, dan Nilai Likuidasi.",
  "Laporan sah apabila ditandatangani Penilai Internal dan Supervisor sesuai ketentuan.",
  "Penggunaan laporan di luar tujuan yang tercantum menjadi tanggung jawab pihak pengguna.",
];

const attachmentCategoryLabels: Partial<Record<AttachmentCategory, string>> = {
  photo_front: "Foto Tampak Depan",
  photo_right: "Foto Sisi Kanan",
  photo_left: "Foto Sisi Kiri",
  photo_interior: "Foto Interior",
  map: "Peta / Denah Lokasi",
  legal_doc: "Dokumen Legalitas",
  other: "Lampiran Lainnya",
};

const defaultAttachmentOrder: AttachmentCategory[] = [
  "photo_front",
  "photo_right",
  "photo_left",
  "photo_interior",
  "map",
  "legal_doc",
  "other",
];

const collateralKindLabels: Record<string, string> = {
  residential: "Rumah Tinggal",
  commercial: "Bangunan Komersial",
  land: "Tanah Kosong",
  other: "Lainnya",
};

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

const formatNumber = (value?: number | null, suffix = "") => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("id-ID")}${suffix}`;
};

const formatDate = (value?: string, withTime = false) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return withTime
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(parsed)
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(parsed);
};

const yesNo = (value?: boolean) => (value === undefined || value === null ? "-" : value ? "Ya" : "Tidak");

const textOrDash = (value?: string | number | null) =>
  value === undefined || value === null || value === "" ? "-" : String(value);

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);

  const [report, setReport] = useState<Report | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [uploadCategory, setUploadCategory] = useState<AttachmentCategory>("photo_front");
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const uploadsBase = useMemo(() => getUploadsBaseUrl(), []);

  const combinedCategories = useMemo<AttachmentCategory[]>(() => {
    if (!metadata) return defaultAttachmentOrder;
    const unique = new Set<AttachmentCategory>([...defaultAttachmentOrder, ...metadata.attachmentCategories]);
    return Array.from(unique);
  }, [metadata]);

  const buildingStandardInfo = useMemo(
    () =>
      report && metadata?.buildingStandards
        ? metadata.buildingStandards.find(
            (standard) => standard.code === report.valuationInput.buildingStandardCode,
          )
        : undefined,
    [metadata, report],
  );

  const loadAll = useCallback(async () => {
    if (!id) {
      throw new Error("ID laporan tidak ditemukan.");
    }
    const [reportData, metadataData] = await Promise.all([fetchReport(id), fetchMetadata()]);
    return { reportData, metadataData };
  }, [id]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        const { reportData, metadataData } = await loadAll();
        if (!active) return;
        setReport(reportData);
        setMetadata(metadataData);
        setError(null);
        setActionError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gagal memuat detail laporan.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [loadAll]);

  const resolveAttachmentUrl = useCallback(
    (attachment: Attachment) => {
      if (attachment.url.startsWith("http") || attachment.url.startsWith("blob:")) {
        return attachment.url;
      }
      const clean = attachment.url.replace(/^\/+/, "");
      return `${uploadsBase}/${clean}`;
    },
    [uploadsBase],
  );

  const attachmentsByCategory = useMemo(() => {
    if (!report) return {} as Record<AttachmentCategory, Attachment[]>;
    const grouped: Partial<Record<AttachmentCategory, Attachment[]>> = {};
    for (const attachment of report.attachments) {
      const list = grouped[attachment.category] ?? [];
      list.push(attachment);
      grouped[attachment.category] = list;
    }
    for (const key of Object.keys(grouped) as AttachmentCategory[]) {
      grouped[key] = grouped[key]!.slice().sort((a, b) => {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });
    }
    return grouped as Record<AttachmentCategory, Attachment[]>;
  }, [report]);

  const canSubmitForReview =
    authUser?.role === "appraiser" && report && (report.status === "draft" || report.status === "rejected");
  const canApprove = report && (authUser?.role === "supervisor" || authUser?.role === "admin") && report.status === "for_review";
  const canReturnToDraft = report && authUser?.role === "admin" && report.status !== "draft";

  const handleRetry = () => {
    setError(null);
    void (async () => {
      try {
        setLoading(true);
        const { reportData, metadataData } = await loadAll();
        setReport(reportData);
        setMetadata(metadataData);
        setActionError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memuat detail laporan.";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleStatusChange = async (newStatus: ReportStatus, reason?: string) => {
    if (!report || !id) return;
    try {
      setStatusLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const updated = await updateReportStatus(id, newStatus, reason);
      setReport(updated);
      setActionSuccess(`Status laporan diperbarui menjadi ${statusLabel[newStatus]}.`);
      if (newStatus === "rejected") {
        setShowRejectionInput(false);
        setRejectionReason(reason ?? "");
      } else {
        setShowRejectionInput(false);
        setRejectionReason("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui status laporan.";
      setActionError(message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!report || !id) return;
    try {
      setPreviewLoading(true);
      setActionError(null);
      const html = await fetchReportPreview(id);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat pratinjau laporan.";
      setActionError(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewHtml(null);
  };

  const handleRecalculate = async () => {
    if (!report || !id) return;
    try {
      setRecalcLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const result = await recalculateReport(id);
      setReport((prev) => (prev ? { ...prev, valuationResult: result } : prev));
      setActionSuccess("Perhitungan penilaian berhasil diperbarui.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal melakukan kalkulasi ulang.";
      setActionError(message);
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!report || !id) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setAttachmentBusy(true);
      setActionError(null);
      setActionSuccess(null);
      const uploaded = await uploadReportAttachments(id, uploadCategory, files);
      setReport((prev) => (prev ? { ...prev, attachments: [...prev.attachments, ...uploaded] } : prev));
      setActionSuccess("Lampiran berhasil diunggah.");
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengunggah lampiran.";
      setActionError(message);
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    if (!report || !id) return;
    const confirmed = window.confirm("Hapus lampiran ini?");
    if (!confirmed) return;
    try {
      setAttachmentBusy(true);
      setActionError(null);
      setActionSuccess(null);
      await deleteReportAttachment(id, attachmentId);
      setReport((prev) =>
        prev ? { ...prev, attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId) } : prev,
      );
      setActionSuccess("Lampiran berhasil dihapus.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus lampiran.";
      setActionError(message);
    } finally {
      setAttachmentBusy(false);
    }
  };

  const environmentChecklistItems: { key: keyof Report["environment"]; label: string }[] = [
    { key: "hasImb", label: "IMB" },
    { key: "hasPbb", label: "PBB Tahun Terakhir" },
    { key: "hasAccessRoad", label: "Terdapat akses jalan masuk" },
    { key: "hasDisputeNotice", label: "Terdapat rambu/info sengketa" },
    { key: "floodProne", label: "Wilayah rawan banjir" },
    { key: "onWaqfLand", label: "Objek berdiri di tanah wakaf/sosial" },
    { key: "sutet", label: "Berada di bawah SUTET" },
    { key: "nearCemetery", label: "Berdekatan (<100 m) dengan TPU" },
    { key: "nearWasteFacility", label: "Berdekatan (<100 m) dengan TPA" },
    { key: "onGreenBelt", label: "Berada di atas jalur hijau" },
    { key: "carAccessible", label: "Jalan masuk dapat dilalui mobil" },
    { key: "nearIndustrial", label: "Berdekatan dengan area industri" },
  ];

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">
        Memuat detail laporan...
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-rose-200">
        <p className="text-base font-semibold text-rose-600">{error}</p>
        <button
          onClick={handleRetry}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          Coba Lagi
        </button>
        <div className="mt-4">
          <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
            Kembali ke daftar laporan
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-slate-500 transition hover:text-primary"
          type="button"
        >
          &larr; Kembali
        </button>
        <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
          Lihat semua laporan
        </Link>
      </div>

      {(actionError || actionSuccess || error) && (
        <div className="space-y-2">
          {actionSuccess && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {actionSuccess}
            </div>
          )}
          {(actionError || error) && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {actionError || error}
            </div>
          )}
        </div>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-800">{report.title}</h1>
            <div className="text-sm text-slate-500">
              Nomor Laporan: <span className="font-semibold text-slate-700">{textOrDash(report.generalInfo.reportNumber)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>Dibuat: {formatDate(report.createdAt, true)}</span>
              <span className="hidden text-slate-300 md:inline">|</span>
              <span>Pembaruan terakhir: {formatDate(report.updatedAt, true)}</span>
            </div>
            {report.rejectionReason && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Alasan penolakan: {report.rejectionReason}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge[report.status]}`}>
              {statusLabel[report.status]}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
              >
                {previewLoading ? "Memuat Preview..." : "Preview Laporan"}
              </button>
              <button
                onClick={() =>
                  downloadReportPdf(report.id, `${report.generalInfo.reportNumber || `report-${report.id}`}.pdf`)
                }
                className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
              >
                Unduh PDF
              </button>
              <button
                onClick={handleRecalculate}
                disabled={recalcLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
              >
                {recalcLoading ? "Menghitung..." : "Hitung Ulang Nilai"}
              </button>
            </div>
            <div className="flex flex-col items-end gap-2">
              {canSubmitForReview && (
                <button
                  onClick={() => void handleStatusChange("for_review")}
                  disabled={statusLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {statusLoading ? "Memproses..." : "Ajukan untuk Review"}
                </button>
              )}
              {canApprove && (
                <div className="flex flex-col items-stretch gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleStatusChange("approved")}
                      disabled={statusLoading}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusLoading ? "Memproses..." : "Setujui Laporan"}
                    </button>
                    <button
                      onClick={() => setShowRejectionInput((prev) => !prev)}
                      disabled={statusLoading}
                      className="rounded-md bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </div>
                  {showRejectionInput && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                      <label className="text-xs font-semibold uppercase text-rose-600">
                        Alasan Penolakan
                        <textarea
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          className="mt-2 w-full rounded-md border border-rose-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          rows={3}
                          placeholder="Tuliskan catatan kenapa laporan ditolak..."
                        />
                      </label>
                      <div className="mt-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowRejectionInput(false);
                              setRejectionReason("");
                            }}
                            className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-100"
                            type="button"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              const reason = rejectionReason.trim();
                              if (!reason) {
                                setActionError("Alasan penolakan wajib diisi sebelum menolak laporan.");
                                return;
                              }
                              void handleStatusChange("rejected", reason);
                            }}
                            disabled={statusLoading}
                            className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold uppercase text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                          >
                            {statusLoading ? "Memproses..." : "Kirim Penolakan"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {canReturnToDraft && (
                <button
                  onClick={() => void handleStatusChange("draft")}
                  disabled={statusLoading}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {statusLoading ? "Memproses..." : "Kembalikan ke Draft"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Batasan dan Syarat-Syarat Penilaian</h2>
        <p className="mt-1 text-sm text-slate-500">Ketentuan internal yang menjadi dasar penyusunan laporan penilaian agunan.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-slate-700">
          {batasanList.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">A. Data Umum</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jenis Laporan</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.reportType ?? "Penilaian Agunan")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Laporan</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.reportDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Nasabah</dt>
            <dd className="mt-1 text-sm text-slate-800">{report.generalInfo.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat Nasabah</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.customerAddress)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plafond Kredit</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatCurrency(report.generalInfo.plafond)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tujuan Pembiayaan</dt>
            <dd className="mt-1 text-sm text-slate-800">{report.generalInfo.creditPurpose}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit Kerja Pemohon</dt>
            <dd className="mt-1 text-sm text-slate-800">{report.generalInfo.unit}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">No. Surat Permohonan</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.requestLetterNumber)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Surat Permohonan</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.requestLetterDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal &amp; Waktu Permohonan Diterima</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.requestReceivedAt, true)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal &amp; Waktu Kelengkapan</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.requestCompletedAt, true)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal OTS / Kunjungan</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.otsSchedule)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Penilaian</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(report.generalInfo.appraisalDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tujuan Penilaian / Laporan</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {textOrDash(report.generalInfo.valuationPurpose)} | {textOrDash(report.generalInfo.valuationType)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendekatan Penilaian</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.valuationApproach)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama Penilai Internal</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.appraiserName)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Person Lapangan</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {textOrDash(report.generalInfo.fieldContactName)}{" "}
              {report.generalInfo.fieldContactRelation ? `(${report.generalInfo.fieldContactRelation})` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">No. Kontak</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.generalInfo.fieldContactPhone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisor Reviewer</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {metadata?.users.supervisors.find((user) => user.id === report.generalInfo.reviewerId)?.fullName ?? "-"}
            </dd>
          </div>
        </dl>
      </section>

      {report.collateral.map((collateral, index) => {
        const legalDocs = collateral.legalDocuments.filter((doc) => doc.type !== "IMB");
        const imbDocs = collateral.legalDocuments.filter((doc) => doc.type === "IMB");
        return (
          <section key={collateral.id ?? index} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">
              B. Agunan {index + 1} &mdash; {collateral.name}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Informasi Dasar</h3>
                <dl className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Jenis Agunan</dt>
                    <dd className="font-medium">{collateralKindLabels[collateral.kind] ?? collateral.kind}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Alamat</dt>
                    <dd>{collateral.address}</dd>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Luas Tanah</dt>
                      <dd>{formatNumber(collateral.landArea, " m²")}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Luas Bangunan</dt>
                      <dd>{formatNumber(collateral.buildingArea, " m²")}</dd>
                    </div>
                  </div>
                  {(collateral.latitude || collateral.longitude) && (
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Koordinat</dt>
                      <dd>
                        {collateral.latitude ?? "-"}, {collateral.longitude ?? "-"}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Spesifikasi Teknis</h3>
                <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Bentuk Tanah</dt>
                    <dd>{report.technical.landShape}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Topografi</dt>
                    <dd>{report.technical.landTopography}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Struktur Bangunan</dt>
                    <dd>{report.technical.buildingStructure}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Material Dinding</dt>
                    <dd>{report.technical.wallMaterial}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Material Lantai</dt>
                    <dd>{report.technical.floorMaterial}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Material Atap</dt>
                    <dd>{report.technical.roofMaterial}</dd>
                  </div>
                  {report.technical.yearBuilt && (
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Tahun Dibangun</dt>
                      <dd>{report.technical.yearBuilt}</dd>
                    </div>
                  )}
                  {report.technical.conditionNotes && (
                    <div className="md:col-span-2">
                      <dt className="text-xs uppercase text-slate-500">Catatan Kondisi</dt>
                      <dd>{report.technical.conditionNotes}</dd>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <dt className="text-xs uppercase text-slate-500">Utilitas</dt>
                    <dd>
                      Listrik: {report.technical.utilities.electricity || "-"} | Air: {report.technical.utilities.water || "-"} | Akses Jalan:{" "}
                      {report.technical.utilities.roadAccess || "-"}{" "}
                      {report.technical.utilities.other ? `| Lainnya: ${report.technical.utilities.other}` : ""}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">B.1 Legalitas Dokumen</h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Jenis</th>
                        <th className="px-4 py-2 text-left">Nomor</th>
                        <th className="px-4 py-2 text-left">Tanggal Terbit</th>
                        <th className="px-4 py-2 text-left">Tanggal Expired</th>
                        <th className="px-4 py-2 text-left">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {legalDocs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                            Tidak ada dokumen legalitas tercatat.
                          </td>
                        </tr>
                      ) : (
                        legalDocs.map((doc, docIndex) => (
                          <tr key={`${doc.number}-${docIndex}`}>
                            <td className="px-4 py-2 font-medium text-slate-700">{doc.type}</td>
                            <td className="px-4 py-2 text-slate-700">{doc.number}</td>
                            <td className="px-4 py-2 text-slate-500">{formatDate(doc.issueDate)}</td>
                            <td className="px-4 py-2 text-slate-500">{formatDate(doc.dueDate)}</td>
                            <td className="px-4 py-2 text-slate-500">{textOrDash(doc.notes)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">B.2 Informasi IMB</h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Nomor IMB</th>
                        <th className="px-4 py-2 text-left">Tanggal Terbit</th>
                        <th className="px-4 py-2 text-left">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {imbDocs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-500">
                            Tidak ada data IMB yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        imbDocs.map((doc, docIndex) => (
                          <tr key={`${doc.number}-${docIndex}`}>
                            <td className="px-4 py-2 font-medium text-slate-700">{doc.number}</td>
                            <td className="px-4 py-2 text-slate-500">{formatDate(doc.issueDate)}</td>
                            <td className="px-4 py-2 text-slate-500">{textOrDash(doc.notes)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">C. Checklist Lingkungan &amp; Batas Tanah</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2 text-center">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {environmentChecklistItems.map((item) => (
                  <tr key={item.key as string}>
                    <td className="px-4 py-2 text-slate-700">{item.label}</td>
                    <td className="px-4 py-2 text-center font-medium text-slate-700">
                      {yesNo(report.environment[item.key] as boolean | undefined)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Batas Tanah</h3>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-slate-500">Utara</dt>
                <dd>{textOrDash(report.environment.boundaryNorth)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Selatan</dt>
                <dd>{textOrDash(report.environment.boundarySouth)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Barat</dt>
                <dd>{textOrDash(report.environment.boundaryWest)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Timur</dt>
                <dd>{textOrDash(report.environment.boundaryEast)}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Faktor Positif</div>
                {report.environment.positiveFactors && report.environment.positiveFactors.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5">
                    {report.environment.positiveFactors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">-</p>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan Risiko</div>
                {report.environment.otherRisks && report.environment.otherRisks.length > 0 ? (
                  <ul className="mt-1 list-disc pl-5 text-rose-600">
                    {report.environment.otherRisks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">-</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">D. Fasilitas dan Kondisi Lingkungan</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kelas Jalan</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.roadClass)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Material Jalan</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.roadMaterial)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kelengkapan Fasilitas</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.facilityCompleteness)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lebar Jalan</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatNumber(report.facility?.roadWidth, " m")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Akses Transportasi</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.transportAccess)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daya Listrik</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.electricityCapacity)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sumber Air</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.waterSource)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posisi Lantai</dt>
            <dd className="mt-1 text-sm text-slate-800">{textOrDash(report.facility?.floorPosition)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">E. Data Pembanding (Market Comparables)</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3 text-right">Jarak (km)</th>
                <th className="px-4 py-3 text-right">Luas Tanah (m�)</th>
                <th className="px-4 py-3 text-right">Luas Bangunan (m�)</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-right">Harga/m�</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {report.comparables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada data pembanding.
                  </td>
                </tr>
              ) : (
                report.comparables.map((item) => (
                  <tr key={item.id ?? `${item.source}-${item.address}`}>
                    <td className="px-4 py-3 font-medium text-slate-700">{item.source}</td>
                    <td className="px-4 py-3 text-slate-700">{item.address}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(item.distance)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(item.landArea)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(item.buildingArea)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.pricePerSquare)}</td>
                    <td className="px-4 py-3 text-slate-500">{textOrDash(item.notes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">F. Ringkasan Penilaian</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Input Penilaian</h3>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <dt>Luas Tanah</dt>
                <dd className="font-medium">{formatNumber(report.valuationInput.landArea, " m2")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Luas Bangunan</dt>
                <dd className="font-medium">{formatNumber(report.valuationInput.buildingArea, " m2")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Harga Tanah per m2</dt>
                <dd className="font-medium">{formatCurrency(report.valuationInput.landRate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Standar Bangunan</dt>
                <dd className="font-medium">
                  {buildingStandardInfo?.name ?? report.valuationInput.buildingStandardCode}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Harga Standar Bangunan</dt>
                <dd className="font-medium">{formatCurrency(report.valuationInput.buildingStandardRate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Penyusutan Bangunan</dt>
                <dd className="font-medium">
                  {formatNumber(report.valuationInput.buildingDepreciationPercent, " %")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Harga Bangunan Terkoreksi per m2</dt>
                <dd className="font-medium">{formatCurrency(report.valuationInput.buildingRate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>NJOP Tanah</dt>
                <dd className="font-medium">{formatCurrency(report.valuationInput.njopLand)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>NJOP Bangunan</dt>
                <dd className="font-medium">{formatCurrency(report.valuationInput.njopBuilding)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Safety Margin</dt>
                <dd className="font-medium">{formatNumber(report.valuationInput.safetyMarginPercent, " %")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Faktor Likuidasi</dt>
                <dd className="font-medium">{formatNumber(report.valuationInput.liquidationFactorPercent, " %")}</dd>
              </div>
            </dl>
            {buildingStandardInfo?.specification?.length ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Spesifikasi Standar Bangunan</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {buildingStandardInfo.specification.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hasil Perhitungan</h3>
            <dl className="mt-3 grid gap-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <dt>Nilai Pasar</dt>
                <dd className="font-semibold text-slate-800">{formatCurrency(report.valuationResult.marketValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Nilai Sebelum Safety Margin</dt>
                <dd className="font-semibold text-slate-800">{formatCurrency(report.valuationResult.marketValueBeforeSafety)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Nilai Setelah Safety Margin</dt>
                <dd className="font-semibold text-slate-800">{formatCurrency(report.valuationResult.collateralValueAfterSafety)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Nilai Likuidasi</dt>
                <dd className="font-semibold text-slate-800">{formatCurrency(report.valuationResult.liquidationValue)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">G. Catatan Penilai</h2>
        {report.remarks ? (
          <div className="mt-3 whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {report.remarks}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Tidak ada catatan tambahan.</p>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">H. Lampiran</h2>
            <p className="text-sm text-slate-500">Foto, dokumen legalitas, dan berkas pendukung lainnya.</p>
          </div>
          <div className="flex flex-col items-end gap-2 md:flex-row">
            <select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value as AttachmentCategory)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {combinedCategories.map((category) => (
                <option key={category} value={category}>
                  {attachmentCategoryLabels[category] ?? category.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark">
              <input
                key={fileInputKey}
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                className="hidden"
                disabled={attachmentBusy}
              />
              {attachmentBusy ? "Memproses..." : "Unggah Lampiran"}
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {combinedCategories.map((category) => {
            const items = attachmentsByCategory[category] ?? [];
            return (
              <div key={category} className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-700">
                  {attachmentCategoryLabels[category] ?? category.replace(/_/g, " ")}
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Belum ada lampiran.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {items.map((attachment) => (
                      <li key={attachment.id} className="rounded-md border border-slate-200 p-3">
                        <div className="font-medium text-slate-800">{attachment.originalName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Diupload oleh {attachment.uploadedBy} pada {formatDate(attachment.uploadedAt, true)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Ukuran: {formatFileSize(attachment.size)}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            href={resolveAttachmentUrl(attachment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Lihat / Unduh
                          </a>
                          <button
                            onClick={() => void handleAttachmentDelete(attachment.id)}
                            disabled={attachmentBusy}
                            className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>

      {previewOpen && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60" onClick={handleClosePreview} />
          <div className="relative z-10 h-[90vh] w-11/12 max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Pratinjau</p>
                <h3 className="text-base font-semibold text-slate-700">Laporan Penilaian</h3>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
            <div className="h-[calc(90vh-64px)] bg-slate-100">
              {previewHtml ? (
                <iframe
                  title="Pratinjau Laporan"
                  srcDoc={previewHtml}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Tidak ada konten untuk ditampilkan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
