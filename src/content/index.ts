import '../index.css';
import type {
  CommandAck,
  ExtensionMessage,
  LrclibLookupResult,
  PlayerCommand,
  RawSpotifyDomState,
} from '../types/extension';
import type {
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../types/player';
import { DEFAULT_SETTINGS } from '../services/mockPlayerAdapter';
import { loadSettings, saveSettings, subscribeSettings } from '../services/settingsStorage';
import { DynamicIslandController } from './dynamicIsland';
import {
  DocumentPipController,
  mountSpotifyPageLauncher,
} from './pipController';
import {
  executePlayerCommand,
  extractSpotifyDomState,
} from './spotifyDomExtractor';

declare global {
  interface Window {
    __spotifyMiniContentInitialized?: boolean;
  }
}

const ARTWORK_PALETTE: Array<Pick<Track['artwork'], 'id' | 'ambientColor' | 'secondaryColor' | 'accentHue'>> = [
  {
    id: 'nocturne',
    ambientColor: '#1e3a5f',
    secondaryColor: '#c98a3e',
    accentHue: 'rgba(56, 114, 178, 0.24)',
  },
  {
    id: 'velvet',
    ambientColor: '#374158',
    secondaryColor: '#9fb3c8',
    accentHue: 'rgba(116, 138, 173, 0.22)',
  },
  {
    id: 'solar',
    ambientColor: '#7a4f2b',
    secondaryColor: '#d9a45b',
    accentHue: 'rgba(196, 134, 65, 0.22)',
  },
  {
    id: 'meridian',
    ambientColor: '#1b4737',
    secondaryColor: '#4fa882',
    accentHue: 'rgba(29, 185, 84, 0.18)',
  },
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initContentBridge(): void {
  if (window.__spotifyMiniContentInitialized) return;
  window.__spotifyMiniContentInitialized = true;

  let settings: PlayerSettings = { ...DEFAULT_SETTINGS };
  let floatingMode: FloatingDisplayMode = settings.defaultDisplayMode;
  let showLaunchPrompt = false;
  let lastRawState: RawSpotifyDomState | null = null;
  let lastTrackKey = '';
  let wasPlaying = false;

  // Sub-second playback clock anchored to Spotify DOM second edges / ms slider
  const LYRIC_VISUAL_LEAD_SEC = 0.25;
  let clockAnchorSec = 0;
  let clockAnchorPerfMs = performance.now();
  let lastObservedDomSec = -1;
  let clockTrackKey = '';

  function updatePlaybackClock(raw: RawSpotifyDomState): void {
    const now = performance.now();
    const trackChanged = raw.trackKey !== clockTrackKey;
    const domSec = raw.currentTimeSec;
    const hasSubSecond = Math.abs(domSec % 1) > 0.01;

    if (trackChanged) {
      clockTrackKey = raw.trackKey;
      lastObservedDomSec = domSec;
      clockAnchorSec = domSec;
      clockAnchorPerfMs = now;
      return;
    }

    if (!raw.isPlaying) {
      lastObservedDomSec = domSec;
      clockAnchorSec = domSec;
      clockAnchorPerfMs = now;
      return;
    }

    if (hasSubSecond) {
      lastObservedDomSec = domSec;
      clockAnchorSec = domSec;
      clockAnchorPerfMs = now;
    } else if (domSec !== lastObservedDomSec) {
      const delta = domSec - lastObservedDomSec;
      // Exact +1s DOM tick happens right on the integer second boundary;
      // jumps/seeks or initial reads mid-second get +0.35s midpoint compensation.
      clockAnchorSec = delta === 1 ? domSec : domSec + 0.35;
      clockAnchorPerfMs = now;
      lastObservedDomSec = domSec;
    } else {
      // Keep drift within Spotify's integer second window [domSec, domSec + 1.05]
      const projected = clockAnchorSec + (now - clockAnchorPerfMs) / 1000;
      if (projected < domSec) {
        clockAnchorSec = domSec;
        clockAnchorPerfMs = now;
      } else if (projected > domSec + 1.1) {
        clockAnchorSec = domSec + 0.95;
        clockAnchorPerfMs = now;
      }
    }
  }

  function getLiveTimeSec(raw: RawSpotifyDomState, includeLyricLead = false): number {
    let base = clockAnchorSec;
    if (raw.isPlaying && raw.hasActiveTrack) {
      base = clockAnchorSec + (performance.now() - clockAnchorPerfMs) / 1000;
    }
    if (includeLyricLead && raw.isPlaying) {
      base += LYRIC_VISUAL_LEAD_SEC;
    }
    if (raw.durationSec > 0) {
      return Math.min(raw.durationSec, Math.max(0, base));
    }
    return Math.max(0, base);
  }
  let lrclibState: {
    trackKey: string;
    loading: boolean;
    result: LrclibLookupResult | null;
  } = { trackKey: '', loading: false, result: null };
  let lyricsStatusOverride: 'auto' | 'loading' | 'empty' = 'auto';

  const pipController = new DocumentPipController((isOpen, mode, error) => {
    floatingMode = mode;
    if (isOpen) {
      showLaunchPrompt = false;
    }
    launcher.update({
      isOpen,
      showPrompt: showLaunchPrompt,
      hasControls: Boolean(lastRawState?.hasPlayerControls),
    });
    updateDynamicIsland();
    void safeSendMessage({
      type: 'PIP_STATE_CHANGED',
      isOpen,
      mode,
      error: error ?? null,
    });
  });

  const dynamicIsland = new DynamicIslandController();

  const launcher = mountSpotifyPageLauncher({
    onLaunchClick: () => {
      showLaunchPrompt = false;
      if (pipController.isOpen()) {
        pipController.close();
      } else {
        void openPipWithCurrentState(floatingMode);
      }
    },
    onDismissBanner: () => {
      showLaunchPrompt = false;
      launcher.update({
        isOpen: pipController.isOpen(),
        showPrompt: false,
        hasControls: Boolean(lastRawState?.hasPlayerControls),
      });
    },
  });

  async function safeSendMessage(
    msg: ExtensionMessage
  ): Promise<CommandAck | undefined> {
    try {
      return (await chrome.runtime.sendMessage(msg)) as CommandAck | undefined;
    } catch {
      return undefined;
    }
  }

  function buildTrackAndLyrics(raw: RawSpotifyDomState): {
    track: Track;
    lyricsStatus: LyricsLoadStatus;
    activeLyricIndexOverride: number | null;
  } {
    const palette =
      ARTWORK_PALETTE[hashString(raw.trackKey || raw.title || 'spotify') % ARTWORK_PALETTE.length];

    const domLyrics =
      raw.domLyrics && raw.domLyrics.lines.length > 0 ? raw.domLyrics : null;
    const lrc =
      lrclibState.trackKey === raw.trackKey ? lrclibState.result : null;

    let lyrics: Track['lyrics'] = [];
    let isInstrumental = false;
    let isUnsyncedLyrics = false;
    let lyricsSource: Track['lyricsSource'] = 'none';
    let activeLyricIndexOverride: number | null = null;
    let lyricsStatus: LyricsLoadStatus = 'empty';

    if (lyricsStatusOverride === 'loading') {
      lyricsStatus = 'loading';
    } else if (lyricsStatusOverride === 'empty') {
      lyricsStatus = 'empty';
    } else if (lrc?.found && lrc.synced && lrc.lines.length > 0) {
      lyrics = lrc.lines;
      lyricsSource = 'lrclib';
      lyricsStatus = 'ready';
    } else if (domLyrics) {
      lyrics = domLyrics.lines.map((text) => ({ timeSec: -1, text }));
      isUnsyncedLyrics = true;
      lyricsSource = 'spotify-dom';
      activeLyricIndexOverride =
        domLyrics.activeIndex >= 0 ? domLyrics.activeIndex : null;
      lyricsStatus = 'ready';
    } else if (lrclibState.loading && lrclibState.trackKey === raw.trackKey) {
      lyricsStatus = 'loading';
    } else if (lrc?.found && lrc.instrumental) {
      isInstrumental = true;
      lyricsSource = 'lrclib';
      lyricsStatus = 'empty';
    } else if (lrc?.found && lrc.lines.length > 0) {
      lyrics = lrc.lines;
      isUnsyncedLyrics = true;
      lyricsSource = 'lrclib';
      lyricsStatus = 'ready';
    }

    const track: Track = {
      id: raw.trackKey || 'spotify-idle',
      title: raw.hasActiveTrack ? raw.title : 'Nothing playing on Spotify',
      artist: raw.hasActiveTrack
        ? raw.artist
        : 'Start a track on Spotify Web to control playback',
      album: raw.hasActiveTrack ? raw.album : 'Spotify Web',
      year: new Date().getFullYear(),
      durationSec: Math.max(0, raw.durationSec),
      artwork: {
        ...palette,
        imageUrl: raw.artworkUrl ?? undefined,
      },
      isInstrumental,
      isUnsyncedLyrics,
      lyricsSource,
      spotifyTrackUrl: raw.spotifyTrackUrl ?? undefined,
      lyrics,
    };

    return { track, lyricsStatus, activeLyricIndexOverride };
  }

  function runCommand(cmd: PlayerCommand): { ok: boolean; error?: string } {
    const res = executePlayerCommand(document, cmd);
    if (res.ok) {
      window.setTimeout(syncFromDom, 90);
      window.setTimeout(syncFromDom, 320);
    }
    return res;
  }

  const pipActions: PlaybackActions = {
    togglePlay: () => void runCommand({ type: 'togglePlay' }),
    nextTrack: () => void runCommand({ type: 'nextTrack' }),
    prevTrack: () => void runCommand({ type: 'prevTrack' }),
    selectTrack: () => {},
    seekTo: (timeSec: number) => void runCommand({ type: 'seekTo', timeSec }),
    seekToLyricLine: (index: number, timeSec: number) => {
      if (timeSec >= 0) {
        void runCommand({ type: 'seekTo', timeSec });
      } else {
        void runCommand({ type: 'clickSpotifyLyricLine', index });
      }
    },
    setVolume: (volume: number) => void runCommand({ type: 'setVolume', volume }),
    toggleMute: () => void runCommand({ type: 'toggleMute' }),
    toggleLike: () => void runCommand({ type: 'toggleLike' }),
    toggleShuffle: () => void runCommand({ type: 'toggleShuffle' }),
    cycleRepeat: () => void runCommand({ type: 'cycleRepeat' }),
    setConnectionStatus: () => {},
    setLyricsStatusOverride: (next) => {
      lyricsStatusOverride = next;
      updatePipIfOpen();
    },
    retryLyrics: () => {
      lyricsStatusOverride = 'auto';
      if (lastRawState?.hasActiveTrack) {
        void triggerLrclibLookup(lastRawState, true);
      }
    },
  };

  function updateDynamicIsland(): void {
    if (!lastRawState) return;
    const shouldShow =
      settings.dynamicIslandEnabled &&
      lastRawState.hasActiveTrack &&
      !pipController.isOpen();
    if (!shouldShow) {
      dynamicIsland.update({
        visible: false,
        track: buildTrackAndLyrics(lastRawState).track,
        playback: {
          currentTrackIndex: 0,
          isPlaying: false,
          currentTimeSec: 0,
          volume: 75,
          isMuted: false,
          isLiked: false,
          shuffle: false,
          repeat: 'off',
          connectionStatus: 'connected',
          lyricsStatusOverride: 'auto',
        },
        actions: pipActions,
        settings,
        lyricsStatus: 'empty',
        onHideIsland: () => {},
      });
      return;
    }

    const { track, lyricsStatus, activeLyricIndexOverride } =
      buildTrackAndLyrics(lastRawState);
    const playback: PlaybackState = {
      currentTrackIndex: 0,
      isPlaying: lastRawState.isPlaying,
      currentTimeSec: getLiveTimeSec(lastRawState, true),
      volume: lastRawState.volume,
      isMuted: lastRawState.isMuted,
      isLiked: lastRawState.isLiked,
      shuffle: lastRawState.shuffle,
      repeat: lastRawState.repeat,
      connectionStatus: 'connected',
      lyricsStatusOverride,
      activeLyricIndexOverride,
      hasActiveTrack: lastRawState.hasActiveTrack,
    };

    dynamicIsland.update({
      visible: true,
      track,
      playback,
      actions: pipActions,
      settings,
      lyricsStatus,
      onPopOutPip: (mode) => void openPipWithCurrentState(mode),
      onHideIsland: () => {
        const next = { ...settings, dynamicIslandEnabled: false };
        settings = next;
        void saveSettings(next);
        updateDynamicIsland();
      },
    });
  }

  function updatePipIfOpen(): void {
    if (!lastRawState || !pipController.isOpen()) return;
    const { track, lyricsStatus, activeLyricIndexOverride } =
      buildTrackAndLyrics(lastRawState);
    const liveSec = getLiveTimeSec(lastRawState, true);
    const playback: PlaybackState = {
      currentTrackIndex: 0,
      isPlaying: lastRawState.isPlaying,
      currentTimeSec: liveSec,
      volume: lastRawState.volume,
      isMuted: lastRawState.isMuted,
      isLiked: lastRawState.isLiked,
      shuffle: lastRawState.shuffle,
      repeat: lastRawState.repeat,
      connectionStatus: 'connected',
      lyricsStatusOverride,
      activeLyricIndexOverride,
      hasActiveTrack: lastRawState.hasActiveTrack,
    };
    pipController.update({
      track,
      playback,
      actions: pipActions,
      settings,
      lyricsStatus,
      mode: floatingMode,
    });
  }

  async function openPipWithCurrentState(
    explicitMode?: FloatingDisplayMode
  ): Promise<{ ok: boolean; error?: string }> {
    const raw = extractSpotifyDomState(document, navigator, window);
    updatePlaybackClock(raw);
    lastRawState = raw;
    const mode = explicitMode ?? settings.defaultDisplayMode;
    floatingMode = mode;
    const { track, lyricsStatus, activeLyricIndexOverride } =
      buildTrackAndLyrics(raw);
    const playback: PlaybackState = {
      currentTrackIndex: 0,
      isPlaying: raw.isPlaying,
      currentTimeSec: getLiveTimeSec(raw, true),
      volume: raw.volume,
      isMuted: raw.isMuted,
      isLiked: raw.isLiked,
      shuffle: raw.shuffle,
      repeat: raw.repeat,
      connectionStatus: 'connected',
      lyricsStatusOverride,
      activeLyricIndexOverride,
      hasActiveTrack: raw.hasActiveTrack,
    };
    return pipController.open({
      track,
      playback,
      actions: pipActions,
      settings,
      lyricsStatus,
      mode,
    });
  }

  async function triggerLrclibLookup(
    raw: RawSpotifyDomState,
    forceRefresh = false
  ): Promise<void> {
    if (!raw.hasActiveTrack || !raw.trackKey || !settings.lrclibEnabled) {
      return;
    }
    const targetKey = raw.trackKey;
    lrclibState = { trackKey: targetKey, loading: true, result: null };
    updatePipIfOpen();

    const ack = await safeSendMessage({
      type: 'FETCH_LRCLIB_LYRICS',
      request: {
        trackKey: targetKey,
        title: raw.title,
        artist: raw.artist,
        album: raw.album,
        durationSec: raw.durationSec,
        forceRefresh,
      },
    });

    if (lastTrackKey !== targetKey) return;

    lrclibState = {
      trackKey: targetKey,
      loading: false,
      result: ack?.lyrics ?? {
        trackKey: targetKey,
        found: false,
        instrumental: false,
        synced: false,
        lines: [],
      },
    };
    updatePipIfOpen();
    broadcastDomState(raw);
  }

  function broadcastDomState(raw: RawSpotifyDomState): void {
    void safeSendMessage({
      type: 'SPOTIFY_DOM_STATE',
      payload: {
        ...raw,
        currentTimeSec: getLiveTimeSec(raw, false),
      },
      isFloatingOpen: pipController.isOpen(),
      floatingMode,
    });
  }

  function syncFromDom(): void {
    const raw = extractSpotifyDomState(document, navigator, window);
    const trackChanged = raw.trackKey !== lastTrackKey;
    updatePlaybackClock(raw);
    lastRawState = raw;

    if (trackChanged) {
      lastTrackKey = raw.trackKey;
      lyricsStatusOverride = 'auto';
      lrclibState = { trackKey: raw.trackKey, loading: false, result: null };
      if (raw.hasActiveTrack && settings.lrclibEnabled) {
        void triggerLrclibLookup(raw, false);
      }
    }

    // Handle auto-open when playback starts
    if (
      settings.autoOpenFloating &&
      raw.isPlaying &&
      !wasPlaying &&
      !pipController.isOpen()
    ) {
      // Chrome Document PiP requires recent user activation; attempt directly,
      // and fall back to showing the 1-click launch banner if Chrome rejects gesture.
      void openPipWithCurrentState(settings.defaultDisplayMode).then((res) => {
        if (!res.ok) {
          showLaunchPrompt = true;
          launcher.update({
            isOpen: false,
            showPrompt: true,
            hasControls: raw.hasPlayerControls,
          });
        }
      });
    }
    wasPlaying = raw.isPlaying;

    launcher.update({
      isOpen: pipController.isOpen(),
      showPrompt: showLaunchPrompt,
      hasControls: raw.hasPlayerControls,
    });
    updatePipIfOpen();
    updateDynamicIsland();
    broadcastDomState(raw);
  }

  // Fast coalesced MutationObserver for player & Spotify DOM lyric updates
  let syncTimer: number | null = null;
  const scheduleSync = () => {
    if (syncTimer !== null) return;
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      syncFromDom();
    }, 35);
  };

  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      if (m.type !== 'attributes') return true;
      if (m.attributeName !== 'class' && m.attributeName !== 'style') {
        return true;
      }
      const el = m.target as HTMLElement | null;
      return Boolean(
        el?.closest?.('[data-testid="lyrics-line"], [data-testid="now-playing-bar"]')
      );
    });
    if (relevant) {
      scheduleSync();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'aria-label',
      'aria-checked',
      'aria-valuenow',
      'aria-valuemax',
      'aria-current',
      'data-active',
      'class',
      'style',
      'src',
      'value',
    ],
  });

  // High-frequency local ticker (100ms) for smooth zero-lag PiP & Dynamic Island lyrics
  window.setInterval(() => {
    if (!lastRawState?.isPlaying) return;
    if (pipController.isOpen()) {
      updatePipIfOpen();
    } else if (settings.dynamicIslandEnabled && lastRawState.hasActiveTrack) {
      updateDynamicIsland();
    }
  }, 100);

  // Periodic DOM heartbeat to stay synchronized even if attributes are throttled
  window.setInterval(syncFromDom, 800);

  // Hook SPA navigation transitions
  const origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    window.setTimeout(syncFromDom, 250);
  };
  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    origReplaceState(...args);
    window.setTimeout(syncFromDom, 250);
  };
  window.addEventListener('popstate', () => window.setTimeout(syncFromDom, 250));

  // Settings initialization & live synchronization
  void loadSettings().then((loaded) => {
    settings = loaded;
    floatingMode = loaded.defaultDisplayMode;
    syncFromDom();
  });

  subscribeSettings((updated) => {
    const lrclibTurnedOn = !settings.lrclibEnabled && updated.lrclibEnabled;
    settings = updated;
    if (lrclibTurnedOn && lastRawState?.hasActiveTrack) {
      void triggerLrclibLookup(lastRawState, false);
    }
    updatePipIfOpen();
    updateDynamicIsland();
  });

  // Listen for commands from background / popup
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      switch (message.type) {
        case 'PING_CONTENT': {
          syncFromDom();
          sendResponse({ ok: true } satisfies CommandAck);
          return false;
        }
        case 'PLAYER_COMMAND': {
          const res = runCommand(message.command);
          sendResponse(res satisfies CommandAck);
          return false;
        }
        case 'REFRESH_LYRICS': {
          const raw = extractSpotifyDomState(document, navigator, window);
          lastRawState = raw;
          if (raw.hasActiveTrack && settings.lrclibEnabled) {
            void triggerLrclibLookup(raw, true).then(() =>
              sendResponse({ ok: true } satisfies CommandAck)
            );
            return true;
          }
          syncFromDom();
          sendResponse({ ok: true } satisfies CommandAck);
          return false;
        }
        case 'REQUEST_FLOATING_LAUNCH': {
          const targetMode = message.mode ?? settings.defaultDisplayMode;
          floatingMode = targetMode;
          if (pipController.isOpen()) {
            pipController.setMode(targetMode);
            void openPipWithCurrentState(targetMode);
            sendResponse({ ok: true } satisfies CommandAck);
            return false;
          }
          if (!pipController.isSupported()) {
            sendResponse({
              ok: false,
              error:
                'Chrome Document Picture-in-Picture is not supported in this browser.',
            } satisfies CommandAck);
            return false;
          }
          // Try opening directly (will succeed if user gesture is present); otherwise show 1-click prompt on Spotify tab
          void openPipWithCurrentState(targetMode).then((res) => {
            if (!res.ok) {
              showLaunchPrompt = true;
              launcher.update({
                isOpen: false,
                showPrompt: true,
                hasControls: Boolean(lastRawState?.hasPlayerControls),
              });
              sendResponse({
                ok: false,
                needsPageGesture: true,
                error:
                  'Switched to Spotify Web — click "Launch Floating" in the top-right badge to open Document Picture-in-Picture.',
              } satisfies CommandAck);
            } else {
              sendResponse({ ok: true } satisfies CommandAck);
            }
          });
          return true;
        }
        case 'SET_FLOATING_MODE': {
          floatingMode = message.mode;
          pipController.setMode(message.mode);
          sendResponse({ ok: true } satisfies CommandAck);
          return false;
        }
        case 'CLOSE_FLOATING_PLAYER': {
          showLaunchPrompt = false;
          pipController.close();
          sendResponse({ ok: true } satisfies CommandAck);
          return false;
        }
        default:
          return false;
      }
    }
  );
}

initContentBridge();
