"use client";

import { useState } from "react";
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
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "#3b82f6",
  },
  {
    href: "/test-flows",
    label: "Automated Tests",
    icon: PlayCircle,
    color: "#10b981",
  },
  {
    href: "/test-cases",
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
  { href: "/bug-report", label: "Bug Report Enhancer", icon: Bug, color: "#f59e0b" },
  {
    href: "/regression",
    label: "Regression Analyzer",
    icon: GitMerge,
    color: "#1b9e77",
  },
  {
    href: "/smoke-tester",
    label: "AI Smoke Tester",
    icon: ShieldCheck,
    color: "#f59e0b",
  },
  {
    href: "/ai-qa-assistant",
    label: "AI Test Agent",
    icon: MonitorCheck,
    color: "#10b981",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Top Bar */}
      <div
        className="mobile-only"
        style={{
          height: "60px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={toggleSidebar}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            padding: "8px",
            marginLeft: "-8px",
          }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginLeft: "12px",
          }}
        >
          <Zap size={20} color="#3b82f6" fill="#3b82f6" />
          <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>
            QA Copilot
          </span>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="mobile-only"
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
        className="sidebar-container"
        style={{
          width: "var(--sidebar-width)",
          minHeight: "100dvh",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          flexShrink: 0,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          zIndex: 50,
        }}
      >
        <style jsx>{`
          .sidebar-container {
            position: relative;
          }
          @media (max-width: 1024px) {
            .sidebar-container {
              position: fixed;
              width: 280px !important;
              transform: ${isOpen ? "translateX(0)" : "translateX(-100%)"};
              box-shadow: ${isOpen ? "20px 0 50px rgba(0,0,0,0.5)" : "none"};
            }
          }
        `}</style>
        {/* Logo */}
        <div
          className="desktop-only"
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
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
            }}
          >
            <Zap size={20} color="white" fill="white" />
          </div>
          <div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: "700",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              QA Copilot
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              AI Testing Assistant
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 12px", flex: 1, marginTop: "10px" }}>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontWeight: "600",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "8px 8px 4px",
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
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  textDecoration: "none",
                  background: isActive ? `${color}18` : "transparent",
                  border: isActive
                    ? `1px solid ${color}30`
                    : "1px solid transparent",
                  color: isActive ? color : "var(--text-secondary)",
                  fontWeight: isActive ? "600" : "400",
                  fontSize: "0.875rem",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={16} />
                {label}
                {isActive && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: color,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ marginBottom: "2px" }}>Powered by Gemini 2.5 Flash</div>
          <div>MVP v1.0</div>
        </div>
      </aside>

      {/* Spacer for fixed top bar on mobile */}
      <div className="mobile-only" style={{ height: "60px" }} />
    </>
  );
}
