"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    Repeat, Play, Square, Save, Trash2, Globe, MousePointer2, Type,
    AlertCircle, CheckCircle2, XCircle, Clock, Library, Wand2, RotateCcw,
    Zap, Terminal, Wifi, Eye, X, ChevronDown, ChevronUp, AlertTriangle,
    Bot, Activity, History, BookOpen, PlayCircle, ListChecks, ShieldCheck,
    Check, Monitor
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface FlowStep {
    step: number; action: string; label?: string;
    selector?: string; value?: string; url?: string;
}
interface TestFlow {
    _id: string; name: string; targetUrl: string; steps: FlowStep[];
    sourceType?: string; requirement?: string; description?: string;
    createdBy?: string; createdAt: string;
}
interface StepResult {
    step: number; label: string; action: string;
    status: "PASS" | "FAIL" | "SKIP"; durationMs: number; error?: string;
}
interface FlowRun {
    _id: string; flowId: string; flowName: string;
    overallStatus: "PASS" | "FAIL" | "PARTIAL";
    totalDurationMs: number; failedStep?: string;
    consoleLogs: string[]; networkFailures: string[];
    stepResults: StepResult[]; screenshot?: string;
    aiAnalysis?: string; createdAt: string;
}

type Tab = "flows" | "recorder" | "results" | "failures";

const ACTION_MAP: Record<string, { color: string; icon: any }> = {
    navigate: { color: "#3b82f6", icon: Globe },
    click: { color: "#8b5cf6", icon: MousePointer2 },
    fill: { color: "#10b981", icon: Type },
    type: { color: "#10b981", icon: Type },
    select: { color: "#f59e0b", icon: ListChecks },
    press: { color: "#06b6d4", icon: Terminal },
    wait: { color: "#64748b", icon: Clock },
    verify: { color: "#f43f5e", icon: ShieldCheck },
};

function ActionBadge({ action }: { action: string }) {
    const config = ACTION_MAP[action] || { color: "#64748b", icon: Activity };
    const Icon = config.icon;
    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.65rem",
            fontWeight: "700",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "6px",
            background: `${config.color}15`,
            color: config.color,
            border: `1px solid ${config.color}30`,
            whiteSpace: "nowrap"
        }}>
            <Icon size={11} strokeWidth={2.5} />
            {action}
        </span>
    );
}

function StepCard({ step, index, compact = false }: { step: FlowStep; index: number; compact?: boolean }) {
    return (
        <div style={{
            padding: compact ? "8px 12px" : "12px 16px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.2s"
        }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", width: "20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{step.step || index + 1}</span>
            <ActionBadge action={step.action} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: compact ? "0.78rem" : "0.85rem",
                    color: "var(--text-secondary)",
                    fontWeight: "500",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    lineHeight: "1.4"
                }}>
                    {step.label || `${step.action} ${step.selector || step.url || ""}`}
                </div>
                {!compact && (step.selector || step.url || step.value) && (
                    <div style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                        marginTop: "4px",
                        opacity: 0.7,
                        overflow: "hidden",
                        wordBreak: "break-all"
                    }}>
                        {step.url || step.selector || step.value}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const m: Record<string, { color: string; bg: string; icon: any }> = {
        PASS: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle2 size={11} /> },
        FAIL: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: <XCircle size={11} /> },
        PARTIAL: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <AlertTriangle size={11} /> },
    };
    const s = m[status] || m.FAIL;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", background: s.bg, color: s.color }}>{s.icon}{status}</span>;
}

export default function TestFlowsPage() {
    const [tab, setTab] = useState<Tab>("flows");
    // ── Flows tab ──
    const [flows, setFlows] = useState<TestFlow[]>([]);
    const [flowsLoading, setFlowsLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [runBanner, setRunBanner] = useState<{ flowName: string; status: string; msg: string; consoleLogs?: string[]; networkFailures?: string[] } | null>(null);
    const [detailFlow, setDetailFlow] = useState<TestFlow | null>(null);
    const [convLoading, setConvLoading] = useState(false); const [convError, setConvError] = useState<string | null>(null);
    // ── Recorder state ──
    const [showNewTest, setShowNewTest] = useState(false);
    const [recordUrl, setRecordUrl] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [recordSteps, setRecordSteps] = useState<FlowStep[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [recLoading, setRecLoading] = useState(false);
    const [recError, setRecError] = useState<string | null>(null);
    const [flowName, setFlowName] = useState("");
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
    const [liveRunActive, setLiveRunActive] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
    const [liveSteps, setLiveSteps] = useState<FlowStep[]>([]);
    const [liveResults, setLiveResults] = useState<any[]>([]);
    const [liveRunStatus, setLiveRunStatus] = useState<string>("RUNNING");
    const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRecording || liveRunActive) {
            document.body.classList.add("recording-mode");
        } else {
            document.body.classList.remove("recording-mode");
        }
        return () => document.body.classList.remove("recording-mode");
    }, [isRecording, liveRunActive]);

    const handleRemoteInteraction = async (e: React.MouseEvent<HTMLImageElement> | React.KeyboardEvent<HTMLImageElement>, type: "click" | "type" | "press") => {
        const sid = isRecording ? sessionId : liveRunActive ? liveSessionId : null;
        if (!sid) return;
        
        // Prevent manual interference during automated playback
        if (!isRecording) return;

        let payload: any = { type };

        if (type === "click") {
            const ev = e as React.MouseEvent<HTMLImageElement>;
            const rect = ev.currentTarget.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const y = ev.clientY - rect.top;
            
            payload.x = x;
            payload.y = y;
            payload.width = rect.width;
            payload.height = rect.height;

            // Add instant visual feedback (ripple)
            const id = Date.now();
            setRipples(prev => [...prev, { x, y, id }]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
        } else {
            const ev = e as React.KeyboardEvent<HTMLImageElement>;
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
                ev.preventDefault();
            }
            if (ev.key === "Enter" || ev.key === "Backspace" || ev.key === "Tab") {
                payload.type = "press";
                payload.key = ev.key;
            } else if (ev.key.length === 1) {
                payload.text = ev.key;
            } else {
                payload.type = "press";
                payload.key = ev.key;
            }
        }

        try {
            const res = await fetch(`/api/flows/session/${sid}/interact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            // Optimistically update screenshot if returned from API for instant feedback
            if (res.ok && data.screenshot) {
                setScreenshot(data.screenshot);
            }
        } catch (_) {}
    };
    // ── Results tab ──
    const [runs, setRuns] = useState<FlowRun[]>([]);
    const [runsLoading, setRunsLoading] = useState(false);
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
    const [detailRun, setDetailRun] = useState<FlowRun | null>(null);
    // ── Failures tab ──
    const [failRuns, setFailRuns] = useState<FlowRun[]>([]);
    const [failLoading, setFailLoading] = useState(false);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [analyses, setAnalyses] = useState<Record<string, string>>({});

    const fetchFlows = useCallback(async () => {
        setFlowsLoading(true);
        try { const r = await fetch("/api/flows"); const d = await r.json(); if (r.ok) setFlows(d.flows || []); }
        finally { setFlowsLoading(false); }
    }, []);

    const fetchRuns = useCallback(async () => {
        setRunsLoading(true);
        try { const r = await fetch("/api/runs"); const d = await r.json(); if (r.ok) setRuns(d.runs || []); }
        finally { setRunsLoading(false); }
    }, []);

    const fetchFails = useCallback(async () => {
        setFailLoading(true);
        try {
            const r = await fetch("/api/runs"); const d = await r.json();
            if (r.ok) {
                const failed = (d.runs || []).filter((x: FlowRun) => x.overallStatus !== "PASS");
                setFailRuns(failed);
                // Pre-load stored analyses
                const stored: Record<string, string> = {};
                failed.forEach((x: FlowRun) => { if (x.aiAnalysis) stored[x._id] = x.aiAnalysis; });
                setAnalyses(a => ({ ...a, ...stored }));
            }
        } finally { setFailLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === "flows") fetchFlows();
        else if (tab === "results") fetchRuns();
        else if (tab === "failures") fetchFails();
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [tab]);

    // ── Run flow ──
    async function handleRun(flow: TestFlow) {
        setRunningId(flow._id); 
        try {
            const r = await fetch(`/api/automated-tests/run/${flow._id}`, { method: "POST" });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Run failed");

            setLiveSessionId(d.sessionId);
            setLiveSteps(flow.steps);
            setLiveResults([]);
            setLiveRunStatus("RUNNING");
            setLiveScreenshot(null);
            setLiveRunActive(true);

            pollingRef.current = setInterval(async () => {
                const pr = await fetch(`/api/flows/session/${d.sessionId}`);
                if (pr.ok) {
                    const pd = await pr.json();
                    setLiveResults(pd.stepResults || []);
                    setLiveRunStatus(pd.runStatus || "RUNNING");
                    setLiveScreenshot(pd.latestScreenshot || null);
                    if (pd.runStatus !== "RUNNING") {
                        clearInterval(pollingRef.current!);
                        // Show the PASS/FAIL result briefly, then auto-transition to Executions tab
                        setTimeout(() => {
                            setLiveRunActive(false);
                            setRunBanner({
                                flowName: flow.name,
                                status: pd.runStatus,
                                msg: pd.runStatus === "PASS" ? "Test completed successfully." : "Test failed. See results for details.",
                                consoleLogs: pd.consoleLogs,
                                networkFailures: pd.networkFailures
                            });
                            setRunningId(null);
                            setTab("results");
                            fetchRuns();
                        }, 1500);
                    }
                } else {
                    // Session ended (browser closed) — auto-navigate to results
                    clearInterval(pollingRef.current!);
                    setLiveRunActive(false);
                    setRunningId(null);
                    setTab("results");
                    fetchRuns();
                }
            }, 250);

        } catch (e: any) {
            setRunBanner({ flowName: flow.name, status: "FAIL", msg: e.message });
            setRunningId(null);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this flow?")) return;
        await fetch(`/api/flows/${id}`, { method: "DELETE" });
        setFlows(f => f.filter(x => x._id !== id));
    }

    // ── Recording session ──
    async function handleStartRecording() {
        if (!recordUrl.trim()) return;
        setRecLoading(true); setRecError(null);
        try {
            const r = await fetch("/api/flows/session/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: recordUrl }) });
            const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed to start");
            setShowNewTest(false);
            setSessionId(d.sessionId); setScreenshot(d.screenshot); setIsRecording(true);
            setRecordSteps([{ step: 1, action: "navigate", label: `Navigate to ${recordUrl}`, url: recordUrl }]);
            pollingRef.current = setInterval(async () => {
                const pr = await fetch(`/api/flows/session/${d.sessionId}`);
                if (pr.ok) {
                    const pd = await pr.json();
                    setRecordSteps(pd.steps);
                    setScreenshot(pd.screenshot || pd.latestScreenshot);
                } else {
                    // Browser closed
                    clearInterval(pollingRef.current!);
                    setSessionId(null);
                }
            }, 250);
        } catch (e: any) { setRecError(e.message); }
        finally { setRecLoading(false); }
    }

    async function handleStopRecording() {
        if (!sessionId) return; setRecLoading(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        try {
            const r = await fetch(`/api/flows/session/${sessionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
            const d = await r.json(); if (r.ok) { setRecordSteps(d.steps); setScreenshot(d.screenshot); }
        } finally { setRecLoading(false); setSessionId(null); }
    }

    async function handleSaveRecording() {
        if (!flowName.trim()) { setRecError("Please enter a flow name."); return; }
        const r = await fetch("/api/flows/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: flowName, targetUrl: recordUrl, steps: recordSteps, sourceType: "recorded" }) });
        if (r.ok) { setIsRecording(false); setRecordSteps([]); setFlowName(""); setScreenshot(null); setSessionId(null); setTab("flows"); fetchFlows(); }
        else { const d = await r.json(); setRecError(d.error || "Save failed"); }
    }

    async function handleStopLiveRun() {
        if (!liveSessionId) return;
        if (pollingRef.current) clearInterval(pollingRef.current);
        try {
            await fetch(`/api/flows/session/${liveSessionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
        } catch (e) { }
        setLiveRunActive(false);
        setLiveSessionId(null);
        fetchRuns();
    }

    // ── AI Analyze ──
    async function handleAnalyze(runId: string) {
        setAnalyzingId(runId);
        try {
            const r = await fetch("/api/automated-tests/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) });
            const d = await r.json(); if (!r.ok) throw new Error(d.error || "Analysis failed");
            setAnalyses(a => ({ ...a, [runId]: d.analysis }));
        } catch (e: any) { setAnalyses(a => ({ ...a, [runId]: `Error: ${e.message}` })); }
        finally { setAnalyzingId(null); }
    }

    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

    const TABS = [
        { id: "flows" as Tab, label: "Tests", icon: BookOpen },
        { id: "results" as Tab, label: "Executions", icon: History },
        { id: "failures" as Tab, label: "Root Cause Analysis (RCA)", icon: AlertTriangle },
    ] as const;

    if (isRecording) {
        return (
            <div className="immersive-overlay">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", flexShrink: 0, background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
                    <div>
                        <h1 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}><Globe size={18} color="#06b6d4" /> Recording: {recordUrl}</h1>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                        <div style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1 }}>
                            <div style={{ padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} /> Recording Active
                                </span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{recordSteps.length} steps captured</span>
                            </div>
                            <div style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                {/* Loading spinner removed from overlay to prevent click blocking */}
                                {screenshot ? (
                                    <>
                                        <img 
                                            src={`data:image/png;base64,${screenshot}`} 
                                            alt="Browser preview" 
                                            style={{ width: "100%", height: "100%", objectFit: "fill", cursor: "auto", outline: "none", display: "block" }} 
                                            tabIndex={0}
                                            onClick={(e) => handleRemoteInteraction(e, "click")}
                                            onKeyDown={(e) => handleRemoteInteraction(e, "type")}
                                        />
                                        {/* Click Ripples */}
                                        {ripples.map(r => (
                                            <div key={r.id} style={{
                                                position: "absolute",
                                                left: r.x,
                                                top: r.y,
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                background: "rgba(59, 130, 246, 0.4)",
                                                border: "2px solid rgba(59, 130, 246, 0.8)",
                                                transform: "translate(-50%, -50%)",
                                                pointerEvents: "none",
                                                animation: "ripple-out 0.6s ease-out forwards"
                                            }} />
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                        <LoadingSpinner size={32} />
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Initializing remote browser...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: "12px 20px", flexShrink: 0, background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
                            <div style={{ fontSize: "0.78rem", color: "#10b981", display: "flex", alignItems: "center", gap: "7px" }}>
                                <Zap size={14} />
                                {sessionId ? "Remote Session Connected — Click and type directly on the preview to record steps." : "Session ended. Save your recording below."}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ padding: "12px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "rgba(10,14,26,0.5)", borderLeft: "1px solid var(--border)" }}>
                        {sessionId ? (
                            <button className="btn-primary" style={{ width: "100%", background: "#ef4444", marginBottom: "16px", flexShrink: 0 }} onClick={handleStopRecording} disabled={recLoading}>
                                <Square size={13} fill="white" /> Stop Recording
                            </button>
                        ) : (
                            <div style={{ flexShrink: 0, marginBottom: "16px" }}>
                                <input type="text" className="input-field" placeholder="Test Flow Name (required)" value={flowName} onChange={e => { setFlowName(e.target.value); setRecError(null); }} style={{ marginBottom: "10px" }} />
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button className="btn-primary" style={{ flex: 1, background: "#059669" }} onClick={handleSaveRecording} disabled={!recordSteps.length || recLoading}><Save size={13} /> Save</button>
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setIsRecording(false); setRecordSteps([]); setScreenshot(null); setFlowName(""); }}>Discard</button>
                                </div>
                            </div>
                        )}
                        {recError && <div style={{ fontSize: "0.78rem", color: "#ef4444", marginBottom: "12px", flexShrink: 0 }}>{recError}</div>}
                        <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "12px", flexShrink: 0 }}>Recorded Steps ({recordSteps.length})</div>
                        <div className="no-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                            {recordSteps.map((s, i) => (
                                <StepCard key={i} step={s} index={i} compact />
                            ))}
                            {recordSteps.length === 0 && <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}>No steps recorded yet.</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Live Run Dashboard Overlay ──
    if (liveRunActive) {
        return (
            <div className="immersive-overlay">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", flexShrink: 0, background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
                    <div>
                        <h1 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Live Execution: {liveRunActive && liveSteps[liveResults.length]?.label || "Processing..."}</h1>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "2px 0 0" }}>ID: {liveSessionId} · {liveResults.length}/{liveSteps.length} complete</p>
                    </div>
                    {liveRunStatus !== "RUNNING" ? (
                        <button className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => { setLiveRunActive(false); setRunBanner(null); setTab("results"); fetchRuns(); }}>Close Results</button>
                    ) : (
                        <button className="btn-secondary" style={{ opacity: 0.8, padding: "6px 14px", fontSize: "0.8rem" }} onClick={handleStopLiveRun}><X size={14} /> Stop</button>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", flex: 1, overflow: "hidden" }}>
                    {/* Left: Stream */}
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0, flex: 1 }}>
                        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}><Monitor size={14} /> Live Browser Stream</div>
                            <div style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: "600" }}>{liveRunStatus === "RUNNING" ? "CONNECTED" : "DISCONNECTED"}</div>
                        </div>
                        <div style={{ flex: 1, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {liveScreenshot ? (
                                <img src={`data:image/png;base64,${liveScreenshot}`} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
                                    <LoadingSpinner size={32} />
                                    <span style={{ fontSize: "0.85rem" }}>Waiting for browser stream...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Steps */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
                        <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Execution Progress</div>
                            <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {liveSteps.map((step, idx) => {
                                        const result = liveResults.find(r => r.step === step.step);
                                        const isCurrent = liveRunStatus === "RUNNING" && liveResults.length === idx;
                                        return (
                                            <div key={idx} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: result?.status === "PASS" ? "6px 14px" : "10px 14px",
                                                borderRadius: "10px",
                                                background: isCurrent ? "rgba(139,92,246,0.08)" : result ? (result.status === "PASS" ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)") : "rgba(255,255,255,0.02)",
                                                border: isCurrent ? "1px solid rgba(139,92,246,0.2)" : "1px solid var(--border)",
                                                opacity: result?.status === "PASS" ? 0.65 : 1,
                                                transform: result?.status === "PASS" ? "scale(0.98)" : "scale(1)",
                                                transition: "all 0.3s ease"
                                            }}>
                                                <div style={{ width: "24px", height: "24px", minWidth: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "700", background: result ? (result.status === "PASS" ? "#10b981" : "#ef4444") : isCurrent ? "#8b5cf6" : "rgba(255,255,255,0.1)", color: "white", flexShrink: 0 }}>
                                                    {result ? (result.status === "PASS" ? <Check size={14} /> : <X size={14} />) : step.step}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)", wordBreak: "break-word", lineHeight: "1.4" }}>{step.label || step.action}</div>
                                                    {result?.error && <div style={{ fontSize: "0.7rem", color: "#f87171", marginTop: "2px", wordBreak: "break-word" }}>{result.error}</div>}
                                                </div>
                                                {result?.durationMs && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{(result.durationMs / 1000).toFixed(1)}s</div>}
                                                {isCurrent && <LoadingSpinner size={12} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Summary Card and Completion Modal */}
                        {liveRunStatus !== "RUNNING" && (
                            <div className="animate-slide-up" style={{ marginTop: "12px" }}>
                                {liveRunStatus === "PASS" ? (
                                    <div style={{ background: "rgba(240, 246, 255, 1)", borderRadius: "10px", padding: "16px", display: "flex", alignItems: "center", gap: "14px", position: "relative", border: "1px solid rgba(219, 234, 254, 1)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.05)" }}>
                                            <div style={{ fontSize: "20px" }}>👌</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "800", fontSize: "0.95rem", color: "#1e293b", letterSpacing: "0.05em", marginBottom: "2px" }}>TEST COMPLETED SUCCESSFULLY</div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Auto-redirecting to results in 1.5s...</div>
                                        </div>
                                        <button 
                                            onClick={() => { setLiveRunActive(false); setRunBanner(null); }} 
                                            style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="glass-card" style={{ padding: "16px", background: "rgba(239,68,68,0.1)", border: "1px solid #ef444444" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>Execution Failed</div>
                                                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Test completed with {liveResults.filter(r => r.status === "PASS").length} passed steps.</div>
                                                <div style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: "600", marginTop: "4px" }}>Auto-redirecting to results in 1.5s...</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg,#10b981,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <PlayCircle size={20} color="white" />
                        </div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Automated Tests</h1>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Record, manage, and run automated browser tests — with AI Root Cause Analysis.</p>
                </div>
                <button className="btn-primary" style={{ background: "#06b6d4", padding: "0 20px", height: "42px" }} onClick={() => setShowNewTest(true)}>
                    <Repeat size={15} fill="white" /> New Test
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "28px", overflowX: "auto" }}>
                {TABS.map(({ id, label, icon: Icon }) => {
                    const active = tab === id;
                    return (
                        <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", background: active ? "rgba(139,92,246,0.12)" : "transparent", color: active ? "#8b5cf6" : "var(--text-muted)", fontWeight: "600", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                            <Icon size={13} />{label}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════ TAB: FLOWS ══ */}
            {tab === "flows" && (
                <div className="animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "20px" }}>
                        <button className="btn-secondary" onClick={fetchFlows} style={{ height: "38px" }}><RotateCcw size={14} /> Refresh List</button>
                    </div>

                    {runBanner && (
                        <div className="animate-fade-in" style={{ marginBottom: "20px", padding: "16px 20px", borderRadius: "12px", background: runBanner.status === "PASS" ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${runBanner.status === "PASS" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                    {runBanner.status === "PASS" ? <CheckCircle2 size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
                                    <div>
                                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>{runBanner.flowName} — <StatusBadge status={runBanner.status} /></div>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "3px" }}>{runBanner.msg}</div>
                                    </div>
                                </div>
                                <button onClick={() => setRunBanner(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "5px", borderRadius: "6px" }}><X size={15} /></button>
                            </div>

                            {runBanner.status !== "PASS" && (runBanner.consoleLogs?.length || runBanner.networkFailures?.length) && (
                                <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                    <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", minWidth: 0 }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "#f59e0b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Terminal size={10} /> Console Errors</div>
                                        {!runBanner.consoleLogs?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ No logs</div> : runBanner.consoleLogs.slice(0, 3).map((l, i) => <div key={i} style={{ fontSize: "0.68rem", color: "#fbbf24", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>)}
                                    </div>
                                    <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", minWidth: 0 }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "#f87171", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}><Wifi size={10} /> Network Failures</div>
                                        {!runBanner.networkFailures?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ No issues</div> : runBanner.networkFailures.slice(0, 3).map((n, i) => <div key={i} style={{ fontSize: "0.68rem", color: "#f87171", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {flowsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><LoadingSpinner size={32} /></div>
                        : flows.length === 0 ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", padding: "80px 20px", color: "var(--text-muted)", textAlign: "center" }}>
                                <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <PlayCircle size={32} style={{ opacity: 0.3 }} />
                                </div>
                                <div><div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "1.1rem", marginBottom: "4px" }}>No automated tests yet</div><div style={{ fontSize: "0.88rem" }}>Use the <strong>New Test</strong> button to record your first automated flow.</div></div>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
                                {flows.map(flow => (
                                    <div key={flow._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                                        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                                                    <h3 style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{flow.name}</h3>
                                                    {flow.sourceType && <span style={{ fontSize: "0.6rem", fontWeight: "700", textTransform: "uppercase", padding: "2px 6px", borderRadius: "3px", background: flow.sourceType === "generated" ? "rgba(139,92,246,0.12)" : "rgba(6,182,212,0.12)", color: flow.sourceType === "generated" ? "#8b5cf6" : "#06b6d4" }}>{flow.sourceType}</span>}
                                                </div>
                                                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Globe size={10} style={{ display: "inline", marginRight: "3px" }} />{flow.targetUrl}</p>
                                                {flow.createdBy && <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "2px 0 0" }}>by {flow.createdBy} · {fmtDate(flow.createdAt)}</p>}
                                            </div>
                                            <span style={{ fontSize: "0.68rem", fontWeight: "700", background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "2px 7px", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0 }}>{flow.steps.length} steps</span>
                                        </div>
                                        {flow.requirement && <div style={{ padding: "7px 18px", background: "rgba(139,92,246,0.03)", borderBottom: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--text-muted)" }}><span style={{ fontWeight: "600", color: "#8b5cf6", marginRight: "5px" }}>Req:</span>{flow.requirement.length > 80 ? flow.requirement.slice(0, 80) + "…" : flow.requirement}</div>}
                                        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto", background: "rgba(255,255,255,0.01)" }}>
                                            {flow.steps.slice(0, 3).map((s, i) => (
                                                <StepCard key={i} step={s} index={i} compact />
                                            ))}
                                            {flow.steps.length > 3 && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "4px", fontWeight: "600" }}>+{flow.steps.length - 3} more steps…</div>}
                                        </div>
                                        <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: "6px" }}>
                                            <button className="btn-secondary" style={{ height: "30px", padding: "0 10px", fontSize: "0.76rem" }} onClick={() => setDetailFlow(flow)}><Eye size={12} /> View</button>
                                            <button className="btn-primary" style={{ flex: 1, height: "30px", fontSize: "0.76rem", background: runningId === flow._id ? "var(--bg-secondary)" : "#059669" }} onClick={() => handleRun(flow)} disabled={runningId !== null}>
                                                {runningId === flow._id ? <LoadingSpinner size={12} /> : <Play size={12} fill="white" />}
                                                {runningId === flow._id ? "Running…" : "Run"}
                                            </button>
                                            <button className="btn-secondary" style={{ height: "30px", padding: "0 10px", color: "#ef4444" }} onClick={() => handleDelete(flow._id)}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            )}

            {/* Removed embedded recorder tab, replaced by full-screen conditional above */}

            {/* ═══════════════════════════════════════════════════ TAB: RESULTS ══ */}
            {tab === "results" && (
                <div className="animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                        <button className="btn-secondary" onClick={fetchRuns} style={{ height: "36px" }}><RotateCcw size={13} /> Refresh</button>
                    </div>
                    {runs.length > 0 && (
                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                            {[{ label: "Total", value: runs.length, color: "#64748b" }, { label: "Passed", value: runs.filter(r => r.overallStatus === "PASS").length, color: "#10b981" }, { label: "Failed", value: runs.filter(r => r.overallStatus === "FAIL").length, color: "#ef4444" }, { label: "Partial", value: runs.filter(r => r.overallStatus === "PARTIAL").length, color: "#f59e0b" }].map(({ label, value, color }) => (
                                <div key={label} className="glass-card" style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "120px" }}>
                                    <div style={{ fontSize: "1.4rem", fontWeight: "800", color }}>{value}</div>
                                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: "600" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {runsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><LoadingSpinner size={32} /></div>
                        : runs.length === 0 ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", padding: "80px", color: "var(--text-muted)" }}>
                                <History size={32} style={{ opacity: 0.3 }} />
                                <div><div style={{ fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>No runs yet</div><div style={{ fontSize: "0.82rem" }}>Run a flow from the <strong>Test Flows</strong> tab.</div></div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {runs.map(run => (
                                    <div key={run._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                                        <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", cursor: "pointer" }} onClick={() => setExpandedRunId(expandedRunId === run._id ? null : run._id)}>
                                            <StatusBadge status={run.overallStatus} />
                                            <div style={{ flex: 1, minWidth: "160px" }}>
                                                <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)" }}>{run.flowName}</div>
                                                {run.failedStep && <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "1px" }}>Failed at: {run.failedStep}</div>}
                                            </div>
                                            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={11} />{(run.totalDurationMs / 1000).toFixed(1)}s</span>
                                            {run.consoleLogs?.length > 0 && <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "3px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: "700" }}>{run.consoleLogs.length} console</span>}
                                            {run.networkFailures?.length > 0 && <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "3px", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: "700" }}>{run.networkFailures.length} network</span>}
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtDateTime(run.createdAt)}</span>
                                            <button className="btn-secondary" style={{ height: "26px", padding: "0 9px", fontSize: "0.72rem" }} onClick={e => { e.stopPropagation(); setDetailRun(run); }}><Eye size={11} /> Detail</button>
                                            {expandedRunId === run._id ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                                        </div>
                                        {expandedRunId === run._id && (
                                            <div style={{ padding: "0 18px 14px", borderTop: "1px solid var(--border)" }}>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                                                    {[{ label: "Console Errors", items: run.consoleLogs, color: "#f59e0b" }, { label: "Network Failures", items: run.networkFailures, color: "#f87171" }].map(({ label, items, color }) => (
                                                        <div key={label} style={{ padding: "10px", borderRadius: "7px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                                                            <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color, marginBottom: "7px" }}>{label} ({items?.length ?? 0})</div>
                                                            {!items?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ None</div> :
                                                                items.slice(0, 3).map((x, i) => <div key={i} style={{ fontSize: "0.7rem", color, fontFamily: "monospace", wordBreak: "break-word", paddingBottom: "3px" }}>{x}</div>)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            )}

            {/* ══════════════════════════════════════════════ TAB: FAILURE LOGS ══ */}
            {tab === "failures" && (
                <div className="animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                        <button className="btn-secondary" onClick={fetchFails} style={{ height: "36px" }}><RotateCcw size={13} /> Refresh</button>
                    </div>
                    {failLoading ? <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><LoadingSpinner size={32} /></div>
                        : failRuns.length === 0 ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", padding: "80px", color: "var(--text-muted)" }}>
                                <CheckCircle2 size={32} style={{ opacity: 0.3 }} />
                                <div><div style={{ fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>No failures!</div><div style={{ fontSize: "0.82rem" }}>All recorded runs have passed.</div></div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {failRuns.map(run => (
                                    <div key={run._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                                        {/* Run header */}
                                        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <StatusBadge status={run.overallStatus} />
                                                <div>
                                                    <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)" }}>{run.flowName}</div>
                                                    {run.failedStep && <div style={{ fontSize: "0.72rem", color: "#f87171" }}>Failed at: "{run.failedStep}"</div>}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={11} />{(run.totalDurationMs / 1000).toFixed(1)}s</span>
                                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{fmtDateTime(run.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Debug info */}
                                        <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                            <div style={{ padding: "10px 12px", borderRadius: "7px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                                                <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "#f59e0b", marginBottom: "7px", display: "flex", alignItems: "center", gap: "4px" }}><Terminal size={10} /> Console ({run.consoleLogs?.length ?? 0})</div>
                                                {!run.consoleLogs?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ None</div> : run.consoleLogs.slice(0, 4).map((l, i) => <div key={i} style={{ fontSize: "0.69rem", color: "#fbbf24", fontFamily: "monospace", wordBreak: "break-word", paddingBottom: "3px", borderBottom: "1px solid rgba(245,158,11,0.07)" }}>{l}</div>)}
                                            </div>
                                            <div style={{ padding: "10px 12px", borderRadius: "7px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                                <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "#f87171", marginBottom: "7px", display: "flex", alignItems: "center", gap: "4px" }}><Wifi size={10} /> Network ({run.networkFailures?.length ?? 0})</div>
                                                {!run.networkFailures?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ None</div> : run.networkFailures.slice(0, 4).map((n, i) => <div key={i} style={{ fontSize: "0.69rem", color: "#f87171", fontFamily: "monospace", wordBreak: "break-word", paddingBottom: "3px", borderBottom: "1px solid rgba(239,68,68,0.07)" }}>{n}</div>)}
                                            </div>
                                        </div>

                                        {/* AI Analysis */}
                                        <div style={{ padding: "0 20px 16px" }}>
                                            {analyses[run._id] ? (
                                                <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                                                    <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "#8b5cf6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                                                        <Bot size={12} /> AI Root Cause Analysis
                                                    </div>
                                                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>{analyses[run._id]}</p>
                                                </div>
                                            ) : (
                                                <button className="btn-secondary" style={{ width: "100%", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", color: "#8b5cf6" }} onClick={() => handleAnalyze(run._id)} disabled={analyzingId === run._id}>
                                                    {analyzingId === run._id ? <LoadingSpinner size={13} /> : <Bot size={13} />}
                                                    {analyzingId === run._id ? "Analyzing with AI…" : "Analyze Failure with AI"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Screenshot */}
                                        {run.screenshot && (
                                            <div style={{ padding: "0 20px 16px" }}>
                                                <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "6px" }}>Final Screenshot</div>
                                                <img src={`data:image/png;base64,${run.screenshot}`} alt="Failure screenshot" style={{ width: "100%", borderRadius: "7px", border: "1px solid var(--border)" }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ MODALS ══════ */}



            {/* Flow Detail Modal */}
            {detailFlow && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDetailFlow(null)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "600px", padding: "0", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "24px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                    <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detailFlow.name}</h2>
                                    <span style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", background: "rgba(16,182,212,0.1)", color: "#06b6d4", padding: "2px 8px", borderRadius: "4px", flexShrink: 0, whiteSpace: "nowrap" }}>{detailFlow.steps.length} Steps</span>
                                </div>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}><Globe size={13} /> {detailFlow.targetUrl}</p>
                            </div>
                            <button onClick={() => setDetailFlow(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "8px", borderRadius: "8px" }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto", background: "var(--bg-primary)" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "4px" }}>Test Execution Steps</div>
                            {detailFlow.steps.map((s, i) => (
                                <StepCard key={i} step={s} index={i} />
                            ))}
                        </div>
                        <div style={{ padding: "16px 24px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
                            <button className="btn-secondary" style={{ flex: 1, height: "44px", fontWeight: "600" }} onClick={() => setDetailFlow(null)}>Close View</button>
                            <button className="btn-primary" style={{ flex: 1, height: "44px", background: "#10b981", fontWeight: "600" }} onClick={() => { handleRun(detailFlow); setDetailFlow(null); }} disabled={runningId !== null}>
                                <Play size={16} fill="white" /> Run Test Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Detail Modal */}
            {detailRun && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setDetailRun(null)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "680px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <h2 style={{ fontSize: "0.98rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detailRun.flowName}</h2>
                                <StatusBadge status={detailRun.overallStatus} />
                                <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}><Clock size={11} />{(detailRun.totalDurationMs / 1000).toFixed(2)}s</span>
                            </div>
                            <button onClick={() => setDetailRun(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.08em" }}>Step Results</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                    {detailRun.stepResults?.map((s, i) => (
                                        <div key={i} style={{ padding: "9px 13px", borderRadius: "7px", border: `1px solid ${s.status === "PASS" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`, background: s.status === "PASS" ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                                                {s.status === "PASS" ? <CheckCircle2 size={13} color="#10b981" /> : <XCircle size={13} color="#ef4444" />}
                                                <span style={{ fontSize: "0.82rem", fontWeight: "500", color: "var(--text-primary)" }}>{s.label || `Step ${s.step}`}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}><Clock size={10} />{s.durationMs}ms</span>
                                                <StatusBadge status={s.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                {[{ label: "Console Errors", items: detailRun.consoleLogs, color: "#f59e0b" }, { label: "Network Failures", items: detailRun.networkFailures, color: "#f87171" }].map(({ label, items, color }) => (
                                    <div key={label} style={{ padding: "12px", borderRadius: "7px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color, marginBottom: "7px" }}>{label} ({items?.length ?? 0})</div>
                                        {!items?.length ? <div style={{ fontSize: "0.74rem", color: "#10b981" }}>✓ None</div> : items.map((x, i) => <div key={i} style={{ fontSize: "0.7rem", color, fontFamily: "monospace", wordBreak: "break-word", paddingBottom: "3px" }}>{x}</div>)}
                                    </div>
                                ))}
                            </div>
                            {detailRun.screenshot && <img src={`data:image/png;base64,${detailRun.screenshot}`} alt="Final state" style={{ width: "100%", borderRadius: "7px", border: "1px solid var(--border)" }} />}
                        </div>
                    </div>
                </div>
            )}
            {/* New Test Modal (Popup) */}
            {showNewTest && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowNewTest(false)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "460px", padding: "26px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <Globe size={24} color="#06b6d4" />
                        </div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Setup New Test</h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>Enter the starting URL for your test. A headless browser will open, allowing you to record your actions.</p>

                        <div style={{ textAlign: "left", marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>Starting URL</label>
                            <input type="url" autoFocus className="input-field" placeholder="https://example.com" value={recordUrl} onChange={e => setRecordUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleStartRecording()} />
                            {recError && <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}><AlertCircle size={12} />{recError}</div>}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowNewTest(false)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, background: "#06b6d4" }} onClick={handleStartRecording} disabled={!recordUrl.trim() || recLoading}>
                                {recLoading ? <LoadingSpinner size={13} /> : <Play size={13} fill="white" />} {recLoading ? "Starting…" : "Create Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
