import React, { useState, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  Folder,
  Play,
  Square,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  Server,
  Database,
  Clock,
  HardDrive,
  BarChart3,
  X,
  FileSpreadsheet,
  Download,
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Search,
  CheckSquare,
  Square as SquareIcon,
  ListChecks,
  FileJson,
  Sliders,
  BookOpen
} from "lucide-react";
import { MOCK_SUNO_TRACKS } from "../data/mockTracks";
import { LogEntry, BackupStateFile, SunoTrack } from "../types";
import { BatchProgressTracker } from "./BatchProgressTracker";
import { QuickSetupModal } from "./QuickSetupModal";

export interface BatchSummaryData {
  totalTracksProcessed: number;
  downloadedTracksCount: number;
  skippedTracksCount: number;
  totalFilesCreated: number;
  totalBytesDownloaded: number;
  formattedSize: string;
  durationSeconds: number;
  formattedDuration: string;
  saveDirectory: string;
  folderGrouping: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const PySideSimulator: React.FC<{ theme?: "dark" | "light" }> = ({ theme = "dark" }) => {
  const isLight = theme === "light";
  
  // Tab Navigation: Dashboard, Library / Batch Downloader, Guide, Settings
  const [activeTab, setActiveTab] = useState<"dashboard" | "library" | "guide" | "settings">("dashboard");

  const [bearerToken, setBearerToken] = useState<string>("mock_suno_bearer_token_12345");
  const [cookieString, setCookieString] = useState<string>("");
  const [showToken, setShowToken] = useState<boolean>(false);
  const [saveDirectory, setSaveDirectory] = useState<string>("/Users/music/Suno_Backup");

  const [downloadAudio, setDownloadAudio] = useState<boolean>(true);
  const [preferredFormat, setPreferredFormat] = useState<"wav" | "mp3">("wav");
  const [preferWav, setPreferWav] = useState<boolean>(true);
  const [downloadVideo, setDownloadVideo] = useState<boolean>(false);
  const [downloadImages, setDownloadImages] = useState<boolean>(true);
  const [downloadMetadata, setDownloadMetadata] = useState<boolean>(true);
  const [generateReport, setGenerateReport] = useState<boolean>(true);
  const [folderGrouping, setFolderGrouping] = useState<"none" | "date" | "album">("none");

  // Human Mimicry / Anti-Block Randomized Delay
  const [minDelay, setMinDelay] = useState<number>(1.0);
  const [maxDelay, setMaxDelay] = useState<number>(3.0);

  // Library multi-selection & search state
  const [libraryTracks, setLibraryTracks] = useState<SunoTrack[]>(MOCK_SUNO_TRACKS);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set(MOCK_SUNO_TRACKS.map(t => t.id)));
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>("");
  const [libraryFilterStatus, setLibraryFilterStatus] = useState<"all" | "completed" | "pending">("all");

  // Batch Tracker Live Statistics State
  const [wavSuccessCount, setWavSuccessCount] = useState<number>(0);
  const [mp3FallbackCount, setMp3FallbackCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [totalBytesDownloaded, setTotalBytesDownloaded] = useState<number>(0);
  const [totalFilesDownloaded, setTotalFilesDownloaded] = useState<number>(0);
  const [totalSleepSeconds, setTotalSleepSeconds] = useState<number>(0);
  const [activeTrackInfo, setActiveTrackInfo] = useState<{
    title: string;
    id: string;
    status: string;
    format: "wav" | "mp3" | "checking" | "idle";
    subFolder?: string;
    step?: string;
    isSleeping?: boolean;
    sleepRemaining?: number;
  } | null>(null);

  // Quick Setup Token Helper Modal State
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState<boolean>(false);

  // Export CSV catalog with full metadata (lyrics, style tags, duration, status, URLs)
  const handleExportCsvCatalog = () => {
    const headers = [
      "id",
      "title",
      "created_at",
      "model_name",
      "style_tags_and_prompt",
      "lyrics",
      "duration_seconds",
      "is_liked",
      "audio_url",
      "video_url",
      "image_url",
      "backup_status"
    ];

    const csvRows = [headers.join(",")];
    
    libraryTracks.forEach((track) => {
      const isCompleted = stateFile.completed_clips[track.id] ? "Completed" : "Pending";
      const cleanTitle = (track.title || "").replace(/"/g, '""');
      const cleanPrompt = (track.prompt || "").replace(/"/g, '""');
      const cleanLyrics = (track.gpt_description_prompt || track.prompt || "").replace(/"/g, '""');
      
      const row = [
        `"${track.id}"`,
        `"${cleanTitle}"`,
        `"${track.created_at || ""}"`,
        `"${track.model_name || "v3.5"}"`,
        `"${cleanPrompt}"`,
        `"${cleanLyrics}"`,
        `"${track.duration || 120}"`,
        `"${track.is_liked ? "TRUE" : "FALSE"}"`,
        `"${track.audio_url || ""}"`,
        `"${track.video_url || ""}"`,
        `"${track.image_url || ""}"`,
        `"${isCompleted}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `suno_library_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog("📥 Exported 'suno_library_catalog.csv' offline spreadsheet catalog directly to your downloads!", "success");
  };

  // Export JSON library metadata file
  const handleExportJsonCatalog = () => {
    const exportData = {
      export_timestamp: new Date().toISOString(),
      generator: "Suno AI Library Backup Tool",
      total_tracks: libraryTracks.length,
      completed_tracks: Object.keys(stateFile.completed_clips).length,
      tracks: libraryTracks.map((track) => ({
        id: track.id,
        title: track.title,
        created_at: track.created_at,
        model_name: track.model_name || "chirp-v3-5",
        style_prompt: track.prompt,
        lyrics: track.gpt_description_prompt || track.prompt,
        duration: track.duration || 120,
        is_liked: track.is_liked || false,
        audio_url: track.audio_url,
        wav_url: track.wav_url,
        video_url: track.video_url,
        image_url: track.image_url,
        image_large_url: track.image_large_url,
        backup_status: stateFile.completed_clips[track.id] ? "completed" : "pending",
        backup_files: stateFile.completed_clips[track.id]?.files || []
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `suno_library_metadata_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog("📥 Exported 'suno_library_metadata.json' structured metadata archive directly to your downloads!", "success");
  };

  // Toggle single track selection
  const handleToggleSelectTrack = (id: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Master selection handlers
  const handleSelectAll = () => {
    setSelectedTrackIds(new Set(libraryTracks.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedTrackIds(new Set());
  };

  const handleSelectPending = () => {
    const pendingIds = libraryTracks
      .filter((t) => !stateFile.completed_clips[t.id])
      .map((t) => t.id);
    setSelectedTrackIds(new Set(pendingIds));
  };

  // Summary result state
  const [batchSummary, setBatchSummary] = useState<BatchSummaryData | null>(null);

  // Connection mode: Mock or Live Proxy
  const [useLiveApi, setUseLiveApi] = useState<boolean>(false);

  // Download Process State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  
  const [progress, setProgress] = useState<number>(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [totalTrackCount, setTotalTrackCount] = useState<number>(MOCK_SUNO_TRACKS.length);

  // Local simulated state tracking file (.suno_backup_state.json)
  const [stateFile, setStateFile] = useState<BackupStateFile>({
    completed_clips: {
      "a1b2c3d4-e5f6-7890-abcd-111111111111": {
        title: "Midnight Cyberpunk Synthwave Drive",
        completed_at: "2026-08-10 11:30:00",
        files: ["Midnight_Cyberpunk_Synthwave_Drive_a1b2c3d4.mp3", "Midnight_Cyberpunk_Synthwave_Drive_a1b2c3d4.json"]
      }
    },
    last_updated: "2026-08-10 11:30:00"
  });

  // Real-Time Authentication Indicator State
  const [authStatus, setAuthStatus] = useState<"idle" | "checking" | "active" | "invalid">("idle");
  const [authMessage, setAuthMessage] = useState<string>("Enter Suno Bearer Token to verify connection");
  const [authTrackCount, setAuthTrackCount] = useState<number | null>(null);
  const [authHttpStatus, setAuthHttpStatus] = useState<number | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [ticker, setTicker] = useState<number>(0);

  // 1-Second interval ticker for live countdown and JWT evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to decode JWT expiry (re-calculated on every tick or token change)
  const getJwtStatus = (token: string) => {
    if (!token || !token.trim()) return null;
    try {
      const clean = token.replace(/Bearer\s+/i, "").trim();
      const parts = clean.split(".");
      if (parts.length !== 3) return { isValidFormat: false, message: "Invalid JWT format" };
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return { isValidFormat: true, isExpired: false, message: "No expiration timestamp" };
      const expTime = payload.exp * 1000;
      const now = Date.now();
      const diffSec = Math.round((expTime - now) / 1000);
      const expDate = new Date(expTime).toLocaleTimeString();
      if (diffSec <= 0) {
        return {
          isValidFormat: true,
          isExpired: true,
          diffSec: Math.abs(diffSec),
          expDate,
          message: `Expired ${Math.abs(diffSec)}s ago (${expDate})`
        };
      }
      return {
        isValidFormat: true,
        isExpired: false,
        diffSec,
        expDate,
        message: `Valid for ${diffSec}s (Expires at ${expDate})`
      };
    } catch {
      return { isValidFormat: false, message: "Could not decode JWT payload" };
    }
  };

  const jwtStatus = getJwtStatus(bearerToken);

  // Real-time API check against /api/suno-validate
  const validateAuth = async (token: string, cookie: string, silent = false) => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      setAuthStatus("idle");
      setAuthMessage("No Bearer token entered");
      setAuthTrackCount(null);
      setAuthHttpStatus(null);
      return;
    }

    const jwt = getJwtStatus(cleanToken);
    if (jwt?.isExpired) {
      setAuthStatus("invalid");
      setAuthMessage(`Invalid: Bearer token expired ${jwt.diffSec}s ago`);
      setAuthHttpStatus(401);
      setLastCheckedTime(new Date().toLocaleTimeString());
      return;
    }

    setAuthStatus("checking");
    try {
      const res = await fetch("/api/suno-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cleanToken, cookie: cookie.trim() })
      });
      const data = await res.json();
      setLastCheckedTime(new Date().toLocaleTimeString());
      if (data.valid) {
        setAuthStatus("active");
        setAuthMessage(data.message || "Active • Verified with Suno API");
        setAuthTrackCount(data.trackCount || 0);
        setAuthHttpStatus(200);
        if (!silent) {
          addLog(`✅ [Auth Check] Suno API Connection Active (${data.trackCount || 0} tracks discovered).`, "success");
        }
      } else {
        setAuthStatus("invalid");
        setAuthMessage(data.message || "Invalid Bearer Token");
        setAuthHttpStatus(data.httpStatus || 401);
        if (!silent) {
          addLog(`❌ [Auth Check] Suno API check: ${data.message}`, "error");
        }
      }
    } catch (err: any) {
      if (jwt && !jwt.isExpired) {
        setAuthStatus("active");
        setAuthMessage(`Active (JWT Valid for ${jwt.diffSec}s)`);
        setAuthHttpStatus(200);
      } else {
        setAuthStatus("invalid");
        setAuthMessage(`API Check Error: ${err.message}`);
        setAuthHttpStatus(500);
      }
    }
  };

  // Debounced auto-check when bearerToken or cookieString changes
  useEffect(() => {
    if (!bearerToken.trim()) {
      setAuthStatus("idle");
      setAuthMessage("No Bearer token entered");
      return;
    }
    const timer = setTimeout(() => {
      validateAuth(bearerToken, cookieString, true);
    }, 600);

    return () => clearTimeout(timer);
  }, [bearerToken, cookieString]);

  // Synchronize expired JWT with authStatus
  useEffect(() => {
    if (jwtStatus?.isExpired && authStatus === "active") {
      setAuthStatus("invalid");
      setAuthMessage(`Invalid: Bearer token expired ${jwtStatus.diffSec}s ago`);
      setAuthHttpStatus(401);
    }
  }, [ticker, jwtStatus?.isExpired, authStatus]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      message: "Suno AI Library Backup Tool initialized (PySide6 / Qt6)",
      level: "info"
    },
    {
      id: "2",
      timestamp: new Date().toLocaleTimeString(),
      message: "Loaded existing state file (.suno_backup_state.json). 1 track previously completed.",
      level: "info"
    }
  ]);

  const logBoxRef = useRef<HTMLDivElement>(null);
  const activeWorkerRef = useRef<boolean>(false);

  // Auto scroll log window
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, level: LogEntry["level"] = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: timeStr,
        message,
        level
      }
    ]);
  };

  const completedCount = Object.keys(stateFile.completed_clips).length;
  const remainingCount = Math.max(0, totalTrackCount - completedCount);

  // Sanitize helper
  const sanitize = (str: string) => {
    return str
      .replace(/[\\/*?:"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 50);
  };

  // Start or Resume Backup Process
  const handleStartBackup = async (tracksOverride?: SunoTrack[]) => {
    if (!bearerToken.trim()) {
      addLog("ERROR: Please enter a valid Suno Bearer Token.", "error");
      return;
    }

    setIsRunning(true);
    setIsCancelled(false);
    activeWorkerRef.current = true;
    setProgress(0);
    setCurrentTrackIndex(0);
    setBatchSummary(null);

    // Reset Batch Progress Tracker
    setWavSuccessCount(0);
    setMp3FallbackCount(0);
    setSkippedCount(0);
    setTotalBytesDownloaded(0);
    setTotalFilesDownloaded(0);
    setTotalSleepSeconds(0);
    setActiveTrackInfo(null);

    const startTime = Date.now();
    let totalFilesCount = 0;
    let totalBytesCount = 0;
    let downloadedTracksCount = 0;
    let skippedTracksCount = 0;
    let wavCount = 0;
    let mp3Count = 0;
    let accumulatedSleep = 0;

    addLog("----------------------------------------------------------------", "info");
    addLog("▶ QThread Background Worker launched.", "info");
    addLog(`Target Backup Directory: ${saveDirectory}`, "info");

    let tracksToProcess: SunoTrack[] = [];

    if (tracksOverride && tracksOverride.length > 0) {
      tracksToProcess = tracksOverride;
      setTotalTrackCount(tracksOverride.length);
      addLog(`🎯 Batch Queue initialized with ${tracksOverride.length} selected tracks.`, "info");
    } else if (useLiveApi) {
      addLog("Connecting to Suno AI Live API (https://studio-api.suno.ai/api/feed/)...", "info");
      try {
        const res = await fetch("/api/suno-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: bearerToken, cookie: cookieString, page: 0 })
        });
        const data = await res.json();
        if (data.error) {
          addLog(`API Connection Failed: ${data.error}`, "error");
          setIsRunning(false);
          return;
        }
        const fetchedClips = Array.isArray(data)
          ? data
          : data.clips || data.items || data.data || [];

        if (fetchedClips.length === 0) {
          addLog("No tracks returned from Suno API. Token may be invalid or feed is empty.", "warn");
          setIsRunning(false);
          return;
        }
        tracksToProcess = fetchedClips;
        setLibraryTracks(fetchedClips);
        setTotalTrackCount(fetchedClips.length);
        addLog(`Successfully retrieved ${fetchedClips.length} tracks from live Suno account!`, "success");
      } catch (err: any) {
        addLog(`Failed to proxy Suno API: ${err.message}. Falling back to simulated feed.`, "warn");
        tracksToProcess = MOCK_SUNO_TRACKS;
        setTotalTrackCount(MOCK_SUNO_TRACKS.length);
      }
    } else {
      tracksToProcess = MOCK_SUNO_TRACKS;
      setTotalTrackCount(MOCK_SUNO_TRACKS.length);
      addLog(`Loaded local library feed (${MOCK_SUNO_TRACKS.length} tracks).`, "info");
    }

    addLog(`Cross-referencing .suno_backup_state.json...`, "info");
    addLog(`State analysis: ${completedCount} already completed, ${remainingCount} remaining.`, "info");

    // Process Loop
    for (let i = 0; i < tracksToProcess.length; i++) {
      if (!activeWorkerRef.current) {
        addLog("🛑 Download process interrupted by user.", "warn");
        break;
      }

      const track = tracksToProcess[i];
      const trackTitle = track.title || `suno_${track.id.slice(0, 8)}`;
      const cleanName = sanitize(trackTitle);
      const prefix = `${cleanName}_${track.id.slice(0, 8)}`;

      // RESUME CHECK: Skip if already in state file!
      if (stateFile.completed_clips[track.id]) {
        addLog(`[${i + 1}/${tracksToProcess.length}] ⏭ [SKIP] Track '${trackTitle}' (${track.id.slice(0, 8)}) is already in state file.`, "warn");
        skippedTracksCount++;
        setSkippedCount(skippedTracksCount);
        setCurrentTrackIndex(i + 1);
        setProgress(Math.round(((i + 1) / tracksToProcess.length) * 100));
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      // HUMAN MIMICRY / ANTI-BLOCK SLEEP DELAY (Randomized sleep before download)
      if (downloadedTracksCount > 0 && maxDelay > 0) {
        const delaySec = Number((Math.random() * (maxDelay - minDelay) + minDelay).toFixed(1));
        accumulatedSleep += delaySec;
        setTotalSleepSeconds(accumulatedSleep);
        addLog(`  ⏱️ [Human Mimicry] Pausing ${delaySec}s before track request to prevent CDN 403 rate-limiting...`, "info");

        setActiveTrackInfo({
          title: trackTitle,
          id: track.id,
          status: "Human Mimicry Pause",
          format: "checking",
          isSleeping: true,
          sleepRemaining: delaySec,
          step: `Pausing ${delaySec}s between requests...`
        });

        // Sleep countdown loop
        const steps = Math.ceil(delaySec * 10);
        for (let s = 0; s < steps; s++) {
          if (!activeWorkerRef.current) break;
          const rem = Math.max(0, delaySec - s * 0.1);
          setActiveTrackInfo((prev) => prev ? { ...prev, sleepRemaining: Number(rem.toFixed(1)) } : null);
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (!activeWorkerRef.current) break;

      addLog(`[${i + 1}/${tracksToProcess.length}] 📥 [DOWNLOADING] '${trackTitle}'...`, "info");

      let subFolder = "";
      if (folderGrouping === "date") {
        subFolder = track.created_at ? track.created_at.slice(0, 7) : "2026-08";
      } else if (folderGrouping === "album") {
        const rawAlbum = track.playlist_title || track.playlist_name || track.album_name;
        if (rawAlbum) {
          subFolder = sanitize(rawAlbum).slice(0, 40) || "Single Tracks";
        } else {
          const rawGenre = track.prompt ? track.prompt.split(",")[0].trim() : (track.model_name || "Single Tracks");
          subFolder = `Style - ${sanitize(rawGenre).slice(0, 30)}` || "Single Tracks";
        }
      }

      const folderPrefix = subFolder ? `${subFolder}/` : "";
      if (subFolder) {
        addLog(`   └─ [FOLDER] Routing into subfolder: /${subFolder}`, "info");
      }

      setActiveTrackInfo({
        title: trackTitle,
        id: track.id,
        status: "Downloading Track Assets",
        format: "checking",
        subFolder,
        isSleeping: false,
        step: "Initializing track stream..."
      });

      // Simulate step-by-step partial downloads with .tmp protection
      const downloadedFiles: string[] = [];

      if (downloadMetadata) {
        const file = `${folderPrefix}${prefix}.json`;
        addLog(`   └─ Writing metadata -> ${file}.tmp ...`, "info");
        await new Promise((r) => setTimeout(r, 200));
        addLog(`   └─ [OK] Renamed ${file}.tmp -> ${file}`, "success");
        downloadedFiles.push(file);
        totalFilesCount++;
        totalBytesCount += 12 * 1024;
        setTotalFilesDownloaded(totalFilesCount);
        setTotalBytesDownloaded(totalBytesCount);
      }

      if (!activeWorkerRef.current) break;

      if (downloadAudio && (track.audio_url || track.wav_url)) {
        const isWavPreferred = preferWav;
        // Simulate 90% WAV success, 10% CDN 403 fallback to MP3 when preferWav is checked
        const isWavSuccess = isWavPreferred && (Boolean(track.wav_url) || !track.id.includes("444"));
        const ext = isWavSuccess ? ".wav" : ".mp3";
        const file = `${folderPrefix}${prefix}${ext}`;

        if (isWavSuccess) {
          wavCount++;
          setWavSuccessCount(wavCount);
          setActiveTrackInfo({
            title: trackTitle,
            id: track.id,
            status: "Downloaded Lossless WAV",
            format: "wav",
            subFolder,
            isSleeping: false,
            step: "Uncompressed 24-bit WAV saved successfully (34.5MB)"
          });
          addLog(`   └─ [WAV SUCCESS] Downloaded uncompressed 24-bit WAV for '${trackTitle}'`, "success");
        } else if (isWavPreferred) {
          mp3Count++;
          setMp3FallbackCount(mp3Count);
          setActiveTrackInfo({
            title: trackTitle,
            id: track.id,
            status: "CDN 403 Forbidden -> MP3 Fallback",
            format: "mp3",
            subFolder,
            isSleeping: false,
            step: "WAV CDN 403 Forbidden. Downloaded MP3 fallback (5.2MB)"
          });
          addLog(`   └─ [WAV Fallback] WAV unavailable/403 for '${trackTitle}'. Downloaded MP3 fallback!`, "warn");
        } else {
          mp3Count++;
          setMp3FallbackCount(mp3Count);
          setActiveTrackInfo({
            title: trackTitle,
            id: track.id,
            status: "Downloaded Standard MP3",
            format: "mp3",
            subFolder,
            isSleeping: false,
            step: "Standard MP3 audio saved (5.2MB)"
          });
          addLog(`   └─ Streaming audio -> ${file}.tmp [MP3]...`, "info");
        }

        await new Promise((r) => setTimeout(r, 300));
        addLog(`   └─ [OK] Renamed ${file}.tmp -> ${file}`, "success");
        downloadedFiles.push(file);
        totalFilesCount++;
        totalBytesCount += isWavSuccess ? 34.5 * 1024 * 1024 : 5.2 * 1024 * 1024;
        setTotalFilesDownloaded(totalFilesCount);
        setTotalBytesDownloaded(totalBytesCount);
      }

      if (!activeWorkerRef.current) break;

      if (downloadVideo && track.video_url) {
        const file = `${folderPrefix}${prefix}.mp4`;
        addLog(`   └─ Streaming video -> ${file}.tmp ...`, "info");
        await new Promise((r) => setTimeout(r, 250));
        addLog(`   └─ [OK] Renamed ${file}.tmp -> ${file}`, "success");
        downloadedFiles.push(file);
        totalFilesCount++;
        totalBytesCount += 14.2 * 1024 * 1024;
        setTotalFilesDownloaded(totalFilesCount);
        setTotalBytesDownloaded(totalBytesCount);
      }

      if (!activeWorkerRef.current) break;

      if (downloadImages && (track.image_large_url || track.image_url)) {
        const file = `${folderPrefix}${prefix}.jpg`;
        addLog(`   └─ Fetching cover artwork -> ${file}.tmp ...`, "info");
        await new Promise((r) => setTimeout(r, 150));
        addLog(`   └─ [OK] Renamed ${file}.tmp -> ${file}`, "success");
        downloadedFiles.push(file);
        totalFilesCount++;
        totalBytesCount += 850 * 1024;
        setTotalFilesDownloaded(totalFilesCount);
        setTotalBytesDownloaded(totalBytesCount);
      }

      if (!activeWorkerRef.current) break;

      // Update state file atomically
      const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19);
      setStateFile((prev) => ({
        completed_clips: {
          ...prev.completed_clips,
          [track.id]: {
            title: trackTitle,
            completed_at: nowStr,
            files: downloadedFiles
          }
        },
        last_updated: nowStr
      }));

      downloadedTracksCount++;
      addLog(`✅ [COMPLETE] '${trackTitle}' saved & logged to .suno_backup_state.json!`, "success");

      setCurrentTrackIndex(i + 1);
      setProgress(Math.round(((i + 1) / tracksToProcess.length) * 100));
      await new Promise((r) => setTimeout(r, 150));
    }

    if (generateReport && !isCancelled) {
      addLog("📊 [CATALOG REPORT] Compiling offline searchable library catalog index...", "info");
      await new Promise((r) => setTimeout(r, 200));
      addLog("   └─ [OK] Exported suno_library_catalog.csv (Searchable CSV index)", "success");
      addLog("   └─ [OK] Exported suno_library_catalog.json (Structured JSON library catalog)", "success");
      totalFilesCount += 2;
    }

    setIsRunning(false);
    activeWorkerRef.current = false;

    if (!isCancelled) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const formattedSize = formatBytes(totalBytesCount);
      const formattedDuration = formatDuration(durationSeconds);

      const summary: BatchSummaryData = {
        totalTracksProcessed: tracksToProcess.length,
        downloadedTracksCount,
        skippedTracksCount,
        totalFilesCreated: totalFilesCount,
        totalBytesDownloaded: totalBytesCount,
        formattedSize,
        durationSeconds,
        formattedDuration,
        saveDirectory,
        folderGrouping,
      };

      setBatchSummary(summary);

      addLog("=======================================================", "success");
      addLog("🎉 BATCH BACKUP COMPLETE SUMMARY", "success");
      addLog(`• Total Tracks Processed: ${tracksToProcess.length} (${downloadedTracksCount} downloaded, ${skippedTracksCount} skipped)`, "success");
      addLog(`• Total Files Downloaded: ${totalFilesCount} files`, "success");
      addLog(`• Total Size Downloaded: ${formattedSize}`, "success");
      addLog(`• Duration Taken: ${formattedDuration}`, "success");
      addLog(`• Destination Directory: ${saveDirectory}`, "success");
      addLog("=======================================================", "success");
    }
  };

  const handleCancel = () => {
    activeWorkerRef.current = false;
    setIsCancelled(true);
    setIsRunning(false);
    addLog("🛑 Cancellation signal sent. Cleaning up active .tmp files...", "warn");
  };

  const handleResetState = () => {
    setStateFile({
      completed_clips: {},
      last_updated: new Date().toISOString().replace("T", " ").slice(0, 19)
    });
    setProgress(0);
    setCurrentTrackIndex(0);
    addLog("🧹 Reset .suno_backup_state.json - state file cleared.", "warn");
  };

  const handleSimulateDrop = () => {
    if (isRunning) {
      activeWorkerRef.current = false;
      setIsRunning(false);
      addLog("⚡ [SIMULATION] Connection dropped mid-stream! .tmp file discarded safely.", "error");
      addLog("👉 Notice how clicking 'Start / Resume Backup' now skips finished tracks and picks up right here!", "info");
    } else {
      addLog("Start a backup first, then click 'Simulate Drop' during a download to test resume!", "warn");
    }
  };

  const handleStartBatchSelected = () => {
    const selected = libraryTracks.filter((t) => selectedTrackIds.has(t.id));
    if (selected.length === 0) {
      addLog("⚠️ No tracks selected. Please check at least one track in the Library Catalog table.", "warn");
      return;
    }
    setActiveTab("dashboard");
    addLog(`🎯 Initiating batch download for ${selected.length} user-selected songs...`, "info");
    handleStartBackup(selected);
  };

  return (
    <div className="space-y-6">
      {/* Suno Sept 3 Download Limits Alert Notice */}
      <div
        className={`border rounded-2xl p-4 flex items-start space-x-3.5 shadow-md ${
          isLight
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-amber-950/40 border-amber-500/30 text-amber-200"
        }`}
      >
        <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider text-amber-500 text-[11px]">
              Critical Notice: Suno Download Policy Change (Sept 3)
            </span>
            <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
              20 / Month Limit
            </span>
          </div>
          <p className="leading-relaxed">
            Suno will be capping track downloads for non-unlimited plans to <strong>20 downloads per month starting September 3rd</strong>. Use this <strong>Suno Archive Utility</strong> to batch back up your entire music library (Lossless WAV, MP3, 1080p MP4 Videos, Art, & Metadata JSON) locally before the limits take effect!
          </p>
        </div>
      </div>

      {/* Explanation Banner */}
      <div
        className={`border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#121215] border-zinc-800/90 text-zinc-200"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`font-bold text-sm sm:text-base tracking-tight ${
                isLight ? "text-blue-600" : "text-blue-400"
              }`}
            >
              Interactive Qt / PySide6 Window Simulator
            </span>
            <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
              Live Demo
            </span>
          </div>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
            This simulator reproduces the exact Qt widget hierarchy, state file mechanics, and background{" "}
            <code className="text-blue-500 bg-blue-50 dark:bg-zinc-900 dark:text-blue-300 px-1 py-0.5 rounded font-mono">
              QThread
            </code>{" "}
            execution of the Python script.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setUseLiveApi(!useLiveApi)}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              useLiveApi
                ? "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                : isLight
                ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Mode: {useLiveApi ? "Live Suno Proxy API" : "Simulated Local Feed"}</span>
          </button>
        </div>
      </div>

      {/* Simulated PySide6 / Qt Window Frame */}
      <div
        className={`border rounded-2xl shadow-2xl overflow-hidden transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#09090b] border-zinc-800/90 text-zinc-100"
        }`}
      >
        {/* Title Bar */}
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between select-none ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-700"
              : "bg-[#121215] border-zinc-800 text-zinc-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            </div>
            <span className="text-xs font-bold ml-2 uppercase tracking-wide">
              Suno AI Library Backup Tool (PySide6 / Qt6)
            </span>
          </div>
          <span className="text-[10px] opacity-60 font-mono">QApp::exec()</span>
        </div>

        {/* Window Content */}
        <div
          className={`p-5 sm:p-6 space-y-5 transition-colors ${
            isLight ? "bg-slate-50/50 text-slate-800" : "bg-[#09090b] text-zinc-100"
          }`}
        >
          {/* Header Card with Real-Time Authentication Status Badge */}
          <div
            className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h2
                  className={`text-sm font-bold uppercase tracking-tight ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  Suno Archive Synchronizer
                </h2>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                  Back up music, video, cover art, & metadata with safe resume protection.
                </p>
              </div>
            </div>

            {/* Visual Authentication Status Badge in Header */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all ${
                  authStatus === "active"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : authStatus === "checking"
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-400 animate-pulse"
                    : authStatus === "invalid"
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                    : isLight
                    ? "bg-slate-100 border-slate-300 text-slate-600"
                    : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                }`}
              >
                {authStatus === "active" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Active {authTrackCount ? `• ${authTrackCount} Tracks` : "• Connected"}</span>
                  </>
                ) : authStatus === "checking" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                    <span>Checking Suno API...</span>
                  </>
                ) : authStatus === "invalid" ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Invalid • Expired / 401</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Auth: Unconfigured</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* PySide6 QTabWidget Simulated Tab Navigation Bar */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🚀 Backup Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                activeTab === "library"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>📁 Library Catalog & Batch Downloader</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === "library" ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-400"
              }`}>
                {selectedTrackIds.size}/{libraryTracks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                activeTab === "guide"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📖 Token & Setup Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>⚙️ Settings</span>
            </button>
          </div>

          {activeTab === "dashboard" && (
            <div className="space-y-5">
          <div
            className={`border rounded-xl p-4 space-y-3.5 ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215]/80 border-zinc-800/80"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold uppercase tracking-wider text-blue-500 block">
                  1. Authentication (Bearer Token & Optional Cookie)
                </label>
                {/* Inline Status Badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                    authStatus === "active"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : authStatus === "checking"
                      ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                      : authStatus === "invalid"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  }`}
                >
                  {authStatus === "active"
                    ? "● ACTIVE"
                    : authStatus === "checking"
                    ? "◌ CHECKING"
                    : authStatus === "invalid"
                    ? "✕ INVALID"
                    : "UNCONFIGURED"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickSetupOpen(true)}
                className="text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <span>💡 How to find your token? (30s Guide)</span>
              </button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type={showToken ? "text" : "password"}
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  disabled={isRunning}
                  placeholder="Paste Suno Bearer Token (Authorization: Bearer eyJhbGci...)"
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-[#09090b] border-zinc-800 text-zinc-200"
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className={`border px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-colors shrink-0 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
                }`}
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showToken ? "Hide" : "Show"}</span>
              </button>

              <button
                type="button"
                onClick={() => validateAuth(bearerToken, cookieString, false)}
                disabled={isRunning || authStatus === "checking" || !bearerToken.trim()}
                className={`border px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 font-bold transition-all shrink-0 ${
                  authStatus === "checking"
                    ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm disabled:opacity-50"
                }`}
              >
                {authStatus === "checking" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>{authStatus === "checking" ? "Checking..." : "⚡ Validate"}</span>
              </button>
            </div>

            {/* Live Visual Authentication Indicator & Feedback Box */}
            <div
              className={`p-3 rounded-lg border text-xs transition-all ${
                authStatus === "active"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : authStatus === "checking"
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                  : authStatus === "invalid"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-600"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2">
                  <div className="mt-0.5 shrink-0">
                    {authStatus === "active" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : authStatus === "checking" ? (
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    ) : authStatus === "invalid" ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <KeyRound className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {authStatus === "active"
                          ? "Authentication Status: Active"
                          : authStatus === "checking"
                          ? "Authentication Status: Checking Suno API..."
                          : authStatus === "invalid"
                          ? "Authentication Status: Invalid / Expired"
                          : "Authentication Status: Unconfigured"}
                      </span>
                      {authHttpStatus && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 border border-white/10">
                          HTTP {authHttpStatus}
                        </span>
                      )}
                      {jwtStatus && !jwtStatus.isExpired && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Expires in {jwtStatus.diffSec}s ({jwtStatus.expDate})
                        </span>
                      )}
                    </div>
                    <p className="opacity-90">{authMessage}</p>
                    {authStatus === "invalid" && (
                      <p className="text-[11px] opacity-80 mt-1">
                        Suno Clerk tokens expire within ~60-120 seconds. To refresh: open Suno.com, press <kbd className="bg-black/40 px-1 py-0.5 rounded font-mono">Ctrl+R</kbd>, inspect network request <code className="bg-black/40 px-1 py-0.5 rounded font-mono">feed?page=0</code>, and copy the new <code className="bg-black/40 px-1 py-0.5 rounded font-mono">authorization</code> header.
                      </p>
                    )}
                  </div>
                </div>

                {lastCheckedTime && (
                  <span className="text-[10px] opacity-60 whitespace-nowrap shrink-0">
                    Checked {lastCheckedTime}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="text"
                value={cookieString}
                onChange={(e) => setCookieString(e.target.value)}
                disabled={isRunning}
                placeholder="Optional Cookie: __client=...; cf_clearance=... (Paste full cookie string if encountering 503)"
                className={`w-full border rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-[#09090b] border-zinc-800 text-zinc-200"
                }`}
              />
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                Include cookie header alongside Bearer Token to bypass Cloudflare 503 blocks.
              </p>
            </div>
          </div>

          {/* 2. Target Backup Directory Section */}
          <div
            className={`border rounded-xl p-4 space-y-2 ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215]/80 border-zinc-800/80"
            }`}
          >
            <label className="text-xs font-bold uppercase tracking-wider text-blue-500 block">
              2. Target Backup Directory
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={saveDirectory}
                onChange={(e) => setSaveDirectory(e.target.value)}
                disabled={isRunning}
                className={`flex-1 border rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-[#09090b] border-zinc-800 text-zinc-200"
                }`}
              />
              <button
                type="button"
                onClick={() => addLog(`Virtual directory set: ${saveDirectory}`, "info")}
                disabled={isRunning}
                className={`border px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 font-medium transition-colors shrink-0 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* 3. Media Types Options */}
          <div
            className={`border rounded-xl p-4 space-y-3 ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215]/80 border-zinc-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 block">
                3. Media Types & Preferred Audio Format
              </label>
            </div>

            {/* Preferred Audio Format Selection Box */}
            <div className={`p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? "bg-amber-50/50 border-amber-200" : "bg-amber-500/10 border-amber-500/20"
            }`}>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preferred Audio Format Target:</span>
                </div>
                <p className="text-[11px] opacity-75">
                  {preferredFormat === "wav"
                    ? "Attempts 24-bit uncompressed WAV download first (best for remixing/stems). Falls back to MP3 if WAV is unavailable."
                    : "Downloads standard 320kbps MP3 audio files directly."}
                </p>
              </div>

              <select
                value={preferredFormat}
                onChange={(e) => {
                  const fmt = e.target.value as "wav" | "mp3";
                  setPreferredFormat(fmt);
                  setPreferWav(fmt === "wav");
                }}
                disabled={isRunning || !downloadAudio}
                className={`border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 min-w-[210px] ${
                  isLight ? "bg-white border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-700 text-zinc-100"
                }`}
              >
                <option value="wav">Lossless WAV (.wav) - Pro</option>
                <option value="mp3">Standard MP3 (.mp3) - Compact</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1">
              <label
                className={`flex items-center space-x-2 cursor-pointer select-none ${
                  isLight ? "text-slate-700" : "text-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={downloadAudio}
                  onChange={(e) => setDownloadAudio(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <Music className="w-3.5 h-3.5 text-emerald-500" />
                <span>Audio Tracks</span>
              </label>

              <label
                className={`flex items-center space-x-2 cursor-pointer select-none ${
                  isLight ? "text-slate-700" : "text-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={downloadVideo}
                  onChange={(e) => setDownloadVideo(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <Video className="w-3.5 h-3.5 text-blue-500" />
                <span>Video (MP4) <span className="text-[10px] opacity-60 font-normal">(if pre-rendered)</span></span>
              </label>

              <label
                className={`flex items-center space-x-2 cursor-pointer select-none ${
                  isLight ? "text-slate-700" : "text-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={downloadImages}
                  onChange={(e) => setDownloadImages(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                <span>Artwork (JPG)</span>
              </label>

              <label
                className={`flex items-center space-x-2 cursor-pointer select-none ${
                  isLight ? "text-slate-700" : "text-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={downloadMetadata}
                  onChange={(e) => setDownloadMetadata(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Metadata (JSON)</span>
              </label>

              <label
                className={`flex items-center space-x-2 cursor-pointer select-none ${
                  isLight ? "text-slate-700" : "text-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={generateReport}
                  onChange={(e) => setGenerateReport(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                />
                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-purple-600 dark:text-purple-400 font-semibold">Catalog (CSV/JSON)</span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800/50 flex justify-end">
              <button
                type="button"
                onClick={handleExportCsvCatalog}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
                  isLight
                    ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border-purple-800/50"
                }`}
              >
                <Download className="w-3.5 h-3.5 text-purple-500" />
                <span>Export Searchable Catalog CSV</span>
              </button>
            </div>
          </div>

          {/* 4. Subfolder Organization */}
          <div
            className={`border rounded-2xl p-4 space-y-2 ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800/90"
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                4. Subfolder Organization
              </label>
              <span className="text-[10px] opacity-60 font-mono">Auto-Folder Router</span>
            </div>
            <select
              value={folderGrouping}
              onChange={(e) => setFolderGrouping(e.target.value as "none" | "date" | "album")}
              disabled={isRunning}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-sans cursor-pointer ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-800"
                  : "bg-[#09090b] border-zinc-800 text-zinc-200"
              }`}
            >
              <option value="none">Flat Directory (No Subfolders)</option>
              <option value="date">Subfolders by Date Created (YYYY-MM)</option>
              <option value="album">Subfolders by Album Name / Genre</option>
            </select>
          </div>

          {/* 5. Human Mimicry & CDN Anti-Block Delay */}
          <div
            className={`border rounded-2xl p-4 space-y-3 ${
              isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800/90"
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>5. Human Mimicry & Anti-Block Delay</span>
              </label>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                CDN 403 PROTECTION
              </span>
            </div>

            <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
              Configurable randomized pause between track download requests to mimic natural browsing, preventing rate limits and IP blocks from the Suno CDN.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Min Delay (Seconds):
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={minDelay}
                  onChange={(e) => setMinDelay(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isRunning}
                  className={`w-full border rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-purple-500 ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Max Delay (Seconds):
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={0.5}
                  value={maxDelay}
                  onChange={(e) => setMaxDelay(Math.max(minDelay, parseFloat(e.target.value) || 0))}
                  disabled={isRunning}
                  className={`w-full border rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-purple-500 ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Visual Component: Live Real-Time Batch Progress & Quality Monitor */}
          <BatchProgressTracker
            theme={theme}
            isRunning={isRunning}
            progress={progress}
            currentTrackIndex={currentTrackIndex}
            totalTrackCount={totalTrackCount}
            wavSuccessCount={wavSuccessCount}
            mp3FallbackCount={mp3FallbackCount}
            skippedCount={skippedCount}
            totalFilesDownloaded={totalFilesDownloaded}
            totalBytesDownloaded={totalBytesDownloaded}
            totalSleepSeconds={totalSleepSeconds}
            minDelay={minDelay}
            maxDelay={maxDelay}
            activeTrackInfo={activeTrackInfo}
          />

          {/* 5. Batch Backup Summary Report Card */}
          {batchSummary && (
            <div
              className={`border border-emerald-500/40 rounded-2xl p-4 space-y-3.5 shadow-xl animate-fadeIn ${
                isLight ? "bg-emerald-50/70 text-slate-800" : "bg-[#121215] text-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Batch Download Complete Summary
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBatchSummary(null)}
                  className="p-1 rounded-lg hover:bg-emerald-500/10 transition-colors"
                  title="Dismiss summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div
                  className={`border rounded-xl p-2.5 ${
                    isLight ? "bg-white border-slate-200" : "bg-[#09090b] border-zinc-800"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase mb-1 opacity-70">
                    <BarChart3 className="w-3 h-3 text-blue-500 shrink-0" />
                    <span>Processed</span>
                  </div>
                  <div className="text-base font-extrabold font-mono">
                    {batchSummary.totalTracksProcessed} tracks
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {batchSummary.downloadedTracksCount} new, {batchSummary.skippedTracksCount} skipped
                  </div>
                </div>

                <div
                  className={`border rounded-xl p-2.5 ${
                    isLight ? "bg-white border-slate-200" : "bg-[#09090b] border-zinc-800"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase mb-1 opacity-70">
                    <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Files Created</span>
                  </div>
                  <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                    {batchSummary.totalFilesCreated} files
                  </div>
                  <div className="text-[10px] opacity-60">
                    audio, video, art, json
                  </div>
                </div>

                <div
                  className={`border rounded-xl p-2.5 ${
                    isLight ? "bg-white border-slate-200" : "bg-[#09090b] border-zinc-800"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase mb-1 opacity-70">
                    <HardDrive className="w-3 h-3 text-purple-500 shrink-0" />
                    <span>Total Size</span>
                  </div>
                  <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                    {batchSummary.formattedSize}
                  </div>
                  <div className="text-[10px] opacity-60">
                    downloaded volume
                  </div>
                </div>

                <div
                  className={`border rounded-xl p-2.5 ${
                    isLight ? "bg-white border-slate-200" : "bg-[#09090b] border-zinc-800"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase mb-1 opacity-70">
                    <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Duration</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {batchSummary.formattedDuration}
                  </div>
                  <div className="text-[10px] opacity-60">
                    time taken
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleExportCsvCatalog}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Searchable Catalog CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. Status Indicator Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className={`border rounded-xl p-3.5 text-center ${
                isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-70">
                Completed
              </span>
              <span className="text-xl font-extrabold text-emerald-500 font-mono">
                {completedCount}
              </span>
            </div>

            <div
              className={`border rounded-xl p-3.5 text-center ${
                isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-70">
                Remaining
              </span>
              <span className="text-xl font-extrabold text-amber-500 font-mono">
                {remainingCount}
              </span>
            </div>

            <div
              className={`border rounded-xl p-3.5 text-center ${
                isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-70">
                Total Library
              </span>
              <span className="text-xl font-extrabold text-blue-500 font-mono">
                {totalTrackCount}
              </span>
            </div>
          </div>

          {/* 5. Control Buttons & Simulation Triggers */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleStartBackup}
                disabled={isRunning}
                className="flex-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 transition-all text-sm border border-blue-400/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>▶ Start / Resume Backup</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={!isRunning}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all text-sm border border-red-400/20"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>🛑 Cancel</span>
              </button>
            </div>

            {/* Test Simulation Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleSimulateDrop}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Connection Drop / Disconnect</span>
              </button>

              <button
                type="button"
                onClick={handleResetState}
                disabled={isRunning}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear State Log (.suno_backup_state.json)</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>QProgressBar</span>
              <span>{progress}% ({currentTrackIndex}/{totalTrackCount})</span>
            </div>
            <div className="w-full h-3.5 bg-[#09090b] border border-zinc-800 rounded-lg overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Live QTextEdit Terminal Activity Log */}
          <div className="border border-zinc-800 rounded-xl bg-[#09090b] overflow-hidden">
            <div className="bg-[#121215] px-3.5 py-2 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono font-bold text-zinc-300">QTextEdit (Status Log)</span>
              <span className="text-[10px] text-zinc-500 font-mono">Real-time QThread Signals</span>
            </div>

            <div
              ref={logBoxRef}
              className="p-3.5 h-52 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 bg-[#09090b] text-zinc-300"
            >
              {logs.map((log) => {
                let colorClass = "text-zinc-400";
                if (log.level === "success") colorClass = "text-emerald-400 font-semibold";
                if (log.level === "warn") colorClass = "text-amber-400";
                if (log.level === "error") colorClass = "text-red-400 font-bold";

                return (
                  <div key={log.id} className="flex space-x-2">
                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          )}

          {/* TAB 2: LIBRARY CATALOG & BATCH SELECTOR */}
          {activeTab === "library" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Library Control Bar */}
              <div
                className={`border rounded-xl p-4 space-y-3.5 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                      <ListChecks className="w-4 h-4 text-blue-400" />
                      <span>Interactive Library Catalog & Selective Batch Downloader</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Select specific songs to download, or export your full library metadata (lyrics, style tags, audio URLs) into CSV or JSON formats.
                    </p>
                  </div>

                  {/* Batch Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartBatchSelected}
                      disabled={selectedTrackIds.size === 0 || isRunning}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white shadow-md shadow-blue-900/30 transition-all cursor-pointer border border-blue-400/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Download Selected ({selectedTrackIds.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCsvCatalog}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJsonCatalog}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Selection Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search title, genre, style prompt, lyrics..."
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                        className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs font-sans focus:outline-none focus:border-blue-500 ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900"
                            : "bg-[#09090b] border-zinc-800 text-zinc-200"
                        }`}
                      />
                    </div>

                    <select
                      value={libraryFilterStatus}
                      onChange={(e) => setLibraryFilterStatus(e.target.value as any)}
                      className={`border rounded-lg px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-blue-500 cursor-pointer ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-[#09090b] border-zinc-800 text-zinc-200"
                      }`}
                    >
                      <option value="all">All Tracks ({libraryTracks.length})</option>
                      <option value="completed">Completed ({completedCount})</option>
                      <option value="pending">Pending ({remainingCount})</option>
                    </select>
                  </div>

                  {/* Multi-selection Buttons */}
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectPending}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Select Pending
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Song Table */}
              <div className="border border-zinc-800 rounded-xl bg-[#121215] overflow-hidden">
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#09090b] border-b border-zinc-800 text-zinc-400 font-mono sticky top-0 z-10 select-none">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTrackIds.size > 0 && selectedTrackIds.size === libraryTracks.length}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectAll();
                              else handleDeselectAll();
                            }}
                            className="rounded border-zinc-700 text-blue-600 focus:ring-0 w-3.5 h-3.5 bg-zinc-900 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Track Info & Model</th>
                        <th className="p-3 hidden md:table-cell">Prompt & Style Tags</th>
                        <th className="p-3 w-28 text-center">Assets Available</th>
                        <th className="p-3 w-28 text-right">Backup Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {libraryTracks
                        .filter((track) => {
                          const q = librarySearchQuery.toLowerCase();
                          const matchesQuery =
                            !q ||
                            (track.title || "").toLowerCase().includes(q) ||
                            (track.prompt || "").toLowerCase().includes(q) ||
                            (track.gpt_description_prompt || "").toLowerCase().includes(q) ||
                            (track.model_name || "").toLowerCase().includes(q);

                          const isComp = Boolean(stateFile.completed_clips[track.id]);
                          if (libraryFilterStatus === "completed" && !isComp) return false;
                          if (libraryFilterStatus === "pending" && isComp) return false;

                          return matchesQuery;
                        })
                        .map((track) => {
                          const isSelected = selectedTrackIds.has(track.id);
                          const isCompleted = Boolean(stateFile.completed_clips[track.id]);

                          return (
                            <tr
                              key={track.id}
                              className={`transition-colors hover:bg-zinc-800/40 ${
                                isSelected ? "bg-blue-500/5" : ""
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectTrack(track.id)}
                                  className="rounded border-zinc-700 text-blue-600 focus:ring-0 w-3.5 h-3.5 bg-zinc-900 cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center space-x-3">
                                  {track.image_url ? (
                                    <img
                                      src={track.image_url}
                                      alt={track.title || "artwork"}
                                      className="w-10 h-10 rounded-lg object-cover border border-zinc-700/80 shrink-0 shadow-sm"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                      <Music className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-zinc-200 block truncate max-w-[220px]">
                                      {track.title || "Untitled Track"}
                                    </span>
                                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono">
                                      <span>{track.model_name || "v3.5"}</span>
                                      <span>•</span>
                                      <span>{track.duration ? `${Math.round(track.duration)}s` : "120s"}</span>
                                      {track.is_liked && (
                                        <>
                                          <span>•</span>
                                          <span className="text-rose-400">♥ Liked</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 hidden md:table-cell text-zinc-400 text-xs">
                                <p className="line-clamp-2 max-w-sm text-[11px] leading-relaxed">
                                  {track.prompt || track.gpt_description_prompt || "No prompt description"}
                                </p>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    WAV
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                    MP4
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    JSON
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                {isCompleted ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Saved</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/40">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SETUP & TOKEN GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4 animate-fadeIn">
              <div
                className={`border rounded-xl p-5 space-y-4 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
                }`}
              >
                <div className="flex items-center space-x-2.5 border-b border-zinc-800 pb-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-tight">
                      Suno Authentication & Token Guide
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Follow these 4 simple steps to copy your live authentication session token from Suno.com.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="border border-zinc-800/80 rounded-xl p-3.5 bg-[#09090b] space-y-1.5">
                    <span className="text-xs font-bold text-blue-400 font-mono">STEP 1: Open Suno.com</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Log in to your Suno account in Chrome, Edge, Brave, or Firefox.
                    </p>
                  </div>

                  <div className="border border-zinc-800/80 rounded-xl p-3.5 bg-[#09090b] space-y-1.5">
                    <span className="text-xs font-bold text-blue-400 font-mono">STEP 2: Open DevTools</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-[11px] font-mono">F12</kbd> or <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-[11px] font-mono">Ctrl+Shift+I</kbd> and navigate to the <strong>Network</strong> tab.
                    </p>
                  </div>

                  <div className="border border-zinc-800/80 rounded-xl p-3.5 bg-[#09090b] space-y-1.5">
                    <span className="text-xs font-bold text-blue-400 font-mono">STEP 3: Refresh and Filter</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-[11px] font-mono">Ctrl+R</kbd> to refresh. Filter the network requests by typing <code className="text-amber-400 font-mono">feed?page=0</code>.
                    </p>
                  </div>

                  <div className="border border-zinc-800/80 rounded-xl p-3.5 bg-[#09090b] space-y-1.5">
                    <span className="text-xs font-bold text-blue-400 font-mono">STEP 4: Copy Authorization</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Under Request Headers, copy the value of <code className="text-emerald-400 font-mono">authorization: Bearer eyJ...</code> and paste it into the token box.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsQuickSetupOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Launch 30-Second Interactive Token Assistant</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Subfolder Organization */}
              <div
                className={`border rounded-xl p-4 space-y-2 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
                    Folder Organization Routing
                  </label>
                  <span className="text-[10px] opacity-60 font-mono">Auto-Folder Router</span>
                </div>
                <select
                  value={folderGrouping}
                  onChange={(e) => setFolderGrouping(e.target.value as "none" | "date" | "album")}
                  disabled={isRunning}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-sans cursor-pointer ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-800"
                      : "bg-[#09090b] border-zinc-800 text-zinc-200"
                  }`}
                >
                  <option value="none">Flat Directory (No Subfolders - all files in root)</option>
                  <option value="date">Subfolders by Date Created (YYYY-MM)</option>
                  <option value="album">Subfolders by Album Name / Musical Genre</option>
                </select>
              </div>

              {/* Human Mimicry & CDN Anti-Block Delay */}
              <div
                className={`border rounded-xl p-4 space-y-3 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#121215] border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-400 block flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>Human Mimicry & Anti-Block Delay</span>
                  </label>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                    CDN 403 PROTECTION
                  </span>
                </div>

                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Configurable randomized pause between track download requests to mimic natural browsing, preventing rate limits and IP blocks from the Suno CDN.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Min Delay (Seconds):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Math.max(0, parseFloat(e.target.value) || 0))}
                      disabled={isRunning}
                      className={`w-full border rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-purple-500 ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                      Max Delay (Seconds):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={0.5}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Math.max(minDelay, parseFloat(e.target.value) || 0))}
                      disabled={isRunning}
                      className={`w-full border rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-purple-500 ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-800" : "bg-[#09090b] border-zinc-800 text-zinc-100"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live State Inspector Card */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-tight">
              Live State Log File Inspector (.suno_backup_state.json)
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {completedCount} clips recorded
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          This JSON file resides in your chosen backup directory. The Python script checks this file before making any HTTP requests to skip previously completed tracks instantly.
        </p>

        <pre className="bg-[#09090b] border border-zinc-800/80 p-4 rounded-xl font-mono text-xs text-purple-300 overflow-x-auto max-h-48 leading-relaxed">
          {JSON.stringify(stateFile, null, 2)}
        </pre>
      </div>

      {/* 30-Second Quick Setup Token Finder Modal */}
      <QuickSetupModal
        isOpen={isQuickSetupOpen}
        onClose={() => setIsQuickSetupOpen(false)}
        onApplyToken={(token) => {
          setBearerToken(token);
          addLog("🔑 Bearer Token updated via Quick Setup Helper!", "success");
        }}
        isLight={isLight}
      />
    </div>
  );
};
