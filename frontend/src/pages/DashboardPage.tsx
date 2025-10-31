import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { fetchMetadata, fetchReports } from "../lib/reportApi";
import type { MetadataResponse, Report, ReportStatus } from "../types/report";
import { useAuthStore } from "../store/auth";

const statusLabel: Record<ReportStatus, string> = {
  draft: "Draft",
  for_review: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const statusColor: Record<ReportStatus, string> = {
  draft: "bg-slate-200 text-slate-700",
  for_review: "bg-amber-200 text-amber-900",
  approved: "bg-emerald-200 text-emerald-900",
  rejected: "bg-rose-200 text-rose-900",
};

export function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [reportData, metadataData] = await Promise.all([fetchReports(), fetchMetadata()]);
        if (isMounted) {
          setReports(reportData);
          setMetadata(metadataData);
        }
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
          logout();
          if (isMounted) {
            setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
          }
          return;
        }
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Gagal memuat data";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  const byStatus = useMemo(() => {
    return reports.reduce<Record<ReportStatus, number>>(
      (acc, report) => {
        acc[report.status] += 1;
        return acc;
      },
      { draft: 0, for_review: 0, approved: 0, rejected: 0 },
    );
  }, [reports]);

  const latestReports = useMemo(() => reports.slice(0, 5), [reports]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Ringkasan Aktivitas</h2>
        <p className="text-sm text-slate-500">Status laporan penilaian agunan saat ini.</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Memuat data...</p>
        ) : error ? (
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {(Object.keys(byStatus) as ReportStatus[]).map((status) => (
              <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{statusLabel[status]}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">{byStatus[status]}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Laporan Terbaru</h3>
            <Link to="/reports" className="text-sm font-medium text-primary hover:text-primary-dark">
              Lihat semua
            </Link>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat data...</p>
          ) : latestReports.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Belum ada laporan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latestReports.map((report) => (
                <li key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{report.title}</p>
                      <p className="text-xs text-slate-500">{report.generalInfo.reportNumber}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor[report.status]}`}>
                      {statusLabel[report.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Nasabah: {report.generalInfo.customerName}</p>
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>Dibuat: {new Date(report.createdAt).toLocaleDateString("id-ID")}</span>
                    <Link to={`/reports/${report.id}`} className="font-medium text-primary hover:text-primary-dark">
                      Detail
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Informasi Pengguna & Parameter</h3>
          {metadata ? (
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-700">Jumlah pengguna terdaftar</p>
                <ul className="mt-2 space-y-1">
                  <li>Penilai: {metadata.users.appraisers.length}</li>
                  <li>Supervisor: {metadata.users.supervisors.length}</li>
                  <li>Administrator: {metadata.users.admins.length}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Parameter Penilaian</p>
                <p className="mt-1 text-xs text-slate-500">Safety Margin (%)</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {metadata.parameters.safetyMarginOptions.map((value) => (
                    <span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                      {value}%
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">Faktor Likuidasi (%)</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {metadata.parameters.liquidationFactorOptions.map((value) => (
                    <span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                      {value}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat metadata...</p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Metadata belum tersedia.</p>
          )}
        </div>
      </section>
    </div>
  );
}
