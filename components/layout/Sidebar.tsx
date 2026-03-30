"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Bug,
  GitMerge,
  Zap,
  Menu,
  X,
  Library,
  DatabaseZap,
  MonitorCheck,
  Repeat,
  ShieldCheck,
  BookOpen,
  History,
  PlayCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "#3b82f6",
  },
  {
    href: "/automated-tests",
    label: "Automated Tests",
    icon: PlayCircle,
    color: "#10b981",
  },
  {
    href: "/test-cases-generator",
    label: "Test Case Generator",
    icon: ClipboardList,
    color: "#8b5cf6",
  },
  {
    href: "/test-case-library",
    label: "Test Case Library",
    icon: Library,
    color: "#06b6d4",
  },
  { href: "/bug-report-enhancer", label: "Bug Report Enhancer", icon: Bug, color: "#f59e0b" },
  {
    href: "/regression-analyzer",
    label: "Regression Analyzer",
    icon: GitMerge,
    color: "#1b9e77",
  },
  {
    href: "/ai-smoke-tester",
    label: "AI Smoke Tester",
    icon: ShieldCheck,
    color: "#f59e0b",
  },
/*
  {
    href: "/ai-test-agent",
    label: "AI Test Agent",
    icon: MonitorCheck,
    color: "#10b981",
  },
*/
];

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const desktopWidth = isCollapsed ? "80px" : "260px";

  return (
    <>
      {/* Backdrop */}
      {isMobile && isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="sidebar-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 45,
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`sidebar-container app-sidebar ${isCollapsed ? "collapsed" : "expanded"} ${isMobileOpen ? "mobile-open" : ""
          }`}
        style={{
          width: isMobile ? "280px" : desktopWidth,
          minHeight: "100dvh",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          flexShrink: 0,
          transition: "width 0.28s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          zIndex: 50,
        }}
      >
        <style jsx>{`
          .sidebar-container {
            position: relative;
          }
          @media (max-width: 768px) {
            .sidebar-container {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 280px !important;
              transform: ${isMobileOpen ? "translateX(0)" : "translateX(-100%)"};
              box-shadow: ${isMobileOpen ? "20px 0 50px rgba(0,0,0,0.5)" : "none"};
              z-index: 60;
            }
          }
        `}</style>
        {/* Logo */}
        <div
          className="sidebar-logo"
          style={{
            height: "76px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: isCollapsed ? "2px" : "0px",
              transition: "margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <Zap size={20} color="white" fill="white" />
          </div>
          <div
            style={{
              opacity: isCollapsed ? 0 : 1,
              marginLeft: "14px",
              transition: "opacity 0.2s ease",
            }}
          >
            <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.2 }}>QA Copilot</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>AI Testing Assistant</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontWeight: "600",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0 8px",
              marginBottom: "8px",
              overflow: "hidden",
              opacity: isCollapsed ? 0 : 1,
              maxHeight: isCollapsed ? 0 : "30px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              whiteSpace: "nowrap",
            }}
          >
            Features
          </div>
          {navItems.map(({ href, label, icon: Icon, color }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onCloseMobile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: isCollapsed ? "44px" : "100%",
                  height: "44px",
                  margin: "0 auto",
                  padding: "0 12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  background: isActive ? `${color}15` : "transparent",
                  border: isActive ? `1px solid ${color}30` : "1px solid transparent",
                  color: isActive ? color : "var(--text-secondary)",
                  fontWeight: isActive ? "600" : "500",
                  fontSize: "0.875rem",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", flexShrink: 0 }}>
                  <Icon size={18} style={{ color: isActive ? color : "var(--text-muted)" }} />
                </div>
                <div style={{ marginLeft: "14px", opacity: isCollapsed ? 0 : 1, transition: "opacity 0.2s ease", flex: 1 }}>
                  {label}
                </div>
                {isActive && !isCollapsed && (
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        {/* Toggle Button */}
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onToggle}
            className="sidebar-toggle-btn"
            style={{
              width: isCollapsed ? "44px" : "100%",
              height: "44px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Footer */}
        <div
          className="sidebar-footer"
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            textAlign: isCollapsed ? "center" : "left",
            overflow: "hidden",
            whiteSpace: "nowrap"
          }}
        >
          <div style={{ opacity: isCollapsed ? 0 : 1, transition: "opacity 0.2s ease" }}>
            <div style={{ marginBottom: "2px" }}>Powered by Gemini 2.5</div>
             <div>MVP v1.0</div>
          </div>
        </div>
      </aside>

    </>
  );
}
