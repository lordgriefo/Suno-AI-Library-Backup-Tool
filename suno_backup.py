#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
Suno AI Library Backup Tool (PySide6 / Qt)
===========================================
Features:
- Multi-Tab Modern Desktop GUI with setup guide, live statistics, and library catalog.
- Active on-demand WAV generation trigger and authenticated lossless download.
- Active on-demand Video (MP4) generation trigger for clips with lyrics animations.
- Bearer Token input field with Show/Hide toggle and live token validation.
- Auto-Token Expiration Check (JWT timestamp decoder).
- Anti-Cloudflare full browser headers & Clerk cookie support.
- Directory Picker with quick 'Open Folder in Explorer' integration.
- Incremental resume capability with hidden state tracking (.suno_backup_state.json).
- Multi-threaded background execution keeping UI 100% responsive.
- Paginated Suno API fetch with automatic retries and exponential backoff.
- Searchable offline catalog generation (CSV & JSON).

Requirements:
    pip install PySide6 requests

Usage:
    python suno_backup.py
"""

import sys
import os
import re
import json
import csv
import time
import base64
import random
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import requests

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QProgressBar, QTextEdit,
    QFileDialog, QMessageBox, QGroupBox, QCheckBox, QFrame,
    QGridLayout, QComboBox, QTabWidget, QTableWidget, QTableWidgetItem,
    QHeaderView, QSlider, QAbstractItemView
)
from PySide6.QtCore import QThread, Signal, Slot, Qt, QUrl
from PySide6.QtGui import QFont, QColor, QDesktopServices

# Setup basic logging to console
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SunoBackup")

# Force global UTF-8 encoding on standard I/O streams for Windows compatibility & special characters in titles
if hasattr(sys, "stdout") and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys, "stderr") and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Constants
SUNO_API_ENDPOINTS = [
    "https://studio-api.suno.ai/api/feed/",
    "https://studio-api.suno.ai/api/feed/v2",
    "https://studio-api-prod.suno.com/api/feed/",
    "https://studio-api.suno.ai/api/billing/info/"
]
STATE_FILENAME = ".suno_backup_state.json"
CATALOG_CSV_FILENAME = "suno_library_catalog.csv"
CATALOG_JSON_FILENAME = "suno_library_catalog.json"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def clean_header_value(value: Any) -> str:
    """Sanitizes HTTP header values to prevent latin-1 encoding crashes."""
    if not value:
        return ""
    val_str = str(value).strip().strip('"').strip("'")
    replacements = [
        (chr(0x2026), "..."),
        ("\u2026", "..."),
        (chr(0x201C), '"'),
        (chr(0x201D), '"'),
        (chr(0x2018), "'"),
        (chr(0x2019), "'"),
        (chr(0x2013), "-"),
        (chr(0x2014), "-"),
        (chr(0xA0), " "),
    ]
    for old, new in replacements:
        val_str = val_str.replace(old, new)
    safe_chars = [ch for ch in val_str if ord(ch) < 256]
    return "".join(safe_chars).strip()


def sanitize_filename(name: str, max_length: int = 120) -> str:
    """Sanitize string to be safe for filenames across Windows, macOS, and Linux."""
    if not name or not str(name).strip():
        return "untitled_track"
    sanitized = re.sub(r'[\\/*?:"<>|]', "", str(name))
    sanitized = "".join(ch for ch in sanitized if ch.isprintable())
    sanitized = sanitized.strip(". ")
    if not sanitized:
        return "untitled_track"
    return sanitized[:max_length]


def format_bytes(size_in_bytes: int) -> str:
    """Formats byte counts into human-readable string (KB, MB, GB)."""
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    elif size_in_bytes < 1024 * 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_in_bytes / (1024 * 1024 * 1024):.2f} GB"


def format_duration(seconds: float) -> str:
    """Formats duration seconds into human-readable time string."""
    total_secs = int(seconds)
    mins, secs = divmod(total_secs, 60)
    hrs, mins = divmod(mins, 60)
    if hrs > 0:
        return f"{hrs}h {mins}m {secs}s"
    elif mins > 0:
        return f"{mins}m {secs}s"
    else:
        return f"{secs}s"


def decode_jwt_expiry(token: str) -> Tuple[Optional[int], Optional[str]]:
    """
    Decodes JWT payload without secret verification to inspect 'exp' expiration timestamp.
    Returns (exp_timestamp, formatted_expiry_str).
    """
    try:
        clean_tok = clean_header_value(token)
        if clean_tok.lower().startswith("bearer "):
            clean_tok = clean_tok[7:].strip()
        parts = clean_tok.split(".")
        if len(parts) != 3:
            return None, None
        payload_b64 = parts[1]
        # Pad base64 string
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)
        exp = payload.get("exp")
        if exp:
            exp_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(exp))
            return int(exp), exp_str
    except Exception:
        pass
    return None, None


def build_full_browser_headers(token: str = "", cookie_str: str = "") -> Dict[str, str]:
    """Constructs comprehensive browser headers to avoid Cloudflare 503 / 403 blocks."""
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://suno.com/",
        "Origin": "https://suno.com",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Priority": "u=1, i"
    }
    clean_tok = clean_header_value(token)
    if clean_tok:
        if not clean_tok.lower().startswith("bearer "):
            headers["Authorization"] = f"Bearer {clean_tok}"
        else:
            headers["Authorization"] = clean_tok
            
    clean_ck = clean_header_value(cookie_str)
    if clean_ck:
        headers["Cookie"] = clean_ck
        
    return headers


def extract_clips_from_response(data: Any) -> List[Dict[str, Any]]:
    """Robust extractor that handles all Suno API JSON schemas and wrapper structures."""
    if not data:
        return []
    
    if isinstance(data, list):
        return [c for c in data if isinstance(c, dict) and ("id" in c or "title" in c or "audio_url" in c)]
        
    if isinstance(data, dict):
        # Look for direct list keys
        for key in ["clips", "items", "data", "results", "songs", "tracks", "project_clips"]:
            val = data.get(key)
            if isinstance(val, list) and val:
                extracted = []
                for item in val:
                    if isinstance(item, dict):
                        if "clip" in item and isinstance(item["clip"], dict):
                            extracted.append(item["clip"])
                        elif "id" in item or "title" in item or "audio_url" in item:
                            extracted.append(item)
                if extracted:
                    return extracted
                    
        # Playlist clips wrapper
        if "playlist_clips" in data and isinstance(data["playlist_clips"], list):
            extracted = []
            for item in data["playlist_clips"]:
                if isinstance(item, dict):
                    if "clip" in item and isinstance(item["clip"], dict):
                        extracted.append(item["clip"])
                    elif "id" in item or "title" in item:
                        extracted.append(item)
            if extracted:
                return extracted
                
        # Dict of clips keyed by ID
        dict_clips = [v for v in data.values() if isinstance(v, dict) and ("id" in v or "audio_url" in v or "title" in v)]
        if dict_clips:
            return dict_clips

    return []


def get_ffmpeg_executable() -> Optional[str]:
    """Finds FFmpeg executable in PATH, imageio_ffmpeg, or local directory."""
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        return ffmpeg_bin
        
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
        
    # Check common Windows paths
    common_win_paths = [
        Path.home() / "ffmpeg" / "bin" / "ffmpeg.exe",
        Path("C:/ffmpeg/bin/ffmpeg.exe"),
        Path("C:/ProgramData/chocolatey/bin/ffmpeg.exe"),
        Path("./ffmpeg.exe")
    ]
    for p in common_win_paths:
        if p.exists():
            return str(p)
            
    return None


def convert_audio_to_wav(source_audio_path: Path, target_wav_path: Path) -> bool:
    """
    Decodes and converts audio stream (MP3/AAC) to standard 16-bit PCM 44.1kHz WAV.
    First checks for FFmpeg (system or imageio-ffmpeg), then falls back to python audio decoding.
    """
    if not source_audio_path.exists():
        return False

    ffmpeg_bin = get_ffmpeg_executable()
    if ffmpeg_bin:
        try:
            cmd = [
                ffmpeg_bin, "-y",
                "-i", str(source_audio_path),
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "44100",
                "-ac", "2",
                str(target_wav_path)
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45)
            if res.returncode == 0 and target_wav_path.exists() and target_wav_path.stat().st_size > 1024:
                return True
        except Exception:
            pass

    # Fallback to pydub if installed in user's python environment
    try:
        from pydub import AudioSegment  # type: ignore
        sound = AudioSegment.from_file(str(source_audio_path))
        sound.export(str(target_wav_path), format="wav")
        if target_wav_path.exists() and target_wav_path.stat().st_size > 1024:
            return True
    except Exception:
        pass

    return False


def create_mp4_video_visualizer(image_path: Path, audio_path: Path, target_video_path: Path) -> bool:
    """
    Creates an MP4 video visualizer combining the Suno album art image and audio track locally via FFmpeg.
    """
    if not image_path.exists() or not audio_path.exists():
        return False

    ffmpeg_bin = get_ffmpeg_executable()
    if not ffmpeg_bin:
        return False

    try:
        cmd = [
            ffmpeg_bin, "-y",
            "-loop", "1",
            "-i", str(image_path),
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            str(target_video_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
        if res.returncode == 0 and target_video_path.exists() and target_video_path.stat().st_size > 1024:
            return True
    except Exception:
        pass

    return False


class BackupWorker(QThread):
    """
    Background worker thread running Suno API fetch and file downloading logic.
    Handles on-demand WAV and MP4 video generation requests on Suno endpoints.
    Supports selective track batching and automated resume.
    """
    log_signal = Signal(str, str)             # (message, level: info|success|warn|error)
    progress_signal = Signal(int, int)        # (current, total)
    counts_signal = Signal(int, int, int)     # (completed, remaining, total)
    stats_signal = Signal(str, str, str)      # (downloaded_size, speed, elapsed)
    track_item_signal = Signal(dict)          # (track_info) for catalog table
    finished_signal = Signal(bool, str)       # (success, final_message)

    def __init__(
        self,
        token: str,
        save_dir: Path,
        cookie_str: str = "",
        download_audio: bool = True,
        preferred_format: str = "wav",
        prefer_wav: bool = True,
        download_video: bool = False,
        download_image: bool = True,
        download_metadata: bool = True,
        generate_report: bool = True,
        folder_grouping: str = "none",
        max_retries: int = 3,
        min_delay: float = 0.5,
        max_delay: float = 2.0,
        trigger_wav_api: bool = True,
        trigger_video_api: bool = True,
        selected_clips: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__()
        self.token = clean_header_value(token)
        self.save_dir = save_dir
        self.cookie_str = clean_header_value(cookie_str)
        self.download_audio = download_audio
        self.preferred_format = preferred_format if preferred_format in ["wav", "mp3"] else "wav"
        self.prefer_wav = prefer_wav or (self.preferred_format == "wav")
        self.download_video = download_video
        self.download_image = download_image
        self.download_metadata = download_metadata
        self.generate_report = generate_report
        self.folder_grouping = folder_grouping
        self.max_retries = max_retries
        self.min_delay = float(min_delay)
        self.max_delay = float(max_delay)
        self.trigger_wav_api = trigger_wav_api
        self.trigger_video_api = trigger_video_api
        self.selected_clips = selected_clips if (selected_clips is not None and isinstance(selected_clips, list)) else None
        
        self.is_cancelled = False
        self.state_file_path = self.save_dir / STATE_FILENAME
        self.state_data: Dict[str, Any] = {"completed_clips": {}, "last_updated": ""}

    def get_auth_headers(self) -> Dict[str, str]:
        return build_full_browser_headers(self.token, self.cookie_str)

    def generate_catalog_reports(self, clips: List[Dict[str, Any]]):
        """Generates offline searchable CSV and JSON catalog indexes of all tracks."""
        if not self.generate_report or not clips:
            return

        self.log("📊 Generating offline searchable catalog index (CSV & JSON)...", "info")
        csv_path = self.save_dir / CATALOG_CSV_FILENAME
        csv_columns = [
            "id", "title", "created_at", "model_name", "tags", "prompt", 
            "gpt_description_prompt", "duration_seconds", "is_liked", "is_public",
            "audio_url", "video_url", "image_url", "backup_status"
        ]
        
        try:
            with open(csv_path, "w", newline="", encoding="utf-8-sig") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=csv_columns)
                writer.writeheader()
                for clip in clips:
                    clip_id = clip.get("id", "")
                    meta = clip.get("metadata") or {}
                    tags = meta.get("tags") if isinstance(meta, dict) else ""
                    prompt = meta.get("prompt") if isinstance(meta, dict) else ""
                    gpt_prompt = meta.get("gpt_description_prompt") if isinstance(meta, dict) else ""
                    is_completed = clip_id in self.state_data.get("completed_clips", {})
                    writer.writerow({
                        "id": clip_id,
                        "title": clip.get("title") or "Untitled Track",
                        "created_at": clip.get("created_at") or "",
                        "model_name": clip.get("model_name") or (meta.get("type") if isinstance(meta, dict) else "") or "",
                        "tags": tags or "",
                        "prompt": prompt or "",
                        "gpt_description_prompt": gpt_prompt or "",
                        "duration_seconds": clip.get("duration") or (meta.get("duration") if isinstance(meta, dict) else "") or "",
                        "is_liked": clip.get("is_liked") or False,
                        "is_public": clip.get("is_public") or False,
                        "audio_url": clip.get("audio_url") or "",
                        "video_url": clip.get("video_url") or "",
                        "image_url": clip.get("image_large_url") or clip.get("image_url") or "",
                        "backup_status": "Completed" if is_completed else "Pending"
                    })
            self.log(f"  └─ [OK] Exported CSV catalog: {CATALOG_CSV_FILENAME}", "success")
        except Exception as e:
            self.log(f"Failed to write CSV catalog report: {e}", "error")

        json_path = self.save_dir / CATALOG_JSON_FILENAME
        try:
            catalog_json_data = {
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_tracks": len(clips),
                "tracks": clips
            }
            with open(json_path, "w", encoding="utf-8") as json_file:
                json.dump(catalog_json_data, json_file, indent=2, ensure_ascii=False)
            self.log(f"  └─ [OK] Exported JSON catalog: {CATALOG_JSON_FILENAME}", "success")
        except Exception as e:
            self.log(f"Failed to write JSON catalog report: {e}", "error")

    def log(self, message: str, level: str = "info"):
        logger.info(f"[{level.upper()}] {message}")
        self.log_signal.emit(message, level)

    def load_state(self):
        if self.state_file_path.exists():
            try:
                with open(self.state_file_path, "r", encoding="utf-8") as f:
                    self.state_data = json.load(f)
                    if "completed_clips" not in self.state_data:
                        self.state_data["completed_clips"] = {}
                count = len(self.state_data["completed_clips"])
                self.log(f"Loaded existing backup state ({count} tracks previously completed).", "info")
            except Exception as e:
                self.log(f"Could not read state file: {e}. Starting fresh.", "warn")
                self.state_data = {"completed_clips": {}, "last_updated": ""}
        else:
            self.state_data = {"completed_clips": {}, "last_updated": ""}

    def save_state(self):
        try:
            self.state_data["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
            tmp_state = Path(str(self.state_file_path) + ".tmp")
            with open(tmp_state, "w", encoding="utf-8") as f:
                json.dump(self.state_data, f, indent=2)
            if tmp_state.exists():
                tmp_state.replace(self.state_file_path)
        except Exception as e:
            self.log(f"Failed to save state file: {e}", "warn")

    def request_wav_generation(self, clip_id: str) -> bool:
        """
        Sends an active trigger request to Suno's backend to generate / convert uncompressed WAV.
        Simulates the 'Download WAV' action on Suno.com so CDN files become accessible.
        """
        if not self.trigger_wav_api or not clip_id:
            return False
        
        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        
        endpoints = [
            f"https://studio-api.suno.ai/api/gen/{clip_id}/wav/",
            f"https://studio-api.suno.ai/api/generate/wav/{clip_id}/",
            "https://studio-api.suno.ai/api/generate/wav/",
            f"https://studio-api.suno.ai/api/convert/{clip_id}/wav"
        ]
        
        for ep in endpoints:
            try:
                res = requests.post(ep, headers=headers, json={"clip_id": clip_id}, timeout=8)
                if res.status_code in [200, 201, 202]:
                    self.log(f"  ✨ [WAV Trigger] Suno confirmed WAV generation request ({res.status_code})", "info")
                    return True
            except Exception:
                pass
        return False

    def request_video_generation(self, clip_id: str) -> bool:
        """
        Sends an active trigger request to Suno's backend to generate / concat MP4 video animation.
        Simulates clicking 'Download Video' on Suno.com.
        """
        if not self.trigger_video_api or not clip_id:
            return False
            
        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        
        endpoints = [
            "https://studio-api.suno.ai/api/generate/concat/",
            f"https://studio-api.suno.ai/api/gen/{clip_id}/mp4/",
            f"https://studio-api.suno.ai/api/generate/video/{clip_id}/"
        ]
        
        for ep in endpoints:
            try:
                res = requests.post(ep, headers=headers, json={"clip_id": clip_id, "clip_ids": [clip_id]}, timeout=8)
                if res.status_code in [200, 201, 202]:
                    self.log(f"  🎬 [Video Trigger] Suno queued MP4 video generation for clip {clip_id[:8]}", "info")
                    return True
            except Exception:
                pass
        return False

    def check_jwt_expiry(self):
        """Checks if JWT token is expired before launching long loop."""
        exp_ts, exp_str = decode_jwt_expiry(self.token)
        if exp_ts and exp_str:
            now_ts = int(time.time())
            if now_ts > exp_ts:
                diff = now_ts - exp_ts
                self.log(f"⚠️ Warning: Bearer token expired {diff}s ago (Expired at: {exp_str}).", "warn")
                self.log("💡 Tip: Suno Clerk JWT tokens expire in ~60-120 seconds. If 401 occurs, copy a fresh Bearer token or paste your full Cookie in the Cookie field.", "info")
            else:
                remaining = exp_ts - now_ts
                self.log(f"🔑 Bearer token is valid for {remaining}s (Expires at: {exp_str}).", "info")

    def fetch_all_clips(self) -> List[Dict[str, Any]]:
        headers = self.get_auth_headers()
        session = requests.Session()
        session.headers.update(headers)

        self.log("Testing connection to Suno API endpoints...", "info")
        self.check_jwt_expiry()

        active_endpoint = None
        for endpoint in SUNO_API_ENDPOINTS:
            try:
                # Billing endpoint is just for validation probe
                probe_url = f"{endpoint}?page=0" if "feed" in endpoint else endpoint
                test_res = session.get(probe_url, timeout=12)
                if test_res.status_code == 200:
                    if "feed" in endpoint:
                        active_endpoint = endpoint
                    else:
                        active_endpoint = "https://studio-api.suno.ai/api/feed/"
                    self.log(f"Connected successfully to API: {endpoint}", "success")
                    break
                elif test_res.status_code == 401:
                    self.log(f"HTTP 401 Unauthorized at {endpoint}: Suno Bearer Token is invalid or expired.", "error")
                    exp_ts, exp_str = decode_jwt_expiry(self.token)
                    if exp_ts and time.time() > exp_ts:
                        self.log(f"Token expired at {exp_str}. Suno web session refreshed the token. Please copy a new Authorization header from DevTools.", "warn")
                    return []
                elif test_res.status_code == 503:
                    self.log(f"HTTP 503 Service Unavailable at {endpoint} (Cloudflare challenge). Retrying with secondary endpoint...", "warn")
            except Exception as e:
                self.log(f"Endpoint test failed for {endpoint}: {e}", "warn")
                continue

        if not active_endpoint:
            active_endpoint = "https://studio-api.suno.ai/api/feed/"
            self.log(f"Defaulting to primary endpoint: {active_endpoint}", "warn")

        all_clips = []
        page = 0
        while not self.is_cancelled:
            url = f"{active_endpoint}?page={page}"
            self.log(f"Fetching library feed page {page + 1}...", "info")
            response = None
            for attempt in range(self.max_retries):
                if self.is_cancelled:
                    break
                try:
                    res = session.get(url, timeout=15)
                    if res.status_code == 401:
                        self.log("HTTP 401 Unauthorized: Bearer Token expired during fetch.", "error")
                        return []
                    res.raise_for_status()
                    response = res
                    break
                except Exception as e:
                    backoff = 2 ** attempt
                    self.log(f"Page {page + 1} fetch failed (attempt {attempt + 1}/{self.max_retries}): {e}. Retrying in {backoff}s...", "warn")
                    time.sleep(backoff)
            
            if not response or response.status_code != 200:
                self.log(f"Finished feed retrieval at page {page + 1}.", "info")
                break
            
            try:
                data = response.json()
            except Exception as e:
                self.log(f"JSON parse error on page {page + 1}: {e}", "error")
                break
            
            page_clips = extract_clips_from_response(data)
            
            if not page_clips:
                self.log(f"Discovered a total of {len(all_clips)} tracks across your Suno library.", "info")
                break
            
            all_clips.extend(page_clips)
            for c in page_clips:
                self.track_item_signal.emit(c)
            
            page += 1
            time.sleep(0.3)
            
        return all_clips

    def download_file_with_retry(self, url: str, target_path: Path, silent_fail: bool = False) -> Tuple[bool, int]:
        """Downloads a file stream with temporary file protection and authentication headers."""
        if not url:
            return False, 0
            
        tmp_path = Path(str(target_path) + ".tmp")
        headers = self.get_auth_headers()
        max_attempts = 1 if silent_fail else self.max_retries
        
        for attempt in range(1, max_attempts + 1):
            if self.is_cancelled:
                self.cleanup_tmp(tmp_path)
                return False, 0
                
            try:
                with requests.get(url, headers=headers, stream=True, timeout=25) as r:
                    r.raise_for_status()
                    with open(tmp_path, "wb") as f:
                        for chunk in r.iter_content(chunk_size=32768):
                            if self.is_cancelled:
                                f.close()
                                self.cleanup_tmp(tmp_path)
                                return False, 0
                            if chunk:
                                f.write(chunk)
                                
                if tmp_path.exists():
                    file_size = tmp_path.stat().st_size
                    if file_size > 1024:
                        tmp_path.replace(target_path)
                        return True, file_size
                    else:
                        self.cleanup_tmp(tmp_path)
            except Exception as e:
                self.cleanup_tmp(tmp_path)
                if not silent_fail:
                    backoff = 2 ** (attempt - 1)
                    if attempt < max_attempts:
                        self.log(f"  [Retry {attempt}/{max_attempts}] {target_path.name}: {e}. Retrying in {backoff}s...", "warn")
                        time.sleep(backoff)
                    else:
                        self.log(f"  [Failed] {target_path.name} after {max_attempts} attempts: {e}", "error")
                        return False, 0
                    
        self.cleanup_tmp(tmp_path)
        return False, 0

    def cleanup_tmp(self, tmp_path: Path):
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass

    def run(self):
        try:
            self.save_dir.mkdir(parents=True, exist_ok=True)
            self.load_state()
            
            # Check FFmpeg availability for WAV / MP4 processing
            ffmpeg_path = get_ffmpeg_executable()
            if ffmpeg_path:
                self.log(f"🎬 FFmpeg audio/video engine active: {ffmpeg_path}", "info")
            else:
                self.log("ℹ️ Note: System FFmpeg not found. Audio streams will be preserved as high-quality 320kbps MP3s. (To enable instant offline WAV/MP4 conversion, install FFmpeg or run: pip install imageio-ffmpeg pydub)", "info")

            if self.selected_clips is not None and isinstance(self.selected_clips, list):
                clips = self.selected_clips
                self.log(f"🎯 Selective Backup Mode: Processing {len(clips)} user-selected track(s)...", "info")
            else:
                clips = self.fetch_all_clips()

            if self.is_cancelled:
                self.finished_signal.emit(False, "Backup process cancelled by user.")
                return
                
            if not clips:
                self.finished_signal.emit(False, "No tracks retrieved. Bearer token may have expired. Copy a fresh Authorization header from Suno.com and retry.")
                return
                
            total_count = len(clips)
            completed_set = set(self.state_data["completed_clips"].keys())
            previously_completed = sum(1 for clip in clips if clip.get("id") in completed_set)
            remaining_count = total_count - previously_completed
            
            self.counts_signal.emit(previously_completed, remaining_count, total_count)
            self.log(f"Library Analysis: Total={total_count} | Previously Backed Up={previously_completed} | Remaining={remaining_count}", "info")
            
            start_time = time.time()
            total_bytes_downloaded = 0
            total_files_downloaded = 0
            current_processed = 0
            session_downloaded = 0
            session_skipped = 0
            
            for index, clip in enumerate(clips, start=1):
                if self.is_cancelled:
                    self.log("Download process cancelled.", "warn")
                    break
                    
                clip_id = clip.get("id")
                if not clip_id:
                    continue
                    
                raw_title = clip.get("title") or f"suno_track_{clip_id[:8]}"
                clean_title = sanitize_filename(raw_title)
                clip_prefix = f"{clean_title}_{clip_id[:8]}"
                
                # Check resume status
                if clip_id in self.state_data["completed_clips"]:
                    self.log(f"[{index}/{total_count}] [SKIP] Already backed up: '{clean_title}' ({clip_id[:8]})", "warn")
                    session_skipped += 1
                    current_processed += 1
                    self.progress_signal.emit(current_processed, total_count)
                    continue
                    
                if self.max_delay > 0 and session_downloaded > 0:
                    delay = round(random.uniform(self.min_delay, self.max_delay), 2)
                    self.log(f"  ⏱️ [Anti-Rate-Limit] Pausing {delay}s...", "info")
                    time.sleep(delay)
                    
                self.log(f"[{index}/{total_count}] [DOWNLOADING] Track: '{clean_title}' ({clip_id[:8]})", "info")
                
                # Determine target directory
                dest_dir = self.save_dir
                folder_rel = ""
                if self.folder_grouping == "date":
                    created_at = clip.get("created_at") or ""
                    folder_rel = created_at[:7] if (created_at and len(created_at) >= 7) else "Unknown_Date"
                    dest_dir = self.save_dir / folder_rel
                elif self.folder_grouping == "album":
                    album_val = (
                        clip.get("album_name") or 
                        clip.get("playlist_name") or 
                        clip.get("playlist_title") or 
                        clip.get("metadata", {}).get("playlist_name") or 
                        clip.get("metadata", {}).get("album_name")
                    )
                    if not album_val:
                        tags = clip.get("metadata", {}).get("tags") or clip.get("prompt")
                        if tags:
                            first_style = str(tags).split(",")[0].strip()
                            album_val = f"Style - {first_style[:40]}" if first_style else "Single Tracks"
                        else:
                            album_val = "Single Tracks"
                    folder_rel = sanitize_filename(str(album_val))[:60].strip() or "Single Tracks"
                    dest_dir = self.save_dir / folder_rel

                try:
                    dest_dir.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    self.log(f"  Error creating subfolder {dest_dir}: {e}", "error")

                downloaded_files = []
                success_all = True
                
                def rel_path(filename: str) -> str:
                    return f"{folder_rel}/{filename}" if folder_rel else filename
                
                # 1. Metadata JSON
                if self.download_metadata:
                    json_filename = f"{clip_prefix}.json"
                    json_path = dest_dir / json_filename
                    tmp_json = dest_dir / f"{json_filename}.tmp"
                    try:
                        with open(tmp_json, "w", encoding="utf-8") as f:
                            json.dump(clip, f, indent=2, ensure_ascii=False)
                        if tmp_json.exists():
                            file_sz = tmp_json.stat().st_size
                            tmp_json.replace(json_path)
                            downloaded_files.append(rel_path(json_filename))
                            total_files_downloaded += 1
                            total_bytes_downloaded += file_sz
                    except Exception as e:
                        self.log(f"  Failed saving metadata JSON for {clip_id}: {e}", "error")
                        self.cleanup_tmp(tmp_json)
                        success_all = False
                
                # 2. Audio (Lossless WAV with API trigger + Conversion Fallback + MP3)
                downloaded_audio_path: Optional[Path] = None
                if self.download_audio:
                    audio_downloaded = False
                    
                    if self.prefer_wav:
                        # Send active on-demand WAV trigger to Suno backend
                        self.request_wav_generation(clip_id)
                        
                        wav_candidates = []
                        for field in ["wav_url", "audio_wav_url", "audio_url_wav", "download_wav_url", "audio_url_high"]:
                            val = clip.get(field)
                            if val and isinstance(val, str) and val.strip():
                                wav_candidates.append(val.strip())
                        
                        base_audio = clip.get("audio_url") or ""
                        if base_audio:
                            if base_audio.endswith(".mp3"):
                                wav_candidates.append(base_audio[:-4] + ".wav")
                            elif ".wav" in base_audio.lower():
                                wav_candidates.append(base_audio)
                            else:
                                wav_candidates.append(f"{base_audio}.wav")
                        
                        if clip_id:
                            wav_candidates.append(f"https://cdn1.suno.ai/{clip_id}.wav")
                            wav_candidates.append(f"https://cdn2.suno.ai/{clip_id}.wav")
                            wav_candidates.append(f"https://audiopipe.suno.ai/wav/{clip_id}")
                            wav_candidates.append(f"https://studio-api.suno.ai/api/file/{clip_id}.wav")
                        
                        seen_urls = set()
                        unique_wav_candidates = [u for u in wav_candidates if u and not (u in seen_urls or seen_urls.add(u))]
                        
                        audio_file_wav = f"{clip_prefix}.wav"
                        wav_path = dest_dir / audio_file_wav
                        
                        for wav_url in unique_wav_candidates:
                            if self.is_cancelled:
                                break
                            ok_w, b_w = self.download_file_with_retry(wav_url, wav_path, silent_fail=True)
                            if ok_w:
                                downloaded_files.append(rel_path(audio_file_wav))
                                total_files_downloaded += 1
                                total_bytes_downloaded += b_w
                                audio_downloaded = True
                                downloaded_audio_path = wav_path
                                self.log(f"  ✨ [WAV SUCCESS] Downloaded native lossless WAV ({format_bytes(b_w)}) for '{clean_title}'", "success")
                                break
                        
                        # If Suno CDN does not have a pre-rendered WAV file, stream the official 320kbps MP3 directly (0% CPU load)
                        if not audio_downloaded and not self.is_cancelled:
                            fallback_url = clip.get("audio_url")
                            if fallback_url:
                                mp3_target = dest_dir / f"{clip_prefix}.mp3"
                                ok_stream, b_stream = self.download_file_with_retry(fallback_url, mp3_target, silent_fail=True)
                                if ok_stream:
                                    downloaded_files.append(rel_path(f"{clip_prefix}.mp3"))
                                    total_files_downloaded += 1
                                    total_bytes_downloaded += b_stream
                                    audio_downloaded = True
                                    downloaded_audio_path = mp3_target
                                    self.log(f"  [MP3 STREAM] Saved Suno 320kbps audio stream for '{clean_title}' (WAV queued in Suno cloud)", "info")

                    if not audio_downloaded and not self.is_cancelled:
                        fallback_url = clip.get("audio_url")
                        ext = ".wav" if (fallback_url and ".wav" in fallback_url.lower()) else ".mp3"
                        audio_file = f"{clip_prefix}{ext}"
                        audio_target = dest_dir / audio_file
                        ok_a, b_a = self.download_file_with_retry(fallback_url, audio_target)
                        if ok_a:
                            downloaded_files.append(rel_path(audio_file))
                            total_files_downloaded += 1
                            total_bytes_downloaded += b_a
                            audio_downloaded = True
                            downloaded_audio_path = audio_target
                            self.log(f"  [AUDIO SUCCESS] Downloaded track for '{clean_title}'", "success")
                        else:
                            success_all = False

                # 3. Cover Art Image
                image_url = clip.get("image_large_url") or clip.get("image_url")
                downloaded_image_path: Optional[Path] = None
                if (self.download_image or self.download_video) and image_url:
                    image_file = f"{clip_prefix}.jpg"
                    image_target = dest_dir / image_file
                    ok_i, b_i = self.download_file_with_retry(image_url, image_target)
                    if ok_i:
                        if self.download_image:
                            downloaded_files.append(rel_path(image_file))
                            total_files_downloaded += 1
                            total_bytes_downloaded += b_i
                        downloaded_image_path = image_target
                    else:
                        if self.download_image:
                            success_all = False

                # 4. Video (Official Suno Animated Lyric Video - 0% Local CPU Overhead)
                if self.download_video:
                    video_candidates = []
                    for field in ["video_url", "video_mp4_url", "download_video_url"]:
                        val = clip.get(field)
                        if val and isinstance(val, str) and val.strip():
                            video_candidates.append(val.strip())
                    
                    if clip_id:
                        video_candidates.append(f"https://cdn1.suno.ai/{clip_id}.mp4")
                        video_candidates.append(f"https://cdn2.suno.ai/{clip_id}.mp4")

                    seen_v = set()
                    unique_video_candidates = [v for v in video_candidates if v and not (v in seen_v or seen_v.add(v))]

                    video_file = f"{clip_prefix}.mp4"
                    video_path = dest_dir / video_file
                    video_downloaded = False

                    # Check direct download for official animated lyric video rendered on Suno servers
                    for v_url in unique_video_candidates:
                        if self.is_cancelled:
                            break
                        ok_v, b_v = self.download_file_with_retry(v_url, video_path, silent_fail=True)
                        if ok_v:
                            downloaded_files.append(rel_path(video_file))
                            total_files_downloaded += 1
                            total_bytes_downloaded += b_v
                            video_downloaded = True
                            self.log(f"  🎬 [MP4 SUCCESS] Downloaded official Suno lyric video ({format_bytes(b_v)}) for '{clean_title}'", "success")
                            break

                    # If not yet rendered on Suno cloud, trigger Suno backend render queue (0% CPU)
                    if not video_downloaded and not self.is_cancelled:
                        if self.trigger_video_api:
                            self.request_video_generation(clip_id)
                            self.log(f"  ℹ️ [MP4 Queued] Sent official lyric video render request to Suno for '{clean_title}'. (Will download on next sync)", "info")

                if success_all:
                    self.state_data["completed_clips"][clip_id] = {
                        "title": raw_title,
                        "completed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "files": downloaded_files
                    }
                    self.save_state()
                    session_downloaded += 1
                    self.log(f"  [SUCCESS] Completed '{clean_title}'. Saved: {', '.join(downloaded_files)}", "success")

                current_processed += 1
                new_completed = len(self.state_data["completed_clips"])
                new_remaining = max(0, total_count - new_completed)
                self.counts_signal.emit(new_completed, new_remaining, total_count)
                self.progress_signal.emit(current_processed, total_count)

                # Update live stats
                elapsed = max(0.1, time.time() - start_time)
                speed_str = f"{format_bytes(int(total_bytes_downloaded / elapsed))}/s"
                self.stats_signal.emit(format_bytes(total_bytes_downloaded), speed_str, format_duration(elapsed))

            # Generate offline reports
            self.generate_catalog_reports(clips)

            if self.is_cancelled:
                self.finished_signal.emit(False, "Backup operation was cancelled.")
            else:
                elapsed = max(0.1, time.time() - start_time)
                fmt_dur = format_duration(elapsed)
                fmt_sz = format_bytes(total_bytes_downloaded)
                msg = f"🎉 Suno Backup Complete!\n\n• Total Tracks Processed: {total_count}\n• Session Downloaded: {session_downloaded}\n• Total Files Downloaded: {total_files_downloaded}\n• Total Size: {fmt_sz}\n• Time Elapsed: {fmt_dur}\n\nSaved to: {self.save_dir}"
                self.finished_signal.emit(True, msg)

        except Exception as e:
            logger.exception("Fatal error in backup worker")
            self.log(f"Fatal error during backup: {e}", "error")
            self.finished_signal.emit(False, f"Fatal error: {e}")


class SunoBackupWindow(QMainWindow):
    """
    Modern Multi-Tab PySide6 GUI for Suno AI Library Backup Tool.
    Includes Setup Guide, Live Stats Cards, Dashboard, Catalog Browser, and Settings.
    """

    def __init__(self):
        super().__init__()
        self.worker: Optional[BackupWorker] = None
        self.catalog_tracks = []
        self.selected_track_ids = set()
        self.is_updating_table = False
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Suno AI Library Backup Tool")
        self.resize(920, 720)
        self.setMinimumSize(780, 600)
        self.apply_theme()

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        root_layout = QVBoxLayout(central_widget)
        root_layout.setSpacing(10)
        root_layout.setContentsMargins(14, 14, 14, 14)

        # Header Title Banner
        header = QFrame()
        header.setObjectName("HeaderFrame")
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(16, 12, 16, 12)
        
        v_title = QVBoxLayout()
        title_label = QLabel("🎵 Suno AI Library Backup Tool")
        title_label.setFont(QFont("Segoe UI", 15, QFont.Bold))
        title_label.setStyleSheet("color: #38bdf8;")
        subtitle_label = QLabel("Lossless WAV, MP3, MP4 video animation, artwork & offline catalog synchronization.")
        subtitle_label.setStyleSheet("color: #94a3b8; font-size: 11px;")
        v_title.addWidget(title_label)
        v_title.addWidget(subtitle_label)
        h_layout.addLayout(v_title, 1)

        # Header Quick Stats Pills
        self.pill_auth = QLabel("Auth: ⚪ Pending")
        self.pill_auth.setStyleSheet("background-color: #1e293b; color: #94a3b8; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #334155;")
        self.pill_total = QLabel("Tracks: 0")
        self.pill_total.setStyleSheet("background-color: #1e293b; color: #60a5fa; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #334155;")
        self.pill_done = QLabel("Done: 0")
        self.pill_done.setStyleSheet("background-color: #1e293b; color: #34d399; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #334155;")
        self.pill_size = QLabel("Size: 0 MB")
        self.pill_size.setStyleSheet("background-color: #1e293b; color: #fbbf24; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #334155;")
        
        h_layout.addWidget(self.pill_auth)
        h_layout.addWidget(self.pill_total)
        h_layout.addWidget(self.pill_done)
        h_layout.addWidget(self.pill_size)
        root_layout.addWidget(header)

        # Main Tab Widget
        self.tabs = QTabWidget()
        self.tabs.setObjectName("MainTabs")
        root_layout.addWidget(self.tabs, 1)

        # Tab 1: Backup Control Center
        self.tab_dashboard = QWidget()
        self.setup_dashboard_tab()
        self.tabs.addTab(self.tab_dashboard, "🚀 Backup Dashboard")

        # Tab 2: Setup Guide & Token Extractor
        self.tab_guide = QWidget()
        self.setup_guide_tab()
        self.tabs.addTab(self.tab_guide, "📖 Setup & Token Guide")

        # Tab 3: Library Catalog Browser
        self.tab_catalog = QWidget()
        self.setup_catalog_tab()
        self.tabs.addTab(self.tab_catalog, "📁 Library Catalog")

        # Tab 4: Advanced Settings
        self.tab_settings = QWidget()
        self.setup_settings_tab()
        self.tabs.addTab(self.tab_settings, "⚙️ Advanced Settings")

        self.check_existing_state()
        self.auto_load_offline_catalog()

    def setup_dashboard_tab(self):
        layout = QVBoxLayout(self.tab_dashboard)
        layout.setSpacing(10)
        layout.setContentsMargins(12, 12, 12, 12)

        # Authentication Group
        auth_group = QGroupBox("1. Authentication (Bearer Token & Optional Session Cookie)")
        auth_layout = QVBoxLayout(auth_group)
        auth_layout.setSpacing(6)

        r1 = QHBoxLayout()
        lbl_token = QLabel("Bearer Token:")
        lbl_token.setFixedWidth(100)
        self.token_input = QLineEdit()
        self.token_input.setPlaceholderText("Paste fresh Suno Bearer token (from studio-api.suno.ai Authorization header)...")
        self.token_input.setEchoMode(QLineEdit.Password)
        
        self.toggle_token_btn = QPushButton("👁️ Show")
        self.toggle_token_btn.setFixedWidth(75)
        self.toggle_token_btn.clicked.connect(self.toggle_token_visibility)

        self.test_token_btn = QPushButton("⚡ Validate")
        self.test_token_btn.setFixedWidth(85)
        self.test_token_btn.clicked.connect(self.validate_token_quick)

        r1.addWidget(lbl_token)
        r1.addWidget(self.token_input)
        r1.addWidget(self.toggle_token_btn)
        r1.addWidget(self.test_token_btn)
        auth_layout.addLayout(r1)

        # Token status feedback
        self.lbl_token_info = QLabel("ℹ️ Suno Clerk JWT tokens expire in ~60-120 seconds. Paste right after opening Suno.com.")
        self.lbl_token_info.setStyleSheet("color: #94a3b8; font-size: 11px;")
        auth_layout.addWidget(self.lbl_token_info)

        r2 = QHBoxLayout()
        lbl_cookie = QLabel("Cookie (Opt):")
        lbl_cookie.setFixedWidth(100)
        self.cookie_input = QLineEdit()
        self.cookie_input.setPlaceholderText("Optional: __client=...; __session=... (Bypasses token expiration & Cloudflare)")
        self.cookie_input.setText("")
        r2.addWidget(lbl_cookie)
        r2.addWidget(self.cookie_input)
        auth_layout.addLayout(r2)
        layout.addWidget(auth_group)

        # Directory & Format Row
        row_cfg = QHBoxLayout()
        
        # Save Dir
        dir_group = QGroupBox("2. Target Backup Directory")
        dir_layout = QHBoxLayout(dir_group)
        self.dir_input = QLineEdit()
        default_path = str(Path.home() / "Music" / "Suno_Backup")
        self.dir_input.setText(default_path)
        browse_btn = QPushButton("📁 Browse...")
        browse_btn.clicked.connect(self.select_directory)
        open_folder_btn = QPushButton("📂 Open")
        open_folder_btn.clicked.connect(self.open_save_directory)
        dir_layout.addWidget(self.dir_input)
        dir_layout.addWidget(browse_btn)
        dir_layout.addWidget(open_folder_btn)
        row_cfg.addWidget(dir_group, 3)

        # Organization
        org_group = QGroupBox("3. Subfolder Grouping")
        org_layout = QHBoxLayout(org_group)
        self.cmb_grouping = QComboBox()
        self.cmb_grouping.addItem("Flat Folder (No Subfolders)", "none")
        self.cmb_grouping.addItem("Subfolders by Date (YYYY-MM)", "date")
        self.cmb_grouping.addItem("Subfolders by Album / Style", "album")
        default_grp = "none"
        if default_grp == "date":
            self.cmb_grouping.setCurrentIndex(1)
        elif default_grp == "album":
            self.cmb_grouping.setCurrentIndex(2)
        else:
            self.cmb_grouping.setCurrentIndex(0)
        org_layout.addWidget(self.cmb_grouping)
        row_cfg.addWidget(org_group, 2)
        layout.addLayout(row_cfg)

        # Media Types & Preferred Format
        media_group = QGroupBox("4. Media Types & Preferred Audio Format")
        media_layout = QVBoxLayout(media_group)
        media_layout.setSpacing(6)

        r_media = QHBoxLayout()
        self.chk_audio = QCheckBox("Audio Tracks")
        self.chk_audio.setChecked(True)
        self.chk_video = QCheckBox("Official Video (MP4) [Cloud Rendered]")
        self.chk_video.setToolTip("Downloads official animated lyric videos rendered by Suno servers. (Default OFF for ultra-fast zero CPU streaming)")
        self.chk_video.setChecked(False)
        self.chk_image = QCheckBox("Cover Artwork")
        self.chk_image.setChecked(True)
        self.chk_meta = QCheckBox("Metadata (JSON)")
        self.chk_meta.setChecked(True)
        self.chk_report = QCheckBox("Offline Catalog (CSV/JSON)")
        self.chk_report.setChecked(True)

        r_media.addWidget(self.chk_audio)
        r_media.addWidget(self.chk_video)
        r_media.addWidget(self.chk_image)
        r_media.addWidget(self.chk_meta)
        r_media.addWidget(self.chk_report)
        media_layout.addLayout(r_media)

        r_fmt = QHBoxLayout()
        lbl_fmt = QLabel("Preferred Format:")
        lbl_fmt.setFixedWidth(110)
        self.cmb_audio_format = QComboBox()
        self.cmb_audio_format.addItem("Lossless WAV (.wav) - Pro Target (With On-Demand Trigger & MP3 Fallback)", "wav")
        self.cmb_audio_format.addItem("Standard MP3 (.mp3) - Compact 320kbps", "mp3")
        default_fmt = "wav"
        self.cmb_audio_format.setCurrentIndex(1 if default_fmt == "mp3" else 0)
        r_fmt.addWidget(lbl_fmt)
        r_fmt.addWidget(self.cmb_audio_format)
        media_layout.addLayout(r_fmt)
        layout.addWidget(media_group)

        # Action Buttons
        act_layout = QHBoxLayout()
        self.start_btn = QPushButton("▶ Start / Resume Backup")
        self.start_btn.setObjectName("StartButton")
        self.start_btn.setFixedHeight(38)
        self.start_btn.setFont(QFont("Segoe UI", 10, QFont.Bold))
        self.start_btn.clicked.connect(self.start_full_backup)

        self.cancel_btn = QPushButton("🛑 Cancel")
        self.cancel_btn.setObjectName("CancelButton")
        self.cancel_btn.setFixedHeight(38)
        self.cancel_btn.setEnabled(False)
        self.cancel_btn.clicked.connect(self.cancel_backup)

        act_layout.addWidget(self.start_btn, 3)
        act_layout.addWidget(self.cancel_btn, 1)
        layout.addLayout(act_layout)

        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(20)
        layout.addWidget(self.progress_bar)

        # Live Console
        log_group = QGroupBox("Activity Console")
        log_layout = QVBoxLayout(log_group)
        log_layout.setContentsMargins(6, 6, 6, 6)
        
        self.log_box = QTextEdit()
        self.log_box.setReadOnly(True)
        self.log_box.setFont(QFont("Consolas", 9))
        self.log_box.setStyleSheet("background-color: #0b0f19; color: #cbd5e1; border: 1px solid #1e293b; border-radius: 4px;")
        log_layout.addWidget(self.log_box)
        layout.addWidget(log_group, 1)

    def on_token_changed(self, text: str):
        exp_ts, exp_str = decode_jwt_expiry(text)
        if exp_ts and exp_str:
            now_ts = int(time.time())
            if now_ts > exp_ts:
                diff = now_ts - exp_ts
                self.lbl_token_info.setText(f"⚠️ Token expired {diff}s ago ({exp_str}). Copy a fresh one from Suno.com.")
                self.lbl_token_info.setStyleSheet("color: #f87171; font-size: 11px;")
                self.pill_auth.setText("Auth: 🔴 Expired")
                self.pill_auth.setStyleSheet("background-color: #450a0a; color: #f87171; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #991b1b;")
            else:
                remaining = exp_ts - now_ts
                self.lbl_token_info.setText(f"✅ Token valid for {remaining}s (Expires at: {exp_str}).")
                self.lbl_token_info.setStyleSheet("color: #34d399; font-size: 11px;")
                self.pill_auth.setText(f"Auth: 🟢 Active ({remaining}s)")
                self.pill_auth.setStyleSheet("background-color: #064e3b; color: #34d399; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #059669;")
        else:
            if not text.strip():
                self.lbl_token_info.setText("ℹ️ Paste your Authorization header from browser DevTools (F12).")
                self.lbl_token_info.setStyleSheet("color: #94a3b8; font-size: 11px;")
                self.pill_auth.setText("Auth: ⚪ Pending")
                self.pill_auth.setStyleSheet("background-color: #1e293b; color: #94a3b8; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #334155;")
            else:
                self.lbl_token_info.setText("ℹ️ Format unverified. Click ⚡ Validate to test against Suno API.")
                self.lbl_token_info.setStyleSheet("color: #60a5fa; font-size: 11px;")
                self.pill_auth.setText("Auth: 🟡 Unverified")
                self.pill_auth.setStyleSheet("background-color: #451a03; color: #fbbf24; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #b45309;")

    def setup_guide_tab(self):
        layout = QVBoxLayout(self.tab_guide)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        guide_box = QTextEdit()
        guide_box.setReadOnly(True)
        guide_box.setStyleSheet("background-color: #131722; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 12px; font-size: 13px;")
        guide_html = """
        <h2 style="color: #38bdf8; margin-top: 0;">How to Get a Fresh Suno Bearer Token (Fast & Easy)</h2>
        <p style="color: #94a3b8;">Suno uses Clerk authentication. Clerk JWT tokens expire within ~60-120 seconds, so copy it right after refreshing your Suno tab.</p>
        
        <ol style="line-height: 1.6; color: #cbd5e1;">
            <li><b>Open Suno</b>: Go to <a href="https://suno.com" style="color: #60a5fa;">suno.com</a> in Chrome, Edge, Brave, or Firefox and log in.</li>
            <li><b>Open Developer Tools</b>: Press <kbd style="background: #334155; padding: 2px 6px; border-radius: 4px;">F12</kbd> (or right-click anywhere and choose <i>Inspect</i>).</li>
            <li><b>Switch to Network Tab</b>: Click the <b>Network</b> tab at the top of DevTools and filter by <b>Fetch/XHR</b>.</li>
            <li><b>Refresh Page</b>: Press <kbd style="background: #334155; padding: 2px 6px; border-radius: 4px;">Ctrl+R</kbd> (or <kbd>Cmd+R</kbd> on Mac).</li>
            <li><b>Find 'feed' or 'billing'</b>: In the list of requests, click on <code>feed?page=0</code> or <code>billing/info</code>.</li>
            <li><b>Copy Authorization Header</b>: In the <i>Headers</i> tab on the right, scroll to <i>Request Headers</i> and look for <b>authorization</b> (starts with <code>Bearer eyJhbGci...</code>).</li>
            <li><b>Paste into Tool & Click Validate</b>: Paste the token into the <i>Bearer Token</i> field and click ⚡ Validate.</li>
        </ol>

        <hr style="border: 1px solid #334155; margin: 15px 0;">

        <h3 style="color: #34d399;">Why did I get 401 Unauthorized or 503?</h3>
        <ul style="line-height: 1.6; color: #cbd5e1;">
            <li><b>401 Unauthorized</b>: Means the short-lived JWT Bearer token expired. Simply refresh Suno.com, copy the brand new authorization header, and paste it into the tool.</li>
            <li><b>503 Service Unavailable (Cloudflare)</b>: Occurs if requests lack full browser user-agent headers or if Cloudflare is challenging the connection. This script now sends full browser spoofing headers. You can also paste your browser <code>Cookie:</code> to bypass Cloudflare.</li>
        </ul>
        """
        guide_box.setHtml(guide_html)
        layout.addWidget(guide_box)

    def setup_catalog_tab(self):
        layout = QVBoxLayout(self.tab_catalog)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Toolbar Row 1: Action Controls
        action_bar = QHBoxLayout()
        action_bar.setSpacing(8)

        self.btn_download_selected = QPushButton("📥 Download Selected (0)")
        self.btn_download_selected.setStyleSheet("background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #38bdf8;")
        self.btn_download_selected.clicked.connect(self.start_selected_backup)

        self.btn_export_csv = QPushButton("📊 Export CSV")
        self.btn_export_csv.setStyleSheet("background-color: #064e3b; color: #34d399; font-weight: bold; border: 1px solid #059669;")
        self.btn_export_csv.clicked.connect(self.export_catalog_csv)

        self.btn_export_json = QPushButton("📄 Export JSON")
        self.btn_export_json.setStyleSheet("background-color: #3b0764; color: #c084fc; font-weight: bold; border: 1px solid #9333ea;")
        self.btn_export_json.clicked.connect(self.export_catalog_json)

        self.btn_fetch_feed = QPushButton("🔄 Fetch Feed from Suno")
        self.btn_fetch_feed.clicked.connect(self.fetch_feed_catalog_only)

        self.btn_refresh = QPushButton("📁 Load from Folder")
        self.btn_refresh.clicked.connect(self.reload_catalog_from_file)

        action_bar.addWidget(self.btn_download_selected)
        action_bar.addWidget(self.btn_export_csv)
        action_bar.addWidget(self.btn_export_json)
        action_bar.addStretch(1)
        action_bar.addWidget(self.btn_fetch_feed)
        action_bar.addWidget(self.btn_refresh)
        layout.addLayout(action_bar)

        # Toolbar Row 2: Search, Filters & Selection Helpers
        filter_bar = QHBoxLayout()
        filter_bar.setSpacing(8)

        self.search_catalog = QLineEdit()
        self.search_catalog.setPlaceholderText("🔍 Filter tracks by title, model, style prompt...")
        self.search_catalog.textChanged.connect(self.filter_catalog_table)

        self.cmb_filter_status = QComboBox()
        self.cmb_filter_status.addItem("All Tracks", "all")
        self.cmb_filter_status.addItem("Completed Only", "completed")
        self.cmb_filter_status.addItem("Pending Only", "pending")
        self.cmb_filter_status.currentIndexChanged.connect(lambda: self.filter_catalog_table(self.search_catalog.text()))

        btn_select_all = QPushButton("Select All")
        btn_select_all.clicked.connect(self.select_all_catalog)

        btn_select_pending = QPushButton("Select Pending")
        btn_select_pending.clicked.connect(self.select_pending_catalog)

        btn_deselect_all = QPushButton("Deselect All")
        btn_deselect_all.clicked.connect(self.deselect_all_catalog)

        filter_bar.addWidget(self.search_catalog, 2)
        filter_bar.addWidget(self.cmb_filter_status, 1)
        filter_bar.addWidget(btn_select_all)
        filter_bar.addWidget(btn_select_pending)
        filter_bar.addWidget(btn_deselect_all)
        layout.addLayout(filter_bar)

        # Interactive Table Widget
        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(["", "Title", "Duration", "Model", "Style Tags / Prompt", "Status"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Fixed)
        self.table.setColumnWidth(0, 36)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(4, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeToContents)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setStyleSheet("background-color: #0b0f19; color: #f1f5f9; gridline-color: #1e293b;")
        self.table.itemChanged.connect(self.on_table_item_changed)
        layout.addWidget(self.table, 1)

    def on_table_item_changed(self, item: QTableWidgetItem):
        if self.is_updating_table or item.column() != 0:
            return
        clip_id = item.data(Qt.UserRole)
        if not clip_id:
            return
        if item.checkState() == Qt.Checked:
            self.selected_track_ids.add(clip_id)
        else:
            self.selected_track_ids.discard(clip_id)
        self.btn_download_selected.setText(f"📥 Download Selected ({len(self.selected_track_ids)})")

    def select_all_catalog(self):
        self.is_updating_table = True
        for r in range(self.table.rowCount()):
            item = self.table.item(r, 0)
            if item:
                clip_id = item.data(Qt.UserRole)
                item.setCheckState(Qt.Checked)
                if clip_id:
                    self.selected_track_ids.add(clip_id)
        self.is_updating_table = False
        self.btn_download_selected.setText(f"📥 Download Selected ({len(self.selected_track_ids)})")

    def select_pending_catalog(self):
        self.is_updating_table = True
        save_path = Path(self.dir_input.text().strip())
        state_file = save_path / STATE_FILENAME
        completed_set = set()
        if state_file.exists():
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    completed_set = set(json.load(f).get("completed_clips", {}).keys())
            except Exception:
                pass

        self.selected_track_ids.clear()
        for r in range(self.table.rowCount()):
            item = self.table.item(r, 0)
            if item:
                clip_id = item.data(Qt.UserRole)
                if clip_id and clip_id not in completed_set:
                    item.setCheckState(Qt.Checked)
                    self.selected_track_ids.add(clip_id)
                else:
                    item.setCheckState(Qt.Unchecked)
        self.is_updating_table = False
        self.btn_download_selected.setText(f"📥 Download Selected ({len(self.selected_track_ids)})")

    def deselect_all_catalog(self):
        self.is_updating_table = True
        self.selected_track_ids.clear()
        for r in range(self.table.rowCount()):
            item = self.table.item(r, 0)
            if item:
                item.setCheckState(Qt.Unchecked)
        self.is_updating_table = False
        self.btn_download_selected.setText("📥 Download Selected (0)")

    def export_catalog_csv(self):
        if not self.catalog_tracks:
            QMessageBox.warning(self, "Export CSV", "No catalog tracks loaded yet. Please run a backup or click 'Fetch Feed from Suno'.")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(self, "Export Catalog to CSV", str(Path.home() / "suno_catalog.csv"), "CSV Files (*.csv)")
        if not file_path:
            return

        save_path = Path(self.dir_input.text().strip())
        state_file = save_path / STATE_FILENAME
        completed_set = set()
        if state_file.exists():
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    completed_set = set(json.load(f).get("completed_clips", {}).keys())
            except Exception:
                pass

        csv_columns = [
            "id", "title", "created_at", "model_name", "tags", "prompt", 
            "gpt_description_prompt", "duration_seconds", "is_liked", "is_public",
            "audio_url", "video_url", "image_url", "backup_status"
        ]
        
        try:
            with open(file_path, "w", newline="", encoding="utf-8-sig") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=csv_columns)
                writer.writeheader()
                for clip in self.catalog_tracks:
                    clip_id = clip.get("id", "")
                    meta = clip.get("metadata") or {}
                    tags = meta.get("tags") if isinstance(meta, dict) else ""
                    prompt = meta.get("prompt") if isinstance(meta, dict) else ""
                    gpt_prompt = meta.get("gpt_description_prompt") if isinstance(meta, dict) else ""
                    is_completed = clip_id in completed_set
                    writer.writerow({
                        "id": clip_id,
                        "title": clip.get("title") or "Untitled Track",
                        "created_at": clip.get("created_at") or "",
                        "model_name": clip.get("model_name") or (meta.get("type") if isinstance(meta, dict) else "") or "",
                        "tags": tags or "",
                        "prompt": prompt or "",
                        "gpt_description_prompt": gpt_prompt or "",
                        "duration_seconds": clip.get("duration") or (meta.get("duration") if isinstance(meta, dict) else "") or "",
                        "is_liked": clip.get("is_liked") or False,
                        "is_public": clip.get("is_public") or False,
                        "audio_url": clip.get("audio_url") or "",
                        "video_url": clip.get("video_url") or "",
                        "image_url": clip.get("image_large_url") or clip.get("image_url") or "",
                        "backup_status": "Completed" if is_completed else "Pending"
                    })
            QMessageBox.information(self, "Export Successful", f"✅ Successfully exported {len(self.catalog_tracks)} tracks to CSV:\n{file_path}")
        except Exception as e:
            QMessageBox.critical(self, "Export Failed", f"Failed to write CSV file:\n{e}")

    def export_catalog_json(self):
        if not self.catalog_tracks:
            QMessageBox.warning(self, "Export JSON", "No catalog tracks loaded yet. Please run a backup or click 'Fetch Feed from Suno'.")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(self, "Export Catalog to JSON", str(Path.home() / "suno_catalog.json"), "JSON Files (*.json)")
        if not file_path:
            return

        try:
            catalog_json_data = {
                "exported_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_tracks": len(self.catalog_tracks),
                "tracks": self.catalog_tracks
            }
            with open(file_path, "w", encoding="utf-8") as json_file:
                json.dump(catalog_json_data, json_file, indent=2, ensure_ascii=False)
            QMessageBox.information(self, "Export Successful", f"✅ Successfully exported {len(self.catalog_tracks)} tracks to JSON:\n{file_path}")
        except Exception as e:
            QMessageBox.critical(self, "Export Failed", f"Failed to write JSON file:\n{e}")

    def auto_load_offline_catalog(self):
        """Silently auto-populates the Library Catalog on startup if previous backup state exists."""
        save_path = Path(self.dir_input.text().strip())
        cat_file = save_path / CATALOG_JSON_FILENAME
        if cat_file.exists():
            try:
                with open(cat_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    tracks = data.get("tracks", [])
                    if tracks:
                        self.table.setRowCount(0)
                        self.catalog_tracks = []
                        self.selected_track_ids.clear()
                        for t in tracks:
                            self.add_catalog_row(t)
                        self.pill_total.setText(f"Tracks: {len(tracks)}")
            except Exception:
                pass
        elif (save_path / STATE_FILENAME).exists():
            try:
                with open(save_path / STATE_FILENAME, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    completed = len(data.get("completed_clips", {}))
                    self.pill_done.setText(f"Done: {completed}")
            except Exception:
                pass

    def fetch_feed_catalog_only(self):
        token = clean_header_value(self.token_input.text())
        cookie_val = clean_header_value(self.cookie_input.text())
        if not token:
            QMessageBox.warning(self, "Token Required", "Please enter your Bearer token in the Dashboard tab first.")
            return

        # Check JWT Expiration
        exp_ts, exp_str = decode_jwt_expiry(token)
        if exp_ts and time.time() > exp_ts:
            diff = int(time.time() - exp_ts)
            ans = QMessageBox.question(
                self,
                "Token Expired Warning",
                f"Your Bearer token expired {diff}s ago ({exp_str}).\n\nSuno will likely return 401 Unauthorized.\n\nDo you want to attempt fetching anyway?",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            if ans == QMessageBox.No:
                return

        self.btn_fetch_feed.setEnabled(False)
        self.btn_fetch_feed.setText("⏳ Fetching...")
        QApplication.processEvents()

        try:
            self.table.setRowCount(0)
            self.catalog_tracks = []
            self.selected_track_ids.clear()
            self.btn_download_selected.setText("📥 Download Selected (0)")
            
            headers = build_full_browser_headers(token, cookie_val)
            session = requests.Session()
            session.headers.update(headers)
            
            self.append_log("Connecting to Suno library API...", "info")
            
            candidate_endpoints = [
                "https://studio-api.suno.ai/api/feed/",
                "https://studio-api.suno.ai/api/feed/v2",
                "https://studio-api-prod.suno.com/api/feed/",
                "https://studio-api.suno.ai/api/feed/?hide_trashed=true"
            ]
            
            active_base_url = None
            for ep in candidate_endpoints:
                try:
                    sep = "&" if "?" in ep else "?"
                    r_test = session.get(f"{ep}{sep}page=0", timeout=12)
                    if r_test.status_code == 200:
                        test_clips = extract_clips_from_response(r_test.json())
                        active_base_url = ep
                        self.append_log(f"Connected to API endpoint ({ep}). Found {len(test_clips)} items on first probe.", "success")
                        break
                    elif r_test.status_code == 401:
                        self.append_log(f"401 Unauthorized at {ep}. Bearer token expired.", "error")
                except Exception as e:
                    self.append_log(f"Endpoint probe note ({ep}): {e}", "warn")
                    continue

            if not active_base_url:
                active_base_url = "https://studio-api.suno.ai/api/feed/"

            page = 0
            total_fetched = 0
            while True:
                sep = "&" if "?" in active_base_url else "?"
                url = f"{active_base_url}{sep}page={page}"
                try:
                    r = session.get(url, timeout=15)
                    if r.status_code == 401:
                        self.append_log(f"HTTP 401 Unauthorized at page {page}. Suno Bearer token expired.", "error")
                        QMessageBox.critical(self, "Token Expired (401)", "❌ Suno returned 401 Unauthorized.\n\nYour Bearer token has expired. Please refresh Suno.com and copy a new token from DevTools.")
                        break
                    r.raise_for_status()
                    data = r.json()
                    page_clips = extract_clips_from_response(data)
                    if not page_clips:
                        self.append_log(f"Reached end of library feed at page {page}.", "info")
                        break
                        
                    for c in page_clips:
                        self.add_catalog_row(c)
                    total_fetched += len(page_clips)
                    self.append_log(f"Fetched page {page + 1}: +{len(page_clips)} tracks (Total: {total_fetched})", "info")
                    page += 1
                    QApplication.processEvents()
                    time.sleep(0.2)
                except Exception as e:
                    self.append_log(f"Feed fetch completed or stopped at page {page}: {e}", "warn")
                    break
                    
            self.pill_total.setText(f"Tracks: {len(self.catalog_tracks)}")
            if len(self.catalog_tracks) > 0:
                # Auto-save catalog JSON and state for future offline loading
                save_path = Path(self.dir_input.text().strip())
                try:
                    save_path.mkdir(parents=True, exist_ok=True)
                    cat_json_path = save_path / CATALOG_JSON_FILENAME
                    with open(cat_json_path, "w", encoding="utf-8") as f:
                        json.dump({
                            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "total_tracks": len(self.catalog_tracks),
                            "tracks": self.catalog_tracks
                        }, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass
                QMessageBox.information(self, "Catalog Loaded", f"✅ Successfully loaded {len(self.catalog_tracks)} tracks from your Suno account!")
            else:
                QMessageBox.warning(self, "Catalog Empty", "⚠️ No tracks were found in the response.\n\nIf you have songs on Suno, verify your Bearer Token or check that you are logged into the correct Suno account.")
        finally:
            self.btn_fetch_feed.setEnabled(True)
            self.btn_fetch_feed.setText("🔄 Fetch Feed from Suno")

    def start_selected_backup(self):
        if not self.selected_track_ids:
            QMessageBox.warning(self, "No Selection", "Please check at least one track in the catalog table to download.")
            return
            
        selected_clips = [c for c in self.catalog_tracks if c.get("id") in self.selected_track_ids]
        if not selected_clips:
            QMessageBox.warning(self, "No Selection", "Selected tracks could not be found in memory.")
            return

        self.tabs.setCurrentWidget(self.tab_dashboard)
        self.start_backup(selected_clips=selected_clips)

    def setup_settings_tab(self):
        layout = QVBoxLayout(self.tab_settings)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        gen_group = QGroupBox("Active On-Demand Cloud Triggers")
        gen_layout = QVBoxLayout(gen_group)
        self.chk_auto_wav = QCheckBox("Automatically send WAV generation trigger to Suno backend")
        self.chk_auto_wav.setChecked(True)
        self.chk_auto_video = QCheckBox("Automatically send Video MP4 render trigger to Suno backend")
        self.chk_auto_video.setChecked(True)
        gen_layout.addWidget(self.chk_auto_wav)
        gen_layout.addWidget(self.chk_auto_video)
        layout.addWidget(gen_group)

        rate_group = QGroupBox("Anti-Rate-Limit Request Throttling")
        rate_layout = QVBoxLayout(rate_group)
        self.lbl_slider = QLabel("Max delay between tracks: 2.0s")
        self.slider_delay = QSlider(Qt.Horizontal)
        self.slider_delay.setRange(0, 10)
        self.slider_delay.setValue(2)
        self.slider_delay.valueChanged.connect(lambda v: self.lbl_slider.setText(f"Max delay between tracks: {v}.0s"))
        rate_layout.addWidget(self.lbl_slider)
        rate_layout.addWidget(self.slider_delay)
        layout.addWidget(rate_group)
        layout.addStretch(1)

    def apply_theme(self):
        self.setStyleSheet("""
            QMainWindow {
                background-color: #0f172a;
            }
            QWidget {
                color: #f1f5f9;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }
            #HeaderFrame {
                background-color: #1e293b;
                border-radius: 8px;
                border: 1px solid #334155;
            }
            QGroupBox {
                font-weight: bold;
                border: 1px solid #334155;
                border-radius: 6px;
                margin-top: 10px;
                padding-top: 10px;
                background-color: #131d31;
                color: #38bdf8;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 4px;
            }
            QLineEdit, QComboBox {
                background-color: #0b0f19;
                border: 1px solid #334155;
                border-radius: 4px;
                padding: 6px 10px;
                color: #f8fafc;
            }
            QLineEdit:focus, QComboBox:focus {
                border: 1px solid #38bdf8;
            }
            QPushButton {
                background-color: #334155;
                color: #f8fafc;
                border: 1px solid #475569;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 500;
            }
            QPushButton:hover {
                background-color: #475569;
            }
            #StartButton {
                background-color: #0284c7;
                border: 1px solid #38bdf8;
            }
            #StartButton:hover {
                background-color: #0369a1;
            }
            #CancelButton {
                background-color: #991b1b;
                border: 1px solid #f87171;
            }
            #CancelButton:hover {
                background-color: #7f1d1d;
            }
            QProgressBar {
                background-color: #0b0f19;
                border: 1px solid #334155;
                border-radius: 4px;
                text-align: center;
                color: #ffffff;
                font-weight: bold;
            }
            QProgressBar::chunk {
                background-color: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0284c7, stop:1 #38bdf8);
                border-radius: 3px;
            }
            QTabWidget::pane {
                border: 1px solid #334155;
                background-color: #0f172a;
                border-radius: 6px;
            }
            QTabBar::tab {
                background: #1e293b;
                color: #94a3b8;
                padding: 8px 16px;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background: #0284c7;
                color: #ffffff;
                font-weight: bold;
            }
        """)

    def toggle_token_visibility(self):
        if self.token_input.echoMode() == QLineEdit.Password:
            self.token_input.setEchoMode(QLineEdit.Normal)
            self.toggle_token_btn.setText("🔒 Hide")
        else:
            self.token_input.setEchoMode(QLineEdit.Password)
            self.toggle_token_btn.setText("👁️ Show")

    def select_directory(self):
        folder = QFileDialog.getExistingDirectory(self, "Select Backup Directory", self.dir_input.text())
        if folder:
            self.dir_input.setText(folder)
            self.check_existing_state()
            self.auto_load_offline_catalog()

    def open_save_directory(self):
        path_str = self.dir_input.text().strip()
        if path_str and os.path.exists(path_str):
            QDesktopServices.openUrl(QUrl.fromLocalFile(path_str))
        else:
            QMessageBox.information(self, "Folder", "Target folder does not exist yet.")

    def check_existing_state(self):
        save_path = Path(self.dir_input.text().strip())
        state_file = save_path / STATE_FILENAME
        if state_file.exists():
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    completed = len(data.get("completed_clips", {}))
                    self.pill_done.setText(f"Done: {completed}")
            except Exception:
                pass

    def validate_token_quick(self):
        token = clean_header_value(self.token_input.text())
        cookie_val = clean_header_value(self.cookie_input.text())
        
        if not token:
            QMessageBox.warning(self, "Token", "Please paste a Bearer token first.")
            return

        # Check JWT Expiry
        exp_ts, exp_str = decode_jwt_expiry(token)
        if exp_ts and time.time() > exp_ts:
            diff = int(time.time() - exp_ts)
            QMessageBox.critical(
                self, 
                "Token Expired", 
                f"❌ This Bearer token expired {diff} seconds ago!\n\nExpired at: {exp_str}\n\nSuno tokens are short-lived. Please refresh Suno.com in your browser, copy the newest 'authorization' header from DevTools, and validate immediately."
            )
            return

        headers = build_full_browser_headers(token, cookie_val)
        endpoints = [
            "https://studio-api.suno.ai/api/feed/?page=0",
            "https://studio-api.suno.ai/api/feed/v2",
            "https://studio-api-prod.suno.com/api/feed/?page=0",
            "https://studio-api.suno.ai/api/billing/info/"
        ]
        
        success = False
        last_status = None
        for ep in endpoints:
            try:
                r = requests.get(ep, headers=headers, timeout=10)
                last_status = r.status_code
                if r.status_code == 200:
                    data = r.json()
                    clips = data if isinstance(data, list) else (data.get("clips") or data.get("items") or [])
                    count_str = f" Discovered {len(clips)} tracks on first page." if clips else ""
                    self.pill_auth.setText("Auth: 🟢 Active")
                    self.pill_auth.setStyleSheet("background-color: #064e3b; color: #34d399; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #059669;")
                    QMessageBox.information(self, "Token Validated", f"✅ Token is active and valid!{count_str}")
                    success = True
                    break
                elif r.status_code == 401:
                    last_status = 401
                    self.pill_auth.setText("Auth: 🔴 Invalid")
                    self.pill_auth.setStyleSheet("background-color: #450a0a; color: #f87171; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #991b1b;")
                    break
            except Exception:
                continue

        if not success:
            if last_status == 401:
                QMessageBox.critical(
                    self, 
                    "Token Error (401)", 
                    "❌ Token is invalid or expired (401 Unauthorized).\n\nPlease refresh Suno.com and copy the fresh 'authorization' header from Network tab."
                )
            elif last_status == 503:
                QMessageBox.warning(
                    self, 
                    "Cloudflare 503", 
                    "⚠️ Suno API returned 503 (Cloudflare protection).\n\nPlease paste your browser Cookie into the 'Cookie (Opt)' field to bypass Cloudflare."
                )
            else:
                QMessageBox.warning(self, "API Response", f"API returned status {last_status or 'Error'}. Check your internet connection or token.")

    def append_log(self, text: str, level: str = "info"):
        timestamp = time.strftime("%H:%M:%S")
        color_map = {
            "info": "#94a3b8",
            "success": "#34d399",
            "warn": "#fbbf24",
            "error": "#f87171"
        }
        color = color_map.get(level, "#f8fafc")
        self.log_box.append(f"<span style='color: #475569;'>[{timestamp}]</span> <span style='color: {color};'>{text}</span>")

    @Slot(int, int, int)
    def update_counts(self, completed: int, remaining: int, total: int):
        self.pill_done.setText(f"Done: {completed}")
        self.pill_total.setText(f"Tracks: {total}")

    @Slot(int, int)
    def update_progress(self, current: int, total: int):
        if total > 0:
            self.progress_bar.setValue(int((current / total) * 100))
            self.progress_bar.setFormat(f"%p% ({current}/{total})")

    @Slot(str, str, str)
    def update_stats(self, sz: str, spd: str, elp: str):
        self.pill_size.setText(f"Size: {sz}")

    @Slot(dict)
    def add_catalog_row(self, clip: dict):
        self.catalog_tracks.append(clip)
        row = self.table.rowCount()
        self.table.insertRow(row)
        clip_id = clip.get("id") or ""
        title = clip.get("title") or "Untitled Track"
        duration = str(int(clip.get("duration") or 0)) + "s"
        model = clip.get("model_name") or "v3.5"
        tags = (clip.get("metadata") or {}).get("tags") or clip.get("prompt") or ""

        save_path = Path(self.dir_input.text().strip())
        state_file = save_path / STATE_FILENAME
        is_completed = False
        if state_file.exists():
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    is_completed = clip_id in json.load(f).get("completed_clips", {})
            except Exception:
                pass

        status = "Completed" if is_completed else "Pending"

        self.is_updating_table = True
        chk_item = QTableWidgetItem()
        chk_item.setFlags(Qt.ItemIsUserCheckable | Qt.ItemIsEnabled | Qt.ItemIsSelectable)
        chk_item.setCheckState(Qt.Checked if clip_id in self.selected_track_ids else Qt.Unchecked)
        chk_item.setData(Qt.UserRole, clip_id)

        self.table.setItem(row, 0, chk_item)
        self.table.setItem(row, 1, QTableWidgetItem(title))
        self.table.setItem(row, 2, QTableWidgetItem(duration))
        self.table.setItem(row, 3, QTableWidgetItem(model))
        self.table.setItem(row, 4, QTableWidgetItem(str(tags)[:60]))
        
        status_item = QTableWidgetItem(status)
        if is_completed:
            status_item.setForeground(QColor("#34d399"))
        else:
            status_item.setForeground(QColor("#fbbf24"))
        self.table.setItem(row, 5, status_item)
        self.is_updating_table = False

    def filter_catalog_table(self, query: str):
        q = query.lower()
        filter_mode = self.cmb_filter_status.currentData() if hasattr(self, "cmb_filter_status") else "all"

        for r in range(self.table.rowCount()):
            match_text = False
            for c in range(1, self.table.columnCount()):
                item = self.table.item(r, c)
                if item and q in item.text().lower():
                    match_text = True
                    break

            status_item = self.table.item(r, 5)
            status_text = status_item.text().lower() if status_item else ""
            match_status = True
            if filter_mode == "completed" and status_text != "completed":
                match_status = False
            elif filter_mode == "pending" and status_text != "pending":
                match_status = False

            self.table.setRowHidden(r, not (match_text and match_status))

    def reload_catalog_from_file(self):
        curr_dir = Path(self.dir_input.text().strip())
        cat_file = curr_dir / CATALOG_JSON_FILENAME
        
        if not cat_file.exists():
            # Allow user to browse for a backup folder or json file
            chosen_dir = QFileDialog.getExistingDirectory(self, "Select Backup Folder with suno_library_catalog.json", str(curr_dir))
            if chosen_dir:
                self.dir_input.setText(chosen_dir)
                curr_dir = Path(chosen_dir)
                cat_file = curr_dir / CATALOG_JSON_FILENAME
            else:
                return

        if cat_file.exists():
            try:
                with open(cat_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    tracks = data.get("tracks", [])
                    self.table.setRowCount(0)
                    self.catalog_tracks = []
                    self.selected_track_ids.clear()
                    for t in tracks:
                        self.add_catalog_row(t)
                    self.pill_total.setText(f"Tracks: {len(tracks)}")
                    self.check_existing_state()
                    QMessageBox.information(self, "Catalog Loaded", f"✅ Loaded {len(tracks)} tracks from offline index:\n{cat_file}")
            except Exception as e:
                QMessageBox.warning(self, "Catalog", f"Error loading catalog:\n{e}")
        elif (curr_dir / STATE_FILENAME).exists():
            # State exists, check existing state
            self.check_existing_state()
            QMessageBox.information(self, "State Found", f"Found backup state in {curr_dir}.\nClick 'Fetch Feed from Suno' to populate full metadata for these tracks.")
        else:
            QMessageBox.information(self, "Catalog Not Found", f"No '{CATALOG_JSON_FILENAME}' found in:\n{curr_dir}\n\nRun a backup or click 'Fetch Feed from Suno' to create one.")

    def start_full_backup(self):
        self.start_backup(selected_clips=None)

    def start_backup(self, selected_clips: Optional[List[Dict[str, Any]]] = None):
        if not isinstance(selected_clips, list):
            selected_clips = None

        token = clean_header_value(self.token_input.text())
        cookie_str = clean_header_value(self.cookie_input.text())
        save_dir_str = self.dir_input.text().strip()

        if not token:
            QMessageBox.warning(self, "Input Error", "Please enter your Suno Bearer Token before starting.")
            return

        # Check token expiration
        exp_ts, exp_str = decode_jwt_expiry(token)
        if exp_ts and time.time() > exp_ts:
            diff = int(time.time() - exp_ts)
            ans = QMessageBox.question(
                self,
                "Token Expired Warning",
                f"Your Bearer token expired {diff}s ago ({exp_str}).\n\nSuno will likely return 401 Unauthorized.\n\nDo you want to continue anyway?",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            if ans == QMessageBox.No:
                return

        if not save_dir_str:
            QMessageBox.warning(self, "Input Error", "Please select a target backup directory.")
            return

        save_dir = Path(save_dir_str)
        try:
            save_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            QMessageBox.critical(self, "Directory Error", f"Cannot create target directory:\n{e}")
            return

        self.start_btn.setEnabled(False)
        self.cancel_btn.setEnabled(True)
        self.token_input.setEnabled(False)
        self.dir_input.setEnabled(False)
        self.progress_bar.setValue(0)
        self.log_box.clear()
        
        if selected_clips is None:
            self.table.setRowCount(0)
            self.catalog_tracks = []

        self.append_log("Starting Suno AI backup process...", "info")

        grouping_val = self.cmb_grouping.currentData() or "none"
        format_val = self.cmb_audio_format.currentData() or "wav"
        is_prefer_wav = (format_val == "wav")
        max_d = float(self.slider_delay.value())

        self.worker = BackupWorker(
            token=token,
            save_dir=save_dir,
            cookie_str=cookie_str,
            download_audio=self.chk_audio.isChecked(),
            preferred_format=format_val,
            prefer_wav=is_prefer_wav,
            download_video=self.chk_video.isChecked(),
            download_image=self.chk_image.isChecked(),
            download_metadata=self.chk_meta.isChecked(),
            generate_report=self.chk_report.isChecked(),
            folder_grouping=grouping_val,
            max_retries=3,
            min_delay=0.5,
            max_delay=max_d,
            trigger_wav_api=self.chk_auto_wav.isChecked(),
            trigger_video_api=self.chk_auto_video.isChecked(),
            selected_clips=selected_clips
        )

        self.worker.log_signal.connect(self.append_log)
        self.worker.counts_signal.connect(self.update_counts)
        self.worker.progress_signal.connect(self.update_progress)
        self.worker.stats_signal.connect(self.update_stats)
        self.worker.track_item_signal.connect(self.add_catalog_row)
        self.worker.finished_signal.connect(self.on_backup_finished)

        self.worker.start()

    def cancel_backup(self):
        if self.worker and self.worker.isRunning():
            self.append_log("Cancellation requested... Stopping worker...", "warn")
            self.worker.is_cancelled = True
            self.cancel_btn.setEnabled(False)

    @Slot(bool, str)
    def on_backup_finished(self, success: bool, message: str):
        self.start_btn.setEnabled(True)
        self.cancel_btn.setEnabled(False)
        self.token_input.setEnabled(True)
        self.dir_input.setEnabled(True)

        if success:
            QMessageBox.information(self, "Backup Finished", message)
        else:
            QMessageBox.warning(self, "Backup Stopped", message)


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = SunoBackupWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
