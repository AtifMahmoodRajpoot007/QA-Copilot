"use client";

import { useState } from "react";
import {
  Bug,
  Wand2,
  AlertCircle,
  RotateCcw,
  Monitor,
  ListOrdered,
  XCircle,
  CheckCircle2,
  MessageSquare,
  Info,
} from "lucide-react";
import { EnhancedBugReport } from "@/types";
import CopyButton from "@/components/ui/CopyButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

const SEVERITY_CLASS: Record<string, string> = {
  Critical: "badge-critical",
  High: "badge-high",
  Medium: "badge-medium",
  Low: "badge-low",
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  Critical: "#fc8181",
  High: "#f87171",
  Medium: "#fbbf24",
  Low: "#34d399",
};

function Section({
  icon: Icon,
  iconColor,
  label,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <Icon size={14} color={iconColor} />
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: "700",
            color: "var(--text-muted)",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function ReportDisplay({
  report,
  rawText,
}: {
  report: EnhancedBugReport;
  rawText: string;
}) {
  // Build full text for top-level copy
  const fullText = `Bug Report\n\nSummary: ${report.summary}\nEnvironment: ${report.environment}\nSeverity: ${report.severity}\n\nSteps to Reproduce:\n${report.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nExpected Result: ${report.expectedResult}\nActual Result: ${report.actualResult}\n\nAdditional Notes: ${report.additionalNotes}`;

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        overflow: "hidden",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
      }}
    >
      {/* Report Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <Bug size={20} color="#f59e0b" />
          <span
            style={{
              fontSize: "1.05rem",
              fontWeight: "700",
              color: "#f8fafc",
            }}
          >
            Enhanced Report
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: SEVERITY_ICON_COLOR[report.severity] || "#fbbf24",
              background: `${SEVERITY_ICON_COLOR[report.severity]}15`,
              padding: "4px 12px",
              borderRadius: "100px",
              border: `1px solid ${SEVERITY_ICON_COLOR[report.severity]}25`,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {report.severity}
          </span>
          <CopyButton text={fullText} />
        </div>
      </div>

      {/* Summary */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #1e293b",
          background: "rgba(245,158,11,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <MessageSquare size={14} color="#f59e0b" />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: "#64748b",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Summary
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: "500",
            color: "#f1f5f9",
            lineHeight: 1.5,
          }}
        >
          {report.summary}
        </p>
      </div>

      <div
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Environment */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <Monitor size={14} color="#06b6d4" />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "#64748b",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Environment
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {report.environment}
          </p>
        </div>

        {/* Steps to Reproduce */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <ListOrdered size={14} color="#8b5cf6" />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Steps to Reproduce
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {report.stepsToReproduce.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "12px",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    color: "var(--accent-blue)",
                    fontWeight: "700",
                    minWidth: "20px",
                  }}
                >
                  {i + 1}.
                </span>
                <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>
                  {step.replace(/^Step\s*\d+:\s*/i, "")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expected vs Actual */}
        <div
          className="content-grid"
          style={{
            gap: "24px",
          }}
        >
          {/* Expected */}
          <div
            style={{
              padding: "16px 20px",
              background: "rgba(16,185,129,0.03)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <CheckCircle2 size={15} color="#10b981" />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Expected Result
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {report.expectedResult}
            </p>
          </div>

          {/* Actual */}
          <div
            style={{
              padding: "16px 20px",
              background: "rgba(239,68,68,0.03)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <XCircle size={15} color="#ef4444" />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  color: "#f87171",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Actual Result
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {report.actualResult}
            </p>
          </div>
        </div>

        {/* Additional Notes */}
        {report.additionalNotes && report.additionalNotes !== "Not specified" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Info size={14} color="#3b82f6" />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#64748b",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Additional Notes
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {report.additionalNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BugReportPage() {
  const [description, setDescription] = useState("");
  const [report, setReport] = useState<EnhancedBugReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnhance() {
    if (!description.trim() || description.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enhancement failed");
      setReport(data.enhancedReport);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setReport(null);
    setDescription("");
    setError(null);
  }

  const isReady = description.trim().length >= 10;

  return (
    <div className="page-container" style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bug size={22} color="white" />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 5vw, 1.8rem)",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Bug Report Enhancer
          </h1>
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            margin: 0,
            fontSize: "0.875rem",
            maxWidth: "600px",
            lineHeight: "1.5",
          }}
        >
          Paste a raw, unstructured bug description and get a professional,
          structured report instantly.
        </p>
      </div>

      {/* Input Section */}
      <div
        className="glass-card"
        style={{ padding: "24px", marginBottom: "24px" }}
      >
        <label
          htmlFor="bug-input"
          style={{
            display: "block",
            fontSize: "0.82rem",
            fontWeight: "600",
            color: "var(--text-secondary)",
            marginBottom: "10px",
            letterSpacing: "0.04em",
          }}
        >
          Raw Bug Description
        </label>
        <AutoResizeTextarea
          id="bug-input"
          className="input-field"
          placeholder="e.g. The login button doesn't work on Safari. I click it and nothing happens. Chrome works fine. This started after the last deploy..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: "160px", display: "block" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {description.length} characters
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {report && (
              <button className="btn-secondary" onClick={handleReset}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <button
              className="btn-primary"
              id="enhance-btn"
              onClick={handleEnhance}
              disabled={!isReady || loading}
            >
              {loading ? <LoadingSpinner size={16} /> : <Wand2 size={16} />}
              {loading ? "Enhancing…" : "Enhance Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="error-banner animate-fade-in"
          style={{
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Result */}
      {report && <ReportDisplay report={report} rawText={description} />}

      {/* Empty state */}
      {!loading && !report && !error && (
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
          <Bug size={28} style={{ opacity: 0.7 }} />
          <div style={{ fontSize: "0.9rem" }}>
            Paste a bug description above and click{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              Enhance Report
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
