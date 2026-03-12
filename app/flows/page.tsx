"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Library,
    Play,
    Trash2,
    Plus,
    Globe,
    Wand2,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronDown,
    Repeat,
    X,
    Save,
    Eye,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface FlowStep {
    step: number;
    action: string;
    label?: string;
    selector?: string;
    value?: string;
    url?: string;
}

interface TestFlow {
    _id: string;
    name: string;
    targetUrl: string;
    steps: FlowStep[];
    sourceType?: "recorded" | "generated";
    requirement?: string;
    description?: string;
    createdAt: string;
}

interface RunSummary {
    _id: string;
    flowName: string;
    overallStatus: "PASS" | "FAIL" | "PARTIAL";
    totalDurationMs: number;
    createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
    navigate: "#3b82f6",
    click: "#8b5cf6",
    fill: "#10b981",
    type: "#10b981",
    select: "#f59e0b",
    press: "#06b6d4",
    wait: "#64748b",
    verify: "#f43f5e",
};

function ActionBadge({ action }: { action: string }) {
    const color = ACTION_COLORS[action] || "#64748b";
    return (
        <span style={{
            fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase",
            letterSpacing: "0.05em", padding: "2px 7px", borderRadius: "4px",
            background: `${color}20`, color, border: `1px solid ${color}30`,
            whiteSpace: "nowrap",
        }}>
            {action}
        </span>
    );
}

function StatusPill({ status }: { status: "PASS" | "FAIL" | "PARTIAL" }) {
    const map = {
        PASS: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: "✓" },
        FAIL: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: "✗" },
        PARTIAL: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: "~" },
    };
    const s = map[status];
    return (
        <span style={{ fontSize: "0.75rem", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", background: s.bg, color: s.color }}>
            {s.icon} {status}
        </span>
    );
}

export default function FlowsPage() {
    const [flows, setFlows] = useState<TestFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<{ flowName: string; status: "PASS" | "FAIL" | "PARTIAL"; message: string } | null>(null);

    // Convert modal
    const [showConvert, setShowConvert] = useState(false);
    const [convertText, setConvertText] = useState("");
    const [convertUrl, setConvertUrl] = useState("");
    const [convertName, setConvertName] = useState("");
    const [convertReq, setConvertReq] = useState("");
    const [convertLoading, setConvertLoading] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);

    // Flow detail modal
    const [detailFlow, setDetailFlow] = useState<TestFlow | null>(null);

    const fetchFlows = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/flows");
            const data = await res.json();
            if (res.ok) setFlows(data.flows || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFlows(); }, [fetchFlows]);

    async function handleRun(flow: TestFlow) {
        setRunningId(flow._id);
        setRunResult(null);
        try {
            const res = await fetch("/api/flows/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    steps: flow.steps,
                    targetUrl: flow.targetUrl,
                    flowId: flow._id,
                    flowName: flow.name,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Run failed");
            setRunResult({
                flowName: flow.name,
                status: data.overallStatus,
                message: data.overallStatus === "PASS"
                    ? `All ${data.stepResults?.length} steps passed in ${(data.totalDurationMs / 1000).toFixed(1)}s.`
                    : `${data.stepResults?.filter((s: any) => s.status === "FAIL").length} step(s) failed. ${data.failedStep ? `First failure: "${data.failedStep}"` : ""}`,
            });
        } catch (err: any) {
            setRunResult({ flowName: flow.name, status: "FAIL", message: err.message });
        } finally {
            setRunningId(null);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this flow?")) return;
        await fetch(`/api/flows/${id}`, { method: "DELETE" });
        setFlows(f => f.filter(x => x._id !== id));
    }

    async function handleConvert() {
        if (!convertText.trim() || !convertUrl.trim()) {
            setConvertError("Target URL and test steps are required.");
            return;
        }
        setConvertLoading(true);
        setConvertError(null);
        try {
            const res = await fetch("/api/ai/convert-testcase-to-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    testSteps: convertText,
                    targetUrl: convertUrl,
                    flowName: convertName || undefined,
                    requirement: convertReq || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Conversion failed");
            setShowConvert(false);
            setConvertText(""); setConvertUrl(""); setConvertName(""); setConvertReq("");
            fetchFlows();
        } catch (err: any) {
            setConvertError(err.message);
        } finally {
            setConvertLoading(false);
        }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Library size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "1.6rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Flow Library</h1>
                            <p style={{ color: "var(--text-muted)", margin: "2px 0 0 0", fontSize: "0.82rem" }}>Manage and execute your saved test flows</p>
                        </div>
                    </div>
                    <button className="btn-primary" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }} onClick={() => setShowConvert(true)}>
                        <Wand2 size={15} /> AI Convert
                    </button>
                </div>
            </div>

            {/* Run result banner */}
            {runResult && (
                <div className="animate-fade-in" style={{
                    marginBottom: "20px", padding: "14px 20px", borderRadius: "10px",
                    background: runResult.status === "PASS" ? "rgba(16,185,129,0.08)" : runResult.status === "PARTIAL" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${runResult.status === "PASS" ? "rgba(16,185,129,0.25)" : runResult.status === "PARTIAL" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {runResult.status === "PASS" ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color={runResult.status === "PARTIAL" ? "#f59e0b" : "#ef4444"} />}
                        <div>
                            <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)" }}>{runResult.flowName} — <StatusPill status={runResult.status} /></div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>{runResult.message}</div>
                        </div>
                    </div>
                    <button onClick={() => setRunResult(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Flows Grid */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><LoadingSpinner size={32} /></div>
            ) : flows.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "80px 20px", color: "var(--text-muted)" }}>
                    <Library size={32} style={{ opacity: 0.3 }} />
                    <div>
                        <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-secondary)" }}>No flows yet</div>
                        <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Use <strong>AI Convert</strong> or the <strong>AI Flow Tester</strong> to create your first flow.</div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
                    {flows.map(flow => (
                        <div key={flow._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                            {/* Header */}
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{flow.name}</h3>
                                        {flow.sourceType && (
                                            <span style={{ fontSize: "0.62rem", fontWeight: "700", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", background: flow.sourceType === "generated" ? "rgba(139,92,246,0.15)" : "rgba(6,182,212,0.15)", color: flow.sourceType === "generated" ? "#8b5cf6" : "#06b6d4" }}>
                                                {flow.sourceType}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        <Globe size={10} style={{ display: "inline", marginRight: "4px" }} />
                                        {flow.targetUrl}
                                    </p>
                                </div>
                                <span style={{ fontSize: "0.7rem", background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "3px 8px", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0, fontWeight: "700" }}>
                                    {flow.steps.length} steps
                                </span>
                            </div>

                            {/* Requirement (if any) */}
                            {flow.requirement && (
                                <div style={{ padding: "8px 20px", background: "rgba(139,92,246,0.03)", borderBottom: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    <span style={{ fontWeight: "600", color: "#8b5cf6", marginRight: "6px" }}>Requirement:</span>
                                    {flow.requirement.length > 100 ? flow.requirement.slice(0, 100) + "…" : flow.requirement}
                                </div>
                            )}

                            {/* Steps preview */}
                            <div style={{ padding: "10px 20px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "110px", overflowY: "auto" }}>
                                {flow.steps.slice(0, 4).map((step, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                        <span style={{ color: "var(--text-muted)", minWidth: "18px", textAlign: "right" }}>{step.step}.</span>
                                        <ActionBadge action={step.action} />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {step.label || step.selector || step.url || step.value || ""}
                                        </span>
                                    </div>
                                ))}
                                {flow.steps.length > 4 && (
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", paddingLeft: "26px" }}>+{flow.steps.length - 4} more steps</div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={10} /> {formatDate(flow.createdAt)}
                                </span>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <button className="btn-secondary" style={{ height: "32px", padding: "0 10px", fontSize: "0.78rem" }} title="View steps" onClick={() => setDetailFlow(flow)}>
                                        <Eye size={13} /> View
                                    </button>
                                    <button
                                        className="btn-primary"
                                        style={{ height: "32px", padding: "0 12px", fontSize: "0.78rem", background: runningId === flow._id ? "var(--bg-secondary)" : "#059669" }}
                                        onClick={() => handleRun(flow)}
                                        disabled={runningId !== null}
                                    >
                                        {runningId === flow._id ? <LoadingSpinner size={13} /> : <Play size={13} fill="white" />}
                                        {runningId === flow._id ? "Running…" : "Run"}
                                    </button>
                                    <button className="btn-secondary" style={{ height: "32px", padding: "0 10px", color: "#ef4444" }} title="Delete" onClick={() => handleDelete(flow._id)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── AI Convert Modal ── */}
            {showConvert && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                    onClick={() => setShowConvert(false)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "560px", padding: "28px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <Wand2 size={18} color="#8b5cf6" />
                                <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>AI Convert Test Case to Flow</h2>
                            </div>
                            <button onClick={() => setShowConvert(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Flow Name (optional)</label>
                                <input type="text" className="input-field" placeholder="e.g. Login Flow" value={convertName} onChange={e => setConvertName(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Target URL *</label>
                                <input type="url" className="input-field" placeholder="https://example.com" value={convertUrl} onChange={e => setConvertUrl(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Requirement / Description (optional)</label>
                                <input type="text" className="input-field" placeholder="e.g. Verify login works with valid credentials" value={convertReq} onChange={e => setConvertReq(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Test Steps *</label>
                                <textarea
                                    className="input-field"
                                    rows={6}
                                    style={{ resize: "vertical", fontFamily: "inherit" }}
                                    placeholder={"1. Open login page\n2. Enter email admin@test.com\n3. Enter password Pass@123\n4. Click login button\n5. Verify dashboard loads"}
                                    value={convertText}
                                    onChange={e => setConvertText(e.target.value)}
                                />
                            </div>

                            {convertError && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.82rem", color: "#ef4444" }}>
                                    <AlertCircle size={14} /> {convertError}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowConvert(false)}>Cancel</button>
                                <button className="btn-primary" style={{ flex: 1, background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }} onClick={handleConvert} disabled={convertLoading}>
                                    {convertLoading ? <LoadingSpinner size={14} /> : <Wand2 size={14} />}
                                    {convertLoading ? "Converting with AI…" : "Convert & Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Flow Detail Modal ── */}
            {detailFlow && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                    onClick={() => setDetailFlow(null)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "540px", padding: "0", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{detailFlow.name}</h2>
                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0" }}>{detailFlow.targetUrl}</p>
                            </div>
                            <button onClick={() => setDetailFlow(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "6px", maxHeight: "60vh", overflowY: "auto" }}>
                            {detailFlow.steps.map((step, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: "20px", marginTop: "2px" }}>{step.step}.</span>
                                    <ActionBadge action={step.action} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "0.82rem", fontWeight: "500", color: "var(--text-primary)" }}>{step.label || `${step.action} ${step.selector || step.url || ""}`}</div>
                                        {(step.selector || step.url || step.value) && (
                                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {step.url || step.selector || step.value}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setDetailFlow(null)}>Close</button>
                            <button className="btn-primary" style={{ flex: 1, background: "#059669" }} onClick={() => { setDetailFlow(null); handleRun(detailFlow); }} disabled={runningId !== null}>
                                {runningId === detailFlow._id ? <LoadingSpinner size={14} /> : <Play size={14} fill="white" />}
                                Run Flow
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
