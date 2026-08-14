import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { PySideSimulator } from "./components/PySideSimulator";
import { CodeInspector } from "./components/CodeInspector";
import { StateInspector } from "./components/StateInspector";
import { UsageGuide } from "./components/UsageGuide";
import { generatePythonScript } from "./pythonCode";

export default function App() {
  const [activeTab, setActiveTab] = useState<"simulator" | "code" | "state" | "guide">("simulator");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("suno_app_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("suno_app_theme", theme);
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleDownloadScript = () => {
    try {
      const scriptCode = generatePythonScript();
      const blob = new Blob([scriptCode], { type: "text/x-python;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "suno_backup.py";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback to API route
      window.open("/api/download-script", "_blank");
    }
  };

  const isLight = theme === "light";

  return (
    <div
      className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-blue-500 selection:text-white ${
        isLight
          ? "bg-slate-100 text-slate-800"
          : "bg-[#09090b] text-zinc-200"
      }`}
    >
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadScript={handleDownloadScript}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "simulator" && <PySideSimulator theme={theme} />}
        {activeTab === "code" && (
          <CodeInspector onDownloadScript={handleDownloadScript} theme={theme} />
        )}
        {activeTab === "state" && <StateInspector theme={theme} />}
        {activeTab === "guide" && (
          <UsageGuide onDownloadScript={handleDownloadScript} theme={theme} />
        )}
      </main>

      <footer
        className={`border-t py-6 text-center text-xs transition-colors ${
          isLight
            ? "bg-slate-200/80 border-slate-300 text-slate-600"
            : "bg-zinc-950 border-zinc-800/80 text-zinc-500"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[11px]">
            SUNO ARCHIVE UTILITY • PYSIDE6 (QT) & REALTIME AGENT SIMULATOR
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("code")}
              className="hover:text-blue-500 transition-colors"
            >
              Python Source
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className="hover:text-blue-500 transition-colors"
            >
              Setup Guide
            </button>
            <button
              onClick={handleDownloadScript}
              className="text-blue-500 font-semibold hover:text-blue-600 transition-colors"
            >
              suno_backup.py
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

