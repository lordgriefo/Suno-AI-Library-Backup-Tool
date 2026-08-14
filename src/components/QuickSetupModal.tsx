import React, { useState } from "react";
import {
  HelpCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Key,
  Globe,
  Terminal,
  ShieldCheck,
  Sparkles,
  Search,
  Lock
} from "lucide-react";

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToken?: (token: string) => void;
  isLight?: boolean;
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  onApplyToken,
  isLight = false
}) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [testInput, setTestInput] = useState<string>("");
  const [detectedCleanToken, setDetectedCleanToken] = useState<string>("");

  if (!isOpen) return null;

  const handleCopy = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleInputChange = (val: string) => {
    setTestInput(val);
    let cleaned = val.trim();
    if (cleaned.toLowerCase().startsWith("bearer ")) {
      cleaned = cleaned.substring(7).trim();
    }
    // Remove surrounding quotes
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    setDetectedCleanToken(cleaned);
  };

  const handleApply = () => {
    if (detectedCleanToken && onApplyToken) {
      onApplyToken(detectedCleanToken);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl border rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#121215] border-zinc-800 text-zinc-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200/60 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">30-Second Suno Token Guide</h3>
                <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  QUICK SETUP
                </span>
              </div>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                Find your Suno authorization Bearer token in 3 simple browser clicks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600"
                : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Steps Grid */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div
            className={`border rounded-xl p-3.5 space-y-2 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#09090b] border-zinc-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] font-mono">
                  1
                </span>
                <span>Open Suno & Launch Developer Tools</span>
              </span>
              <a
                href="https://suno.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-500 hover:text-blue-400 font-semibold flex items-center space-x-1"
              >
                <span>Open suno.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
              Log into <strong className="text-amber-500">suno.com</strong> in your web browser (Chrome, Edge, Firefox, or Safari). Press <kbd className="bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">F12</kbd> (or <kbd className="bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+Shift+I</kbd> / <kbd className="bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">Cmd+Opt+I</kbd> on Mac).
            </p>
          </div>

          {/* Step 2 */}
          <div
            className={`border rounded-xl p-3.5 space-y-2 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#09090b] border-zinc-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-500 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] font-mono">
                  2
                </span>
                <span>Filter Network Requests</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                Network Tab
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
              Click on the <strong className="text-blue-400">Network</strong> tab inside Developer Tools. In the search filter box, type <code className="bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-mono font-bold">feed</code> or <code className="bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-mono font-bold">api</code>. Refresh the Suno web page if no requests appear.
            </p>
          </div>

          {/* Step 3 */}
          <div
            className={`border rounded-xl p-3.5 space-y-2 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#09090b] border-zinc-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-500 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] font-mono">
                  3
                </span>
                <span>Copy "Authorization" Header</span>
              </span>
              <button
                onClick={() => handleCopy("Authorization", 3)}
                className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1"
              >
                {copiedStep === 3 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStep === 3 ? "Copied!" : "Copy 'Authorization'"}</span>
              </button>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
              Click on any request to <code className="text-amber-400 font-mono">studio-api.suno.ai/api/feed/v2</code>. Look at <strong className="text-emerald-400">Headers → Request Headers</strong>. Find <code className="text-amber-400 font-mono">Authorization</code> and copy the long token starting after <code className="text-zinc-400 font-mono">Bearer ...</code>.
            </p>
          </div>
        </div>

        {/* Instant Token Tester / Paste Cleaner */}
        <div className="border border-blue-500/30 rounded-xl p-4 space-y-3 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Paste & Auto-Clean Token Here</span>
            </span>
            <span className="text-[10px] text-blue-400 font-mono">
              Auto-strips "Bearer " prefix & quotes
            </span>
          </div>

          <input
            type="text"
            value={testInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste raw string copied from browser headers (e.g. Bearer eyJhbGci...)"
            className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 ${
              isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
            }`}
          />

          {detectedCleanToken && (
            <div className="flex items-center justify-between pt-1">
              <div className="truncate max-w-sm text-[11px] font-mono text-emerald-500 font-medium">
                ✅ Clean Token Detected ({detectedCleanToken.length} chars): {detectedCleanToken.slice(0, 15)}...{detectedCleanToken.slice(-10)}
              </div>
              <button
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow-md shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to App</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-800/80">
          <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Tokens are stored locally in memory only.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
