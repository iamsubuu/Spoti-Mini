# Spotify Mini — Chrome Extension (Manifest V3)

A refined compact floating mini player and synchronized lyrics Chrome Extension for **Spotify Web (`https://open.spotify.com`)**, built with React, TypeScript, Tailwind CSS v4, Vite, and Chrome's **Document Picture-in-Picture API**.

---

## Features

- **Live Spotify Web Detection (`open.spotify.com`)**: Automatically discovers active Spotify Web tabs, handles SPA navigation, and gracefully reports disconnected/reconnecting states with one-click tab focus or launch.
- **Accessible DOM & Media Session Bridge**: Reads track title, artist(s), album, cover art, play/pause state, progress/duration (including remaining-time mode), volume, mute, like/save status, shuffle, and repeat directly from visible semantic DOM controls (`data-testid` / `aria-*`) and `navigator.mediaSession` — without private Spotify API scraping, cookie extraction, or DRM circumvention.
- **Real Playback Controls**: Play/pause, previous/next track, progress scrubbing, volume slider & mute, save/like toggle, shuffle, and repeat routed safely to visible Spotify Web Player controls.
- **Always-On-Top Desktop Dynamic Island (Outside Chrome, Zero Address Bar)**: Optional lightweight Electron desktop companion (`electron/main.cjs` + `src/desktop/DesktopIslandApp.tsx`) that connects to the Chrome Extension over localhost WebSocket (`127.0.0.1:47195`) and floats as a genuinely frameless, transparent macOS-style Dynamic Island above all desktop windows even when Chrome is minimized.
- **Frameless In-Browser Dynamic Island**: Floats a borderless frosted-glass Dynamic Island pill at the top-center of Chrome tabs (`src/content/dynamicIsland.tsx` + `src/island/index.ts`), displaying live album art, active equalizer bars, live lyrics snippet, and quick Play/Pause, expanding on click into **Bar**, **Card**, **Lyrics**, or **Combined** views.
- **Always-on-Top Document Picture-in-Picture**: Opens a Chrome Document PiP floating window via `window.documentPictureInPicture.requestWindow()`.
- **Synchronized Lyrics (Spotify DOM + LRCLIB Fallback)**:
  - Reads Spotify's rendered lyrics (`[data-testid="lyrics-line"]`) whenever open/accessible in the Spotify Web tab.
  - Optional **LRCLIB** fallback (`https://lrclib.net/api/get` & `/api/search`) fetches timestamped LRC lyrics with caching in `chrome.storage.local` so lyrics stay synchronized even while browsing other tabs or playlists.
  - Click any timestamped lyric line to seek Spotify playback directly.
- **Persistent Preferences**: Theme (`Obsidian`, `Midnight`, `Warm Vinyl`, `Alabaster`), lyrics font size, compact mode, auto-open floating behavior, default display mode, and LRCLIB toggle persist across popup, content script, and floating PiP via `chrome.storage.local`.

---

## Architecture

- `public/manifest.json` — Chrome Extension Manifest V3 definition (`storage`, `tabs`, `scripting`, host permissions for `open.spotify.com` and `lrclib.net`).
- `src/background/index.ts` — MV3 service worker routing state snapshots, tab discovery/auto-injection recovery, playback commands, and cached LRCLIB lookups.
- `src/content/spotifyDomExtractor.ts` — Defensive DOM metadata/lyrics reader and safe UI control dispatcher.
- `src/content/pipController.tsx` — Document Picture-in-Picture window lifecycle manager (`requestWindow`, theme & CSS injection, React root mounting) plus isolated Shadow DOM on-page launcher.
- `src/content/index.ts` — Content script coordinating `MutationObserver`, SPA navigation hooks, LRCLIB sync, and message handlers.
- `src/popup/PopupApp.tsx` — Extension action popup (`popup.html`) rendering `ExtensionPopup`, `FloatingLyricsView`, and `SettingsView`.
- `src/services/lrclibService.ts` — LRC timestamp parser and LRCLIB client with bounded `chrome.storage.local` cache.
- `src/services/settingsStorage.ts` — Cross-context settings persistence (`chrome.storage.local` with `localStorage` fallback).

---

## Installation (Load Unpacked in Chrome)

### Prerequisites
- Node.js 20+ (tested on Node 26 LTS)
- Google Chrome 116+ (required for the **Document Picture-in-Picture API**)

### Build the Extension

```bash
npm install
npm run build
```

This builds the complete Chrome Extension into the `dist/` directory:
- `dist/manifest.json`
- `dist/popup.html` (and `dist/index.html`)
- `dist/background.js`
- `dist/content.js`
- `dist/island.js`
- `dist/pip.css`
- `dist/icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

### Load into Chrome

1. Open `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder inside this repository.
4. Pin **Spotify Mini** to your Chrome toolbar for quick access.

### Run the Frameless Desktop Dynamic Island (Always-On Over All Apps)

To run the borderless, always-on-top macOS-style Dynamic Island **outside Chrome** (with zero `open.spotify.com` bar):

1. Ensure the Chrome Extension is loaded in Chrome and `https://open.spotify.com` is open.
2. Launch the Desktop Dynamic Island companion:
   ```bash
   npm run desktop
   ```
3. The frameless frosted-glass Dynamic Island pill appears at the top-center of your screen and stays on top of all desktop apps. Use the system tray icon to show/hide, snap to top-center, or quit.

### Local UI Showcase & Tests

- Run unit tests (LRC parser, Spotify DOM extractor & control dispatcher, settings storage):
  ```bash
  npm test
  ```
- Type-check:
  ```bash
  npm run lint
  ```
- Run the standalone UI showcase preview in the browser:
  ```bash
  npm run dev
  ```

---

## Manual Testing Checklist with Live Spotify Web

Automated tests cover LRC parsing, DOM extraction/dispatch, settings persistence, and production MV3 bundling. The following scenarios require manual verification against a live logged-in `https://open.spotify.com` session:

1. **Detection & Navigation**:
   - Open `https://open.spotify.com` and verify the popup header shows **Spotify Web** (connected).
   - Navigate between Home, Search, Playlists, and Now Playing / Lyrics views on Spotify and verify metadata and playback status remain synced.
   - Close all Spotify tabs and verify the popup transitions to **Disconnected** with working **Open Spotify** and **Reconnect** buttons.
2. **Live Playback Controls**:
   - Test Play/Pause, Next, Previous, Seek scrubber, Volume slider, Mute, Like/Save, Shuffle, and Repeat in both the popup and Document PiP window while observing Spotify Web update immediately.
   - Toggle Spotify's duration display between total duration and remaining time (`-mm:ss`) and verify duration stays accurate.
3. **Document Picture-in-Picture Floating Window**:
   - Click the **Mini Player** pill on `open.spotify.com` (or click **Open Floating Player** in the popup -> **Launch Floating** on the activated Spotify tab) to verify a real always-on-top Chrome Document PiP window opens.
   - Switch between **Bar**, **Card**, **Lyrics**, and **Combined** modes inside the Document PiP window and confirm window resizing, theme changes, and `Escape` / `Space` / `M` / `L` / `Shift+Arrow` shortcuts work.
   - Verify the PiP window stays visible across other Chrome tabs and desktop applications.
4. **Spotify DOM Lyrics & LRCLIB Fallback**:
   - Play a vocal track with LRCLIB enabled and verify timestamped lyrics highlight in sync and clicking a lyric line seeks playback.
   - Open Spotify's built-in Lyrics view (`[data-testid="lyrics-button"]`) with LRCLIB disabled in Settings and verify Spotify's rendered lyrics are extracted and synchronized.
   - Play an instrumental track or a track without lyrics and verify empty/instrumental states render cleanly.
5. **Settings Persistence**:
   - Change Theme, Lyrics Font Size, Compact Mode, Default Display Mode, Auto-Open Floating, and LRCLIB Fallback, then close and reopen the popup and Document PiP window to verify persistence via `chrome.storage.local`.

> **Note on Chrome User Activation:** By browser security design, `documentPictureInPicture.requestWindow()` requires a direct user gesture inside the long-lived `open.spotify.com` page context. When launching from the extension popup or via **Auto-Open Floating**, the extension focuses the Spotify tab and shows a one-click **Launch Floating** banner if a fresh page gesture is needed.
