# Spotify Mini — Chrome Extension (Manifest V3) & Desktop Dynamic Island

A compact macOS-style frosted glass mini player and synchronized lyrics companion for **Spotify Web (`https://open.spotify.com`)**, built with React, TypeScript, Tailwind CSS v4, Vite, Chrome Manifest V3, Document Picture-in-Picture, and an optional Electron always-on-top Desktop Dynamic Island.

---

## Features

- **Live Spotify Web Detection (`open.spotify.com`)**: Automatically discovers active Spotify Web tabs, handles SPA navigation, and gracefully reports disconnected/reconnecting states with one-click tab focus or launch.
- **Accessible DOM & Media Session Bridge**: Reads track title, artist(s), album, cover art, play/pause state, progress/duration (including remaining-time mode), volume, mute, like/save status, shuffle, and repeat directly from visible semantic DOM controls (`data-testid` / `aria-*`) and `navigator.mediaSession` — without private Spotify API scraping, cookie extraction, or DRM circumvention.
- **Real Playback Controls**: Play/pause, previous/next track, progress scrubbing, volume slider & mute, save/like toggle, shuffle, and repeat routed safely to visible Spotify Web Player controls.
- **Always-On-Top Desktop Dynamic Island (Outside Chrome, Zero Address Bar)**: Optional lightweight Electron desktop companion (`electron/main.cjs` + `src/desktop/DesktopIslandApp.tsx`) that connects to the Chrome Extension over localhost WebSocket (`127.0.0.1:47195`) and floats as a frameless, transparent macOS-style Dynamic Island above all desktop windows even when Chrome is minimized.
- **Frameless In-Browser Dynamic Island**: Floats a borderless frosted-glass Dynamic Island pill at the top-center of Chrome tabs (`src/content/dynamicIsland.tsx` + `src/island/index.ts`), displaying live album art, active equalizer bars, live lyrics snippet, and quick Play/Pause, expanding on click into **Bar**, **Card**, **Lyrics**, or **Combined** views.
- **Always-On-Top Document Picture-in-Picture**: Opens a Chrome Document PiP floating window via `window.documentPictureInPicture.requestWindow()` supporting **Bar**, **Card**, **Lyrics**, and **Combined** layouts.
- **Synchronized Lyrics (Spotify DOM + LRCLIB Fallback)**:
  - Reads Spotify's rendered lyrics (`[data-testid="lyrics-line"]`) whenever open/accessible in the Spotify Web tab.
  - Optional **LRCLIB** fallback (`https://lrclib.net/api/get` & `/api/search`) fetches timestamped LRC lyrics with caching in `chrome.storage.local` so lyrics stay synchronized even while browsing other tabs or playlists.
  - Click any timestamped lyric line to seek Spotify playback directly.
- **Persistent Preferences**: Theme (`Obsidian`, `Midnight`, `Warm Vinyl`, `Alabaster`), lyrics font size, compact mode, auto-open floating behavior, default display mode, LRCLIB fallback, and Dynamic Island toggle persist across popup, content script, Document PiP, and Desktop Island via `chrome.storage.local`.

---

## Architecture

| Path | Role |
| :--- | :--- |
| `public/manifest.json` | Chrome Extension Manifest V3 definition (`storage`, `tabs`, `scripting`, host permissions for `open.spotify.com`, `lrclib.net`, and `127.0.0.1`). |
| `src/background/index.ts` | MV3 service worker routing state snapshots, tab discovery/auto-injection recovery, playback commands, cached LRCLIB lookups, and Desktop Companion WebSocket sync. |
| `src/content/spotifyDomExtractor.ts` | Defensive DOM metadata/lyrics reader and safe UI control dispatcher. |
| `src/content/pipController.tsx` | Document Picture-in-Picture window lifecycle manager (`requestWindow`, theme & CSS injection, React root mounting) plus isolated Shadow DOM on-page launcher. |
| `src/content/dynamicIsland.tsx` | Frameless Shadow DOM Dynamic Island overlay UI (`Bar`, `Card`, `Lyrics`, `Combined`). |
| `src/content/index.ts` | Spotify Web content script coordinating `MutationObserver`, SPA navigation hooks, sub-second playback clock, LRCLIB sync, and message handlers. |
| `src/island/index.ts` | Cross-tab Dynamic Island client injected into active Chrome tabs. |
| `src/popup/PopupApp.tsx` | Extension action popup (`popup.html`) rendering `ExtensionPopup`, `FloatingLyricsView`, and `SettingsView`. |
| `src/services/lrclibService.ts` | LRC timestamp parser and LRCLIB client with bounded `chrome.storage.local` cache. |
| `src/services/settingsStorage.ts` | Cross-context settings persistence (`chrome.storage.local` with `localStorage` fallback). |
| `electron/main.cjs` & `src/desktop/DesktopIslandApp.tsx` | Frameless, transparent, always-on-top Electron Desktop Dynamic Island + Windows system tray. |

---

## Installation & Setup (New Machine)

### Prerequisites

- **Node.js 20+** (tested on Node 26 LTS)
- **Google Chrome 116+** (required for Document Picture-in-Picture)

### 1. Install Dependencies & Build `dist/`

```bash
npm install
npm run build
```

> **Windows PowerShell note:** If PowerShell script execution policy blocks `npm`, use `npm.cmd install` and `npm.cmd run build` (or run inside Command Prompt).

`npm install` automatically downloads `node_modules/` (including React, Vite, Tailwind CSS, `ws`, and Electron). `npm run build` outputs the complete Chrome Extension and desktop bundle into `dist/`:

- `dist/manifest.json`
- `dist/popup.html`, `dist/desktop.html`, `dist/index.html`
- `dist/background.js`
- `dist/content.js`
- `dist/island.js`
- `dist/pip.css`
- `dist/icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

### 2. Load the Chrome Extension

1. Open `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder inside this repository.
4. Pin **Spotify Mini** to your Chrome toolbar and open `https://open.spotify.com`.

### 3. Run the Out-of-Chrome Desktop Dynamic Island (Optional)

To float the frameless macOS-style Dynamic Island **outside Chrome** over all desktop apps (with zero `open.spotify.com` bar):

1. Ensure the **Spotify Mini** Chrome Extension is loaded in Chrome and `https://open.spotify.com` is open.
2. Launch the Desktop Dynamic Island companion:
   - **Windows (no terminal window):** Double-click `Start-Dynamic-Island.vbs` in the project root (or place a shortcut in `Win + R` -> `shell:startup`).
   - **Terminal (Windows / macOS / Linux):**
     ```bash
     npm run desktop:start
     ```
     *(Use `npm run desktop` to rebuild `dist/` before launching.)*
3. Click the pill at the top-center of your screen to expand into **Bar**, **Card**, **Lyrics**, or **Combined**, drag anywhere (double-click to snap back), or use the system tray icon to show/hide or quit.

---

## Local Verification & UI Preview

```bash
# Type-check
npm run lint

# Run unit tests (LRC parser, Spotify DOM extractor & control dispatcher, settings storage)
npm test

# Run standalone UI showcase preview in browser
npm run dev
```

---

## Manual Testing Checklist with Live Spotify Web

Automated tests cover LRC parsing, DOM extraction/dispatch, settings persistence, and production MV3 bundling. Verify the following against a live logged-in `https://open.spotify.com` session:

1. **Detection & Navigation**:
   - Open `https://open.spotify.com` and verify the popup header shows **Spotify Web** (connected).
   - Navigate between Home, Search, Playlists, and Now Playing / Lyrics views on Spotify and verify metadata and playback status remain synced.
   - Close all Spotify tabs and verify the popup transitions to **Disconnected** with working **Open Spotify** and **Reconnect** buttons.
2. **Live Playback Controls**:
   - Test Play/Pause, Next, Previous, Seek scrubber, Volume slider, Mute, Like/Save, Shuffle, and Repeat in the popup, Dynamic Island, and Document PiP window while observing Spotify Web update immediately.
   - Toggle Spotify's duration display between total duration and remaining time (`-mm:ss`) and verify duration stays accurate.
3. **Dynamic Island & Document Picture-in-Picture**:
   - Verify the frameless Dynamic Island pill appears at the top-center of Chrome tabs (with no address bar), expands cleanly, and updates across tabs.
   - Launch the Desktop Dynamic Island (`Start-Dynamic-Island.vbs` or `npm run desktop:start`) and verify it stays floating above other desktop apps when Chrome is minimized.
   - Click the **Mini Player** pill on `open.spotify.com` (or **Open Floating Player** -> **Launch Floating**) to verify Chrome Document PiP opens cleanly and switches between **Bar**, **Card**, **Lyrics**, and **Combined** modes.
4. **Spotify DOM Lyrics & LRCLIB Fallback**:
   - Play a vocal track with LRCLIB enabled and verify timestamped lyrics highlight in sync and clicking any line seeks playback.
   - Open Spotify's built-in Lyrics view (`[data-testid="lyrics-button"]`) with LRCLIB disabled in Settings and verify Spotify's rendered lyrics are extracted and synchronized.
   - Play an instrumental track or a track without lyrics and verify empty/instrumental states render cleanly.
5. **Settings Persistence**:
   - Change Theme, Lyrics Font Size, Compact Mode, Default Display Mode, Auto-Open Floating, LRCLIB Fallback, and Dynamic Island settings, then reload the popup and Dynamic Island to verify persistence via `chrome.storage.local`.

> **Note on Chrome User Activation:** By browser security design, `documentPictureInPicture.requestWindow()` requires a direct user gesture inside the long-lived `open.spotify.com` page context. When launching Document PiP from the extension popup or via **Auto-Open Floating**, the extension focuses the Spotify tab and shows a one-click **Launch Floating** banner if a fresh page gesture is needed.
