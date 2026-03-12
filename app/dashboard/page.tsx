"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Bug,
  GitMerge,
  Clock,
  Zap,
  RefreshCw,
  Repeat,
  ShieldCheck,
  MonitorCheck,
} from "lucide-react";

interface DashboardStats {
  totalTestCases: number;
  totalBugReports: number;
  totalRegressionAnalyses: number;
  totalSmokeTests: number;
  totalRegressionScripts: number;
  totalAssistantSessions: number;
  assistantSuccessRate: number;
  smokeSuccessRate: number;
  avgSmokeLoadTime: number;
  timeSavedHours: number;
  totalMinutes: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  unit,
  secondary,
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  color: string;
  unit?: string;
  secondary?: string;
}) {
  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: "24px",
        flex: 1,
        minWidth: 0,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: `${color}15`,
            border: `1px solid ${color}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={color} />
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#64748b",
            fontWeight: "600",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: "2.8rem",
          fontWeight: "800",
          color: "#f8fafc",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}
      >
        {value === null ? (
          <span style={{ fontSize: "1rem", color: "#64748b" }}>
            Loading…
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            {value}
            {unit && (
              <span
                style={{
                  fontSize: "1.2rem",
                  color: "#94a3b8",
                  fontWeight: "500",
                }}
              >
                {unit}
              </span>
            )}
          </div>
        )}
      </div>
      {secondary && (
        <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
          {secondary}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load stats");
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
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
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={22} color="white" fill="white" />
          </div>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 5vw, 1.8rem)",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Productivity Dashboard
          </h1>
          <button
            onClick={fetchStats}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              padding: "7px 14px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              transition: "all 0.2s",
            }}
          >
            <RefreshCw size={13} />
            <span className="desktop-only">Refresh</span>
          </button>
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
          Real-time metrics calculated from your testing activities.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "12px",
            color: "#ef4444",
            marginBottom: "32px"
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div
        className="responsive-grid"
        style={{ marginBottom: "40px" }}
      >
        <StatCard
          label="Total Test Cases"
          value={loading ? null : (stats?.totalTestCases ?? 0)}
          icon={ClipboardList}
          color="#8b5cf6"
        />
        <StatCard
          label="Bugs Enhanced"
          value={loading ? null : (stats?.totalBugReports ?? 0)}
          icon={Bug}
          color="#f59e0b"
        />
        <StatCard
          label="Analyses Run"
          value={loading ? null : (stats?.totalRegressionAnalyses ?? 0)}
          icon={GitMerge}
          color="#10b981"
        />
        <StatCard
          label="Smoke Tests"
          value={loading ? null : (stats?.totalSmokeTests ?? 0)}
          icon={ShieldCheck}
          color="#f59e0b"
          secondary={stats ? `${stats.smokeSuccessRate}% Success · ${stats.avgSmokeLoadTime}ms Avg` : undefined}
        />
        <StatCard
          label="Flow Scripts"
          value={loading ? null : (stats?.totalRegressionScripts ?? 0)}
          icon={Repeat}
          color="#06b6d4"
        />
        <StatCard
          label="AI Assistant"
          value={loading ? null : (stats?.totalAssistantSessions ?? 0)}
          icon={MonitorCheck}
          color="#10b981"
          secondary={stats ? `${stats.assistantSuccessRate}% Success` : undefined}
        />
        <StatCard
          label="Total Time Saved"
          value={loading ? null : (stats ? (stats.totalMinutes < 60 ? stats.totalMinutes : stats.timeSavedHours) : 0)}
          icon={Clock}
          color="#3b82f6"
          unit={loading || !stats ? "hrs" : (stats.totalMinutes < 60 ? "mins" : "hrs")}
        />
      </div>
    </div>
  );
}
