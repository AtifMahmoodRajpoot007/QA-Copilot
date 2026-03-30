"use client";

import { useState, useEffect } from "react";
import {
    Library,
    ChevronRight,
    ChevronDown,
    Calendar,
    Layers,
    BookOpen,
    ClipboardList,
    Search,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { TestCase } from "@/types";

interface SavedTestCaseSet {
    _id: string;
    projectName: string;
    moduleName: string;
    requirementInput: string;
    generatedTestCases: TestCase[];
    createdAt: string;
}

function PriorityBadge({ priority }: { priority: string }) {
    const pLower = (priority || "").toLowerCase();
    const color =
        pLower === "high" ? "#f87171" : pLower === "medium" ? "#fbbf24" : "#34d399";
    const bg =
        pLower === "high"
            ? "rgba(239,68,68,0.12)"
            : pLower === "medium"
                ? "rgba(245,158,11,0.12)"
                : "rgba(16,185,129,0.12)";
    return (
        <span
            style={{
                fontSize: "0.7rem",
                fontWeight: "700",
                color,
                background: bg,
                padding: "3px 10px",
                borderRadius: "100px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
            }}
        >
            {priority}
        </span>
    );
}

function TestCaseCard({ tc, index }: { tc: TestCase; index: number }) {
    const isFailureTest =
        (tc.id || "").toLowerCase().includes("fail") ||
        (tc.id || "").toLowerCase().includes("error") ||
        (tc.title || "").toLowerCase().includes("fail") ||
        (tc.title || "").toLowerCase().includes("error") ||
        (tc.title || "").toLowerCase().includes("invalid");

    const accentColor = isFailureTest ? "#ef4444" : "#10b981";
    const accentBg = isFailureTest ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)";
    const accentBorder = isFailureTest ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)";

    return (
        <div
            className="animate-fade-in"
            style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                overflow: "hidden",
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
                boxShadow: isFailureTest ? "0 4px 20px -5px rgba(239, 68, 68, 0.15)" : "none",
            }}
        >
            {/* Card Header */}
            <div
                style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    background: isFailureTest ? "rgba(239, 68, 68, 0.02)" : "transparent",
                }}
            >
                <span
                    style={{
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        color: isFailureTest ? "#ef4444" : "#475569",
                        background: isFailureTest ? "rgba(239, 68, 68, 0.1)" : "#1e293b",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                    }}
                >
                    {tc.id}
                </span>
                <h3
                    style={{
                        fontSize: "0.95rem",
                        fontWeight: "700",
                        color: "#f1f5f9",
                        margin: 0,
                        flex: 1,
                        lineHeight: 1.4,
                    }}
                >
                    {tc.title}
                </h3>
                <PriorityBadge priority={tc.priority} />
            </div>

            {/* Card Body */}
            <div style={{ padding: "20px" }}>
                {/* Preconditions */}
                {tc.preconditions && (
                    <div style={{ marginBottom: "18px" }}>
                        <div
                            style={{
                                fontSize: "0.7rem",
                                fontWeight: "700",
                                color: "#64748b",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                marginBottom: "8px",
                            }}
                        >
                            Preconditions
                        </div>
                        <div
                            style={{
                                fontSize: "0.88rem",
                                color: "#94a3b8",
                                lineHeight: 1.6,
                                padding: "10px 14px",
                                background: "rgba(51,65,85,0.2)",
                                borderRadius: "8px",
                                borderLeft: "3px solid #334155",
                            }}
                        >
                            {tc.preconditions}
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div style={{ marginBottom: "18px" }}>
                    <div
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: "10px",
                        }}
                    >
                        Test Steps
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {tc.steps.map((step, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "flex-start",
                                }}
                            >
                                <span
                                    style={{
                                        width: "22px",
                                        height: "22px",
                                        borderRadius: "50%",
                                        background: isFailureTest ? "rgba(239, 68, 68, 0.1)" : "rgba(99,102,241,0.15)",
                                        border: `1px solid ${isFailureTest ? "rgba(239, 68, 68, 0.2)" : "rgba(99,102,241,0.25)"}`,
                                        color: isFailureTest ? "#ef4444" : "#818cf8",
                                        fontSize: "0.72rem",
                                        fontWeight: "700",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginTop: "1px",
                                    }}
                                >
                                    {i + 1}
                                </span>
                                <span
                                    style={{
                                        fontSize: "0.88rem",
                                        color: "#cbd5e1",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {step}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expected Result */}
                <div
                    style={{
                        padding: "14px 16px",
                        background: accentBg,
                        border: `1px solid ${accentBorder}`,
                        borderRadius: "8px",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start",
                    }}
                >
                    {isFailureTest ? (
                        <AlertCircle size={16} color={accentColor} style={{ flexShrink: 0, marginTop: "2px" }} />
                    ) : (
                        <CheckCircle2
                            size={16}
                            color={accentColor}
                            style={{ flexShrink: 0, marginTop: "2px" }}
                        />
                    )}
                    <div>
                        <div
                            style={{
                                fontSize: "0.7rem",
                                fontWeight: "700",
                                color: accentColor,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: "5px",
                            }}
                        >
                            Expected Result
                        </div>
                        <div
                            style={{
                                fontSize: "0.88rem",
                                color: "#e2e8f0",
                                lineHeight: 1.6,
                            }}
                        >
                            {tc.expectedResult}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TestCaseLibraryPage() {
    const [testCaseSets, setTestCaseSets] = useState<SavedTestCaseSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedProjects, setExpandedProjects] = useState<
        Record<string, boolean>
    >({});
    const [selectedSet, setSelectedSet] = useState<SavedTestCaseSet | null>(
        null
    );

    useEffect(() => {
        fetchTestCases();
    }, []);

    async function fetchTestCases() {
        try {
            const res = await fetch("/api/testcases");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch library");
            setTestCaseSets(data.testCases);

            if (data.testCases.length > 0) {
                const firstProject = data.testCases[0].projectName || "General";
                setExpandedProjects({ [firstProject]: true });
                setSelectedSet(data.testCases[0]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const toggleProject = (name: string) =>
        setExpandedProjects((p) => ({ ...p, [name]: !p[name] }));

    const projects = testCaseSets.reduce((acc, set) => {
        const key = set.projectName || "General";
        if (!acc[key]) acc[key] = [];
        acc[key].push(set);
        return acc;
    }, {} as Record<string, SavedTestCaseSet[]>);

    const getSetLabel = (set: SavedTestCaseSet) => {
        if (set.moduleName) return set.moduleName;
        return new Date(set.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    if (loading) {
        return (
            <div
                className="page-container"
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "60vh",
                }}
            >
                <LoadingSpinner size={40} />
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: "32px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "10px",
                    }}
                >
                    <div
                        style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Library size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "clamp(1.4rem, 4vw, 1.8rem)",
                                fontWeight: "700",
                                color: "var(--text-primary)",
                                margin: 0,
                                lineHeight: 1.2,
                            }}
                        >
                            Test Case Library
                        </h1>
                        <p
                            style={{
                                color: "var(--text-muted)",
                                margin: 0,
                                fontSize: "0.83rem",
                                marginTop: "3px",
                            }}
                        >
                            Browse and manage your previously generated test case collections.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        padding: "12px 16px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: "8px",
                        color: "#f87171",
                        fontSize: "0.88rem",
                        marginBottom: "24px",
                    }}
                >
                    {error}
                </div>
            )}

            {Object.keys(projects).length === 0 ? (
                <div
                    className="glass-card"
                    style={{
                        padding: "80px 20px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <div
                        style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            background: "rgba(51,65,85,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Library size={28} color="#475569" />
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: "1.05rem",
                                fontWeight: "600",
                                color: "var(--text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            No test cases saved yet
                        </div>
                        <div
                            style={{ fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "380px" }}
                        >
                            Start by generating test cases from the{" "}
                            <strong style={{ color: "var(--text-secondary)" }}>
                                Test Case Generator
                            </strong>
                            . They will automatically appear here.
                        </div>
                    </div>
                </div>
            ) : (
                /* Main layout — sidebar + content */
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "260px 1fr",
                        gap: "24px",
                        alignItems: "start",
                    }}
                    className="library-layout"
                >
                    {/* ── Sidebar ─────────────────────────── */}
                    <div
                        className="glass-card"
                        style={{
                            padding: "12px",
                            position: "sticky",
                            top: "16px",
                            maxHeight: "calc(100vh - 180px)",
                            overflowY: "auto",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "0.68rem",
                                fontWeight: "700",
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                                padding: "4px 8px 10px",
                                borderBottom: "1px solid var(--border)",
                                marginBottom: "8px",
                            }}
                        >
                            Projects
                        </div>

                        {Object.entries(projects).map(([projectName, sets]) => (
                            <div key={projectName} style={{ marginBottom: "2px" }}>
                                {/* Project toggle */}
                                <button
                                    onClick={() => toggleProject(projectName)}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "9px 10px",
                                        background: expandedProjects[projectName]
                                            ? "rgba(59,130,246,0.07)"
                                            : "transparent",
                                        border: "none",
                                        borderRadius: "7px",
                                        cursor: "pointer",
                                        color: "var(--text-primary)",
                                        fontWeight: "600",
                                        fontSize: "0.875rem",
                                        textAlign: "left",
                                        transition: "background 0.2s",
                                    }}
                                >
                                    <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                                        {expandedProjects[projectName] ? (
                                            <ChevronDown size={13} />
                                        ) : (
                                            <ChevronRight size={13} />
                                        )}
                                    </span>
                                    <span style={{ flex: 1 }}>{projectName}</span>
                                    <span
                                        style={{
                                            fontSize: "0.68rem",
                                            color: "var(--text-muted)",
                                            background: "var(--bg-secondary)",
                                            padding: "2px 7px",
                                            borderRadius: "100px",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {sets.length}
                                    </span>
                                </button>

                                {/* Module list */}
                                {expandedProjects[projectName] && (
                                    <div
                                        style={{
                                            marginLeft: "16px",
                                            paddingLeft: "10px",
                                            borderLeft: "1.5px solid var(--border)",
                                            marginTop: "2px",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        {sets.map((set) => {
                                            const active = selectedSet?._id === set._id;
                                            return (
                                                <button
                                                    key={set._id}
                                                    onClick={() => setSelectedSet(set)}
                                                    style={{
                                                        width: "100%",
                                                        padding: "7px 10px",
                                                        marginBottom: "2px",
                                                        background: active
                                                            ? "rgba(6,182,212,0.1)"
                                                            : "transparent",
                                                        border: active
                                                            ? "1px solid rgba(6,182,212,0.2)"
                                                            : "1px solid transparent",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        color: active ? "#06b6d4" : "var(--text-secondary)",
                                                        fontSize: "0.82rem",
                                                        fontWeight: active ? "600" : "400",
                                                        textAlign: "left",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    {set.moduleName ? (
                                                        <Layers size={12} style={{ flexShrink: 0 }} />
                                                    ) : (
                                                        <Calendar size={12} style={{ flexShrink: 0 }} />
                                                    )}
                                                    <span
                                                        style={{
                                                            flex: 1,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {getSetLabel(set)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Detail Panel ─────────────────────── */}
                    <div style={{ minWidth: 0 }}>
                        {selectedSet ? (
                            <div className="animate-fade-in">
                                {/* Meta card */}
                                <div
                                    className="glass-card"
                                    style={{
                                        padding: "24px 28px",
                                        marginBottom: "24px",
                                        borderLeft: "4px solid #06b6d4",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            flexWrap: "wrap",
                                            gap: "12px",
                                            marginBottom: "20px",
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "0.68rem",
                                                    fontWeight: "800",
                                                    color: "#06b6d4",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.12em",
                                                    marginBottom: "6px",
                                                }}
                                            >
                                                {selectedSet.projectName || "General"}
                                            </div>
                                            <h2
                                                style={{
                                                    fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                                                    fontWeight: "700",
                                                    color: "var(--text-primary)",
                                                    margin: 0,
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {selectedSet.moduleName || "General Test Cases"}
                                            </h2>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                color: "var(--text-muted)",
                                                fontSize: "0.82rem",
                                                background: "var(--bg-secondary)",
                                                padding: "6px 14px",
                                                borderRadius: "100px",
                                                border: "1px solid var(--border)",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Calendar size={13} />
                                            {new Date(selectedSet.createdAt).toLocaleString(
                                                undefined,
                                                { dateStyle: "medium", timeStyle: "short" }
                                            )}
                                        </div>
                                    </div>

                                    {/* Requirement */}
                                    <div>
                                        <div
                                            style={{
                                                fontSize: "0.7rem",
                                                fontWeight: "700",
                                                color: "var(--text-muted)",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.1em",
                                                marginBottom: "10px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}
                                        >
                                            <BookOpen size={13} /> User Story / Requirement
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.9rem",
                                                color: "var(--text-secondary)",
                                                lineHeight: 1.7,
                                                padding: "14px 16px",
                                                background: "rgba(0,0,0,0.25)",
                                                borderRadius: "8px",
                                                border: "1px solid var(--border)",
                                            }}
                                        >
                                            {selectedSet.requirementInput}
                                        </div>
                                    </div>
                                </div>

                                {/* Test cases header */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        marginBottom: "16px",
                                        padding: "10px 14px",
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                    }}
                                >
                                    <ClipboardList size={16} color="#3b82f6" />
                                    <span
                                        style={{
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            color: "var(--text-primary)",
                                        }}
                                    >
                                        {selectedSet.generatedTestCases.length} Generated Test Cases
                                    </span>
                                </div>

                                {/* Test case cards */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "14px",
                                        paddingBottom: "40px",
                                    }}
                                >
                                    {selectedSet.generatedTestCases.map((tc, i) => (
                                        <TestCaseCard key={i} tc={tc} index={i} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="glass-card"
                                style={{
                                    padding: "80px 20px",
                                    textAlign: "center",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "12px",
                                }}
                            >
                                <Search
                                    size={36}
                                    color="#475569"
                                    style={{ opacity: 0.5 }}
                                />
                                <div
                                    style={{
                                        fontSize: "0.95rem",
                                        fontWeight: "500",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    Select a module from the sidebar to view test cases
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Responsive override */}
            <style>{`
        @media (max-width: 900px) {
          .library-layout {
            grid-template-columns: 1fr !important;
          }
          .library-layout > div:first-child {
            position: static !important;
            max-height: 300px !important;
          }
        }
      `}</style>
        </div>
    );
}
