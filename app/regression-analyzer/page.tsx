"use client";

import { useState } from "react";
import {
  GitMerge,
  ScanSearch,
  AlertCircle,
  RotateCcw,
  Layers,
  TriangleAlert,
  Target,
  PlayCircle,
  Repeat,
  ExternalLink,
} from "lucide-react";
import { RegressionAnalysis } from "@/types";
import CopyButton from "@/components/ui/CopyButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

const TEST_TYPE_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  API: {
    bg: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    border: "rgba(59,130,246,0.25)",
  },
  UI: {
    bg: "rgba(139,92,246,0.1)",
    color: "#a78bfa",
    border: "rgba(139,92,246,0.25)",
  },
  Integration: {
    bg: "rgba(6,182,212,0.1)",
    color: "#22d3ee",
    border: "rgba(6,182,212,0.25)",
  },
  Unit: {
    bg: "rgba(16,185,129,0.1)",
    color: "#34d399",
    border: "rgba(16,185,129,0.25)",
  },
  E2E: {
    bg: "rgba(245,158,11,0.1)",
    color: "#fbbf24",
    border: "rgba(245,158,11,0.25)",
  },
  Performance: {
    bg: "rgba(239,68,68,0.1)",
    color: "#f87171",
    border: "rgba(239,68,68,0.25)",
  },
  Security: {
    bg: "rgba(251,191,36,0.12)",
    color: "#fcd34d",
    border: "rgba(251,191,36,0.3)",
  },
};

function ResultPanel({
  icon: Icon,
  iconColor,
  label,
  accentBg,
  accentBorder,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  accentBg: string;
  accentBorder: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
        overflow: "hidden",
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1e293b",
          background: accentBg,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Icon size={16} color={iconColor} />
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            color: iconColor,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function AnalysisDisplay({
  analysis,
  rawText,
}: {
  analysis: RegressionAnalysis;
  rawText: string;
}) {
  const fullText = `Regression Impact Analysis

Impacted Modules:
${analysis.impactedModules.join(", ")}

Risk Areas:
${analysis.riskAreas.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Regression Focus Areas:
${analysis.regressionFocusAreas.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Recommended Test Types:
${analysis.recommendedTestTypes.join(", ")}
${analysis.suggestedFlowScripts?.length ? `\nSuggested Existing Flow Scripts:\n${analysis.suggestedFlowScripts.join(", ")}` : ""}`;

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          padding: "16px 20px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontSize: "0.92rem",
            fontWeight: "600",
            color: "#f8fafc",
          }}
        >
          Analysis Ready
        </span>
        <CopyButton text={fullText} />
      </div>

      <div
        className="responsive-grid"
        style={{ gap: "12px" }}
      >
        {/* Impacted Modules */}
        <ResultPanel
          icon={Layers}
          iconColor="#8b5cf6"
          label="Impacted Modules"
          accentBg="rgba(139,92,246,0.06)"
          accentBorder="rgba(139,92,246,0.2)"
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {analysis.impactedModules.map((mod, i) => (
              <span key={i} className="tag">
                {mod}
              </span>
            ))}
          </div>
        </ResultPanel>

        {/* Recommended Test Types */}
        <ResultPanel
          icon={PlayCircle}
          iconColor="#06b6d4"
          label="Recommended Test Types"
          accentBg="rgba(6,182,212,0.06)"
          accentBorder="rgba(6,182,212,0.2)"
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {analysis.recommendedTestTypes.map((type, i) => {
              const colors = TEST_TYPE_COLORS[type] || TEST_TYPE_COLORS.API;
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    background: colors.bg,
                    color: colors.color,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {type}
                </span>
              );
            })}
          </div>
        </ResultPanel>

        {/* Risk Areas */}
        <ResultPanel
          icon={TriangleAlert}
          iconColor="#f59e0b"
          label="Risk Areas"
          accentBg="rgba(245,158,11,0.06)"
          accentBorder="rgba(245,158,11,0.2)"
        >
          <ul
            style={{
              margin: 0,
              paddingLeft: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {analysis.riskAreas.map((risk, i) => (
              <li
                key={i}
                style={{
                  fontSize: "0.86rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                {risk}
              </li>
            ))}
          </ul>
        </ResultPanel>

        {/* Regression Focus Areas */}
        <ResultPanel
          icon={Target}
          iconColor="#10b981"
          label="Regression Focus Areas"
          accentBg="rgba(16,185,129,0.06)"
          accentBorder="rgba(16,185,129,0.2)"
        >
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {analysis.regressionFocusAreas.map((area, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "0.86rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "1px solid rgba(16,185,129,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    color: "#10b981",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {i + 1}
                </span>
                {area}
              </li>
            ))}
          </ul>
        </ResultPanel>
        {/* Suggested Flow Scripts */}
        {analysis.suggestedFlowScripts && analysis.suggestedFlowScripts.length > 0 && (
          <ResultPanel
            icon={PlayCircle}
            iconColor="#06b6d4"
            label="Suggested Automated Tests"
            accentBg="rgba(6,182,212,0.06)"
            accentBorder="rgba(6,182,212,0.2)"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {analysis.suggestedFlowScripts.map((script, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4" }} />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "500" }}>{script}</span>
                  </div>
                  <a
                    href="/flow-recorder"
                    style={{
                      fontSize: "0.75rem",
                      color: "#06b6d4",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      textDecoration: "none",
                      fontWeight: "600"
                    }}
                  >
                    Open Recorder <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </ResultPanel>
        )}
      </div>
    </div>
  );
}

export default function RegressionAnalyzerPage() {
  const [prSummary, setPrSummary] = useState("");
  const [analysis, setAnalysis] = useState<RegressionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!prSummary.trim() || prSummary.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/regression-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setAnalysis(null);
    setPrSummary("");
    setError(null);
  }

  const isReady = prSummary.trim().length >= 10;

  return (
    <div className="page-container" style={{ maxWidth: "1100px" }}>
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
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GitMerge size={22} color="white" />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 5vw, 1.8rem)",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Regression Analyzer
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
          Paste a pull request summary or list of changed files to identify
          regression risk areas.
        </p>
      </div>

      {/* Input Section */}
      <div
        className="glass-card"
        style={{ padding: "24px", marginBottom: "24px" }}
      >
        <label
          htmlFor="pr-input"
          style={{
            display: "block",
            fontSize: "0.82rem",
            fontWeight: "600",
            color: "var(--text-secondary)",
            marginBottom: "10px",
            letterSpacing: "0.04em",
          }}
        >
          PR Summary / Changed Files
        </label>
        <AutoResizeTextarea
          id="pr-input"
          className="input-field"
          placeholder={`Paste a PR summary or list of changed files, e.g.:

PR: Add new payment gateway integration
Changed files:
- src/payments/stripe.ts
- src/checkout/CartSummary.tsx
- api/orders/create.ts
- lib/email/receipts.ts`}
          value={prSummary}
          onChange={(e) => setPrSummary(e.target.value)}
          style={{
            minHeight: "180px",
            display: "block",
            fontFamily: "monospace",
          }}
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
            {prSummary.length} characters · Tip: include file paths for more
            precise analysis
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {analysis && (
              <button className="btn-secondary" onClick={handleReset}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <button
              className="btn-primary"
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={!isReady || loading}
            >
              {loading ? (
                <LoadingSpinner size={16} />
              ) : (
                <ScanSearch size={16} />
              )}
              {loading ? "Analyzing…" : "Analyze Impact"}
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

      {/* Results */}
      {analysis && <AnalysisDisplay analysis={analysis} rawText={prSummary} />}

      {/* Empty state */}
      {!loading && !analysis && !error && (
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
          <GitMerge size={28} style={{ opacity: 0.7 }} />
          <div style={{ fontSize: "0.9rem" }}>
            Paste a PR summary or changed file list above and click{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              Analyze Impact
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
