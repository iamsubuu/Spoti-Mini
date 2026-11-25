import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SAMPLE_TRACKS,
} from '../services/mockPlayerAdapter';
import type {
  ConnectionStatus,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  Track,
} from '../types/player';

interface UseSimulatedPlaybackOptions {
  autoOpenFloating: boolean;
  onAutoOpenFloating: () => void;
}

export function useSimulatedPlayback({
  autoOpenFloating,
  onAutoOpenFloating,
}: UseSimulatedPlaybackOptions) {
  const [state, setState] = useState<PlaybackState>({
    currentTrackIndex: 0,
    isPlaying: true,
    currentTimeSec: 26,
    volume: 74,
    isMuted: false,
    isLiked: true,
    shuffle: false,
    repeat: 'all',
    connectionStatus: 'connected',
    lyricsStatusOverride: 'auto',
  });

  const currentTrack: Track = SAMPLE_TRACKS[state.currentTrackIndex];

  // Simulated 1-second playback ticker
  useEffect(() => {
    if (!state.isPlaying || state.connectionStatus !== 'connected') {
      return;
    }

    const timer = window.setInterval(() => {
      setState((prev) => {
        const track = SAMPLE_TRACKS[prev.currentTrackIndex];
        const nextSec = prev.currentTimeSec + 1;

        if (nextSec >= track.durationSec) {
          if (prev.repeat === 'one') {
            return { ...prev, currentTimeSec: 0 };
          }
          if (prev.repeat === 'off' && prev.currentTrackIndex === SAMPLE_TRACKS.length - 1) {
            return { ...prev, isPlaying: false, currentTimeSec: track.durationSec };
          }
          const nextIndex = prev.shuffle
            ? (prev.currentTrackIndex + 1 + Math.floor(Math.random() * (SAMPLE_TRACKS.length - 1))) %
              SAMPLE_TRACKS.length
            : (prev.currentTrackIndex + 1) % SAMPLE_TRACKS.length;
          return {
            ...prev,
            currentTrackIndex: nextIndex,
            currentTimeSec: 0,
            lyricsStatusOverride: 'auto',
          };
        }

        return { ...prev, currentTimeSec: nextSec };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.isPlaying, state.connectionStatus]);

  const togglePlay = useCallback(() => {
    setState((prev) => {
      const willPlay = !prev.isPlaying;
      if (willPlay && autoOpenFloating) {
        onAutoOpenFloating();
      }
      return { ...prev, isPlaying: willPlay };
    });
  }, [autoOpenFloating, onAutoOpenFloating]);

  const nextTrack = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.shuffle
        ? (prev.currentTrackIndex + 1 + Math.floor(Math.random() * (SAMPLE_TRACKS.length - 1))) %
          SAMPLE_TRACKS.length
        : (prev.currentTrackIndex + 1) % SAMPLE_TRACKS.length;
      return {
        ...prev,
        currentTrackIndex: nextIndex,
        currentTimeSec: 0,
        lyricsStatusOverride: 'auto',
      };
    });
  }, []);

  const prevTrack = useCallback(() => {
    setState((prev) => {
      if (prev.currentTimeSec > 4) {
        return { ...prev, currentTimeSec: 0 };
      }
      const prevIndex =
        (prev.currentTrackIndex - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length;
      return {
        ...prev,
        currentTrackIndex: prevIndex,
        currentTimeSec: 0,
        lyricsStatusOverride: 'auto',
      };
    });
  }, []);

  const selectTrack = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SAMPLE_TRACKS.length - 1, index));
    setState((prev) => ({
      ...prev,
      currentTrackIndex: clamped,
      currentTimeSec: 0,
      isPlaying: true,
      lyricsStatusOverride: 'auto',
    }));
  }, []);

  const seekTo = useCallback((timeSec: number) => {
    setState((prev) => {
      const track = SAMPLE_TRACKS[prev.currentTrackIndex];
      const clamped = Math.max(0, Math.min(track.durationSec, timeSec));
      return { ...prev, currentTimeSec: clamped };
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setState((prev) => ({ ...prev, volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleLike = useCallback(() => {
    setState((prev) => ({ ...prev, isLiked: !prev.isLiked }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const cycleRepeat = useCallback(() => {
    setState((prev) => {
      const next =
        prev.repeat === 'off' ? 'all' : prev.repeat === 'all' ? 'one' : 'off';
      return { ...prev, repeat: next };
    });
  }, []);

  const setConnectionStatus = useCallback((connectionStatus: ConnectionStatus) => {
    setState((prev) => ({ ...prev, connectionStatus }));
  }, []);

  const setLyricsStatusOverride = useCallback(
    (lyricsStatusOverride: 'auto' | 'loading' | 'empty') => {
      setState((prev) => ({ ...prev, lyricsStatusOverride }));
    },
    []
  );

  const lyricsStatus: LyricsLoadStatus = useMemo(() => {
    if (state.lyricsStatusOverride === 'loading') return 'loading';
    if (state.lyricsStatusOverride === 'empty') return 'empty';
    if (currentTrack.lyrics.length === 0) return 'empty';
    return 'ready';
  }, [state.lyricsStatusOverride, currentTrack.lyrics.length]);

  const actions: PlaybackActions = useMemo(
    () => ({
      togglePlay,
      nextTrack,
      prevTrack,
      selectTrack,
      seekTo,
      setVolume,
      toggleMute,
      toggleLike,
      toggleShuffle,
      cycleRepeat,
      setConnectionStatus,
      setLyricsStatusOverride,
    }),
    [
      togglePlay,
      nextTrack,
      prevTrack,
      selectTrack,
      seekTo,
      setVolume,
      toggleMute,
      toggleLike,
      toggleShuffle,
      cycleRepeat,
      setConnectionStatus,
      setLyricsStatusOverride,
    ]
  );

  return {
    tracks: SAMPLE_TRACKS,
    currentTrack,
    playback: state,
    lyricsStatus,
    actions,
  };
}
