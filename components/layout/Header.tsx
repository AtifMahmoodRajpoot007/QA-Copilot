"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, Zap } from "lucide-react";
import { usePathname } from "next/navigation";

interface HeaderProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

export default function Header({ isCollapsed, isMobile, onToggle }: HeaderProps) {
  const pathname = usePathname();
  
  // Standard breadcrumb titles mapping
  const titles: Record<string, string> = {
    "dashboard": "Dashboard",
    "automated-tests": "Automated Tests",
    "ai-test-agent": "AI Test Agent",
    "regression-analyzer": "Regression Analyzer",
    "bug-report-enhancer": "Bug Report Enhancer",
    "test-cases-generator": "Test Case Generator",
    "test-case-library": "Test Case Library",
    "ai-smoke-tester": "AI Smoke Tester",
    "record-test-flow": "Record Fast Flow",
  };
  
  const getPageTitle = () => {
    const segment = pathname.split("/").filter(Boolean).pop() || "dashboard";
    return titles[segment] || segment.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <header className="app-header" style={{
      height: "60px",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      background: "rgba(10, 14, 26, 0.7)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      zIndex: 40,
      flexShrink: 0
    }}>
      <button
        onClick={onToggle}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-light)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginRight: "16px",
          transition: "all 0.2s"
        }}
        aria-label="Toggle Sidebar"
      >
        {isMobile ? <Menu size={20} /> : (isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />)}
      </button>

      {isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "16px" }}>
          <Zap size={18} color="#3b82f6" fill="#3b82f6" />
          <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>QA Copilot</span>
        </div>
      )}

      <div style={{ 
        fontSize: "0.85rem", 
        fontWeight: "600", 
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span style={{ opacity: 0.5 }}>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{getPageTitle()}</span>
      </div>
    </header>
  );
}
