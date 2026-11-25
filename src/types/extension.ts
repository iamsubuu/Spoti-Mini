import type {
  ConnectionStatus,
  FloatingDisplayMode,
  LyricLine,
  LyricsLoadStatus,
  LyricsSource,
  Track,
} from './player';

export interface DomLyricsPayload {
  trackKey: string;
  lines: string[];
  activeIndex: number;
}

export interface RawSpotifyDomState {
  hasPlayerControls: boolean;
  hasActiveTrack: boolean;
  trackKey: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  spotifyTrackUrl: string | null;
  durationSec: number;
  currentTimeSec: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isLiked: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  domLyrics: DomLyricsPayload | null;
  hasSpotifyLyricsButton: boolean;
  pipSupported: boolean;
  pageUrl: string;
}

export interface SpotifySnapshot {
  connectionStatus: ConnectionStatus;
  tabId: number | null;
  tabUrl: string | null;
  hasPlayerControls: boolean;
  hasActiveTrack: boolean;
  track: Track | null;
  isPlaying: boolean;
  currentTimeSec: number;
  volume: number;
  isMuted: boolean;
  isLiked: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  domLyrics: DomLyricsPayload | null;
  lyricsStatus: LyricsLoadStatus;
  lyricsSource: LyricsSource;
  activeLyricIndexOverride: number | null;
  isFloatingOpen: boolean;
  floatingMode: FloatingDisplayMode;
  pipSupported: boolean;
  errorMessage: string | null;
  updatedAt: number;
}

export type PlayerCommand =
  | {
      type:
        | 'togglePlay'
        | 'nextTrack'
        | 'prevTrack'
        | 'toggleMute'
        | 'toggleLike'
        | 'toggleShuffle'
        | 'cycleRepeat'
        | 'openSpotifyLyrics';
    }
  | { type: 'seekTo'; timeSec: number }
  | { type: 'setVolume'; volume: number }
  | { type: 'clickSpotifyLyricLine'; index: number };

export interface LrclibLookupRequest {
  trackKey: string;
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
  forceRefresh?: boolean;
}

export interface LrclibLookupResult {
  trackKey: string;
  found: boolean;
  instrumental: boolean;
  synced: boolean;
  lines: LyricLine[];
  error?: string;
}

export type ExtensionMessage =
  | { type: 'SPOTIFY_DOM_STATE'; payload: RawSpotifyDomState; isFloatingOpen: boolean; floatingMode: FloatingDisplayMode }
  | { type: 'SNAPSHOT_UPDATED'; snapshot: SpotifySnapshot }
  | { type: 'GET_SNAPSHOT' }
  | { type: 'PLAYER_COMMAND'; command: PlayerCommand }
  | { type: 'FETCH_LRCLIB_LYRICS'; request: LrclibLookupRequest }
  | { type: 'REFRESH_LYRICS' }
  | { type: 'REQUEST_FLOATING_LAUNCH'; mode?: FloatingDisplayMode }
  | { type: 'SET_FLOATING_MODE'; mode: FloatingDisplayMode }
  | { type: 'CLOSE_FLOATING_PLAYER' }
  | { type: 'PIP_STATE_CHANGED'; isOpen: boolean; mode: FloatingDisplayMode; error?: string | null }
  | { type: 'OPEN_SPOTIFY_TAB' }
  | { type: 'RECONNECT_SPOTIFY' }
  | { type: 'PING_CONTENT' };

export interface CommandAck {
  ok: boolean;
  error?: string;
  needsPageGesture?: boolean;
  snapshot?: SpotifySnapshot;
  lyrics?: LrclibLookupResult;
}
