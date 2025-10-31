"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/elements/app-sidebar";

const STORAGE_KEY = "lupa-sidebar-collapsed";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }

    const handleStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 100);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{
          marginLeft: collapsed ? "3.5rem" : "14rem",
        }}
      >
        <div className="h-full px-4">{children}</div>
      </main>
    </div>
  );
}
