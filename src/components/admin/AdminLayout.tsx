"use client";

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { AiAssistantPanel } from "./AiAssistantPanel";

export function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAssistantOpen, setAssistantOpen] = useState(false);

  const openSidebar = () => {
    setAssistantOpen(false);
    setSidebarOpen(true);
  };
  const closeAssistant = () => {
    setAssistantOpen(false);
    setSidebarOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {isAssistantOpen ? (
        <AiAssistantPanel onClose={closeAssistant} />
      ) : (
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onOpenAssistant={() => {
            setSidebarOpen(false);
            setAssistantOpen(true);
          }}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <AdminTopBar onMenuClick={openSidebar} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
