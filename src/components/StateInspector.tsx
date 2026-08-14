import React, { useState } from "react";
import { ShieldCheck, FileCheck, RefreshCw, Sparkles, AlertCircle, HardDrive } from "lucide-react";

export const StateInspector: React.FC = () => {
  const [testInput, setTestInput] = useState<string>(
    'My "Epic" Suno Song / Remix (100% Fire) <v2> *NEW* | :Special:'
  );

  const sanitizeFilename = (name: string, maxLength = 120): string => {
    if (!name || !name.trim()) return "untitled_track";
    // Remove invalid characters
    let sanitized = name.replace(/[\\/*?:"<>|]/g, "");
    // Remove control characters
    sanitized = Array.from(sanitized)
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join("");
    // Strip trailing/leading dots or spaces
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, "");
    if (!sanitized) return "untitled_track";
    return sanitized.slice(0, maxLength);
  };

  const sanitizedResult = sanitizeFilename(testInput);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-2 shadow-xl">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight">
            Resume Architecture & Cross-Platform Sanitizer
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Learn how the <code className="text-purple-300 bg-[#09090b] px-1.5 py-0.5 rounded font-mono">.suno_backup_state.json</code> state file and atomic temporary files prevent duplicate downloads, bandwidth waste, and corrupted media files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interactive Filename Sanitizer Test Lab */}
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-tight">
              Cross-Platform Filename Sanitizer Tester
            </h3>
          </div>

          <p className="text-xs text-zinc-400">
            Suno song titles frequently contain quotes, slashes, emojis, and special punctuation that crash Windows or Linux file systems. Test how titles are sanitized:
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 block">
              Raw Song Title Input:
            </label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400 block">
              Sanitizer Output (Safe for Win/Mac/Linux):
            </label>
            <div className="bg-[#09090b] border border-zinc-800/80 p-3 rounded-xl font-mono text-xs text-emerald-300 break-all">
              {sanitizedResult || <span className="text-zinc-600">Empty</span>}
            </div>
          </div>

          <div className="bg-[#09090b]/80 p-3 rounded-xl border border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300 block">Rules Applied:</span>
            <ul className="list-disc list-inside space-y-1">
              <li>Strips Windows reserved characters: <code className="text-amber-300">\ / * ? : &quot; &lt; &gt; |</code></li>
              <li>Removes non-printable ASCII control characters</li>
              <li>Trimming leading/trailing spaces and trailing dots</li>
              <li>Cap length at 120 characters to prevent path overflows</li>
            </ul>
          </div>
        </div>

        {/* Temporary File Protection Explanation */}
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-tight">
              Atomic .tmp Writes & Partial Download Safeguards
            </h3>
          </div>

          <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                1
              </div>
              <div>
                <strong className="text-zinc-100">Temporary File Extension (.tmp)</strong>
                <p className="text-zinc-400 text-[11px]">
                  Files are written as <code className="text-blue-300 font-mono">song_123.mp3.tmp</code> during stream download.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                2
              </div>
              <div>
                <strong className="text-zinc-100">Automatic Cleanup on Failure / Interrupt</strong>
                <p className="text-zinc-400 text-[11px]">
                  If the user cancels, or Wi-Fi drops mid-song, the incomplete <code className="text-blue-300 font-mono">.tmp</code> file is deleted immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                3
              </div>
              <div>
                <strong className="text-zinc-100">Atomic Rename on 100% Verification</strong>
                <p className="text-zinc-400 text-[11px]">
                  Only when 100% of bytes are written successfully is the file renamed to <code className="text-emerald-300 font-mono">song_123.mp3</code> and committed to the state log.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                4
              </div>
              <div>
                <strong className="text-zinc-100">Exponential Backoff Retries (3x)</strong>
                <p className="text-zinc-400 text-[11px]">
                  Transient network glitches trigger automatic retries with 1s, 2s, 4s backoff delays before marking a track failed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
