import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadReportPdf, fetchReports, exportReports } from "../lib/reportApi";
import type { Report, ReportStatus } from "../types/report";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  FileText,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";
import { Skeleton } from "../components/Skeleton";
import { Chatbox } from "../components/Chatbox";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";

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

export function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<"reports" | "analytics">("reports");

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

  const handleExport = async () => {
    try {
      const params = {
        search: filters.search || undefined,
        status: filters.status !== "semua" ? filters.status : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      };
      await exportReports(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengunduh laporan";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Laporan</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola seluruh laporan penilaian agunan dalam satu tempat.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>
          <button
            onClick={() => setRefreshToken((prev) => prev + 1)}
            className="btn-secondary text-sm gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Segarkan
          </button>
          <Link
            to="/reports/new"
            className="btn-primary text-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            Buat Laporan
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("reports")}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${activeTab === "reports"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
          >
            Daftar Laporan
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${activeTab === "analytics"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
          >
            Analytics Dashboard
          </button>
        </nav>
      </div>

      {activeTab === "analytics" ? (
        <AnalyticsDashboard />
      ) : (
        <>
          {/* Filters */}
          <div className="card p-6 border-0 shadow-lg ring-1 ring-slate-100">
            <form className="grid gap-6 md:grid-cols-4 mb-8">
              <div className="md:col-span-2">
                <label className="input-label">Pencarian</label>
                <div className="relative">
                  <input
                    value={filters.search}
                    onChange={(event) => handleFilterChange("search", event.target.value)}
                    placeholder="Cari berdasarkan nama nasabah, nomor laporan..."
                    className="input-field pl-10"
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
              <div>
                <label className="input-label">Status Laporan</label>
                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(event) => handleFilterChange("status", event.target.value)}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="for_review">Menunggu Review</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                  <Filter className="w-5 h-5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Dari Tanggal</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(event) => handleFilterChange("from", event.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">Sampai Tanggal</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(event) => handleFilterChange("to", event.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Summary Cards */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Total Laporan:</span>
                <span className="text-lg font-bold text-slate-800">{reports.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Total Plafond:</span>
                <span className="text-lg font-bold text-slate-800">Rp {totalPlafond.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Laporan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nasabah</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plafond</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <Skeleton className="h-5 w-5 rounded-full" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-rose-600 bg-rose-50">
                        <p className="font-medium">Terjadi Kesalahan</p>
                        <p className="text-sm mt-1">{error}</p>
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="font-medium text-slate-900">Tidak ada laporan ditemukan</p>
                          <p className="text-sm mt-1">Coba sesuaikan filter pencarian Anda.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors duration-150 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">{report.generalInfo.reportNumber}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">{report.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{report.generalInfo.customerName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${report.status === 'approved' ? 'badge-success' :
                            report.status === 'rejected' ? 'badge-error' :
                              report.status === 'for_review' ? 'badge-warning' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {statusLabel[report.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          Rp {report.generalInfo.plafond.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(report.updatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => downloadReportPdf(report.id, `${report.generalInfo.reportNumber}.pdf`)}
                              className="text-slate-400 hover:text-primary transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <Link
                              to={`/reports/${report.id}`}
                              className="text-slate-400 hover:text-primary transition-colors"
                              title="Lihat Detail"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <Skeleton className="h-9 flex-1 rounded-lg" />
                      <Skeleton className="h-9 flex-1 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : error ? (
                <div className="rounded-lg bg-rose-50 p-4 text-center text-rose-600">
                  <p className="font-medium">Terjadi Kesalahan</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">Tidak ada laporan ditemukan</p>
                  <p className="text-sm mt-1">Coba sesuaikan filter pencarian Anda.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{report.generalInfo.reportNumber}</div>
                        <div className="text-xs text-slate-500">{report.title}</div>
                      </div>
                      <span className={`badge ${report.status === 'approved' ? 'badge-success' :
                        report.status === 'rejected' ? 'badge-error' :
                          report.status === 'for_review' ? 'badge-warning' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {statusLabel[report.status]}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nasabah:</span>
                        <span className="font-medium">{report.generalInfo.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plafond:</span>
                        <span className="font-medium">Rp {report.generalInfo.plafond.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal:</span>
                        <span>{new Date(report.updatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => downloadReportPdf(report.id, `${report.generalInfo.reportNumber}.pdf`)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      <Link
                        to={`/reports/${report.id}`}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary-dark"
                      >
                        Detail
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      <Chatbox />
    </div>
  );
}
