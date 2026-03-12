"use client";

import { useState } from "react";
import {
  ClipboardList,
  Sparkles,
  Download,
  FileJson,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Tag,
  Database,
  Layers,
} from "lucide-react";
import { TestCase } from "@/types";
import { exportToCSV, exportToJSON } from "@/lib/export-utils";
import CopyButton from "@/components/ui/CopyButton";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

const PRIORITY_COLORS: Record<string, string> = {
  High: "badge-high",
  Medium: "badge-medium",
  Low: "badge-low",
};

function TestCaseCard({ tc, index }: { tc: TestCase; index: number }) {
  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: "0",
        overflow: "hidden",
        background: "#0f172a", // Darker slate for the card background
        border: "1px solid #1e293b",
        borderRadius: "12px",
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
      }}
    >
      {/* Card header section */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "1px solid #1e293b",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#64748b",
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}
          >
            {tc.id}
          </span>
          <h3
            style={{
              fontSize: "1.05rem",
              fontWeight: "700",
              color: "#f8fafc",
              margin: 0,
            }}
          >
            {tc.title}
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          <span
            className="desktop-only"
            style={{
              fontSize: "0.7rem",
              fontWeight: "600",
              color: "#94a3b8",
              background: "rgba(51,65,85,0.4)",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "1px solid #334155",
              textTransform: "capitalize",
            }}
          >
            {tc.testType}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: tc.priority.toLowerCase() === "high" ? "#ef4444" : tc.priority.toLowerCase() === "medium" ? "#f59e0b" : "#10b981",
              background: tc.priority.toLowerCase() === "high" ? "rgba(239,68,68,0.1)" : tc.priority.toLowerCase() === "medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
              padding: "4px 12px",
              borderRadius: "100px",
              border: `1px solid ${tc.priority.toLowerCase() === "high" ? "rgba(239,68,68,0.2)" : tc.priority.toLowerCase() === "medium" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {tc.priority}
          </span>
          <CopyButton
            text={`${tc.id}: ${tc.title}\n\nPreconditions: ${tc.preconditions}\n\nSteps:\n${tc.steps.join("\n")}\n\nTest Data: ${tc.testData}\n\nExpected Result: ${tc.expectedResult}\n\nTags: ${tc.tags.join(", ")}`}
          />
        </div>
      </div>

      {/* Card body */}
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Preconditions & Test Data Row */}
        <div className="content-grid">
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Layers size={14} color="#8b5cf6" /> Preconditions
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {tc.preconditions}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Database size={14} color="#06b6d4" /> Test Data
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {tc.testData}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "16px",
            }}
          >
            Test Steps
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {tc.steps.map((step, i) => (
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
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Result */}
        <div
          style={{
            padding: "20px 24px",
            background: "rgba(16,185,129,0.04)",
            border: "1px solid rgba(16,185,129,0.15)",
            borderRadius: "12px",
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(16,185,129,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "800",
                color: "#10b981",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              Expected Result
            </div>
            <div
              style={{
                fontSize: "1rem",
                color: "#f1f5f9",
                lineHeight: 1.7,
                fontWeight: "500",
              }}
            >
              {tc.expectedResult}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
          {tc.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: "0.7rem",
                background: "rgba(51,65,85,0.4)",
                color: "#64748b",
                padding: "4px 12px",
                borderRadius: "100px",
                border: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Tag size={12} /> {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TestCasesPage() {
  const [requirement, setRequirement] = useState("");
  const [projectName, setProjectName] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!requirement.trim() || requirement.trim().length < 10) return;

    setLoading(true);
    setError(null);
    setTestCases([]);

    try {
      const res = await fetch("/api/testcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, projectName, moduleName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setTestCases(data.testCases);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTestCases([]);
    setRequirement("");
    setProjectName("");
    setModuleName("");
    setError(null);
  }

  const charCount = requirement.length;
  const isReady = requirement.trim().length >= 10;

  return (
    <div className="page-container">
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
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClipboardList size={22} color="white" />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 5vw, 1.8rem)",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Test Case Generator
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
          Paste a user story or requirement and generate comprehensive,
          structured test cases instantly.
        </p>
      </div>

      {/* Input Section */}
      <div
        className="glass-card"
        style={{ padding: "24px", marginBottom: "24px" }}
      >
        <div className="responsive-grid" style={{ marginBottom: "20px" }}>
          <div>
            <label
              htmlFor="project-input"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                letterSpacing: "0.04em",
              }}
            >
              Project Name <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              id="project-input"
              type="text"
              className="input-field"
              placeholder="e.g. E-Commerce App"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="module-input"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                letterSpacing: "0.04em",
              }}
            >
              Module Name <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              id="module-input"
              type="text"
              className="input-field"
              placeholder="e.g. User Authentication"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />
          </div>
        </div>

        <label
          htmlFor="requirement-input"
          style={{
            display: "block",
            fontSize: "0.82rem",
            fontWeight: "600",
            color: "var(--text-secondary)",
            marginBottom: "10px",
            letterSpacing: "0.04em",
          }}
        >
          User Story / Requirement
        </label>
        <AutoResizeTextarea
          id="requirement-input"
          className="input-field"
          placeholder="e.g. As a user, I want to be able to log in with my email and password so that I can access my dashboard..."
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
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
          <span
            style={{
              fontSize: "0.75rem",
              color:
                charCount > 3000 ? "var(--accent-red)" : "var(--text-muted)",
            }}
          >
            {charCount} characters
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {testCases.length > 0 && (
              <button className="btn-secondary" onClick={handleReset}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!isReady || loading}
              id="generate-btn"
            >
              {loading ? <LoadingSpinner size={16} /> : <Sparkles size={16} />}
              {loading ? "Generating…" : "Generate Test Cases"}
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
      {testCases.length > 0 && (
        <div>
          {/* Export toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              padding: "12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "0.88rem",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              {testCases.length} Cases
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-secondary"
                id="export-csv-btn"
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                onClick={() => exportToCSV(testCases)}
              >
                <Download size={14} /> CSV
              </button>
              <button
                className="btn-secondary"
                id="export-json-btn"
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                onClick={() => exportToJSON(testCases)}
              >
                <FileJson size={14} /> JSON
              </button>
            </div>
          </div>

          {/* Test case cards */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {testCases.map((tc, i) => (
              <TestCaseCard key={tc.id || i} tc={tc} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && testCases.length === 0 && !error && (
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
          <ClipboardList
            size={28}
            style={{ opacity: 0.7 }}
          />
          <div style={{ fontSize: "0.9rem" }}>
            Paste a requirement above and click{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              Generate Test Cases
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
