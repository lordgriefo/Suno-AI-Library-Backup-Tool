import React, { useState } from "react";
import { Copy, Check, Download, FileCode, Sliders, Shield, Terminal } from "lucide-react";
import { generatePythonScript } from "../pythonCode";

interface CodeInspectorProps {
  onDownloadScript: () => void;
  theme?: "dark" | "light";
}

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  onDownloadScript,
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const [copied, setCopied] = useState<boolean>(false);
  const [cookieString, setCookieString] = useState<string>("");
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [downloadAudio, setDownloadAudio] = useState<boolean>(true);
  const [preferredAudioFormat, setPreferredAudioFormat] = useState<"wav" | "mp3">("wav");
  const [downloadVideo, setDownloadVideo] = useState<boolean>(true);
  const [downloadImages, setDownloadImages] = useState<boolean>(true);
  const [downloadMetadata, setDownloadMetadata] = useState<boolean>(true);
  const [generateReport, setGenerateReport] = useState<boolean>(true);
  const [folderGrouping, setFolderGrouping] = useState<"none" | "date" | "album">("none");

  const scriptCode = generatePythonScript({
    maxRetries,
    downloadAudio,
    preferredAudioFormat,
    preferWav: preferredAudioFormat === "wav",
    downloadVideo,
    downloadImages,
    downloadMetadata,
    generateReport,
    folderGrouping,
    cookieString,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Code Inspector Header Banner */}
      <div
        className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#121215] border-zinc-800 text-zinc-200"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`font-bold text-sm sm:text-base tracking-tight ${
                isLight ? "text-blue-600" : "text-blue-400"
              }`}
            >
              Complete Single-File Python Application (PySide6)
            </span>
            <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
              Standalone Script
            </span>
          </div>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
            A production-ready{" "}
            <code className="text-blue-500 bg-blue-50 dark:bg-[#09090b] dark:text-blue-300 font-mono px-1.5 py-0.5 rounded">
              suno_backup.py
            </code>{" "}
            script containing all GUI widgets, background{" "}
            <code className="text-blue-500 bg-blue-50 dark:bg-[#09090b] dark:text-blue-300 font-mono px-1.5 py-0.5 rounded">
              QThread
            </code>{" "}
            worker, retry logic, and atomic state saving.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 font-semibold px-3.5 py-2 rounded-xl text-xs transition-colors border ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Code"}</span>
          </button>

          <button
            onClick={onDownloadScript}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all border border-blue-400/20"
          >
            <Download className="w-4 h-4" />
            <span>Download suno_backup.py</span>
          </button>
        </div>
      </div>

      {/* Script Options Drawer */}
      <div
        className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl transition-colors ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-200"
        }`}
      >
        <div className={`flex items-center space-x-2 border-b pb-3 ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
          <Sliders className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Script Generator Default Settings
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 text-xs">
          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Max Retries Per File</label>
            <select
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className={`w-full border rounded-lg px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-blue-500 ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-200"
              }`}
            >
              <option value={1}>1 Attempt (No Retries)</option>
              <option value={3}>3 Attempts (Default - Exponential Backoff)</option>
              <option value={5}>5 Attempts (High Resilience)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Default Audio</label>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={downloadAudio}
                onChange={(e) => setDownloadAudio(e.target.checked)}
                className="rounded border-slate-300 text-blue-500"
              />
              <span>Download MP3/WAV</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Preferred Format</label>
            <select
              value={preferredAudioFormat}
              onChange={(e) => setPreferredAudioFormat(e.target.value as "wav" | "mp3")}
              disabled={!downloadAudio}
              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-200"
              }`}
            >
              <option value="wav">Lossless WAV (.wav) - Pro</option>
              <option value="mp3">Standard MP3 (.mp3)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Default Video</label>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={downloadVideo}
                onChange={(e) => setDownloadVideo(e.target.checked)}
                className="rounded border-slate-300 text-blue-500"
              />
              <span>Download MP4</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Default Artwork</label>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                className="rounded border-slate-300 text-blue-500"
              />
              <span>Download JPG</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Default Metadata</label>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={downloadMetadata}
                onChange={(e) => setDownloadMetadata(e.target.checked)}
                className="rounded border-slate-300 text-blue-500"
              />
              <span>Save JSON</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="opacity-70 font-medium block">Catalog Index</label>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={generateReport}
                onChange={(e) => setGenerateReport(e.target.checked)}
                className="rounded border-slate-300 text-purple-500"
              />
              <span className="text-purple-600 dark:text-purple-400 font-medium">CSV & JSON</span>
            </label>
          </div>

          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <label className="opacity-70 font-medium block">Default Subfolders</label>
            <select
              value={folderGrouping}
              onChange={(e) => setFolderGrouping(e.target.value as "none" | "date" | "album")}
              className={`w-full border rounded-lg px-2.5 py-1.5 font-sans text-xs focus:outline-none focus:border-purple-500 cursor-pointer ${
                isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-200"
              }`}
            >
              <option value="none">Flat Directory</option>
              <option value="date">Date (YYYY-MM)</option>
              <option value="album">Album / Genre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Code View Area */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#121215] px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200 font-bold">suno_backup.py</span>
            <span className="text-zinc-500">({scriptCode.split("\n").length} lines)</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-zinc-400">PySide6 (Qt) + requests</span>
            <span className="text-emerald-400 font-semibold">Python 3.8+</span>
          </div>
        </div>

        <div className="p-4 overflow-x-auto max-h-[600px] text-xs font-mono leading-relaxed text-zinc-300 selection:bg-blue-900 selection:text-blue-100">
          <pre>{scriptCode}</pre>
        </div>
      </div>
    </div>
  );
};
