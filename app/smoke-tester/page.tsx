"use client";

import { useState } from "react";
import {
    Zap,
    Play,
    Download,
    FileJson,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Globe,
    LogIn,
    Terminal,
    Activity,
    FileText,
    Clock,
    ShieldCheck,
    ChevronRight,
    Server,
    Mail,
    Lock,
    Eye,
    EyeOff,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SmokeTestReport } from "@/types";

function StatusBadge({ status }: { status: "PASS" | "FAIL" | "N/A" }) {
    const isPass = status === "PASS";
    const isFail = status === "FAIL";

    return (
        <span
            style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: isPass ? "#10b981" : isFail ? "#ef4444" : "#94a3b8",
                background: isPass ? "rgba(16,185,129,0.1)" : isFail ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)",
                padding: "4px 12px",
                borderRadius: "100px",
                border: `1px solid ${isPass ? "rgba(16,185,129,0.2)" : isFail ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.2)"}`,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
            }}
        >
            {isPass ? <CheckCircle2 size={12} /> : isFail ? <XCircle size={12} /> : null}
            {status}
        </span>
    );
}

export default function SmokeTesterPage() {
    const [buildUrl, setBuildUrl] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [report, setReport] = useState<SmokeTestReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleRunTest() {
        if (!buildUrl.trim()) return;

        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const res = await fetch("/api/smoke-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    buildUrl,
                    login: email && password ? { email, password } : undefined
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Smoke test failed");
            setReport(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setBuildUrl("");
        setEmail("");
        setPassword("");
        setReport(null);
        setError(null);
    }

    function exportReport(format: 'json' | 'csv') {
        if (!report) return;

        let content = "";
        let mimeType = "";
        let fileName = `smoke-test-report-${Date.now()}`;

        if (format === 'json') {
            content = JSON.stringify(report, null, 2);
            mimeType = "application/json";
            fileName += ".json";
        } else {
            const rows = [
                ["Field", "Value"],
                ["Target URL", report.buildUrl],
                ["Homepage Status", report.homepageStatus],
                ["Login Status", report.loginStatus],
                ["Page Load Time", `${report.pageLoadTimeMs}ms`],
                ["UI Checks", JSON.stringify(report.uiChecks)],
                ["Redirects", report.redirectChecks?.join(" | ") || "None"],
                ["API Checks", report.criticalApiChecks?.join(" | ") || "None"],
                ["Tested Pages", report.testedPages.join(", ")],
                ["Console Errors", report.consoleErrors.join(" | ")],
                ["Network Errors", report.networkErrors.join(" | ")]
            ];
            content = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
            mimeType = "text/csv";
            fileName += ".csv";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <ShieldCheck size={22} color="white" fill="#f59e0b" />
                    </div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                        AI Smoke Tester
                    </h1>
                </div>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem", maxWidth: "600px" }}>
                    Automatically verify build health, check for console errors, network failures, and validate login flows.
                </p>
            </div>

            {/* Input Section */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
                        Target URL
                    </label>
                    <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                            <Globe size={16} />
                        </div>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="https://staging.myapp.com"
                            value={buildUrl}
                            onChange={(e) => setBuildUrl(e.target.value)}
                            style={{ paddingLeft: "40px" }}
                        />
                    </div>
                </div>

                <div className="responsive-grid" style={{ marginBottom: "20px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            Login Email <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                        </label>
                        <div style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="e.g. admin@test.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ paddingLeft: "40px" }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            Login Password <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                        </label>
                        <div style={{ position: "relative" }}>
                            <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                                <Lock size={16} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                placeholder="e.g. securePass123"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: "40px", paddingRight: "40px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute",
                                    right: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    padding: "0",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    {report && (
                        <button className="btn-secondary" onClick={handleReset}>
                            <RotateCcw size={14} /> Reset
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={handleRunTest}
                        disabled={!buildUrl.trim() || loading}
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                    >
                        {loading ? <LoadingSpinner size={16} color="white" /> : <Play size={16} fill="white" />}
                        {loading ? "Running Smoke Test…" : "Run Smoke Test"}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="error-banner animate-fade-in" style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Results */}
            {report && (
                <div className="animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                                Health Report
                            </h2>
                            {report.pageLoadTimeMs > 0 && (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={12} /> {report.pageLoadTimeMs}ms
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-secondary" onClick={() => exportReport('csv')} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                                <Download size={14} /> CSV
                            </button>
                            <button className="btn-secondary" onClick={() => exportReport('json')} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                                <FileJson size={14} /> JSON
                            </button>
                        </div>
                    </div>

                    <div className="responsive-grid" style={{ marginBottom: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                        {/* Core Status & UI Health */}
                        <div className="glass-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "var(--text-muted)" }}>
                                <ShieldCheck size={16} />
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Health & Performance</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Homepage</span>
                                    <StatusBadge status={report.homepageStatus} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Login Flow</span>
                                    <StatusBadge status={report.loginStatus} />
                                </div>
                                {Object.keys(report.uiChecks || {}).length > 0 && (
                                    <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0", paddingTop: "8px" }}></div>
                                )}
                            </div>
                        </div>

                        {/* Redirect & Nav Log */}
                        <div className="glass-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "var(--text-muted)" }}>
                                <ChevronRight size={16} />
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Redirects & Pages</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {report.redirectChecks?.length > 0 ? (
                                    report.redirectChecks.map((log, i) => {
                                        const isPass = log.includes(": PASS");
                                        const isInfo = log.includes(": INFO");
                                        const color = isPass ? "#10b981" : isInfo ? "#f59e0b" : "#ef4444";
                                        const bg = isPass ? "rgba(16,185,129,0.05)" : isInfo ? "rgba(245,158,11,0.05)" : "rgba(239,68,68,0.05)";
                                        const border = isPass ? "rgba(16,185,129,0.1)" : isInfo ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";

                                        return (
                                            <div key={i} style={{ fontSize: "0.8rem", color, padding: "6px 10px", background: bg, borderRadius: "6px", border: `1px solid ${border}` }}>
                                                {log}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No redirects detected.</div>
                                )}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                    {report.testedPages.map((p, i) => (
                                        <span key={i} style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* API Health */}
                        <div className="glass-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "var(--text-muted)" }}>
                                <Server size={16} />
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Critical API Health</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {report.criticalApiChecks?.length > 0 ? (
                                    report.criticalApiChecks.map((api, i) => {
                                        const [url, status] = api.split(": ");
                                        const isOk = status === "200" || status === "201";
                                        return (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                                                <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                                                    {url.split('/').pop() || url}
                                                </span>
                                                <span style={{ color: isOk ? "#10b981" : "#ef4444", fontWeight: "600" }}>{status}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No API calls monitored.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        <div className="glass-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "#ef4444" }}>
                                <Terminal size={16} />
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Console Errors</span>
                            </div>
                            {report.consoleErrors.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {report.consoleErrors.map((err, i) => (
                                        <div key={i} style={{
                                            padding: "8px 12px",
                                            background: "rgba(239, 68, 68, 0.05)",
                                            borderRadius: "6px",
                                            fontSize: "0.8rem",
                                            color: "#fca5a5",
                                            fontFamily: "monospace",
                                            borderLeft: "3px solid #ef4444",
                                            lineHeight: "1.5",
                                            overflowWrap: "break-word",
                                            wordBreak: "normal"
                                        }}>
                                            {err}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    No console errors detected.
                                </div>
                            )}
                        </div>

                        <div className="glass-card" style={{ padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", color: "#f97316" }}>
                                <Activity size={16} />
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Network Failures</span>
                            </div>
                            {report.networkErrors.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {report.networkErrors.map((err, i) => (
                                        <div key={i} style={{
                                            padding: "8px 12px",
                                            background: "rgba(249, 115, 22, 0.05)",
                                            borderRadius: "6px",
                                            fontSize: "0.8rem",
                                            color: "#fdba74",
                                            fontFamily: "monospace",
                                            borderLeft: "3px solid #f97316",
                                            lineHeight: "1.5",
                                            overflowWrap: "break-word",
                                            wordBreak: "normal"
                                        }}>
                                            {err}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    No network failures detected.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !report && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        color: "var(--text-muted)",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: "4px"
                    }}
                >
                    <ShieldCheck size={28} style={{ opacity: 0.7 }} />
                    <div style={{ fontSize: "0.9rem" }}>
                        Enter a Target URL above to start an automated health check.
                    </div>
                </div>
            )}
        </div>
    );
}
