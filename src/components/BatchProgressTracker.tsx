import React from "react";
import {
  Music,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Zap,
  FastForward,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  Sparkles,
  Layers
} from "lucide-react";

export interface BatchTrackerProps {
  theme?: "dark" | "light";
  isRunning: boolean;
  progress: number;
  currentTrackIndex: number;
  totalTrackCount: number;
  wavSuccessCount: number;
  mp3FallbackCount: number;
  skippedCount: number;
  totalFilesDownloaded: number;
  totalBytesDownloaded: number;
  totalSleepSeconds: number;
  minDelay: number;
  maxDelay: number;
  activeTrackInfo: {
    title: string;
    id: string;
    status: string;
    format: "wav" | "mp3" | "checking" | "idle";
    subFolder?: string;
    step?: string;
    isSleeping?: boolean;
    sleepRemaining?: number;
  } | null;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const BatchProgressTracker: React.FC<BatchTrackerProps> = ({
  theme = "dark",
  isRunning,
  progress,
  currentTrackIndex,
  totalTrackCount,
  wavSuccessCount,
  mp3FallbackCount,
  skippedCount,
  totalFilesDownloaded,
  totalBytesDownloaded,
  totalSleepSeconds,
  minDelay,
  maxDelay,
  activeTrackInfo
}) => {
  const isLight = theme === "light";
  const totalAudioDownloaded = wavSuccessCount + mp3FallbackCount;
  const wavPercentage =
    totalAudioDownloaded > 0 ? Math.round((wavSuccessCount / totalAudioDownloaded) * 100) : 100;
  const mp3Percentage =
    totalAudioDownloaded > 0 ? Math.round((mp3FallbackCount / totalAudioDownloaded) * 100) : 0;

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl transition-all ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : "bg-[#121215] border-zinc-800 text-zinc-100"
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${
                isRunning
                  ? activeTrackInfo?.isSleeping
                    ? "bg-purple-500 animate-pulse"
                    : "bg-emerald-500 animate-ping"
                  : progress === 100
                  ? "bg-blue-500"
                  : "bg-zinc-500"
              }`}
            />
            <div
              className={`absolute inset-0 w-3 h-3 rounded-full ${
                isRunning
                  ? activeTrackInfo?.isSleeping
                    ? "bg-purple-500"
                    : "bg-emerald-500"
                  : progress === 100
                  ? "bg-blue-500"
                  : "bg-zinc-500"
              }`}
            />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center space-x-2">
              <span>Batch Download Monitor & WAV Quality Index</span>
              {isRunning && (
                <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                  QThread Active
                </span>
              )}
            </h3>
            <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
              Real-time monitoring for Lossless WAV vs MP3 fallback resolution & rate limit protection
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 font-mono text-[11px] ${
              activeTrackInfo?.isSleeping
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
                : isRunning
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {activeTrackInfo?.isSleeping
                ? `HUMAN MIMICRY SLEEP (${minDelay}s–${maxDelay}s)`
                : isRunning
                ? `DOWNLOADING (${currentTrackIndex}/${totalTrackCount})`
                : progress === 100
                ? "BATCH COMPLETE"
                : "READY TO SYNC"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Progress Bar Component */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700 dark:text-zinc-300">Overall Progress</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              {progress}%
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-70">
            {currentTrackIndex} of {totalTrackCount} tracks
          </span>
        </div>

        <div className="relative w-full h-4 bg-slate-100 dark:bg-[#09090b] border border-slate-300 dark:border-zinc-800 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 shadow-md ${
              activeTrackInfo?.isSleeping
                ? "bg-gradient-to-r from-purple-600 to-indigo-500 shadow-purple-500/30"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 shadow-blue-500/30"
            }`}
            style={{ width: `${Math.max(1, progress)}%` }}
          />
        </div>
      </div>

      {/* Real-time Quality & Fallback Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Card 1: WAV Success */}
        <div
          className={`border rounded-xl p-3 space-y-1 transition-all ${
            isLight
              ? "bg-emerald-50/60 border-emerald-200 text-slate-800"
              : "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lossless WAV</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.2 rounded">
              {wavPercentage}%
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {wavSuccessCount} <span className="text-xs font-normal opacity-80">tracks</span>
          </div>
          <p className="text-[10px] opacity-70 truncate">Pro 24-bit uncompressed WAV</p>
        </div>

        {/* Card 2: MP3 Fallbacks */}
        <div
          className={`border rounded-xl p-3 space-y-1 transition-all ${
            mp3FallbackCount > 0
              ? isLight
                ? "bg-amber-50/80 border-amber-300 text-slate-800"
                : "bg-amber-950/30 border-amber-500/40 text-amber-100"
              : isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-[#09090b] border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>MP3 Fallback</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded">
              {mp3Percentage}%
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {mp3FallbackCount} <span className="text-xs font-normal opacity-80">tracks</span>
          </div>
          <p className="text-[10px] opacity-70 truncate">CDN 403 / Free tier fallback</p>
        </div>

        {/* Card 3: Skipped (Resume) */}
        <div
          className={`border rounded-xl p-3 space-y-1 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#09090b] border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center space-x-1">
              <FastForward className="w-3.5 h-3.5" />
              <span>Resume Skipped</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.2 rounded">
              STATE
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-blue-500">
            {skippedCount} <span className="text-xs font-normal opacity-80">tracks</span>
          </div>
          <p className="text-[10px] opacity-70 truncate">Verified in state index</p>
        </div>

        {/* Card 4: Anti-Block Sleep Protection */}
        <div
          className={`border rounded-xl p-3 space-y-1 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#09090b] border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Anti-Block Delay</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded">
              HUMAN
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-purple-500">
            {totalSleepSeconds.toFixed(1)}s
          </div>
          <p className="text-[10px] opacity-70 truncate">Randomized sleep time</p>
        </div>
      </div>

      {/* Live Active Track Monitor Banner */}
      {activeTrackInfo && isRunning && (
        <div
          className={`border rounded-xl p-3.5 space-y-2 text-xs transition-colors ${
            activeTrackInfo.isSleeping
              ? isLight
                ? "bg-purple-50/70 border-purple-200 text-purple-900"
                : "bg-purple-950/30 border-purple-800/60 text-purple-200"
              : isLight
              ? "bg-blue-50/70 border-blue-200 text-slate-800"
              : "bg-blue-950/20 border-blue-900/60 text-blue-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 font-bold">
              {activeTrackInfo.isSleeping ? (
                <Clock className="w-4 h-4 text-purple-500 animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
              )}
              <span className="truncate max-w-xs sm:max-w-md">
                Active Track: '{activeTrackInfo.title}'
              </span>
            </div>

            <div className="flex items-center space-x-2 font-mono text-[11px]">
              {activeTrackInfo.format === "wav" && (
                <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>WAV SUCCESS</span>
                </span>
              )}
              {activeTrackInfo.format === "mp3" && (
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>MP3 FALLBACK</span>
                </span>
              )}
              {activeTrackInfo.format === "checking" && (
                <span className="bg-blue-500/20 text-blue-500 font-bold px-2 py-0.5 rounded border border-blue-500/30 animate-pulse">
                  TESTING WAV CANDIDATES...
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] opacity-80 pt-1 border-t border-slate-200/50 dark:border-zinc-800/50">
            <span>
              {activeTrackInfo.subFolder ? `Subfolder: /${activeTrackInfo.subFolder}` : "Root Directory"}
            </span>
            <span className="font-mono">
              {activeTrackInfo.isSleeping
                ? `⏱️ Human Mimicry Pause: ${activeTrackInfo.sleepRemaining?.toFixed(1)}s`
                : activeTrackInfo.step || "Processing files..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
