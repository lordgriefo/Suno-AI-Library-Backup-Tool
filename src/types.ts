export interface SunoTrack {
  id: string;
  title: string;
  audio_url?: string;
  wav_url?: string;
  video_url?: string;
  image_url?: string;
  image_large_url?: string;
  created_at?: string;
  model_name?: string;
  gpt_description_prompt?: string;
  prompt?: string;
  status?: string;
  duration?: number;
  is_liked?: boolean;
  playlist_title?: string;
  playlist_name?: string;
  album_name?: string;
}

export interface BackupStateFile {
  completed_clips: Record<string, {
    title: string;
    completed_at: string;
    files: string[];
  }>;
  last_updated: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: "info" | "success" | "warn" | "error";
}

export interface BackupConfig {
  bearerToken: string;
  saveDirectory: string;
  downloadAudio: boolean;
  preferWav: boolean;
  downloadVideo: boolean;
  downloadImage: boolean;
  downloadMetadata: boolean;
  maxRetries: number;
  folderGrouping: "none" | "date" | "album";
}
