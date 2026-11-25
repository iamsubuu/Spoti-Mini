export type ThemeId = 'obsidian' | 'midnight' | 'vinyl' | 'light';

export type LyricsFontSize = 'sm' | 'md' | 'lg';

export type FloatingDisplayMode =
  | 'mini-horizontal'
  | 'mini-vertical'
  | 'lyrics'
  | 'combined';

export type WorkspaceView =
  | 'popup'
  | 'floating-mini'
  | 'floating-lyrics'
  | 'combined'
  | 'settings';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type LyricsLoadStatus = 'ready' | 'loading' | 'empty';

export type LyricsSource = 'spotify-dom' | 'lrclib' | 'none';

export type CombinedSizePreset = 'wide' | 'medium' | 'narrow';

export interface LyricLine {
  /** Timestamp in seconds, or -1 for unsynced lines (e.g. Spotify DOM / plain text). */
  timeSec: number;
  text: string;
}

export interface TrackArtworkSpec {
  id: 'nocturne' | 'velvet' | 'solar' | 'meridian';
  ambientColor: string;
  secondaryColor: string;
  accentHue: string;
  imageUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  durationSec: number;
  artwork: TrackArtworkSpec;
  isInstrumental?: boolean;
  isUnsyncedLyrics?: boolean;
  lyricsSource?: LyricsSource;
  spotifyTrackUrl?: string;
  lyrics: LyricLine[];
}

export interface PlayerSettings {
  theme: ThemeId;
  lyricsFontSize: LyricsFontSize;
  compactMode: boolean;
  autoOpenFloating: boolean;
  defaultDisplayMode: FloatingDisplayMode;
  lrclibEnabled: boolean;
  dynamicIslandEnabled: boolean;
}

export interface PlaybackState {
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTimeSec: number;
  volume: number;
  isMuted: boolean;
  isLiked: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  connectionStatus: ConnectionStatus;
  lyricsStatusOverride: 'auto' | 'loading' | 'empty';
  activeLyricIndexOverride?: number | null;
  hasActiveTrack?: boolean;
  errorMessage?: string | null;
}

/**
 * Clean abstraction boundary so Chrome Extension Manifest V3 messaging
 * and Spotify Web playback bridges work seamlessly without UI refactors.
 */
export interface PlaybackActions {
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (index: number) => void;
  seekTo: (timeSec: number) => void;
  seekToLyricLine?: (index: number, timeSec: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLike: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLyricsStatusOverride: (override: 'auto' | 'loading' | 'empty') => void;
  retryLyrics?: () => void;
}
