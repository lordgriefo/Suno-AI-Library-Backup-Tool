import React from "react";
import { Monitor, Code2, BookOpen, Download, ShieldCheck, Sun, Moon } from "lucide-react";

interface NavbarProps {
  activeTab: "simulator" | "code" | "state" | "guide";
  setActiveTab: (tab: "simulator" | "code" | "state" | "guide") => void;
  onDownloadScript: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onDownloadScript,
  theme = "dark",
  onToggleTheme,
}) => {
  const isLight = theme === "light";

  return (
    <header
      className={`border-b sticky top-0 z-50 transition-colors duration-200 ${
        isLight
          ? "bg-white/90 backdrop-blur-md border-slate-200 shadow-sm text-slate-800"
          : "bg-[#09090b] border-zinc-800/80 text-zinc-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`font-bold text-base sm:text-lg tracking-tight uppercase ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  Suno Archive Utility
                </span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                  v2.4.0
                </span>
              </div>
              <p
                className={`text-xs font-medium hidden sm:block ${
                  isLight ? "text-slate-500" : "text-zinc-500"
                }`}
              >
                Full Library Synchronizer & Asset Backup Tool
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "simulator"
                  ? isLight
                    ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
                    : "bg-zinc-800 text-blue-400 border border-zinc-700 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Qt GUI Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "code"
                  ? isLight
                    ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
                    : "bg-zinc-800 text-blue-400 border border-zinc-700 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python Code</span>
            </button>

            <button
              onClick={() => setActiveTab("state")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "state"
                  ? isLight
                    ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-sm"
                    : "bg-zinc-800 text-purple-400 border border-zinc-700 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>State & Sanitizer</span>
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "guide"
                  ? isLight
                    ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"
                    : "bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          </nav>

          {/* Quick Actions & Theme Toggle */}
          <div className="flex items-center space-x-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                type="button"
                className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-700"
                }`}
                title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isLight ? (
                  <>
                    <Moon className="w-4 h-4 text-purple-600" />
                    <span className="hidden lg:inline text-[11px] font-bold">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden lg:inline text-[11px] font-bold">Light</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onDownloadScript}
              className="hidden md:flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl shadow-md text-xs transition-all border border-blue-400/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>suno_backup.py</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

