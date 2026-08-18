# 🎵 Suno AI Library Backup & Catalog Tool

A fast, robust archiving solution, metadata exporter, and batch downloader for Suno AI creators.

Safeguard your creative library with studio-quality audio (WAV/MP3), official animated lyric videos (MP4), album artwork, timestamped lyrics & prompts, and searchable CSV/JSON spreadsheets.

---

### 💾 Download Pre-Compiled Binaries (No Python Required)

Grab the standalone executable for your operating system from the **[Latest GitHub Release](https://github.com/lordgriefo/Suno-AI-Library-Backup-Tool)**:

* **Windows:** `Suno_backup_windows.exe` *(If SmartScreen appears: click **More info** ➔ **Run anyway**)*
* **macOS:** `Suno_backup_mac`
* **Linux:** `Suno_backup_linux`

---

## 📌 Overview

As your Suno AI library grows to hundreds or thousands of songs, manually backing up individual tracks through the browser becomes impractical. Cloud libraries can also be vulnerable to accidental deletion, account issues, or platform policy changes.

The **Suno AI Library Backup Tool** provides an automated desktop solution to archive your entire music catalog to your local drive. It supports full library backups, selective batch downloads, offline CSV/JSON spreadsheet exports, and smart state tracking for seamless resumes.

---

## ✨ Key Features

* 📦 **Complete Media Archiving:** Downloads audio (WAV/MP3), official Suno animated lyric videos (MP4), high-resolution album cover art (JPG/PNG), and complete generation metadata (JSON).
* 🎯 **Selective Batch Downloader:** Filter, search, and check off specific songs in an interactive table to download only the tracks you select.
* 📊 **One-Click CSV & JSON Catalog Exporter:** Export your entire song database into an Excel-ready `.csv` spreadsheet or structured `.json` file—including prompt lyrics, style tags, duration, creation dates, model versions, and direct CDN URLs.
* 🔁 **Resumable State Tracking:** Tracks completed files in `suno_backup_state.json`. If a backup is interrupted, subsequent runs skip previously saved tracks instantly.
* 🛡️ **Rate-Limit & Cloudflare Safe:** Uses randomized jitter delays, exponential backoff retries, and browser header emulation to ensure smooth, uninterrupted syncing.
* 📂 **Flexible Organization:** Save files into a single folder or organize automatically by Creation Month (`YYYY-MM`), Artist / Account Name, or Model Version (`v3.5`, `v4`, etc.).

---

## 🎧 Audio Handling & Fallback Mechanism (WAV vs. MP3)

Suno AI handles audio streams and high-resolution files differently across its platform:

1. **Default 320kbps MP3 Streams:**
When a song is generated, Suno immediately creates and hosts a high-bitrate 320kbps MP3 stream on their content delivery network (CDN). This stream is instantly accessible for playback and standard downloads.
2. **Native Lossless WAVs:**
Suno prepares uncompressed lossless `.wav` files on demand. Because WAV files are not always pre-generated for every track in your history, the tool utilizes an intelligent audio retrieval process:
* **Direct WAV Discovery:** The tool checks Suno’s CDN for an existing native lossless WAV file. If present, it downloads the full WAV directly.
* **MP3 Fallback:** If Suno's CDN does not have a pre-rendered WAV file available at the time of your sync, the tool automatically downloads the pristine 320kbps MP3 stream so no tracks are skipped.
* **WAV Render Triggering:** When preferred format is set to WAV, the tool fires a background render request to Suno's servers. On future sync passes, any newly prepared WAV files will be harvested.



---

## 💡 Best Practices for Large Libraries (1,000+ Tracks)

* ⚡ **Disable Video (MP4) Downloads on First Pass:**
Official Suno animated lyric videos are rendered asynchronously in Suno's cloud queue. Queuing thousands of video streams significantly increases backup time. Keep **"Official Video (MP4)"** unchecked during your initial run for maximum download speed.
* 📊 **Instant Catalog Export:**
If you only need an immediate snapshot of your lyrics, prompts, and song metadata, open the **Library Catalog & Batch Downloader** tab, click **Fetch Feed from Suno**, and click **Export CSV** to generate an offline spreadsheet in seconds.
* 🕒 **Token Expiry Notice:**
Suno authentication tokens (Clerk JWTs) expire quickly. Start your backup within 1–2 minutes of copying the token from your browser.

---

## 🚀 Quick Start Guide (Run from Source)

### 1. Prerequisites

Ensure you have Python 3.8 or newer installed, then install dependencies:
`pip install requests PySide6`

### 2. Obtain Your Suno Bearer Token

1. Open [Suno.com](https://suno.com) in your web browser and sign in.
2. Press F12 (or right-click anywhere and select Inspect) to open Developer Tools.
3. Switch to the Network tab and filter by Fetch/XHR.
4. Refresh the webpage (Ctrl + R / Cmd + R).
5. Click on any network request named `feed?page=0` or `billing/info`.
6. Under Request Headers, find `Authorization:` and copy the entire string starting with `Bearer eyJ...`.

### 3. Launch the Application

`python suno_backup.py`

Paste your Bearer token, choose your target backup directory, select your media preferences, and click **🚀 Start Full Backup**.

---

## 📁 Backup Folder Structure

```text
📁 Suno_Library_Backup/
├── 📄 suno_catalog.csv              <-- Searchable Excel/CSV database of your songs
├── 📄 suno_catalog.json             <-- Full developer JSON export
├── ⚙️ suno_backup_state.json         <-- Checkpoint index for instant resumes
└── 📁 2024-08/
    ├── 🎵 Wormhole Banjo Boing_678c5b51.wav
    ├── 🎵 Wormhole Banjo Boing_678c5b51.mp3
    ├── 🎬 Wormhole Banjo Boing_678c5b51.mp4   (Optional: Suno Lyric Video)
    ├── 🖼️ Wormhole Banjo Boing_678c5b51.jpg
    └── 📝 Wormhole Banjo Boing_678c5b51.json

```

---

## 💬 Need Help or Troubleshooting?

If you run into issues while setting up or running the tool:

* **Instant AI Troubleshooting:** Copy any error message or terminal traceback and paste it directly into [Google Gemini](https://gemini.google.com) or [Google AI Studio](https://aistudio.google.com) along with your issue for an instant step-by-step fix.
* **GitHub Issues:** Open an issue in this repository with your operating system and console logs so the community can assist.
* **Token Refresh:** Most sync issues stem from an expired Bearer token. Grab a fresh token from your browser network tab and try running the sync again.

---

## 📄 License

This project is released under the **MIT License**. Free to use, modify, and distribute.
