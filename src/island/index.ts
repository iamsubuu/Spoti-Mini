import type {
  CommandAck,
  ExtensionMessage,
  PlayerCommand,
  SpotifySnapshot,
} from '../types/extension';
import type {
  FloatingDisplayMode,
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
import { DynamicIslandController } from '../content/dynamicIsland';

declare global {
  interface Window {
    __spotifyMiniIslandInitialized?: boolean;
  }
}

const FALLBACK_TRACK: Track = {
  id: 'spotify-idle',
  title: 'Spotify Web',
  artist: 'Spotify',
  album: 'Spotify Web',
  year: new Date().getFullYear(),
  durationSec: 0,
  artwork: {
    id: 'meridian',
    ambientColor: '#1b4737',
    secondaryColor: '#4fa882',
    accentHue: 'rgba(29, 185, 84, 0.18)',
  },
  lyrics: [],
};

function initDynamicIslandClient(): void {
  if (window.__spotifyMiniIslandInitialized) return;
  if (window.top !== window.self) return;
  window.__spotifyMiniIslandInitialized = true;

  let settings: PlayerSettings = { ...DEFAULT_SETTINGS };
  let snapshot: SpotifySnapshot | null = null;
  let lastSyncedPerfMs = performance.now();
  const controller = new DynamicIslandController();

  async function sendRuntime(msg: ExtensionMessage): Promise<CommandAck | undefined> {
    try {
      return (await chrome.runtime.sendMessage(msg)) as CommandAck | undefined;
    } catch {
      return undefined;
    }
  }

  function sendCommand(command: PlayerCommand): void {
    void sendRuntime({ type: 'PLAYER_COMMAND', command });
  }

  const actions: PlaybackActions = {
    togglePlay: () => sendCommand({ type: 'togglePlay' }),
    nextTrack: () => sendCommand({ type: 'nextTrack' }),
    prevTrack: () => sendCommand({ type: 'prevTrack' }),
    selectTrack: () => {},
    seekTo: (timeSec: number) => sendCommand({ type: 'seekTo', timeSec }),
    seekToLyricLine: (index: number, timeSec: number) => {
      if (timeSec >= 0) {
        sendCommand({ type: 'seekTo', timeSec });
      } else {
        sendCommand({ type: 'clickSpotifyLyricLine', index });
      }
    },
    setVolume: (volume: number) => sendCommand({ type: 'setVolume', volume }),
    toggleMute: () => sendCommand({ type: 'toggleMute' }),
    toggleLike: () => sendCommand({ type: 'toggleLike' }),
    toggleShuffle: () => sendCommand({ type: 'toggleShuffle' }),
    cycleRepeat: () => sendCommand({ type: 'cycleRepeat' }),
    setConnectionStatus: () => {},
    setLyricsStatusOverride: () => {},
    retryLyrics: () => {
      void sendRuntime({ type: 'REFRESH_LYRICS' });
    },
  };

  function getInterpolatedTime(): number {
    if (!snapshot) return 0;
    let t = snapshot.currentTimeSec;
    if (
      snapshot.connectionStatus === 'connected' &&
      snapshot.hasActiveTrack &&
      snapshot.isPlaying
    ) {
      t += (performance.now() - lastSyncedPerfMs) / 1000 + 0.25;
    }
    const dur = snapshot.track?.durationSec ?? 0;
    return dur > 0 ? Math.min(dur, Math.max(0, t)) : Math.max(0, t);
  }

  function render(): void {
    const visible = Boolean(
      settings.dynamicIslandEnabled &&
        snapshot &&
        snapshot.connectionStatus === 'connected' &&
        snapshot.hasActiveTrack &&
        snapshot.track &&
        !snapshot.isFloatingOpen
    );

    const track = snapshot?.track ?? FALLBACK_TRACK;
    const playback: PlaybackState = {
      currentTrackIndex: 0,
      isPlaying: snapshot?.isPlaying ?? false,
      currentTimeSec: getInterpolatedTime(),
      volume: snapshot?.volume ?? 75,
      isMuted: snapshot?.isMuted ?? false,
      isLiked: snapshot?.isLiked ?? false,
      shuffle: snapshot?.shuffle ?? false,
      repeat: snapshot?.repeat ?? 'off',
      connectionStatus: snapshot?.connectionStatus ?? 'disconnected',
      lyricsStatusOverride: 'auto',
      activeLyricIndexOverride: snapshot?.activeLyricIndexOverride ?? null,
      hasActiveTrack: snapshot?.hasActiveTrack ?? false,
    };

    controller.update({
      visible,
      track,
      playback,
      actions,
      settings,
      lyricsStatus: snapshot?.lyricsStatus ?? 'empty',
      onPopOutPip: (mode: FloatingDisplayMode) => {
        void sendRuntime({ type: 'REQUEST_FLOATING_LAUNCH', mode });
      },
      onHideIsland: () => {
        const next = { ...settings, dynamicIslandEnabled: false };
        settings = next;
        void saveSettings(next);
        render();
      },
    });
  }

  function refreshSnapshot(): void {
    void sendRuntime({ type: 'GET_SNAPSHOT' }).then((ack) => {
      if (ack?.snapshot) {
        snapshot = ack.snapshot;
        lastSyncedPerfMs = performance.now();
        render();
      }
    });
  }

  void loadSettings().then((loaded) => {
    settings = loaded;
    refreshSnapshot();
  });

  subscribeSettings((updated) => {
    settings = updated;
    render();
  });

  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'SNAPSHOT_UPDATED') {
      snapshot = message.snapshot;
      lastSyncedPerfMs = performance.now();
      render();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshSnapshot();
    }
  });

  window.setInterval(() => {
    if (
      document.visibilityState === 'visible' &&
      settings.dynamicIslandEnabled &&
      snapshot?.isPlaying &&
      !snapshot.isFloatingOpen
    ) {
      render();
    }
  }, 100);
}

initDynamicIslandClient();
