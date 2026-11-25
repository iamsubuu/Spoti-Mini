import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  executePlayerCommand,
  extractDomLyrics,
  extractSpotifyDomState,
  parseTimeText,
} from '../content/spotifyDomExtractor';

function setupSpotifyDom(): void {
  document.body.innerHTML = `
    <footer data-testid="now-playing-bar">
      <div data-testid="now-playing-widget">
        <img data-testid="cover-art-image" src="https://i.scdn.co/image/ab67616d0000b273test" />
        <div data-testid="context-item-info-title">
          <a href="https://open.spotify.com/track/12345">Midnight City</a>
        </div>
        <div data-testid="context-item-info-subtitles">
          <a href="/artist/1">M83</a>
        </div>
        <button data-testid="add-button" aria-checked="true" aria-label="Remove from Liked Songs"></button>
      </div>
      <div class="controls">
        <button data-testid="control-button-shuffle" aria-checked="true"></button>
        <button data-testid="control-button-skip-back"></button>
        <button data-testid="control-button-playpause" aria-label="Pause"></button>
        <button data-testid="control-button-skip-forward"></button>
        <button data-testid="control-button-repeat" aria-checked="true" aria-label="Enable repeat one"></button>
      </div>
      <div data-testid="playback-position">1:15</div>
      <div data-testid="playback-progressbar">
        <input type="range" min="0" max="243000" value="75000" />
        <div data-testid="progress-bar"></div>
      </div>
      <div data-testid="playback-duration">-2:48</div>
      <div data-testid="volume-bar">
        <button data-testid="volume-bar-toggle-mute-button" aria-label="Mute"></button>
        <input type="range" min="0" max="1" step="0.01" value="0.68" />
        <div data-testid="progress-bar"></div>
      </div>
      <button data-testid="lyrics-button"></button>
    </footer>
    <main>
      <div data-testid="lyrics-line" style="color: rgba(255, 255, 255, 0.5)">Past lyric</div>
      <div data-testid="lyrics-line" aria-current="true" style="color: rgb(255, 255, 255)">Current lyric</div>
      <div data-testid="lyrics-line" style="color: rgba(0, 0, 0, 0.7)">Next lyric</div>
    </main>
  `;
}

describe('spotifyDomExtractor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses elapsed and remaining time formats', () => {
    expect(parseTimeText('1:23')).toEqual({ seconds: 83, isRemaining: false });
    expect(parseTimeText('-2:48')).toEqual({ seconds: 168, isRemaining: true });
    expect(parseTimeText('1:02:05')).toEqual({ seconds: 3725, isRemaining: false });
  });

  it('extracts metadata, remaining-time duration, controls state, and DOM lyrics', () => {
    setupSpotifyDom();
    const state = extractSpotifyDomState(document, navigator, window);

    expect(state.hasPlayerControls).toBe(true);
    expect(state.hasActiveTrack).toBe(true);
    expect(state.title).toBe('Midnight City');
    expect(state.artist).toBe('M83');
    expect(state.artworkUrl).toBe('https://i.scdn.co/image/ab67616d0000b273test');
    expect(state.isPlaying).toBe(true);
    expect(state.currentTimeSec).toBe(75);
    expect(state.durationSec).toBe(243);
    expect(state.volume).toBe(68);
    expect(state.isMuted).toBe(false);
    expect(state.isLiked).toBe(true);
    expect(state.shuffle).toBe(true);
    expect(state.repeat).toBe('all');
    expect(state.domLyrics).toEqual({
      trackKey: state.trackKey,
      lines: ['Past lyric', 'Current lyric', 'Next lyric'],
      activeIndex: 1,
    });
  });

  it('detects active DOM lyric line via luminance contrast when aria-current is absent', () => {
    document.body.innerHTML = `
      <div data-testid="lyrics-line" style="color: rgb(90, 90, 90)">Line 0</div>
      <div data-testid="lyrics-line" style="color: rgb(255, 255, 255)">Line 1</div>
      <div data-testid="lyrics-line" style="color: rgb(60, 60, 60)">Line 2</div>
    `;
    const lyrics = extractDomLyrics(document, 'key', window);
    expect(lyrics?.activeIndex).toBe(1);
  });

  it('dispatches safe clicks to Spotify visible controls', () => {
    setupSpotifyDom();
    const playBtn = document.querySelector(
      '[data-testid="control-button-playpause"]'
    ) as HTMLElement;
    const clickSpy = vi.fn();
    playBtn.addEventListener('click', clickSpy);

    const res = executePlayerCommand(document, { type: 'togglePlay' });
    expect(res.ok).toBe(true);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const lineSpy = vi.fn();
    const secondLine = document.querySelectorAll('[data-testid="lyrics-line"]')[1];
    secondLine.addEventListener('click', lineSpy);
    const lyricRes = executePlayerCommand(document, {
      type: 'clickSpotifyLyricLine',
      index: 1,
    });
    expect(lyricRes.ok).toBe(true);
    expect(lineSpy).toHaveBeenCalledTimes(1);
  });

  it('handles missing Spotify controls gracefully', () => {
    const state = extractSpotifyDomState(document, navigator, window);
    expect(state.hasPlayerControls).toBe(false);
    expect(state.hasActiveTrack).toBe(false);

    const cmd = executePlayerCommand(document, { type: 'nextTrack' });
    expect(cmd.ok).toBe(false);
    expect(cmd.error).toBeTruthy();
  });
});
