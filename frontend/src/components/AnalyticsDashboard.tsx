import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, FileText, Clock } from "lucide-react";

interface DashboardStats {
    totalReports: number;
    completedReports: number;
    pendingReports: number;
    avgTatHours: number;
    activeAppraisers: number;
}

interface ValuationTrend {
    month: string;
    avgValue: number;
    count: number;
}

export function AnalyticsDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trends, setTrends] = useState<ValuationTrend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, trendsRes] = await Promise.all([
                    api.get<DashboardStats>("/analytics/stats"),
                    api.get<ValuationTrend[]>("/analytics/trends"),
                ]);
                setStats(statsRes.data);
                setTrends(trendsRes.data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Memuat data analitik...</div>;
    }

    if (!stats) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Laporan</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.totalReports}</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Selesai</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.completedReports}</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Rata-rata TAT</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.avgTatHours} Jam</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Penilai Aktif</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.activeAppraisers}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Valuation Trend Chart */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-lg font-semibold text-slate-900">Tren Nilai Properti (Miliar Rp)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avgValue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity / Performance (Mock List) */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Performa Penilai Terbaik</h3>
                    <div className="space-y-4">
                        {[
                            { name: "Budi Santoso", score: 98, reports: 15 },
                            { name: "Siti Aminah", score: 95, reports: 12 },
                            { name: "Andi Wijaya", score: 92, reports: 20 },
                        ].map((appraiser, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                        {appraiser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{appraiser.name}</p>
                                        <p className="text-xs text-slate-500">{appraiser.reports} Laporan bulan ini</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                        Skor: {appraiser.score}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
