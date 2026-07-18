"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  TrendingUp,
  BarChart3,
  GitCompareArrows,
  Code2,
  Menu,
  X,
  CloudSun,
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/constants";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  home: Home,
  "building-2": Building2,
  "trending-up": TrendingUp,
  "bar-chart-3": BarChart3,
  "git-compare-arrows": GitCompareArrows,
  "code-2": Code2,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl sm:hidden shadow-lg"
        style={{
          background: "#ffffff",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)",
        }}
        aria-label={open ? "Tutup menu" : "Buka menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-2xl shadow-md shadow-blue-200/70"
            style={{ background: "var(--gradient-accent)" }}
          >
            <CloudSun size={20} className="text-white" />
          </div>
          <div className="sidebar-logo-text">
            <h1 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              WeatherInsight
            </h1>
            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              Cuaca Indonesia
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <p
            className="px-7 py-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Navigasi
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || Home;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive(item.href) ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span className="sidebar-text">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium sidebar-text" style={{ color: "var(--text-muted)" }}>
              Sistem berjalan normal
            </span>
          </div>
          <p className="mt-1 text-[10px] sidebar-text" style={{ color: "var(--text-muted)" }}>
            Open-Meteo · data berkala
          </p>
        </div>
      </aside>
    </>
  );
}
