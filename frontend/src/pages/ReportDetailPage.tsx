import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
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
  verifyLegalDocument,
  uploadReportAttachments,
  saveSignature,
  deleteSignature,
} from "../lib/reportApi";
import { buildGoogleMapsEmbedUrl, buildGoogleMapsLink, buildStaticMapUrl } from "../lib/maps";
import { responseLabel } from "../utils/inspectionChecklist";
import type {
  Attachment,
  AttachmentCategory,
  MetadataResponse,
  Report,
  ReportStatus,
} from "../types/report";
import { useAuthStore } from "../store/auth";
import { api } from "../lib/api";
import { MapView } from "../components/MapView";
import { SignaturePad } from "../components/SignaturePad";

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

const verificationStatusStyles: Record<
  "pending" | "verified" | "rejected",
  { label: string; className: string }
> = {
  pending: { label: "Belum Diverifikasi", className: "bg-slate-100 text-slate-600" },
  verified: { label: "Terverifikasi", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Ditolak", className: "bg-rose-100 text-rose-700" },
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState<string | null>(null);
  const [remarksExpanded, setRemarksExpanded] = useState(false);
  const [gisComparables, setGisComparables] = useState<any[]>([]);
  const [gisLoading, setGisLoading] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureRole, setSignatureRole] = useState<"appraiser" | "supervisor" | null>(null);

  const uploadsBase = useMemo(() => getUploadsBaseUrl(), []);

  const requestCurrentLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return null;
    }
    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    });
  }, []);
  const combinedCategories = useMemo<AttachmentCategory[]>(() => {
    if (!metadata) return defaultAttachmentOrder;
    const unique = new Set<AttachmentCategory>([...defaultAttachmentOrder, ...metadata.attachmentCategories]);
    return Array.from(unique);
  }, [metadata]);

  const canVerifyLegal = useMemo(() => {
    if (!report || !authUser) {
      return false;
    }
    if (authUser.role === "admin" || authUser.role === "supervisor") {
      return true;
    }
    return report.assignedAppraiserId === authUser.id;
  }, [authUser, report]);

  const buildingStandardInfo = useMemo(
    () =>
      report && metadata?.buildingStandards
        ? metadata.buildingStandards.find(
          (standard) => standard.code === report.valuationInput.buildingStandardCode,
        )
        : undefined,
    [metadata, report],
  );

  const valuationBreakdown = useMemo(() => {
    if (!report) return null;
    const { valuationInput, valuationResult } = report;

    const fallbackLandValue = Math.round(valuationInput.landArea * valuationInput.landRate);
    const fallbackBuildingValue = Math.round(valuationInput.buildingArea * valuationInput.buildingRate);
    const fallbackBuildingSafety = Math.round((fallbackBuildingValue * valuationInput.safetyMarginPercent) / 100);
    const fallbackLiquidationFactor = valuationInput.liquidationFactorPercent / 100;

    const computeAverageValue = (values: Array<number | undefined>) => {
      const filtered = values.filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
      );
      if (!filtered.length) {
        return undefined;
      }
      const sum = filtered.reduce((acc, value) => acc + value, 0);
      return Math.round(sum / filtered.length);
    };

    const landComponent =
      valuationResult.land ??
      {
        valueBeforeSafety: fallbackLandValue,
        safetyDeduction: 0,
        valueAfterSafety: fallbackLandValue,
        liquidationValue: Math.round(fallbackLandValue * fallbackLiquidationFactor),
      };

    const buildingComponent =
      valuationResult.building ??
      {
        valueBeforeSafety: fallbackBuildingValue,
        safetyDeduction: fallbackBuildingSafety,
        valueAfterSafety: Math.max(0, fallbackBuildingValue - fallbackBuildingSafety),
        liquidationValue: Math.round(
          Math.max(0, fallbackBuildingValue - fallbackBuildingSafety) * fallbackLiquidationFactor,
        ),
      };

    const landAverageValue =
      landComponent.averageValue ??
      computeAverageValue([
        landComponent.valueBeforeSafety,
        valuationInput.landArea > 0 ? valuationInput.landRate * valuationInput.landArea : undefined,
        valuationInput.njopLand,
      ]);

    const buildingAverageValue =
      buildingComponent.averageValue ??
      computeAverageValue([
        buildingComponent.valueBeforeSafety,
        valuationInput.buildingArea > 0 ? valuationInput.buildingRate * valuationInput.buildingArea : undefined,
        valuationInput.njopBuilding,
      ]);

    const totalAverageValue = (() => {
      const values = [landAverageValue, buildingAverageValue].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      );
      if (!values.length) {
        return undefined;
      }
      return values.reduce((acc, value) => acc + value, 0);
    })();

    const marketValueBeforeSafety =
      valuationResult.marketValueBeforeSafety ??
      landComponent.valueBeforeSafety + buildingComponent.valueBeforeSafety;
    const marketValue = valuationResult.marketValue ?? marketValueBeforeSafety;
    const totalSafetyDeduction = landComponent.safetyDeduction + buildingComponent.safetyDeduction;
    const collateralValueAfterSafety = landComponent.valueAfterSafety + buildingComponent.valueAfterSafety;
    const liquidationValue = landComponent.liquidationValue + buildingComponent.liquidationValue;

    return {
      marketValue,
      marketValueBeforeSafety,
      totalSafetyDeduction,
      collateralValueAfterSafety,
      liquidationValue,
      totalAverageValue,
      land:
        typeof landAverageValue === "number"
          ? { ...landComponent, averageValue: landAverageValue }
          : { ...landComponent },
      building:
        typeof buildingAverageValue === "number"
          ? { ...buildingComponent, averageValue: buildingAverageValue }
          : { ...buildingComponent },
    };
  }, [report]);

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

        // Fetch GIS Data if coordinates exist
        if (reportData.collateral[0]?.latitude && reportData.collateral[0]?.longitude) {
          try {
            setGisLoading(true);
            const res = await api.get("/gis/comparables", {
              params: {
                lat: reportData.collateral[0].latitude,
                lng: reportData.collateral[0].longitude,
                radius: 2 // 2km radius
              }
            });
            if (active) setGisComparables(res.data);
          } catch (e) {
            console.error("Failed to fetch GIS data", e);
          } finally {
            if (active) setGisLoading(false);
          }
        }

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

  useEffect(() => {
    setRemarksExpanded(false);
  }, [report?.id, report?.remarks]);

  const canSubmitForReview =
    authUser?.role === "appraiser" && report && (report.status === "draft" || report.status === "rejected");
  const canApprove = report && (authUser?.role === "supervisor" || authUser?.role === "admin") && report.status === "for_review";
  const canReturnToDraft = report && authUser?.role === "admin" && report.status !== "draft";
  const canEditDraft =
    report &&
    report.status === "draft" &&
    (authUser?.role === "admin" || report.assignedAppraiserId === authUser?.id);

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
      if (isAxiosError(err)) {
        const responseMessage =
          typeof err.response?.data?.message === "string" && err.response.data.message.length
            ? err.response.data.message
            : err.message;
        setActionError(responseMessage);
      } else {
        const message = err instanceof Error ? err.message : "Gagal memperbarui status laporan.";
        setActionError(message);
      }
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
      const updatedReport = await recalculateReport(id);
      setReport(updatedReport);
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
      setUploadProgress(0);
      setActionError(null);
      setActionSuccess(null);
      let geoOptions: { latitude?: number; longitude?: number; capturedAt?: string } | undefined;
      try {
        const position = await requestCurrentLocation();
        if (position) {
          geoOptions = {
            latitude: position.latitude,
            longitude: position.longitude,
            capturedAt: new Date().toISOString(),
          };
        }
      } catch {
        // ignore geolocation failure
      }
      const uploadOptions: {
        latitude?: number;
        longitude?: number;
        capturedAt?: string;
        onProgress?: (value: number) => void;
      } = {
        ...(geoOptions ?? {}),
        onProgress: (value: number) => setUploadProgress(value),
      };
      const uploaded = await uploadReportAttachments(id, uploadCategory, files, uploadOptions);
      setUploadProgress(100);
      setReport((prev) => (prev ? { ...prev, attachments: [...prev.attachments, ...uploaded] } : prev));
      setActionSuccess("Lampiran berhasil diunggah.");
      setFileInputKey((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengunggah lampiran.";
      setActionError(message);
    } finally {
      setAttachmentBusy(false);
      setUploadProgress(null);
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

  const handleVerificationChange = async (
    documentId: string,
    status: "pending" | "verified" | "rejected",
  ) => {
    if (!id) {
      return;
    }
    try {
      setVerificationBusy(documentId);
      setActionError(null);
      setActionSuccess(null);
      const updated = await verifyLegalDocument(id, documentId, { status });
      setReport(updated);
      setActionSuccess("Status verifikasi dokumen diperbarui.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memperbarui status verifikasi dokumen.";
      setActionError(message);
    } finally {
      setVerificationBusy(null);
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
    if (!id || !signatureRole) return;
    try {
      setActionError(null);
      setActionSuccess(null);
      await saveSignature(id, signatureRole, dataUrl);

      // Refresh report to get the new signature
      const updated = await fetchReport(id);
      setReport(updated);

      setActionSuccess("Tanda tangan berhasil disimpan.");
      setShowSignaturePad(false);
      setSignatureRole(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan tanda tangan.";
      setActionError(message);
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

  const qualityChecks = useMemo(() => report?.qualityChecks ?? [], [report]);
  const legalAlerts = useMemo(() => report?.legalAlerts ?? [], [report]);
  const qualitySummary = report?.qualitySummary;
  const criticalIssues = useMemo(
    () => qualityChecks.filter((check) => check.status === "fail" && check.severity === "critical"),
    [qualityChecks],
  );
  const failingChecks = useMemo(
    () => qualityChecks.filter((check) => check.status === "fail"),
    [qualityChecks],
  );
  const auditEntries = useMemo(
    () =>
      report?.auditTrail
        ? [...report.auditTrail].sort(
          (a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf(),
        )
        : [],
    [report],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Memuat detail laporan...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg ring-1 ring-rose-200">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-900">Terjadi Kesalahan</p>
          <p className="mt-2 text-slate-600">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigate("/reports")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali
            </button>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Sticky Header */}
        <div className="sticky top-[4rem] z-30 -mx-4 -mt-8 mb-8 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all duration-200 shadow-sm">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-primary hover:text-primary"
                  title="Kembali"
                >
                  <span className="sr-only">Kembali</span>
                  <svg className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-900">{report.title}</h1>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusBadge[report.status]}`}>
                      {statusLabel[report.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{textOrDash(report.generalInfo.reportNumber)}</span>
                    <span>•</span>
                    <span>{formatDate(report.updatedAt, true)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEditDraft && (
                  <button
                    onClick={() => navigate(`/reports/${report.id}/edit`)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary"
                  >
                    Edit Draft
                  </button>
                )}
                <button
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {previewLoading ? "Memuat..." : "Preview"}
                </button>
                <button
                  onClick={() =>
                    downloadReportPdf(report.id, `${report.generalInfo.reportNumber || `report-${report.id}`}.pdf`)
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark hover:shadow-md"
                >
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          {(actionError || actionSuccess || error) && (
            <div className="space-y-2">
              {actionSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
                  {actionSuccess}
                </div>
              )}
              {(actionError || error) && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                  {actionError || error}
                </div>
              )}
            </div>
          )}

          {/* Action Bar for Status Changes */}
          {(canSubmitForReview || canApprove || canReturnToDraft || report.rejectionReason) && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Status & Workflow</h3>
                  <p className="text-sm text-slate-500">Kelola status laporan dan persetujuan.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canSubmitForReview && (
                    <button
                      onClick={() => void handleStatusChange("for_review")}
                      disabled={statusLoading}
                      className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark hover:shadow-lg disabled:opacity-50"
                    >
                      {statusLoading ? "Memproses..." : "Ajukan Review"}
                    </button>
                  )}
                  {canApprove && (
                    <>
                      <button
                        onClick={() => void handleStatusChange("approved")}
                        disabled={statusLoading}
                        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50"
                      >
                        {statusLoading ? "Memproses..." : "Setujui Laporan"}
                      </button>
                      <button
                        onClick={() => setShowRejectionInput((prev) => !prev)}
                        disabled={statusLoading}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                    </>
                  )}
                  {canReturnToDraft && (
                    <button
                      onClick={() => void handleStatusChange("draft")}
                      disabled={statusLoading}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {statusLoading ? "Memproses..." : "Kembalikan ke Draft"}
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection Input */}
              {showRejectionInput && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                    <label className="mb-2 block text-sm font-semibold text-rose-700">
                      Alasan Penolakan
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      className="w-full rounded-md border-rose-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                      rows={3}
                      placeholder="Jelaskan alasan penolakan..."
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowRejectionInput(false);
                          setRejectionReason("");
                        }}
                        className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-700"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          const reason = rejectionReason.trim();
                          if (!reason) {
                            setActionError("Alasan penolakan wajib diisi.");
                            return;
                          }
                          void handleStatusChange("rejected", reason);
                        }}
                        disabled={statusLoading}
                        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
                      >
                        Kirim Penolakan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {report.rejectionReason && !showRejectionInput && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <span className="font-semibold">Catatan Penolakan:</span> {report.rejectionReason}
                </div>
              )}
            </section>
          )}

          <section className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Batasan & Syarat Penilaian</h2>
                <p className="text-sm text-slate-500">Ketentuan dasar penyusunan laporan.</p>
              </div>
            </div>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600 marker:font-semibold marker:text-slate-400">
              {batasanList.map((item, index) => (
                <li key={index} className="pl-2">{item}</li>
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
                  {textOrDash(
                    report.generalInfo.supervisorName ||
                    metadata?.users.supervisors.find((user) => user.id === report.generalInfo.reviewerId)?.fullName ||
                    "",
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Validasi &amp; Kelayakan Data</h2>
                <p className="text-sm text-slate-500">
                  {qualitySummary
                    ? `Total ${qualitySummary.total} pengecekan otomatis terhadap data laporan.`
                    : "Belum ada catatan validasi terekam pada laporan ini."}
                </p>
              </div>
              {qualitySummary && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-md bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    Lulus {qualitySummary.passed}
                  </span>
                  <span className="rounded-md bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                    Peringatan {qualitySummary.warnings}
                  </span>
                  <span className="rounded-md bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                    Kritis {criticalIssues.length}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {failingChecks.length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Seluruh pengecekan data telah terpenuhi. Tidak ada temuan yang perlu ditindaklanjuti.
                </div>
              ) : (
                failingChecks.map((check) => (
                  <div
                    key={check.id}
                    className={`rounded-md border px-4 py-3 text-sm ${check.severity === "critical"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{check.label}</span>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                        {check.category}
                      </span>
                    </div>
                    {check.message && <p className="mt-1 text-sm">{check.message}</p>}
                  </div>
                ))
              )}

              {legalAlerts.length > 0 && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-semibold">Catatan Legal:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {legalAlerts.map((alert) => (
                      <li key={`legal-${alert.id}`}>
                        <span className="font-medium">{alert.label}</span>
                        {alert.message ? ` - ${alert.message}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {
            report.collateral.map((collateral, index) => {
              const legalDocs = collateral.legalDocuments.filter((doc) => doc.type !== "IMB");
              const imbDocs = collateral.legalDocuments.filter((doc) => doc.type === "IMB");
              const hasCoordinates =
                typeof collateral.latitude === "number" && !Number.isNaN(collateral.latitude) &&
                typeof collateral.longitude === "number" && !Number.isNaN(collateral.longitude);
              const embedUrl = hasCoordinates
                ? buildGoogleMapsEmbedUrl(collateral.latitude as number, collateral.longitude as number)
                : null;
              const mapsLink = hasCoordinates
                ? buildGoogleMapsLink(collateral.latitude as number, collateral.longitude as number)
                : null;
              const staticMapUrl = hasCoordinates
                ? buildStaticMapUrl(collateral.latitude as number, collateral.longitude as number)
                : null;
              return (
                <div key={collateral.id ?? index} className="space-y-8">
                  <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
                        {collateral.inspectionChecklist?.length ? (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Checklist Inspeksi Lapangan
                            </h4>
                            <div className="space-y-3">
                              {collateral.inspectionChecklist.map((item) => (
                                <div
                                  key={`${collateral.id ?? index}-${item.id}`}
                                  className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <span className="font-medium text-slate-800">{item.label}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                      {responseLabel(item.response)}
                                    </span>
                                  </div>
                                  {item.notes ? (
                                    <p className="mt-2 text-xs text-slate-500">
                                      Catatan: <span className="text-slate-700">{item.notes}</span>
                                    </p>
                                  ) : null}
                                  {item.updatedAt ? (
                                    <p className="mt-1 text-[10px] uppercase text-slate-400">
                                      Terakhir diperbarui {formatDate(item.updatedAt, true)}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {hasCoordinates && embedUrl && mapsLink ? (
                          <div className="mt-4 space-y-3">
                            <div className="aspect-[16/9] overflow-hidden rounded-lg border border-slate-200">
                              <iframe
                                title={`map-preview-${collateral.id ?? index}`}
                                src={embedUrl}
                                loading="lazy"
                                allowFullScreen
                                className="h-full w-full border-0"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <a
                                href={mapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded border border-primary px-3 py-1 font-semibold text-primary transition hover:bg-primary/10"
                              >
                                Buka di Google Maps
                              </a>
                              {staticMapUrl ? (
                                <a
                                  href={staticMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded border border-slate-300 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                  Unduh Snapshot
                                </a>
                              ) : (
                                <span className="rounded px-3 py-1 text-slate-500">
                                  Tambahkan Google Maps API key untuk mengunduh snapshot otomatis.
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null}
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
                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <tr>
                                <th className="px-4 py-2 text-left">Jenis</th>
                                <th className="px-4 py-2 text-left">Nomor</th>
                                <th className="px-4 py-2 text-left">Tanggal Terbit</th>
                                <th className="px-4 py-2 text-left">Tanggal Expired</th>
                                <th className="px-4 py-2 text-left">Catatan</th>
                                <th className="px-4 py-2 text-left">Status Verifikasi</th>
                                <th className="px-4 py-2 text-left">Pengingat</th>
                                <th className="px-4 py-2 text-left">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {legalDocs.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="px-4 py-4 text-center text-slate-500">
                                    Tidak ada dokumen legalitas tercatat.
                                  </td>
                                </tr>
                              ) : (
                                legalDocs.map((doc, docIndex) => {
                                  const verificationStatus = doc.verification?.status ?? "pending";
                                  const docKey = doc.id ?? `${doc.number}-${docIndex}`;
                                  const statusMeta = verificationStatusStyles[verificationStatus];
                                  const isBusy = Boolean(doc.id && verificationBusy === doc.id);
                                  const canUpdate = Boolean(canVerifyLegal && doc.id);
                                  return (
                                    <tr key={docKey}>
                                      <td className="px-4 py-2 font-medium text-slate-700">{doc.type}</td>
                                      <td className="px-4 py-2 text-slate-700">{doc.number}</td>
                                      <td className="px-4 py-2 text-slate-500">{formatDate(doc.issueDate)}</td>
                                      <td className="px-4 py-2 text-slate-500">{formatDate(doc.dueDate)}</td>
                                      <td className="px-4 py-2 text-slate-500">{textOrDash(doc.notes)}</td>
                                      <td className="px-4 py-2">
                                        <div className="flex flex-col gap-1">
                                          <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
                                          >
                                            {statusMeta.label}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {doc.verification?.verifiedBy
                                              ? `oleh ${doc.verification.verifiedBy} (${formatDate(
                                                doc.verification.verifiedAt,
                                                true,
                                              )})`
                                              : "Belum diverifikasi"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-slate-500">
                                        {formatDate(doc.reminderDate ?? doc.verification?.reminderDate)}
                                      </td>
                                      <td className="px-4 py-2">
                                        {canUpdate ? (
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              disabled={isBusy || verificationStatus === "pending"}
                                              onClick={() => doc.id && handleVerificationChange(doc.id, "pending")}
                                              className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              Tandai Pending
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isBusy || verificationStatus === "verified"}
                                              onClick={() => doc.id && handleVerificationChange(doc.id, "verified")}
                                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                            >
                                              Tandai Verified
                                            </button>
                                          </div>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">B.2 IMB</h3>
                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              <tr>
                                <th className="px-4 py-2 text-left">Nomor</th>
                                <th className="px-4 py-2 text-left">Tanggal Terbit</th>
                                <th className="px-4 py-2 text-left">Catatan</th>
                                <th className="px-4 py-2 text-left">Status Verifikasi</th>
                                <th className="px-4 py-2 text-left">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {imbDocs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                                    Tidak ada dokumen IMB tercatat.
                                  </td>
                                </tr>
                              ) : (
                                imbDocs.map((doc, docIndex) => {
                                  const verificationStatus = doc.verification?.status ?? "pending";
                                  const docKey = doc.id ?? `imb-${doc.number}-${docIndex}`;
                                  const statusMeta = verificationStatusStyles[verificationStatus];
                                  const isBusy = Boolean(doc.id && verificationBusy === doc.id);
                                  const canUpdate = Boolean(canVerifyLegal && doc.id);
                                  return (
                                    <tr key={docKey}>
                                      <td className="px-4 py-2 font-medium text-slate-700">{doc.number}</td>
                                      <td className="px-4 py-2 text-slate-500">{formatDate(doc.issueDate)}</td>
                                      <td className="px-4 py-2 text-slate-500">{textOrDash(doc.notes)}</td>
                                      <td className="px-4 py-2">
                                        <div className="flex flex-col gap-1">
                                          <span
                                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
                                          >
                                            {statusMeta.label}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {doc.verification?.verifiedBy
                                              ? `oleh ${doc.verification.verifiedBy} (${formatDate(
                                                doc.verification.verifiedAt,
                                                true,
                                              )})`
                                              : "Belum diverifikasi"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        {canUpdate ? (
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              disabled={isBusy || verificationStatus === "verified"}
                                              onClick={() => doc.id && handleVerificationChange(doc.id, "verified")}
                                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                            >
                                              Verifikasi
                                            </button>
                                          </div>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
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
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800">Analisis Lokasi (GIS)</h2>
                        <p className="text-sm text-slate-500">Peta lokasi agunan dan properti pembanding di sekitar.</p>
                      </div>
                      {gisLoading && <span className="text-xs text-slate-500">Memuat data GIS...</span>}
                    </div>

                    <div className="mb-6">
                      {report.collateral[0]?.latitude && report.collateral[0]?.longitude ? (
                        <MapView
                          center={[report.collateral[0].latitude, report.collateral[0].longitude]}
                          comparables={gisComparables}
                        />
                      ) : (
                        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                          <p>Koordinat lokasi belum tersedia. Edit draft untuk menambahkan lokasi.</p>
                        </div>
                      )}
                    </div>

                    {gisComparables.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {gisComparables.slice(0, 3).map((comp) => (
                          <div key={comp.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-slate-800">{comp.type === 'house' ? 'Rumah' : comp.type === 'land' ? 'Tanah' : 'Ruko'}</span>
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{comp.distance}m</span>
                            </div>
                            <p className="text-slate-600 text-xs mb-2 line-clamp-1">{comp.address}</p>
                            <p className="font-semibold text-emerald-600">Rp {comp.price.toLocaleString('id-ID')}</p>
                          </div>
                        ))}
                      </div>
                    )}
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
                            <th className="px-4 py-3 text-right">Luas Tanah (m²)</th>
                            <th className="px-4 py-3 text-right">Luas Bangunan (m²)</th>
                            <th className="px-4 py-3 text-right">Harga</th>
                            <th className="px-4 py-3 text-right">Harga/m²</th>
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
                            <dd className="font-semibold text-slate-800">{formatCurrency(valuationBreakdown?.marketValue)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Nilai Sebelum Safety Margin</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(valuationBreakdown?.marketValueBeforeSafety)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Deduksi Safety Margin</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(valuationBreakdown?.totalSafetyDeduction)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Nilai Setelah Safety Margin</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(valuationBreakdown?.collateralValueAfterSafety)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Nilai Likuidasi</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(valuationBreakdown?.liquidationValue)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    {report.comparables.length > 0 && (
                      <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {report.comparables.map((item, idx) => {
                          const key = item.id ?? `${item.source}-${item.address}`;
                          const adjustedPrice = item.adjustedPrice ?? item.price;
                          const finalPricePerSquare =
                            item.finalPricePerSquare ?? item.adjustedPricePerSquare ?? item.pricePerSquare;
                          const hasAdjustments = Boolean(item.adjustments && item.adjustments.length > 0);
                          return (
                            <div
                              key={`${key}-details`}
                              className={
                                idx === report.comparables.length - 1
                                  ? "space-y-2"
                                  : "space-y-2 border-b border-slate-200 pb-3"
                              }
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-semibold text-slate-800">{item.source}</span>
                                {item.weight !== undefined && (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                    Bobot {formatNumber(item.weight)}
                                  </span>
                                )}
                              </div>
                              <div className="grid gap-2 md:grid-cols-3">
                                <div>
                                  <div className="text-xs uppercase text-slate-500">Harga Disesuaikan</div>
                                  <div className="font-medium text-slate-800">{formatCurrency(adjustedPrice)}</div>
                                </div>
                                <div>
                                  <div className="text-xs uppercase text-slate-500">Harga Akhir/m²</div>
                                  <div className="font-medium text-slate-800">{formatCurrency(finalPricePerSquare)}</div>
                                </div>
                                <div>
                                  <div className="text-xs uppercase text-slate-500">Luas Total</div>
                                  <div className="font-medium text-slate-800">
                                    {formatNumber((item.landArea ?? 0) + (item.buildingArea ?? 0), " m²")}
                                  </div>
                                </div>
                              </div>
                              {hasAdjustments && (
                                <div>
                                  <div className="text-xs uppercase text-slate-500">Penyesuaian</div>
                                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">
                                    {item.adjustments!.map((adj, adjIndex) => (
                                      <li key={`${key}-adj-${adjIndex}`}>
                                        <span className="font-semibold text-slate-700">{adj.factor}</span>:{" "}
                                        {formatCurrency(adj.amount)}
                                        {adj.description ? ` (${adj.description})` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {report.comparableAnalysis && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                          Ringkasan Analisis Pembanding
                        </h3>
                        <dl className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="flex justify-between">
                            <dt>Rata-rata Tertimbang Harga</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(report.comparableAnalysis.weightedAveragePrice)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Rata-rata Tertimbang Harga/m²</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatCurrency(report.comparableAnalysis.weightedAveragePricePerSquare)}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Total Bobot</dt>
                            <dd className="font-semibold text-slate-800">
                              {formatNumber(report.comparableAnalysis.totalWeight)}
                            </dd>
                          </div>
                        </dl>
                        {report.comparableAnalysis.notes?.length ? (
                          <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
                            <p className="font-semibold text-slate-700">Catatan Analis</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                              {report.comparableAnalysis.notes.map((note, noteIndex) => (
                                <li key={`analysis-note-${noteIndex}`}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>

                  <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">G. Catatan Penilai</h2>
                    {report.remarks ? (
                      <div className="mt-3 space-y-2">
                        <div
                          className={`relative whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition-all ${!remarksExpanded && report.remarks.length > 280 ? "max-h-40 overflow-hidden" : ""
                            }`}
                        >
                          {report.remarks}
                          {!remarksExpanded && report.remarks.length > 280 ? (
                            <div className="pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-slate-50 to-transparent" />
                          ) : null}
                        </div>
                        {report.remarks.length > 280 ? (
                          <button
                            type="button"
                            onClick={() => setRemarksExpanded((current) => !current)}
                            className="text-sm font-medium text-primary hover:text-primary-dark"
                          >
                            {remarksExpanded ? "Sembunyikan catatan" : "Lihat selengkapnya"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Tidak ada catatan tambahan.</p>
                    )}
                    {auditEntries.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Belum ada riwayat aktivitas.</p>
                    ) : (
                      <ul className="mt-4 space-y-3 text-sm text-slate-700">
                        {auditEntries.map((entry) => (
                          <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-slate-800">{entry.description}</div>
                              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {entry.actorRole}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{formatDate(entry.timestamp, true)}</div>
                            {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                              <div className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                <p className="font-semibold text-slate-700">Detail</p>
                                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px]">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              );
            })}

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Tanda Tangan</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {/* Appraiser Signature */}
              <div className="flex flex-col items-center rounded-lg border border-slate-200 p-6 text-center">
                <p className="mb-4 text-sm font-medium text-slate-500">Penilai Internal</p>
                {report.signatures?.appraiser ? (
                  <div className="mb-2 flex flex-col items-center">
                    <img
                      src={report.signatures.appraiser.imageDataUrl}
                      alt="Tanda Tangan Penilai"
                      className="h-24 object-contain"
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {report.signatures.appraiser.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(report.signatures.appraiser.signedAt, true)}
                    </p>
                    {authUser?.role === "appraiser" && report.assignedAppraiserId === authUser.id && (
                      <button
                        onClick={async () => {
                          if (confirm("Apakah Anda yakin ingin menghapus tanda tangan ini?")) {
                            try {
                              await deleteSignature(report.id, "appraiser");
                              fetchReportData();
                            } catch (error) {
                              console.error("Failed to delete signature", error);
                              alert("Gagal menghapus tanda tangan.");
                            }
                          }
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 flex h-24 w-full items-center justify-center rounded bg-slate-50 text-xs text-slate-400">
                    Belum ditandatangani
                  </div>
                )}
                {authUser?.role === "appraiser" &&
                  report.assignedAppraiserId === authUser.id &&
                  !report.signatures?.appraiser && (
                    <button
                      onClick={() => {
                        setSignatureRole("appraiser");
                        setShowSignaturePad(true);
                      }}
                      className="mt-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                    >
                      Tanda Tangani
                    </button>
                  )}
              </div>

              {/* Supervisor Signature */}
              <div className="flex flex-col items-center rounded-lg border border-slate-200 p-6 text-center">
                <p className="mb-4 text-sm font-medium text-slate-500">Supervisor</p>
                {report.signatures?.supervisor ? (
                  <div className="mb-2 flex flex-col items-center">
                    <img
                      src={report.signatures.supervisor.imageDataUrl}
                      alt="Tanda Tangan Supervisor"
                      className="h-24 object-contain"
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {report.signatures.supervisor.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(report.signatures.supervisor.signedAt, true)}
                    </p>
                    {(authUser?.role === "supervisor" || authUser?.role === "admin") && (
                      <button
                        onClick={async () => {
                          if (confirm("Apakah Anda yakin ingin menghapus tanda tangan ini?")) {
                            try {
                              await deleteSignature(report.id, "supervisor");
                              fetchReportData();
                            } catch (error) {
                              console.error("Failed to delete signature", error);
                              alert("Gagal menghapus tanda tangan.");
                            }
                          }
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 flex h-24 w-full items-center justify-center rounded bg-slate-50 text-xs text-slate-400">
                    Belum ditandatangani
                  </div>
                )}
                {(authUser?.role === "supervisor" || authUser?.role === "admin") &&
                  !report.signatures?.supervisor && (
                    <button
                      onClick={() => {
                        setSignatureRole("supervisor");
                        setShowSignaturePad(true);
                      }}
                      className="mt-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                    >
                      Tanda Tangani
                    </button>
                  )}
              </div>
            </div>
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
                  {attachmentBusy ? `Mengunggah ${uploadProgress ?? 0}%` : "Unggah Lampiran"}
                </label>
              </div>
              {uploadProgress !== null && (
                <div className="mt-2 w-full md:w-60">
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Mengunggah {Math.min(uploadProgress, 100)}%</p>
                </div>
              )}
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
                            {attachment.caption && (
                              <div className="mt-1 text-xs text-slate-500">
                                Keterangan: <span className="text-slate-700">{attachment.caption}</span>
                              </div>
                            )}
                            {(attachment.latitude !== undefined || attachment.longitude !== undefined || attachment.capturedAt) && (
                              <div className="mt-1 text-xs text-slate-500">
                                {attachment.capturedAt ? `Diambil ${formatDate(attachment.capturedAt, true)}` : ""}
                                {(attachment.latitude !== undefined || attachment.longitude !== undefined) && (
                                  <span>
                                    {attachment.capturedAt ? " | " : ""}
                                    Koordinat: {attachment.latitude ?? "-"}, {attachment.longitude ?? "-"}
                                  </span>
                                )}
                              </div>
                            )}
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
      </div>

      {
        previewOpen && report && (
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
        )
      }
      {showSignaturePad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Tanda Tangan sebagai {signatureRole === "appraiser" ? "Penilai" : "Supervisor"}
              </h3>
              <button
                onClick={() => {
                  setShowSignaturePad(false);
                  setSignatureRole(null);
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SignaturePad
              onSave={handleSaveSignature}
              onClear={() => { }}
            />
          </div>
        </div>
      )}
    </>
  );
}







