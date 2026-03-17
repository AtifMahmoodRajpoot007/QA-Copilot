"use client";

import { useState, useEffect, useRef } from "react";
import {
    MonitorCheck,
    Play,
    AlertCircle,
    CheckCircle2,
    Clock,
    Image as ImageIcon,
    ChevronRight,
    Terminal,
    FileJson,
    X,
    Search,
    Layers,
    Library,
    History as HistoryIcon,
    Calendar,
    ArrowRight,
    PlayCircle,
    Monitor,
    Check,
    AlertTriangle,
    ListChecks
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

export default function AIQAAssistantPage() {
    const [targetUrl, setTargetUrl] = useState("");
    const [instruction, setInstruction] = useState("");
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"execution" | "history">("execution");
    const [historySessions, setHistorySessions] = useState<any[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [selectedHistorySession, setSelectedHistorySession] = useState<any>(null);

    const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

    // Live Run States
    const [liveRunActive, setLiveRunActive] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
    const [liveSteps, setLiveSteps] = useState<any[]>([]);
    const [liveRunStatus, setLiveRunStatus] = useState<"RUNNING" | "PASS" | "FAIL">("RUNNING");
    const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    async function fetchHistory() {
        setFetchingHistory(true);
        try {
            const res = await fetch("/api/ai-qa-assistant/history");
            const data = await res.json();
            if (res.ok) {
                setHistorySessions(data.sessions);
                if (data.sessions.length > 0) {
                    setSelectedHistorySession(data.sessions[0]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        } finally {
            setFetchingHistory(false);
        }
    }

    useEffect(() => {
        if (activeTab === "history" && historySessions.length === 0) {
            fetchHistory();
        }
    }, [activeTab]);

    async function handleRunTest() {
        if (!targetUrl.trim()) return setError("Please provide a Target URL.");
        if (!instruction.trim()) return setError("Please provide a Test Instruction.");

        setRunning(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch("/api/ai-qa-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: targetUrl, instruction })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Execution failed");

            setLiveSessionId(data.sessionId);
            setLiveSteps([]);
            setLiveRunStatus("RUNNING");
            setLiveScreenshot(null);
            setLiveRunActive(true);

            pollingRef.current = setInterval(async () => {
                const pr = await fetch(`/api/flows/session/${data.sessionId}`);
                if (pr.ok) {
                    const pd = await pr.json();
                    if (pd.runStatus !== "RUNNING") {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setRunning(false);
                        fetchHistory();
                    }
                    setLiveSteps(pd.steps || []);
                    setLiveRunStatus(pd.runStatus || "RUNNING");
                    if (pd.latestScreenshot) {
                        setLiveScreenshot(`data:image/png;base64,${pd.latestScreenshot}`);
                    }
                } else {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setRunning(false);
                }
            }, 1000);

        } catch (err: any) {
            setError(err.message);
            setRunning(false);
        }
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <MonitorCheck size={22} color="white" />
                        </div>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                            AI Test Agent
                        </h1>
                    </div>
                    <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem", maxWidth: "600px" }}>
                        Test application flows using plain English instructions. The AI will dynamically explore the UI and execute your test.
                    </p>
                </div>

                <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                    <button onClick={() => setActiveTab("execution")} style={{ padding: "8px 16px", background: activeTab === "execution" ? "rgba(16, 185, 129, 0.1)" : "transparent", color: activeTab === "execution" ? "#10b981" : "var(--text-muted)", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Play size={14} /> New Test
                    </button>
                    <button onClick={() => setActiveTab("history")} style={{ padding: "8px 16px", background: activeTab === "history" ? "rgba(16, 185, 129, 0.1)" : "transparent", color: activeTab === "history" ? "#10b981" : "var(--text-muted)", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <HistoryIcon size={14} /> History
                    </button>
                </div>
            </div>

            {activeTab === "execution" && (
                <div className="responsive-grid animate-fade-in" style={{ gridTemplateColumns: "1fr 1.8fr", gap: "24px", alignItems: "start" }}>
                    {/* Left Column: Prompt Configuration */}
                    <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                            <Play size={16} color="#10b981" /> Test Instructions
                        </h3>

                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>Target App URL</label>
                            <input type="url" className="input-field" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://example.com" />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>Plain English Instruction</label>
                            <AutoResizeTextarea className="input-field" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. Try to sign up with invalid email format and verify error, or Add phone to cart and checkout..." style={{ minHeight: "100px" }} />
                        </div>

                        <button className="btn-primary" style={{ width: "100%", height: "48px", background: "#10b981" }} onClick={handleRunTest} disabled={running || !targetUrl.trim() || !instruction.trim()}>
                            {running ? <LoadingSpinner size={20} /> : <Play size={18} fill="white" />}
                            {running ? "Agent Exploring..." : "Run AI Test"}
                        </button>

                        {error && (
                            <div className="error-banner animate-fade-in" style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Dynamic Agent Progress/Results */}
                    <div className="glass-card" style={{ padding: "0", display: "flex", flexDirection: "column", minHeight: "500px", overflow: "hidden" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                                <Terminal size={18} color="#10b981" /> Live Execution Status
                            </h3>
                            {results && (
                                <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", background: results.status === "pass" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: results.status === "pass" ? "#10b981" : "#ef4444" }}>
                                    {results.status === "pass" ? "Test Passed" : "Test Failed"}
                                </span>
                            )}
                        </div>

                        <div style={{ padding: "24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                            {!running && !results && !error && (
                                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "16px" }}>
                                    <MonitorCheck size={48} style={{ opacity: 0.3 }} />
                                    <p style={{ fontSize: "0.9rem" }}>Provide instructions and run the test to see the AI agent's actions here.</p>
                                </div>
                            )}

                            {running && (
                                <div style={{ padding: "24px", textAlign: "center", background: "rgba(16,185,129,0.05)", borderRadius: "12px", border: "1px dashed rgba(16,185,129,0.3)" }}>
                                    <LoadingSpinner size={28} />
                                    <h4 style={{ margin: "16px 0 8px", color: "var(--text-primary)" }}>Agent is exploring...</h4>
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>I am actively processing the DOM and deciding on the next step. This can take a minute or two.</p>
                                </div>
                            )}

                            {results?.steps && results.steps.map((step: any, i: number) => (
                                <div key={i} className="animate-fade-in" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700" }}>{i + 1}</div>
                                        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                            <span style={{ textTransform: "capitalize", fontWeight: "700", color: "#10b981", marginRight: "6px" }}>{step.action}</span>
                                            {step.selector || step.value || step.url || ""}
                                        </h4>
                                    </div>
                                    {step.reasoning && (
                                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", borderLeft: "3px solid #6366f1" }}>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>"{step.reasoning}"</p>
                                        </div>
                                    )}
                                    {step.screenshot && (
                                        <div style={{ marginTop: "8px" }}>
                                            <button onClick={() => setPreviewScreenshot(step.screenshot)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", cursor: "pointer" }}>
                                                <ImageIcon size={14} /> Screenshot
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="responsive-grid animate-fade-in" style={{ gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
                    {/* Left Column: Session List */}
                    <div className="glass-card" style={{ padding: "0", display: "flex", flexDirection: "column", height: "600px" }}>
                        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                <HistoryIcon size={18} color="#10b981" /> Past AI Tests
                            </h3>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
                            {fetchingHistory ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><LoadingSpinner size={24} /></div>
                            ) : historySessions.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No history found yet.</div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {historySessions.map((session) => {
                                        const isSelected = selectedHistorySession?._id === session._id;
                                        return (
                                            <div key={session._id} style={{ padding: "16px", borderRadius: "12px", cursor: "pointer", border: isSelected ? "1px solid #10b981" : "1px solid var(--border)", background: isSelected ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.02)", transition: "all 0.2s ease" }} onClick={() => setSelectedHistorySession(session)}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>{session.instruction || "Test Flow"}</span>
                                                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: session.results?.status === "pass" ? "#10b981" : "#ef4444", background: session.results?.status === "pass" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                                        {session.results?.status === "pass" ? "Pass" : "Fail"}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                                    <Calendar size={12} /> {new Date(session.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Session Details */}
                    <div className="glass-card" style={{ padding: "0", display: "flex", flexDirection: "column", height: "600px" }}>
                        {selectedHistorySession ? (
                            <>
                                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                                        <Terminal size={18} color="#10b981" /> Test Details
                                    </h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Ran on {new Date(selectedHistorySession.createdAt).toLocaleString()}</p>
                                </div>
                                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                                    <div style={{ marginBottom: "24px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                        <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>Target & Instruction</h4>
                                        <p style={{ fontSize: "0.85rem", color: "var(--accent-blue)", margin: "0 0 8px", fontWeight: "600" }}>{selectedHistorySession.url}</p>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: 0, fontStyle: "italic" }}>"{selectedHistorySession.instruction}"</p>
                                    </div>

                                    <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "16px", textTransform: "uppercase" }}>Executed Actions</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        {selectedHistorySession.results?.steps?.map((step: any, i: number) => (
                                            <div key={i} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700" }}>{i + 1}</div>
                                                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                                        <span style={{ textTransform: "capitalize", fontWeight: "700", color: "#10b981", marginRight: "6px" }}>{step.action}</span>
                                                        {step.selector || step.value || step.url || ""}
                                                    </h4>
                                                </div>
                                                {step.reasoning && (
                                                    <div style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", borderLeft: "3px solid #6366f1" }}>
                                                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>"{step.reasoning}"</p>
                                                    </div>
                                                )}
                                                {step.screenshot && (
                                                    <div style={{ marginTop: "4px" }}>
                                                        <button onClick={() => setPreviewScreenshot(step.screenshot)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", cursor: "pointer" }}>
                                                            <ImageIcon size={14} /> Snapshot
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>Select a session to view details</div>
                        )}
                    </div>
                </div>
            )}

            {/* Screenshot Modal */}
            {previewScreenshot && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }} onClick={() => setPreviewScreenshot(null)}>
                    <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewScreenshot(null)} style={{ position: "absolute", top: "-40px", right: 0, color: "white", background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
                        <img src={previewScreenshot} alt="Snapshot" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", border: "1px solid var(--border)" }} />
                    </div>
                </div>
            )}

            {/* Live Run Dashboard Overlay */}
            {liveRunActive && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10, 10, 10, 0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }} className="animate-fade-in">
                    <div style={{ width: "100%", maxWidth: "1200px", height: "85vh", display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px" }}>
                        
                        {/* Browser Visual Side */}
                        <div style={{ background: "#1a1a1a", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                            <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
                                </div>
                                <div style={{ flex: 1, height: "28px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", display: "flex", alignItems: "center", padding: "0 12px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                                    {targetUrl}
                                </div>
                            </div>
                            <div style={{ flex: 1, position: "relative", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                {liveScreenshot ? (
                                    <img src={liveScreenshot} alt="Live Browser" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                ) : (
                                    <div style={{ textAlign: "center" }}>
                                        <LoadingSpinner size={32} />
                                        <p style={{ marginTop: "16px", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Connecting to agent session...</p>
                                    </div>
                                )}
                                <div style={{ position: "absolute", top: "20px", right: "20px", padding: "8px 16px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div className="pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", background: liveRunStatus === "RUNNING" ? "#10b981" : "#64748b" }} />
                                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "white", textTransform: "uppercase" }}>
                                        Agent: {liveRunStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Panel */}
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "16px", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                            <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <ListChecks size={20} color="#10b981" /> Agent Progress
                                </h3>
                                <button onClick={() => { setLiveRunActive(false); if(pollingRef.current) clearInterval(pollingRef.current); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><X size={20} /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                                {liveSteps.length === 0 && (
                                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
                                        Initializing agent loop...
                                    </div>
                                )}
                                {liveSteps.map((step, i) => (
                                    <div key={i} className="animate-slide-up" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700" }}>{i + 1}</div>
                                            <span style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "0.75rem", color: "#10b981" }}>{step.action}</span>
                                        </div>
                                        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", marginBottom: "8px" }}>{step.reasoning}</div>
                                        {step.value && <div style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>Value: {step.value}</div>}
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: "24px", background: "rgba(0,0,0,0.2)" }}>
                                {liveRunStatus === "RUNNING" ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
                                        <LoadingSpinner size={18} /> AI is deciding next action...
                                    </div>
                                ) : (
                                    <div className="animate-slide-up">
                                        {liveRunStatus === "PASS" ? (
                                            <div style={{ background: "rgba(240, 246, 255, 1)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(219, 234, 254, 1)" }}>
                                                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                                                    <div style={{ fontSize: "24px" }}>👌</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#1e293b", letterSpacing: "0.05em", marginBottom: "2px" }}>AGENT FINISHED SUCCESSFULLY</div>
                                                    <button onClick={() => { setLiveRunActive(false); setActiveTab("history"); fetchHistory(); }} style={{ background: "none", border: "none", padding: 0, color: "#334155", textDecoration: "underline", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>View Details</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                                                <AlertTriangle size={20} color="#ef4444" />
                                                <div>
                                                    <div style={{ fontWeight: "700", color: "#ef4444", fontSize: "0.9rem" }}>AGENT FAILED</div>
                                                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>The agent could not complete the instruction.</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
