import React, { useState } from "react";
import { Key, Terminal, Play, Download, HelpCircle, ShieldAlert, Sparkles, Copy, Check, ExternalLink } from "lucide-react";

interface UsageGuideProps {
  onDownloadScript: () => void;
  theme?: "dark" | "light";
}

export const UsageGuide: React.FC<UsageGuideProps> = ({ onDownloadScript, theme = "dark" }) => {
  const isLight = theme === "light";
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [testInput, setTestInput] = useState<string>("");
  const [cleanToken, setCleanToken] = useState<string>("");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInputChange = (val: string) => {
    setTestInput(val);
    let cleaned = val.trim();
    if (cleaned.toLowerCase().startsWith("bearer ")) {
      cleaned = cleaned.substring(7).trim();
    }
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    setCleanToken(cleaned);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div
        className={`border rounded-2xl p-5 space-y-2 shadow-xl ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold uppercase tracking-tight">
            Setup & Execution Guide
          </h2>
        </div>
        <p className={`text-xs ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
          Follow these quick steps to extract your Suno Bearer Token and launch the PySide6 desktop backup tool on your computer.
        </p>
      </div>

      {/* Step 1: Get Token */}
      <div
        className={`border rounded-2xl p-5 space-y-4 shadow-xl ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold flex items-center space-x-2 uppercase tracking-tight">
            <Key className="w-4 h-4 text-amber-500" />
            <span>How to Find Your Suno Bearer Token (30 Seconds)</span>
          </h3>
        </div>

        <ol className={`list-decimal list-inside text-xs space-y-2 pl-2 leading-relaxed ${isLight ? "text-slate-700" : "text-zinc-300"}`}>
          <li>
            Open <a href="https://suno.com" target="_blank" rel="noreferrer" className="text-blue-500 underline font-semibold">suno.com <ExternalLink className="w-3 h-3 inline ml-0.5" /></a> in Chrome, Edge, Firefox, or Safari and log into your Suno account.
          </li>
          <li>
            Open Developer Tools by pressing <kbd className="bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">F12</kbd> (or <kbd className="bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl + Shift + I</kbd> / <kbd className="bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">Cmd + Option + I</kbd> on Mac).
          </li>
          <li>
            Click on the <strong className="text-blue-500">Network</strong> tab and filter by <code className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-mono font-bold">feed</code> or <code className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-mono font-bold">api</code>.
          </li>
          <li>
            Refresh the page or scroll your music library. Click on any network request to <code className="bg-slate-100 dark:bg-[#09090b] text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono">studio-api.suno.ai/api/feed/v2</code>.
          </li>
          <li>
            Under <strong className="text-emerald-500">Headers → Request Headers</strong>, locate <code className="text-amber-500 font-mono font-bold">Authorization</code>. Copy the long token string following <code className="font-mono opacity-80">Bearer ...</code>.
          </li>
          <li>
            <strong className="text-purple-500">Optional (for Cloudflare 503 bypass):</strong> Copy the full <code className="text-purple-500 font-mono font-bold">Cookie</code> header value from the same request.
          </li>
        </ol>

        {/* Quick Paste & Clean Tool */}
        <div className="border border-blue-500/30 rounded-xl p-4 space-y-3 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Token Cleaning Tool</span>
            </span>
            <span className="text-[10px] text-blue-500 font-mono">
              Auto-formats copied header string
            </span>
          </div>

          <input
            type="text"
            value={testInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste copied raw string here (e.g. Bearer eyJhbGci...)"
            className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 ${
              isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
            }`}
          />

          {cleanToken && (
            <div className="flex items-center justify-between pt-1">
              <div className="truncate max-w-md text-[11px] font-mono text-emerald-500 font-medium">
                ✅ Clean Bearer Token Ready ({cleanToken.length} chars)
              </div>
              <button
                onClick={() => handleCopy(cleanToken, "cleaned_token")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-md shrink-0"
              >
                {copiedIndex === "cleaned_token" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === "cleaned_token" ? "Copied!" : "Copy Clean Token"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-600 dark:text-amber-200 flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Security Notice:</strong> Your Bearer Token grants access to your Suno account. Never share your token publicly or check it into public git repositories.
          </span>
        </div>
      </div>

      {/* Step 2: Install PySide6 & Requests */}
      <div
        className={`border rounded-2xl p-5 space-y-3 shadow-xl ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold flex items-center space-x-2 uppercase tracking-tight">
            <Terminal className="w-4 h-4 text-blue-500" />
            <span>Install Dependencies</span>
          </h3>
        </div>

        <p className={`text-xs ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
          Ensure Python 3.8 or newer is installed on your computer, then install PySide6 (Qt) and Requests via pip:
        </p>

        <div className={`border rounded-xl p-3 font-mono text-xs text-blue-500 flex items-center justify-between ${
          isLight ? "bg-slate-50 border-slate-300" : "bg-[#09090b] border-zinc-800 text-blue-300"
        }`}>
          <code>pip install PySide6 requests</code>
          <button
            onClick={() => handleCopy("pip install PySide6 requests", "pip")}
            className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-300 dark:border-zinc-700 font-sans font-semibold flex items-center space-x-1"
          >
            {copiedIndex === "pip" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedIndex === "pip" ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Step 3: Run Script */}
      <div
        className={`border rounded-2xl p-5 space-y-3 shadow-xl ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold flex items-center space-x-2 uppercase tracking-tight">
            <Play className="w-4 h-4 text-emerald-500" />
            <span>Launch the Desktop App</span>
          </h3>
        </div>

        <p className={`text-xs ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
          Save the code as <code className="text-emerald-500 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">suno_backup.py</code> and execute it in your command prompt / terminal:
        </p>

        <div className={`border rounded-xl p-3 font-mono text-xs text-emerald-500 flex items-center justify-between ${
          isLight ? "bg-slate-50 border-slate-300" : "bg-[#09090b] border-zinc-800 text-emerald-300"
        }`}>
          <code>python suno_backup.py</code>
          <button
            onClick={() => handleCopy("python suno_backup.py", "run")}
            className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-300 dark:border-zinc-700 font-sans font-semibold flex items-center space-x-1"
          >
            {copiedIndex === "run" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedIndex === "run" ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onDownloadScript}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all text-xs border border-blue-400/20"
          >
            <Download className="w-4 h-4" />
            <span>Download suno_backup.py Script Now</span>
          </button>
        </div>
      </div>

      {/* Step 4: Video & Audio Direct Cloud Mode Explanation */}
      <div
        className={`border rounded-2xl p-5 space-y-3 shadow-xl ${
          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-tight">
            ⚡ Ultra-Fast 0% CPU Cloud Direct Architecture
          </h3>
        </div>

        <div className={`text-xs space-y-2 leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
          <p>
            <strong>Official Suno Lyric Videos (MP4):</strong> Suno renders high-definition lyric videos with dynamic text animations on their own cloud servers. When video backup is enabled, the tool sends on-demand render triggers to Suno’s servers without consuming your computer's CPU. Completed lyric videos are directly saved from Suno's CDN.
          </p>
          <p>
            <strong>Pro Tip for Large Libraries (1,000+ tracks):</strong> Keep <em>Video (MP4)</em> unchecked for maximum download speed. Your audio (WAV/MP3), cover art (JPG), and metadata (JSON/CSV) will download instantly at pure gigabit network speeds with zero CPU overhead.
          </p>
        </div>
      </div>
    </div>
  );
};

