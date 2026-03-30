"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      const tablet = width > 768 && width <= 1024;

      setIsMobile(mobile);
      if (mobile) setIsMobileOpen(false);
      if (tablet) setIsCollapsed(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="app-shell" style={{ display: "flex", height: "100dvh", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
      <Sidebar 
        isCollapsed={isCollapsed} 
        isMobile={isMobile} 
        isMobileOpen={isMobileOpen} 
        onCloseMobile={() => setIsMobileOpen(false)} 
        onToggle={toggleSidebar}
      />
      
      <main className="app-main" style={{ 
        flex: 1, 
        width: "100%", 
        minWidth: 0, 
        background: "var(--bg-primary)", 
        position: "relative", 
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden"
      }}>

        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
