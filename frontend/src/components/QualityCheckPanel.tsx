import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { QualityCheck, QualitySummary } from "../types/report";
import { useMemo } from "react";

interface QualityCheckPanelProps {
    checks: QualityCheck[];
    summary: QualitySummary;
    displayMode?: "full" | "summary";
    className?: string;
}

export function QualityCheckPanel({ checks, summary, displayMode = "full", className = "" }: QualityCheckPanelProps) {
    const criticalIssues = useMemo(() => checks.filter((c) => c.status === "fail" && c.severity === "critical"), [checks]);
    const warningIssues = useMemo(() => checks.filter((c) => c.status === "fail" && c.severity === "warning"), [checks]);
    const passedChecks = useMemo(() => checks.filter((c) => c.status === "pass"), [checks]);

    const score = useMemo(() => {
        if (summary.total === 0) return 0;
        return Math.round((summary.passed / summary.total) * 100);
    }, [summary]);

    const scoreColor = score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-rose-600";
    const circleColor = score >= 90 ? "stroke-emerald-500" : score >= 70 ? "stroke-amber-500" : "stroke-rose-500";

    return (
        <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
            {/* Header */}
            <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900">Kualitas Laporan</h3>
                        <p className="text-xs text-slate-500">Skor Kualitas & Kepatuhan</p>
                    </div>
                    <div className="relative flex h-12 w-12 items-center justify-center">
                        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                            <path
                                className="text-slate-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className={circleColor}
                                strokeDasharray={`${score}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        <span className={`absolute text-sm font-bold ${scoreColor}`}>{score}</span>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {displayMode === "full" && (
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50 p-2 text-center text-xs">
                    <div>
                        <span className="block font-bold text-rose-600">{criticalIssues.length}</span>
                        <span className="text-slate-500">Kritis</span>
                    </div>
                    <div>
                        <span className="block font-bold text-amber-600">{warningIssues.length}</span>
                        <span className="text-slate-500">Warning</span>
                    </div>
                    <div>
                        <span className="block font-bold text-emerald-600">{passedChecks.length}</span>
                        <span className="text-slate-500">Pass</span>
                    </div>
                </div>
            )}

            {/* Issues List */}
            <div className="max-h-[400px] overflow-y-auto p-4">
                {checks.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">Belum ada pemeriksaan kualitas.</p>
                ) : (
                    <div className="space-y-3">
                        {criticalIssues.map((issue) => (
                            <div key={issue.id} className="flex gap-3 rounded-lg border border-rose-100 bg-rose-50 p-3">
                                <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                                <div>
                                    <h4 className="text-sm font-medium text-rose-800">{issue.label}</h4>
                                    <p className="mt-1 text-xs text-rose-600">{issue.message}</p>
                                </div>
                            </div>
                        ))}

                        {warningIssues.map((issue) => (
                            <div key={issue.id} className="flex gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                                <div>
                                    <h4 className="text-sm font-medium text-amber-800">{issue.label}</h4>
                                    <p className="mt-1 text-xs text-amber-600">{issue.message}</p>
                                </div>
                            </div>
                        ))}

                        {displayMode === "full" && passedChecks.length > 0 && (
                            <div className="mt-4">
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Terpenuhi</h4>
                                <div className="space-y-2">
                                    {passedChecks.map((check) => (
                                        <div key={check.id} className="flex items-center gap-2 text-sm text-slate-600">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            <span>{check.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
