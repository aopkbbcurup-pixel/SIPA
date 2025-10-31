import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadReportPdf, fetchReports } from "../lib/reportApi";
import type { Report, ReportStatus } from "../types/report";

interface Filters {
  search: string;
  status: ReportStatus | "semua";
  from: string;
  to: string;
}

const initialFilters: Filters = {
  search: "",
  status: "semua",
  from: "",
  to: "",
};

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

export function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadReports = async () => {
      try {
        setLoading(true);
        const params = {
          search: filters.search || undefined,
          status: filters.status !== "semua" ? filters.status : undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        };
        const data = await fetchReports(params);
        if (isMounted) {
          setReports(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Gagal memuat laporan";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [filters.search, filters.status, filters.from, filters.to, refreshToken]);

  const totalPlafond = useMemo(() => {
    return reports.reduce((sum, report) => sum + report.generalInfo.plafond, 0);
  }, [reports]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Manajemen Laporan Penilaian</h2>
          <p className="text-sm text-slate-500">Cari, filter, dan kelola laporan penilaian agunan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshToken((prev) => prev + 1)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Segarkan Data
          </button>
          <Link
            to="/reports/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            + Laporan Baru
          </Link>
        </div>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600">Pencarian</label>
            <input
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              placeholder="Nama nasabah, nomor laporan, atau judul"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Status</label>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="semua">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="for_review">Menunggu Review</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600">Dari</label>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => handleFilterChange("from", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Sampai</label>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => handleFilterChange("to", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>Total laporan: <span className="font-semibold text-slate-700">{reports.length}</span></p>
          <p>
            Total plafon permohonan: <span className="font-semibold text-slate-700">Rp {totalPlafond.toLocaleString("id-ID")}</span>
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Nomor Laporan</th>
                <th className="px-4 py-3">Nasabah</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plafond</th>
                <th className="px-4 py-3">Diperbarui</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Memuat data laporan...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada laporan sesuai filter.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{report.generalInfo.reportNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{report.generalInfo.customerName}</div>
                      <div className="text-xs text-slate-400">{report.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge[report.status]}`}>
                        {statusLabel[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Rp {report.generalInfo.plafond.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(report.updatedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/reports/${report.id}`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Detail
                        </Link>
                        <button
                          onClick={() => downloadReportPdf(report.id, `${report.generalInfo.reportNumber}.pdf`)}
                          className="rounded-md border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
