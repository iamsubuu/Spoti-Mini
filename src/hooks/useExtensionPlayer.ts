import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CommandAck,
  ExtensionMessage,
  PlayerCommand,
  SpotifySnapshot,
} from '../types/extension';
import type {
  ConnectionStatus,
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../types/player';
import { DEFAULT_SETTINGS } from '../services/mockPlayerAdapter';
import {
  loadSettings,
  saveSettings,
  subscribeSettings,
} from '../services/settingsStorage';

const IDLE_TRACK: Track = {
  id: 'spotify-idle',
  title: 'Spotify Web Player',
  artist: 'Open open.spotify.com to connect',
  album: 'No active playback detected',
  year: new Date().getFullYear(),
  durationSec: 0,
  artwork: {
    id: 'meridian',
    ambientColor: '#1b4737',
    secondaryColor: '#4fa882',
    accentHue: 'rgba(29, 185, 84, 0.18)',
  },
  isInstrumental: false,
  lyricsSource: 'none',
  lyrics: [],
};

const INITIAL_SNAPSHOT: SpotifySnapshot = {
  connectionStatus: 'reconnecting',
  tabId: null,
  tabUrl: null,
  hasPlayerControls: false,
  hasActiveTrack: false,
  track: null,
  isPlaying: false,
  currentTimeSec: 0,
  volume: 75,
  isMuted: false,
  isLiked: false,
  shuffle: false,
  repeat: 'off',
  domLyrics: null,
  lyricsStatus: 'empty',
  lyricsSource: 'none',
  activeLyricIndexOverride: null,
  isFloatingOpen: false,
  floatingMode: DEFAULT_SETTINGS.defaultDisplayMode,
  pipSupported: true,
  errorMessage: null,
  updatedAt: Date.now(),
};

function hasChromeRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.sendMessage === 'function'
  );
}

async function sendRuntimeMessage(
  msg: ExtensionMessage
): Promise<CommandAck | undefined> {
  if (!hasChromeRuntime()) return undefined;
  try {
    return (await chrome.runtime.sendMessage(msg)) as CommandAck | undefined;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Extension messaging error.',
    };
  }
}

export function useExtensionPlayer() {
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<SpotifySnapshot>(INITIAL_SNAPSHOT);
  const [interpolatedTimeSec, setInterpolatedTimeSec] = useState<number>(0);
  const [lyricsStatusOverride, setLyricsStatusOverride] = useState<
    'auto' | 'loading' | 'empty'
  >('auto');
  const [pipNotice, setPipNotice] = useState<string | null>(null);
  const lastSnapshotAtRef = useRef<number>(Date.now());

  // Load persisted settings and subscribe to cross-surface updates
  useEffect(() => {
    let mounted = true;
    void loadSettings().then((loaded) => {
      if (mounted) setSettings(loaded);
    });
    const unsubscribe = subscribeSettings((updated) => {
      if (mounted) setSettings(updated);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Fetch initial snapshot and subscribe to background broadcasts
  useEffect(() => {
    let mounted = true;

    void sendRuntimeMessage({ type: 'GET_SNAPSHOT' }).then((ack) => {
      if (!mounted || !ack?.snapshot) return;
      lastSnapshotAtRef.current = Date.now();
      setSnapshot(ack.snapshot);
      setInterpolatedTimeSec(ack.snapshot.currentTimeSec);
    });

    if (!hasChromeRuntime() || !chrome.runtime.onMessage) {
      return () => {
        mounted = false;
      };
    }

    const listener = (message: ExtensionMessage) => {
      if (!mounted) return;
      if (message.type === 'SNAPSHOT_UPDATED') {
        lastSnapshotAtRef.current = Date.now();
        setSnapshot(message.snapshot);
        setInterpolatedTimeSec(message.snapshot.currentTimeSec);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      mounted = false;
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // Smooth local progress interpolation between DOM snapshots
  useEffect(() => {
    if (
      snapshot.connectionStatus !== 'connected' ||
      !snapshot.hasActiveTrack ||
      !snapshot.isPlaying
    ) {
      setInterpolatedTimeSec(snapshot.currentTimeSec);
      return;
    }

    const duration = snapshot.track?.durationSec ?? 0;
    const timer = window.setInterval(() => {
      const elapsedSinceSync = (Date.now() - lastSnapshotAtRef.current) / 1000;
      // Small +0.25s anticipation aligns floored DOM clocks and lyric scroll transitions
      const next = snapshot.currentTimeSec + elapsedSinceSync + 0.25;
      setInterpolatedTimeSec(
        duration > 0 ? Math.min(duration, Math.max(0, next)) : Math.max(0, next)
      );
    }, 100);

    return () => window.clearInterval(timer);
  }, [
    snapshot.connectionStatus,
    snapshot.hasActiveTrack,
    snapshot.isPlaying,
    snapshot.currentTimeSec,
    snapshot.track?.durationSec,
  ]);

  const sendCommand = useCallback((command: PlayerCommand) => {
    void sendRuntimeMessage({ type: 'PLAYER_COMMAND', command }).then((ack) => {
      if (ack && !ack.ok && ack.error) {
        setPipNotice(ack.error);
      }
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void saveSettings(DEFAULT_SETTINGS);
  }, []);

  const reconnect = useCallback(() => {
    setSnapshot((prev) => ({
      ...prev,
      connectionStatus: 'reconnecting',
      errorMessage: null,
    }));
    void sendRuntimeMessage({ type: 'RECONNECT_SPOTIFY' }).then((ack) => {
      if (ack?.snapshot) {
        lastSnapshotAtRef.current = Date.now();
        setSnapshot(ack.snapshot);
        setInterpolatedTimeSec(ack.snapshot.currentTimeSec);
      }
    });
  }, []);

  const openSpotifyTab = useCallback(() => {
    void sendRuntimeMessage({ type: 'OPEN_SPOTIFY_TAB' });
  }, []);

  const openFloating = useCallback(
    async (explicitMode?: FloatingDisplayMode) => {
      setPipNotice(null);
      const targetMode = explicitMode ?? settings.defaultDisplayMode;
      const ack = await sendRuntimeMessage({
        type: 'REQUEST_FLOATING_LAUNCH',
        mode: targetMode,
      });
      if (ack && !ack.ok && ack.error) {
        setPipNotice(ack.error);
      }
    },
    [settings.defaultDisplayMode]
  );

  const closeFloating = useCallback(() => {
    void sendRuntimeMessage({ type: 'CLOSE_FLOATING_PLAYER' });
  }, []);

  const currentTrack: Track = snapshot.track ?? IDLE_TRACK;

  const lyricsStatus: LyricsLoadStatus = useMemo(() => {
    if (lyricsStatusOverride === 'loading') return 'loading';
    if (lyricsStatusOverride === 'empty') return 'empty';
    return snapshot.lyricsStatus;
  }, [lyricsStatusOverride, snapshot.lyricsStatus]);

  const playback: PlaybackState = useMemo(
    () => ({
      currentTrackIndex: 0,
      isPlaying: snapshot.isPlaying,
      currentTimeSec: interpolatedTimeSec,
      volume: snapshot.volume,
      isMuted: snapshot.isMuted,
      isLiked: snapshot.isLiked,
      shuffle: snapshot.shuffle,
      repeat: snapshot.repeat,
      connectionStatus: snapshot.connectionStatus,
      lyricsStatusOverride,
      activeLyricIndexOverride: snapshot.activeLyricIndexOverride,
      hasActiveTrack: snapshot.hasActiveTrack,
      errorMessage: snapshot.errorMessage,
    }),
    [snapshot, interpolatedTimeSec, lyricsStatusOverride]
  );

  const actions: PlaybackActions = useMemo(
    () => ({
      togglePlay: () => sendCommand({ type: 'togglePlay' }),
      nextTrack: () => sendCommand({ type: 'nextTrack' }),
      prevTrack: () => sendCommand({ type: 'prevTrack' }),
      selectTrack: () => {},
      seekTo: (timeSec: number) => {
        setInterpolatedTimeSec(timeSec);
        sendCommand({ type: 'seekTo', timeSec });
      },
      seekToLyricLine: (index: number, timeSec: number) => {
        if (timeSec >= 0) {
          setInterpolatedTimeSec(timeSec);
          sendCommand({ type: 'seekTo', timeSec });
        } else {
          sendCommand({ type: 'clickSpotifyLyricLine', index });
        }
      },
      setVolume: (volume: number) => {
        setSnapshot((prev) => ({
          ...prev,
          volume,
          isMuted: volume === 0,
        }));
        sendCommand({ type: 'setVolume', volume });
      },
      toggleMute: () => sendCommand({ type: 'toggleMute' }),
      toggleLike: () => sendCommand({ type: 'toggleLike' }),
      toggleShuffle: () => sendCommand({ type: 'toggleShuffle' }),
      cycleRepeat: () => sendCommand({ type: 'cycleRepeat' }),
      setConnectionStatus: (connectionStatus: ConnectionStatus) => {
        if (connectionStatus === 'reconnecting') reconnect();
      },
      setLyricsStatusOverride,
      retryLyrics: () => {
        setLyricsStatusOverride('auto');
        void sendRuntimeMessage({ type: 'REFRESH_LYRICS' });
      },
    }),
    [sendCommand, reconnect]
  );

  const footerNote = useMemo(() => {
    if (snapshot.connectionStatus !== 'connected') {
      return 'Spotify Web disconnected';
    }
    if (!snapshot.hasActiveTrack) {
      return 'Spotify Web ready';
    }
    if (snapshot.lyricsSource === 'lrclib') {
      return currentTrack.isUnsyncedLyrics
        ? 'Lyrics · LRCLIB plain'
        : 'Lyrics · LRCLIB synced';
    }
    if (snapshot.lyricsSource === 'spotify-dom') {
      return 'Lyrics · Spotify Web';
    }
    return 'Spotify Web · Live';
  }, [
    snapshot.connectionStatus,
    snapshot.hasActiveTrack,
    snapshot.lyricsSource,
    currentTrack.isUnsyncedLyrics,
  ]);

  return {
    settings,
    updateSettings,
    resetSettings,
    snapshot,
    currentTrack,
    playback,
    lyricsStatus,
    actions,
    footerNote,
    pipNotice,
    dismissPipNotice: () => setPipNotice(null),
    reconnect,
    openSpotifyTab,
    openFloating,
    closeFloating,
  };
}
