import { describe, expect, it } from 'vitest';
import {
  cleanTrackTitle,
  parseLrc,
  parsePlainLyrics,
  primaryArtistName,
} from '../services/lrclibService';
import { getActiveLyricIndex } from '../services/mockPlayerAdapter';

describe('lrclibService parsing & normalization', () => {
  it('parses standard, millisecond, and multi-timestamp LRC lines sorted by time', () => {
    const lrc = `
[ti:Nocturne Transit]
[ar:Kaito]
[offset:500]
[00:12.50][00:45.00] Chorus line
[00:05.250] First line
[01:02.10] Last line
`;
    const parsed = parseLrc(lrc);
    expect(parsed).toEqual([
      { timeSec: 5.75, text: 'First line' },
      { timeSec: 13, text: 'Chorus line' },
      { timeSec: 45.5, text: 'Chorus line' },
      { timeSec: 62.6, text: 'Last line' },
    ]);
  });

  it('parses plain unsynced lyrics with -1 timeSec', () => {
    const plain = parsePlainLyrics('Line one\n\n  Line two  \n');
    expect(plain).toEqual([
      { timeSec: -1, text: 'Line one' },
      { timeSec: -1, text: 'Line two' },
    ]);
  });

  it('cleans remastered and featured suffixes cleanly', () => {
    expect(cleanTrackTitle('Dreams - 2004 Remaster')).toBe('Dreams');
    expect(cleanTrackTitle('Starlight (feat. Daft Punk)')).toBe('Starlight');
    expect(primaryArtistName('Daft Punk, Pharrell Williams')).toBe('Daft Punk');
  });

  it('computes active lyric index for timestamped and DOM override modes', () => {
    const timed = [
      { timeSec: 0, text: 'A' },
      { timeSec: 10, text: 'B' },
      { timeSec: 20, text: 'C' },
    ];
    expect(getActiveLyricIndex(timed, 14)).toBe(1);
    expect(getActiveLyricIndex(timed, 25)).toBe(2);

    const unsynced = [
      { timeSec: -1, text: 'A' },
      { timeSec: -1, text: 'B' },
    ];
    expect(getActiveLyricIndex(unsynced, 10)).toBe(-1);
    expect(getActiveLyricIndex(unsynced, 10, 1)).toBe(1);
  });
});
