import type { PlayerSettings, Track } from '../types/player';

export const DEFAULT_SETTINGS: PlayerSettings = {
  theme: 'obsidian',
  lyricsFontSize: 'md',
  compactMode: false,
  autoOpenFloating: false,
  defaultDisplayMode: 'mini-horizontal',
  lrclibEnabled: true,
  dynamicIslandEnabled: true,
};

/**
 * Sample catalog strictly for frontend UI/UX preview.
 * Isolated from UI components so live Spotify Web / Chrome Extension
 * message passing provides live data in extension runtime.
 */
export const SAMPLE_TRACKS: Track[] = [
  {
    id: 'trk-nocturne-transit',
    title: 'Nocturne Transit',
    artist: 'Kaito & The Late Line',
    album: 'After Rain on Platform 4',
    year: 2025,
    durationSec: 214,
    artwork: {
      id: 'nocturne',
      ambientColor: '#1e3a5f',
      secondaryColor: '#c98a3e',
      accentHue: 'rgba(56, 114, 178, 0.24)',
    },
    lyrics: [
      { timeSec: 0, text: 'Streetlights blur across the quiet windowpane' },
      { timeSec: 6, text: 'Midnight holding steady in the silver rain' },
      { timeSec: 12, text: 'Every station glows and fades behind the glass' },
      { timeSec: 18, text: 'Counting all the amber signals as we pass' },
      { timeSec: 25, text: 'Keep the needle turning slow through city haze' },
      { timeSec: 32, text: 'Lost inside the rhythm of the quiet days' },
      { timeSec: 39, text: 'Footsteps echo softly on the concrete floor' },
      { timeSec: 46, text: 'Nothing left to hurry for anymore' },
      { timeSec: 53, text: 'We trace the skyline where the shadows bend' },
      { timeSec: 60, text: 'Waiting for the midnight line to reach the end' },
      { timeSec: 68, text: 'Static hums a melody we used to know' },
      { timeSec: 76, text: 'Warmth against the static of the undertow' },
      { timeSec: 84, text: 'Turn the collar upward to the evening air' },
      { timeSec: 92, text: 'Every passing silhouette is waiting there' },
      { timeSec: 100, text: 'Hold the final chord until the morning clears' },
      { timeSec: 110, text: 'Drifting through the quiet of the avenue' },
      { timeSec: 122, text: 'Every mile a whisper pulling back to you' },
      { timeSec: 136, text: 'Sodium reflections on the riverbend' },
      { timeSec: 150, text: 'Playing out the chorus till the signal ends' },
      { timeSec: 168, text: 'Softly as the rails begin to slow' },
      { timeSec: 184, text: 'Home is just a quarter mile below' },
    ],
  },
  {
    id: 'trk-velvet-static',
    title: 'Velvet Static',
    artist: 'Maren Solis',
    album: 'Concrete & Tide',
    year: 2024,
    durationSec: 196,
    artwork: {
      id: 'velvet',
      ambientColor: '#374158',
      secondaryColor: '#9fb3c8',
      accentHue: 'rgba(116, 138, 173, 0.22)',
    },
    lyrics: [
      { timeSec: 0, text: 'Cold mist rising from the harbor stone' },
      { timeSec: 7, text: 'Half a mile from any light we own' },
      { timeSec: 14, text: 'Hear the low hum braided in the cedar wire' },
      { timeSec: 21, text: 'Quiet as the embers of an autumn fire' },
      { timeSec: 28, text: 'You spoke in echoes underneath the arch' },
      { timeSec: 36, text: 'Counting out the hours till the turn of March' },
      { timeSec: 44, text: 'Velvet static settling on the window sill' },
      { timeSec: 52, text: 'Even when the shoreline goes completely still' },
      { timeSec: 60, text: 'Stay a little longer in the pale blue light' },
      { timeSec: 69, text: 'Nothing needs an answer in the middle of the night' },
      { timeSec: 78, text: 'Let the harbor bells ring out across the bay' },
      { timeSec: 88, text: 'Every heavy word can wait another day' },
      { timeSec: 98, text: 'Salt air drifting through the open hall' },
      { timeSec: 110, text: 'Shadows stretching softly down the plaster wall' },
      { timeSec: 124, text: 'Velvet static humming on the bedroom floor' },
      { timeSec: 138, text: 'We are not the strangers that we were before' },
      { timeSec: 156, text: 'Let the tide come in and wash the noise away' },
      { timeSec: 174, text: 'Quiet till the silver edge of day' },
    ],
  },
  {
    id: 'trk-solar-drift',
    title: 'Solar Drift',
    artist: 'Dario Vale & June',
    album: 'Warm Limestone Sessions',
    year: 2026,
    durationSec: 228,
    artwork: {
      id: 'solar',
      ambientColor: '#7a4f2b',
      secondaryColor: '#d9a45b',
      accentHue: 'rgba(196, 134, 65, 0.22)',
    },
    lyrics: [
      { timeSec: 0, text: 'Four o’clock shadows sliding down the courtyard wall' },
      { timeSec: 8, text: 'Dust motes floating slow before the evening fall' },
      { timeSec: 16, text: 'Open up the shutters let the cedar breathe' },
      { timeSec: 24, text: 'Listening to the vinyl crackle underneath' },
      { timeSec: 32, text: 'Golden hour resting on the coffee cup' },
      { timeSec: 40, text: 'No one on the terrace rushing to get up' },
      { timeSec: 49, text: 'Solar drift across the painted tile' },
      { timeSec: 57, text: 'Leave the telephone silent for a little while' },
      { timeSec: 66, text: 'Warm bass rolling easy down the narrow street' },
      { timeSec: 75, text: 'Time moves slower in the summer heat' },
      { timeSec: 84, text: 'Hands along the railing watching swallows turn' },
      { timeSec: 94, text: 'Every simple melody is all we need to learn' },
      { timeSec: 106, text: 'Keep the window tilted to the southern breeze' },
      { timeSec: 118, text: 'Sunlight breaking softly through the olive trees' },
      { timeSec: 132, text: 'Solar drift until the amber turns to rose' },
      { timeSec: 148, text: 'Following the groove wherever it goes' },
      { timeSec: 168, text: 'Evening settling slow along the stone' },
      { timeSec: 192, text: 'Quiet as a record spinning on its own' },
    ],
  },
  {
    id: 'trk-glass-meridian',
    title: 'Glass Meridian (Instrumental)',
    artist: 'Nora Lindqvist',
    album: 'Refractions Vol. II',
    year: 2025,
    durationSec: 245,
    artwork: {
      id: 'meridian',
      ambientColor: '#1b4737',
      secondaryColor: '#4fa882',
      accentHue: 'rgba(29, 185, 84, 0.18)',
    },
    isInstrumental: true,
    lyrics: [],
  },
];

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getActiveLyricIndex(
  lyrics: Track['lyrics'],
  currentTimeSec: number,
  activeIndexOverride?: number | null
): number {
  if (!lyrics.length) return -1;
  if (typeof activeIndexOverride === 'number' && activeIndexOverride >= 0) {
    return Math.min(lyrics.length - 1, activeIndexOverride);
  }
  if (lyrics[0].timeSec < 0) {
    return -1;
  }
  let active = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].timeSec >= 0 && currentTimeSec >= lyrics[i].timeSec) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}
