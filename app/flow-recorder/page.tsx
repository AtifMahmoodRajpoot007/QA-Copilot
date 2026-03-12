"use client";

import { useState, useEffect, useRef } from "react";
import {
    Repeat,
    Play,
    Square,
    Save,
    Trash2,
    Plus,
    Globe,
    MousePointer2,
    Type,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Library,
    Wand2,
    RotateCcw,
    Zap,
    Terminal,
    Wifi,
    Edit3,
    Eye,
    X,
    ChevronDown,
    ChevronUp,
    Shield,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { TestFlow, FlowStep, FlowStepResult } from "@/types";

type Tab = "record" | "convert" | "library" | "results";

const ACTION_ICONS: Record<string, React.ElementType> = {
    navigate: Globe,
    click: MousePointer2,
    fill: Type,
    select: ChevronDown,
    press: ChevronRight,
    wait: Clock,
};

const ACTION_COLORS: Record<string, string> = {
    navigate: "#3b82f6",
    click: "#8b5cf6",
    fill: "#10b981",
    select: "#f59e0b",
    press: "#06b6d4",
    wait: "#64748b",
};

function StepBadge({ action }: { action: string }) {
    const color = ACTION_COLORS[action] || "#64748b";
    return (
        <span style={{
            fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase",
            letterSpacing: "0.05em", padding: "2px 8px", borderRadius: "4px",
            background: `${color}20`, color, border: `1px solid ${color}40`,
            whiteSpace: "nowrap",
        }}>
            {action}
        </span>
    );
}

function StatusBadge({ status }: { status: "PASS" | "FAIL" | "PARTIAL" | "SKIP" }) {
    const map = {
        PASS: { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "PASS" },
        FAIL: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "FAIL" },
        PARTIAL: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "PARTIAL" },
        SKIP: { color: "#64748b", bg: "rgba(100,116,139,0.1)", label: "SKIP" },
    };
    const s = map[status];
    return (
        <span style={{
            fontSize: "0.7rem", fontWeight: "700", padding: "3px 8px",
            borderRadius: "4px", background: s.bg, color: s.color,
        }}>
            {s.label}
        </span>
    );
}

function StepRow({ step, index, onRemove, editable }: {
    step: FlowStep; index: number; onRemove?: () => void; editable?: boolean;
}) {
    const Icon = ACTION_ICONS[step.action] || Globe;
    const color = ACTION_COLORS[step.action] || "#64748b";
    const detail = step.url || step.selector || step.value || "";
    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px",
            background: "rgba(255,255,255,0.03)", borderRadius: "8px",
            border: "1px solid var(--border)", position: "relative",
        }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                <Icon size={13} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)" }}>Step {step.step}</span>
                    <StepBadge action={step.action} />
                    {step.label && <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: "500" }}>{step.label}</span>}
                </div>
                {detail && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {detail}
                    </div>
                )}
            </div>
            {editable && onRemove && (
                <button onClick={onRemove} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

export default function FlowTesterPage() {
    const [activeTab, setActiveTab] = useState<Tab>("record");

    // Record tab (Auto-recording)
    const [recordUrl, setRecordUrl] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [recordSteps, setRecordSteps] = useState<FlowStep[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [recordLoading, setRecordLoading] = useState(false);
    const [recordError, setRecordError] = useState<string | null>(null);
    const [flowName, setFlowName] = useState("");

    // Convert tab
    const [convertText, setConvertText] = useState("");
    const [convertUrl, setConvertUrl] = useState("");
    const [convertedSteps, setConvertedSteps] = useState<FlowStep[]>([]);
    const [convertedName, setConvertedName] = useState("");
    const [convertLoading, setConvertLoading] = useState(false);
    const [convertError, setConvertError] = useState<string | null>(null);
    const [saveConvertLoading, setSaveConvertLoading] = useState(false);

    // Library tab
    const [flows, setFlows] = useState<TestFlow[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [runningFlowId, setRunningFlowId] = useState<string | null>(null);

    // Edit modal
    const [editingFlow, setEditingFlow] = useState<TestFlow | null>(null);
    const [editName, setEditName] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    // Results
    const [runResults, setRunResults] = useState<{
        stepResults: FlowStepResult[];
        consoleLogs: string[];
        networkFailures: string[];
        overallStatus: "PASS" | "FAIL" | "PARTIAL";
        totalDurationMs: number;
        screenshot?: string;
        flowName: string;
    } | null>(null);

    // Polling interval ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeTab === "library") fetchFlows();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [activeTab]);

    async function fetchFlows() {
        setLibraryLoading(true);
        try {
            const res = await fetch("/api/flows");
            const data = await res.json();
            if (res.ok) setFlows(data.flows || []);
        } finally {
            setLibraryLoading(false);
        }
    }

    async function handleStartRecording() {
        if (!recordUrl.trim()) return;
        setRecordLoading(true);
        setRecordError(null);
        try {
            const res = await fetch("/api/flows/session/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: recordUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start");
            
            setSessionId(data.sessionId);
            setScreenshot(data.screenshot);
            setIsRecording(true);
            setRecordSteps([{ step: 1, action: "navigate", label: `Navigate to ${recordUrl}`, url: recordUrl }]);

            // Start polling for updates
            pollingRef.current = setInterval(async () => {
                const pRes = await fetch(`/api/flows/session/${data.sessionId}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    setRecordSteps(pData.steps);
                    setScreenshot(pData.screenshot);
                }
            }, 2000);

        } catch (err: any) {
            setRecordError(err.message);
        } finally {
            setRecordLoading(false);
        }
    }

    async function handleStopRecording() {
        if (!sessionId) return;
        setRecordLoading(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        
        try {
            const res = await fetch(`/api/flows/session/${sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "stop" }),
            });
            const data = await res.json();
            if (res.ok) {
                setRecordSteps(data.steps);
                setScreenshot(data.screenshot);
            }
        } finally {
            setRecordLoading(false);
            setSessionId(null);
        }
    }

    async function handleSaveFlow(steps: FlowStep[], name: string, url: string) {
        if (!name.trim()) { setRecordError("Please enter a flow name"); return; }
        const res = await fetch("/api/flows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, targetUrl: url, steps }),
        });
        if (res.ok) {
            setIsRecording(false); setRecordSteps([]); setFlowName(""); setScreenshot(null);
            setSessionId(null);
            setActiveTab("library");
        } else {
            const d = await res.json();
            setRecordError(d.error || "Save failed");
        }
    }

    async function handleConvert() {
        if (!convertText.trim()) return;
        setConvertLoading(true);
        setConvertError(null);
        setConvertedSteps([]);
        try {
            const res = await fetch("/api/flows/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testSteps: convertText, targetUrl: convertUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConvertedSteps(data.steps);
        } catch (err: any) {
            setConvertError(err.message);
        } finally {
            setConvertLoading(false);
        }
    }

    async function handleSaveConverted() {
        if (!convertedName.trim() || !convertUrl.trim()) {
            setConvertError("Flow name and target URL are required");
            return;
        }
        setSaveConvertLoading(true);
        try {
            const res = await fetch("/api/flows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: convertedName, targetUrl: convertUrl, steps: convertedSteps }),
            });
            if (res.ok) {
                setConvertText(""); setConvertedSteps([]); setConvertedName(""); setConvertUrl("");
                setActiveTab("library");
            } else {
                const d = await res.json();
                setConvertError(d.error || "Save failed");
            }
        } finally {
            setSaveConvertLoading(false);
        }
    }

    async function handleRunFlow(flow: TestFlow) {
        setRunningFlowId(flow._id!);
        setRunResults(null);
        try {
            const res = await fetch("/api/flows/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ steps: flow.steps, targetUrl: flow.targetUrl, flowId: flow._id, flowName: flow.name }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Run failed");
            setRunResults({ ...data, flowName: flow.name });
            setActiveTab("results");
        } catch (err: any) {
            alert("Failed to run flow: " + err.message);
        } finally {
            setRunningFlowId(null);
        }
    }

    async function handleDeleteFlow(id: string) {
        if (!confirm("Delete this flow?")) return;
        await fetch(`/api/flows/${id}`, { method: "DELETE" });
        fetchFlows();
    }

    async function handleSaveEdit() {
        if (!editingFlow) return;
        setEditLoading(true);
        try {
            await fetch(`/api/flows/${editingFlow._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, targetUrl: editUrl }),
            });
            setEditingFlow(null);
            fetchFlows();
        } finally {
            setEditLoading(false);
        }
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: "record", label: "Record", icon: Repeat },
        { id: "convert", label: "AI Convert", icon: Wand2 },
        { id: "library", label: "Flow Library", icon: Library },
        { id: "results", label: "Results", icon: Terminal },
    ];

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #06b6d4, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Repeat size={20} color="white" />
                    </div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                        AI Flow Tester
                    </h1>
                </div>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem", maxWidth: "600px" }}>
                    Record, convert, and replay test flows. Get real-time execution results with console and network diagnostics.
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "28px", flexWrap: "wrap" }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const hasResult = tab.id === "results" && runResults;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                                background: isActive ? "rgba(6,182,212,0.12)" : "transparent",
                                color: isActive ? "#06b6d4" : "var(--text-muted)",
                                fontWeight: "600", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px",
                                transition: "all 0.2s", position: "relative",
                            }}
                        >
                            <Icon size={14} />
                            {tab.label}
                            {hasResult && (
                                <span style={{
                                    width: "7px", height: "7px", borderRadius: "50%",
                                    background: runResults.overallStatus === "PASS" ? "#10b981" : runResults.overallStatus === "PARTIAL" ? "#f59e0b" : "#ef4444",
                                    position: "absolute", top: "6px", right: "6px",
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: RECORD ── */}
            {activeTab === "record" && (
                <div className="animate-fade-in">
                    {!isRecording ? (
                        <div className="glass-card" style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                <Globe size={24} color="#06b6d4" />
                            </div>
                            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Start New Recording</h2>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "28px" }}>Enter the starting URL for your flow. A browser session will be launched to capture your steps.</p>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    type="url" className="input-field" placeholder="https://example.com"
                                    value={recordUrl} onChange={e => setRecordUrl(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleStartRecording()}
                                />
                                <button className="btn-primary" onClick={handleStartRecording} disabled={!recordUrl.trim() || recordLoading} style={{ background: "#06b6d4", whiteSpace: "nowrap" }}>
                                    {recordLoading ? <LoadingSpinner size={16} /> : <Play size={16} fill="white" />}
                                    Start
                                </button>
                            </div>
                            {recordError && (
                                <div className="error-banner animate-fade-in" style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <AlertCircle size={14} /> {recordError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start" }}>
                            {/* Left: Preview + add step */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                {/* Screenshot */}
                                <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                                    <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} /> Recording Active
                                        </span>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{recordSteps.length} step{recordSteps.length !== 1 ? "s" : ""}</span>
                                    </div>
                                    <div style={{ minHeight: "300px", background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {recordLoading && (
                                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <LoadingSpinner size={36} />
                                            </div>
                                        )}
                                        {screenshot ? (
                                            <img src={`data:image/png;base64,${screenshot}`} alt="Page preview" style={{ width: "100%", height: "auto", display: "block" }} />
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Initializing browser preview…</span>
                                        )}
                                    </div>
                                </div>

                                {/* Live Status */}
                                <div className="glass-card" style={{ padding: "20px" }}>
                                    <h3 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sessionId ? "#ef4444" : "#64748b", animation: sessionId ? "pulse 1.5s infinite" : "none" }} /> 
                                        {sessionId ? "Live Browser Connected" : "Connection Lost"}
                                    </h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                        {sessionId 
                                            ? "Interacting with the launched browser window will automatically record your clicks, typing, and navigations here." 
                                            : "Browser session ended. You can still save the recorded steps below."}
                                    </p>
                                    {!sessionId && (
                                        <button className="btn-secondary" style={{ marginTop: "16px", width: "100%" }} onClick={() => { setIsRecording(false); setRecordSteps([]); setScreenshot(null); }}>
                                            <RotateCcw size={14} /> Start Fresh
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right: Steps + Controls */}
                            <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                                <div className="glass-card" style={{ padding: "20px" }}>
                                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                                        {sessionId ? (
                                            <button className="btn-primary" style={{ flex: 1, background: "#ef4444" }} onClick={handleStopRecording} disabled={recordLoading}>
                                                <Square size={14} fill="white" /> Stop Recording
                                            </button>
                                        ) : (
                                            <button className="btn-primary" style={{ flex: 1, background: "#059669" }}
                                                disabled={!recordSteps.length || recordLoading}
                                                onClick={() => {
                                                    if (!flowName.trim()) { setRecordError("Enter a flow name to save"); return; }
                                                    handleSaveFlow(recordSteps, flowName, recordUrl);
                                                }}>
                                                <Save size={14} /> Save Flow
                                            </button>
                                        )}
                                    </div>
                                    {!sessionId && (
                                        <input type="text" className="input-field" placeholder="Flow name (e.g. Login Flow)" value={flowName} onChange={e => { setFlowName(e.target.value); setRecordError(null); }} style={{ marginBottom: "16px" }} />
                                    )}
                                    {recordError && <div style={{ fontSize: "0.8rem", color: "#ef4444", marginBottom: "12px" }}>{recordError}</div>}
                                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                                        Recorded Steps ({recordSteps.length})
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "380px", overflowY: "auto" }}>
                                        {recordSteps.map((step, i) => (
                                            <StepRow key={i} step={step} index={i} editable onRemove={() => setRecordSteps(recordSteps.filter((_, si) => si !== i))} />
                                        ))}
                                        {recordSteps.length === 0 && (
                                            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}>
                                                No steps yet. Add steps above.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: AI CONVERT ── */}
            {activeTab === "convert" && (
                <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
                    {/* Input */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Wand2 size={16} color="#8b5cf6" /> Paste Manual Test Steps
                        </h3>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Target URL</label>
                            <input type="url" className="input-field" placeholder="https://example.com" value={convertUrl} onChange={e => setConvertUrl(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Test Steps (plain text)</label>
                            <AutoResizeTextarea
                                className="input-field"
                                placeholder={`e.g.\nOpen login page\nEnter email admin@test.com\nEnter password Pass@123\nClick the login button\nVerify dashboard loads`}
                                value={convertText}
                                onChange={e => setConvertText(e.target.value)}
                                style={{ minHeight: "180px" }}
                            />
                        </div>
                        <button className="btn-primary" style={{ width: "100%", height: "44px" }} onClick={handleConvert} disabled={!convertText.trim() || convertLoading}>
                            {convertLoading ? <LoadingSpinner size={16} /> : <Wand2 size={16} />}
                            {convertLoading ? "Converting with AI…" : "Convert to Flow"}
                        </button>
                        {convertError && (
                            <div className="error-banner animate-fade-in" style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <AlertCircle size={14} /> {convertError}
                            </div>
                        )}
                    </div>

                    {/* Output */}
                    <div className="glass-card" style={{ padding: "24px" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <ChevronRight size={16} color="#10b981" /> Converted Flow Steps
                        </h3>
                        {convertedSteps.length > 0 ? (
                            <>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px", maxHeight: "320px", overflowY: "auto" }}>
                                    {convertedSteps.map((step: FlowStep, i: number) => <StepRow key={i} step={step} index={i} />)}
                                </div>
                                <div style={{ marginBottom: "12px" }}>
                                    <input type="text" className="input-field" placeholder="Flow name (required to save)" value={convertedName} onChange={e => setConvertedName(e.target.value)} />
                                </div>
                                <button className="btn-primary" style={{ width: "100%", height: "44px", background: "#059669" }} onClick={handleSaveConverted} disabled={!convertedName.trim() || !convertUrl.trim() || saveConvertLoading}>
                                    {saveConvertLoading ? <LoadingSpinner size={16} /> : <Save size={16} />}
                                    Save to Flow Library
                                </button>
                            </>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "240px", color: "var(--text-muted)", gap: "12px" }}>
                                <Wand2 size={28} style={{ opacity: 0.3 }} />
                                <p style={{ fontSize: "0.9rem" }}>Converted steps will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: LIBRARY ── */}
            {activeTab === "library" && (
                <div className="animate-fade-in">
                    {libraryLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><LoadingSpinner size={32} /></div>
                    ) : flows.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-muted)", padding: "60px 20px" }}>
                            <Library size={28} style={{ opacity: 0.4 }} />
                            <div style={{ fontSize: "0.9rem" }}>No flows saved yet. <strong style={{ color: "var(--text-secondary)" }}>Record</strong> or <strong style={{ color: "var(--text-secondary)" }}>AI Convert</strong> to get started.</div>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                            {flows.map((flow: TestFlow) => (
                                <div key={flow._id} className="glass-card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
                                    {/* Card header */}
                                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                                        <div style={{ minWidth: 0 }}>
                                            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flow.name}</h4>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flow.targetUrl}</p>
                                        </div>
                                        <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "3px 8px", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0 }}>
                                            {flow.steps.length} steps
                                        </span>
                                    </div>
                                    {/* Steps preview */}
                                    <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "130px", overflowY: "auto" }}>
                                        {flow.steps.slice(0, 4).map((step: FlowStep, i: number) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                                <span style={{ color: "var(--text-muted)", minWidth: "16px" }}>{step.step}.</span>
                                                <StepBadge action={step.action} />
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.label || step.selector || step.url || step.value || ""}</span>
                                            </div>
                                        ))}
                                        {flow.steps.length > 4 && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "24px" }}>+{flow.steps.length - 4} more steps</div>}
                                    </div>
                                    {/* Actions */}
                                    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
                                        <button
                                            className="btn-primary"
                                            style={{ flex: 1, height: "36px", fontSize: "0.82rem", background: runningFlowId === flow._id ? "var(--bg-secondary)" : "#059669" }}
                                            onClick={() => handleRunFlow(flow)}
                                            disabled={runningFlowId !== null}
                                        >
                                            {runningFlowId === flow._id ? <LoadingSpinner size={14} /> : <Play size={14} fill="white" />}
                                            {runningFlowId === flow._id ? "Running…" : "Run Flow"}
                                        </button>
                                        <button className="btn-secondary" style={{ height: "36px", padding: "0 12px" }} title="Edit"
                                            onClick={() => { setEditingFlow(flow); setEditName(flow.name); setEditUrl(flow.targetUrl); }}>
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="btn-secondary" style={{ height: "36px", padding: "0 12px", color: "#ef4444" }} title="Delete" onClick={() => handleDeleteFlow(flow._id!)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: RESULTS ── */}
            {activeTab === "results" && (
                <div className="animate-fade-in">
                    {!runResults ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-muted)", padding: "60px 20px" }}>
                            <Terminal size={28} style={{ opacity: 0.4 }} />
                            <p style={{ fontSize: "0.9rem" }}>Run a flow from the <strong style={{ color: "var(--text-secondary)" }}>Library</strong> to see results here.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Summary bar */}
                            <div className="glass-card" style={{ padding: "20px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                                    <div>
                                        <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{runResults.flowName}</h3>
                                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Clock size={12} /> {(runResults.totalDurationMs / 1000).toFixed(2)}s total
                                        </p>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#10b981" }}>
                                                {runResults.stepResults.filter(s => s.status === "PASS").length}
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Passed</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ef4444" }}>
                                                {runResults.stepResults.filter(s => s.status === "FAIL").length}
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Failed</div>
                                        </div>
                                        <StatusBadge status={runResults.overallStatus} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                {/* Step Results */}
                                <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "rgba(99,102,241,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Zap size={15} color="#818cf8" />
                                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Step Results</span>
                                    </div>
                                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto" }}>
                                        {runResults.stepResults.map((s, i) => (
                                            <div key={i} style={{
                                                padding: "12px 14px", borderRadius: "8px", border: `1px solid ${s.status === "PASS" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
                                                background: s.status === "PASS" ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)",
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: s.error ? "8px" : 0 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        {s.status === "PASS" ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                                                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>{s.label || `Step ${s.step}`}</span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                                                            <Clock size={10} /> {s.durationMs}ms
                                                        </span>
                                                        <StatusBadge status={s.status} />
                                                    </div>
                                                </div>
                                                {s.error && (
                                                    <div style={{ fontSize: "0.78rem", color: "#f87171", fontFamily: "monospace", padding: "6px 8px", background: "rgba(239,68,68,0.06)", borderRadius: "4px", wordBreak: "break-word" }}>
                                                        {s.error}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Console + Network */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {/* Network Failures */}
                                    <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                                        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "rgba(239,68,68,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Wifi size={15} color="#f87171" />
                                            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                Network Failures ({runResults.networkFailures.length})
                                            </span>
                                        </div>
                                        <div style={{ padding: "12px 16px", maxHeight: "180px", overflowY: "auto" }}>
                                            {runResults.networkFailures.length === 0 ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#10b981", fontSize: "0.82rem" }}>
                                                    <CheckCircle2 size={14} /> No network failures
                                                </div>
                                            ) : runResults.networkFailures.map((err: string, i: number) => (
                                                <div key={i} style={{ fontSize: "0.78rem", color: "#f87171", fontFamily: "monospace", padding: "4px 0", borderBottom: "1px solid rgba(239,68,68,0.08)", wordBreak: "break-word", lineHeight: 1.5 }}>
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Console Errors */}
                                    <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                                        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "rgba(245,158,11,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Terminal size={15} color="#f59e0b" />
                                            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                Console Errors ({runResults.consoleLogs.length})
                                            </span>
                                        </div>
                                        <div style={{ padding: "12px 16px", maxHeight: "180px", overflowY: "auto" }}>
                                            {runResults.consoleLogs.length === 0 ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#10b981", fontSize: "0.82rem" }}>
                                                    <CheckCircle2 size={14} /> No console errors
                                                </div>
                                            ) : runResults.consoleLogs.map((log: string, i: number) => (
                                                <div key={i} style={{ fontSize: "0.78rem", color: "#fbbf24", fontFamily: "monospace", padding: "4px 0", borderBottom: "1px solid rgba(245,158,11,0.08)", wordBreak: "break-word", lineHeight: 1.5 }}>
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Screenshot */}
                                    {runResults.screenshot && (
                                        <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                                            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                Final Screenshot
                                            </div>
                                            <img src={`data:image/png;base64,${runResults.screenshot}`} alt="Final state" style={{ width: "100%", display: "block" }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {editingFlow && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                    onClick={() => setEditingFlow(null)}>
                    <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "440px", padding: "28px" }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "20px" }}>Edit Flow</h3>
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Flow Name</label>
                            <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Target URL</label>
                            <input type="url" className="input-field" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingFlow(null)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit} disabled={editLoading || !editName.trim()}>
                                {editLoading ? <LoadingSpinner size={14} /> : <Save size={14} />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
