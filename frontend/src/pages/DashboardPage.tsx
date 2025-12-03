import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { fetchMetadata, fetchReports } from "../lib/reportApi";
import type { MetadataResponse, Report, ReportStatus } from "../types/report";
import { useAuthStore } from "../store/auth";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Shield,
  Activity,
  ArrowRight
} from "lucide-react";
import { Skeleton } from "../components/Skeleton";

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "text-slate-500 bg-slate-100", icon: FileText },
  for_review: { label: "Menunggu Review", color: "text-amber-600 bg-amber-100", icon: Clock },
  approved: { label: "Disetujui", color: "text-emerald-600 bg-emerald-100", icon: CheckCircle },
  rejected: { label: "Ditolak", color: "text-rose-600 bg-rose-100", icon: XCircle },
};

export function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuthStore();

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
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-dark to-primary px-8 py-10 shadow-xl">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Selamat Datang, {user?.fullName?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-emerald-100 max-w-xl text-lg">
            Sistem Penilaian Agunan siap membantu Anda mengelola penilaian properti dengan lebih efisien dan akurat.
          </p>
          <div className="mt-8 flex gap-4">
            <Link to="/reports/new" className="btn bg-white text-primary-dark hover:bg-emerald-50 border-none shadow-lg">
              Buat Laporan Baru
            </Link>
            <Link to="/reports" className="btn bg-primary-dark/30 text-white hover:bg-primary-dark/50 backdrop-blur-sm border border-white/20">
              Lihat Semua Laporan
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent transform skew-x-12"></div>
        <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200 flex items-center gap-3">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Terjadi kesalahan</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <section className="grid gap-6 md:grid-cols-4">
        {(Object.keys(byStatus) as ReportStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <div key={status} className="card p-6 hover:scale-[1.02] transition-transform duration-200 border-t-4" style={{ borderTopColor: status === 'approved' ? '#10b981' : status === 'rejected' ? '#f43f5e' : status === 'for_review' ? '#f59e0b' : '#cbd5e1' }}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{byStatus[status]}</p>
              <p className="text-sm text-slate-500 font-medium">{config.label}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Latest Reports */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-slate-900">Laporan Terbaru</h2>
            </div>
            <Link to="/reports" className="group flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
              Lihat semua
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="card overflow-hidden border-0 shadow-lg ring-1 ring-slate-100">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-3 w-16 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : latestReports.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p>Belum ada laporan yang dibuat.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {latestReports.map((report) => (
                  <div key={report.id} className="p-4 hover:bg-slate-50/80 transition-colors duration-150 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">{report.title}</h3>
                        <span className={`badge ${report.status === 'approved' ? 'badge-success' :
                          report.status === 'rejected' ? 'badge-error' :
                            report.status === 'for_review' ? 'badge-warning' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {statusConfig[report.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{report.generalInfo.reportNumber}</span>
                        <span>•</span>
                        <span>{report.generalInfo.customerName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        {new Date(report.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <Link to={`/reports/${report.id}`} className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 inline-flex items-center gap-1">
                        Detail <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* System Stats */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-slate-900">Statistik Sistem</h2>
          </div>

          <div className="card p-6 space-y-8 border-0 shadow-lg ring-1 ring-slate-100">
            {metadata ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Pengguna Aktif</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-medium">Penilai</span>
                      <span className="font-bold text-primary bg-white px-3 py-1 rounded-md shadow-sm border border-slate-100">{metadata.users.appraisers.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-medium">Supervisor</span>
                      <span className="font-bold text-primary bg-white px-3 py-1 rounded-md shadow-sm border border-slate-100">{metadata.users.supervisors.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-medium">Admin</span>
                      <span className="font-bold text-primary bg-white px-3 py-1 rounded-md shadow-sm border border-slate-100">{metadata.users.admins.length}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Parameter Global</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium text-slate-600">Safety Margin</span>
                        <span className="font-bold text-slate-900">{metadata.parameters.defaultSafetyMargin}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-accent h-full rounded-full shadow-sm" style={{ width: `${metadata.parameters.defaultSafetyMargin}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium text-slate-600">Liquidation Factor</span>
                        <span className="font-bold text-slate-900">{metadata.parameters.defaultLiquidationFactor}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full shadow-sm" style={{ width: `${metadata.parameters.defaultLiquidationFactor}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-12 rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-5">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-2.5 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
