"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Terminal,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Wifi,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Eye,
    X,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface StepResult {
    step: number;
    label: string;
    action: string;
    status: "PASS" | "FAIL" | "SKIP";
    durationMs: number;
    error?: string;
}

interface FlowRun {
    _id: string;
    flowId: string;
    flowName: string;
    overallStatus: "PASS" | "FAIL" | "PARTIAL";
    totalDurationMs: number;
    failedStep?: string;
    consoleLogs: string[];
    networkFailures: string[];
    stepResults: StepResult[];
    screenshot?: string;
    createdAt: string;
}

function StatusBadge({ status }: { status: "PASS" | "FAIL" | "PARTIAL" }) {
    const map = {
        PASS: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle2 size={12} /> },
        FAIL: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: <XCircle size={12} /> },
        PARTIAL: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <AlertTriangle size={12} /> },
    };
    const s = map[status];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", fontWeight: "700", padding: "3px 9px", borderRadius: "20px", background: s.bg, color: s.color }}>
            {s.icon} {status}
        </span>
    );
}

export default function ExecutionsPage() {
    const [runs, setRuns] = useState<FlowRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detailRun, setDetailRun] = useState<FlowRun | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchRuns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/runs");
            const data = await res.json();
            if (res.ok) setRuns(data.runs || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRuns(); }, [fetchRuns]);

    async function loadDetail(id: string) {
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/runs/${id}`);
            const data = await res.json();
            if (res.ok) setDetailRun(data.run);
        } finally {
            setDetailLoading(false);
        }
    }

    const formatDate = (d: string) => new Date(d).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });

    const statusCounts = {
        pass: runs.filter(r => r.overallStatus === "PASS").length,
        fail: runs.filter(r => r.overallStatus === "FAIL").length,
        partial: runs.filter(r => r.overallStatus === "PARTIAL").length,
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#ef4444,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Terminal size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "1.6rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Execution History</h1>
                            <p style={{ color: "var(--text-muted)", margin: "2px 0 0 0", fontSize: "0.82rem" }}>Flow run results with console and network diagnostics</p>
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={fetchRuns} style={{ height: "38px" }}>
                        <RotateCcw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {runs.length > 0 && (
                <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                    {[
                        { label: "Total Runs", value: runs.length, color: "#64748b" },
                        { label: "Passed", value: statusCounts.pass, color: "#10b981" },
                        { label: "Failed", value: statusCounts.fail, color: "#ef4444" },
                        { label: "Partial", value: statusCounts.partial, color: "#f59e0b" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="glass-card" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", flex: "1", minWidth: "140px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color }}>{value}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Runs list */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><LoadingSpinner size={32} /></div>
            ) : runs.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "80px 20px", color: "var(--text-muted)" }}>
                    <Terminal size={32} style={{ opacity: 0.3 }} />
                    <div>
                        <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-secondary)" }}>No executions yet</div>
                        <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Go to the <strong>Flow Library</strong> and run a flow to see results.</div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {runs.map(run => (
                        <div key={run._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                            {/* Row */}
                            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", cursor: "pointer" }}
                                onClick={() => setExpandedId(expandedId === run._id ? null : run._id)}>
                                {/* Status */}
                                <StatusBadge status={run.overallStatus} />

                                {/* Name */}
                                <div style={{ flex: 1, minWidth: "160px" }}>
                                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>{run.flowName}</div>
                                    {run.failedStep && (
                                        <div style={{ fontSize: "0.73rem", color: "#f87171", marginTop: "2px" }}>
                                            Failed at: {run.failedStep}
                                        </div>
                                    )}
                                </div>

                                {/* Time */}
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    <Clock size={12} /> {(run.totalDurationMs / 1000).toFixed(1)}s
                                </div>

                                {/* Error indicators */}
                                <div style={{ display: "flex", gap: "8px" }}>
                                    {run.consoleLogs?.length > 0 && (
                                        <span title={`${run.consoleLogs.length} console error(s)`} style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: "4px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: "700" }}>
                                            {run.consoleLogs.length} console
                                        </span>
                                    )}
                                    {run.networkFailures?.length > 0 && (
                                        <span title={`${run.networkFailures.length} network failure(s)`} style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: "700" }}>
                                            {run.networkFailures.length} network
                                        </span>
                                    )}
                                </div>

                                {/* Date */}
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(run.createdAt)}</span>

                                {/* Detail btn */}
                                <button className="btn-secondary" style={{ height: "28px", padding: "0 10px", fontSize: "0.73rem" }}
                                    onClick={e => { e.stopPropagation(); loadDetail(run._id); }}>
                                    <Eye size={12} /> Detail
                                </button>

                                {/* Expand */}
                                {expandedId === run._id ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>

                            {/* Expanded inline summary */}
                            {expandedId === run._id && (
                                <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--border)" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
                                        {/* Console errors */}
                                        <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                                                <Terminal size={11} /> Console Errors ({run.consoleLogs?.length ?? 0})
                                            </div>
                                            {run.consoleLogs?.length === 0 ? (
                                                <div style={{ fontSize: "0.78rem", color: "#10b981", display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <CheckCircle2 size={12} /> No console errors
                                                </div>
                                            ) : (
                                                <div style={{ maxHeight: "80px", overflowY: "auto" }}>
                                                    {run.consoleLogs?.slice(0, 3).map((log, i) => (
                                                        <div key={i} style={{ fontSize: "0.72rem", color: "#fbbf24", fontFamily: "monospace", borderBottom: "1px solid rgba(245,158,11,0.08)", paddingBottom: "3px", marginBottom: "3px", wordBreak: "break-word" }}>{log}</div>
                                                    ))}
                                                    {run.consoleLogs?.length > 3 && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>+{run.consoleLogs.length - 3} more</div>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Network failures */}
                                        <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                                                <Wifi size={11} /> Network Failures ({run.networkFailures?.length ?? 0})
                                            </div>
                                            {run.networkFailures?.length === 0 ? (
                                                <div style={{ fontSize: "0.78rem", color: "#10b981", display: "flex", alignItems: "center", gap: "5px" }}>
                                                    <CheckCircle2 size={12} /> No network failures
                                                </div>
                                            ) : (
                                                <div style={{ maxHeight: "80px", overflowY: "auto" }}>
                                                    {run.networkFailures?.slice(0, 3).map((err, i) => (
                                                        <div key={i} style={{ fontSize: "0.72rem", color: "#f87171", fontFamily: "monospace", borderBottom: "1px solid rgba(239,68,68,0.08)", paddingBottom: "3px", marginBottom: "3px", wordBreak: "break-word" }}>{err}</div>
                                                    ))}
                                                    {run.networkFailures?.length > 3 && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>+{run.networkFailures.length - 3} more</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {(detailRun || detailLoading) && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                    onClick={() => setDetailRun(null)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "700px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                        {detailLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><LoadingSpinner size={28} /></div>
                        ) : detailRun && (
                            <>
                                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{detailRun.flowName}</h2>
                                        <StatusBadge status={detailRun.overallStatus} />
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Clock size={11} /> {(detailRun.totalDurationMs / 1000).toFixed(2)}s
                                        </span>
                                    </div>
                                    <button onClick={() => setDetailRun(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {/* Step Results */}
                                    <div>
                                        <div style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.08em" }}>Step Results</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                            {detailRun.stepResults?.map((s, i) => (
                                                <div key={i} style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${s.status === "PASS" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`, background: s.status === "PASS" ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                                        {s.status === "PASS" ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                                                        <span style={{ fontSize: "0.83rem", fontWeight: "500", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || `Step ${s.step}`}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                                                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                                                            <Clock size={10} /> {s.durationMs}ms
                                                        </span>
                                                        <StatusBadge status={s.status as any} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Console + Network */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                        <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", marginBottom: "8px" }}>
                                                Console Errors ({detailRun.consoleLogs?.length ?? 0})
                                            </div>
                                            {detailRun.consoleLogs?.length === 0 ? (
                                                <div style={{ fontSize: "0.78rem", color: "#10b981" }}>No errors</div>
                                            ) : detailRun.consoleLogs?.map((log, i) => (
                                                <div key={i} style={{ fontSize: "0.72rem", color: "#fbbf24", fontFamily: "monospace", marginBottom: "4px", wordBreak: "break-word" }}>{log}</div>
                                            ))}
                                        </div>
                                        <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", marginBottom: "8px" }}>
                                                Network Failures ({detailRun.networkFailures?.length ?? 0})
                                            </div>
                                            {detailRun.networkFailures?.length === 0 ? (
                                                <div style={{ fontSize: "0.78rem", color: "#10b981" }}>No failures</div>
                                            ) : detailRun.networkFailures?.map((err, i) => (
                                                <div key={i} style={{ fontSize: "0.72rem", color: "#f87171", fontFamily: "monospace", marginBottom: "4px", wordBreak: "break-word" }}>{err}</div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Screenshot */}
                                    {detailRun.screenshot && (
                                        <div>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.08em" }}>Final Screenshot</div>
                                            <img src={`data:image/png;base64,${detailRun.screenshot}`} alt="Final state" style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--border)" }} />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
