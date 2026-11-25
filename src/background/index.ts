import type {
  CommandAck,
  ExtensionMessage,
  LrclibLookupResult,
  RawSpotifyDomState,
  SpotifySnapshot,
} from '../types/extension';
import type {
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlayerSettings,
  Track,
} from '../types/player';
import { fetchLrclibLyrics } from '../services/lrclibService';
import { DEFAULT_SETTINGS } from '../services/mockPlayerAdapter';
import { loadSettings, saveSettings } from '../services/settingsStorage';

const SPOTIFY_URL_PATTERN = 'https://open.spotify.com/*';
const SESSION_SNAPSHOT_KEY = 'spotifyMiniSessionSnapshot';
const COMPANION_WS_URL = 'ws://127.0.0.1:47195';

let companionSocket: WebSocket | null = null;
let companionReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let companionKeepaliveTimer: ReturnType<typeof setInterval> | null = null;

const ARTWORK_PALETTE: Array<
  Pick<Track['artwork'], 'id' | 'ambientColor' | 'secondaryColor' | 'accentHue'>
> = [
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

function createDisconnectedSnapshot(
  floatingMode: FloatingDisplayMode
): SpotifySnapshot {
  return {
    connectionStatus: 'disconnected',
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
    floatingMode,
    pipSupported: true,
    errorMessage: null,
    updatedAt: Date.now(),
  };
}

let cachedSettings: PlayerSettings = { ...DEFAULT_SETTINGS };
let currentSnapshot: SpotifySnapshot = createDisconnectedSnapshot(
  DEFAULT_SETTINGS.defaultDisplayMode
);
const lrclibResultsByTrackKey = new Map<string, LrclibLookupResult>();
const lrclibLoadingTrackKeys = new Set<string>();

void loadSettings().then((s) => {
  cachedSettings = s;
});

if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.spotifyMiniSettings?.newValue) {
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...(changes.spotifyMiniSettings.newValue as Partial<PlayerSettings>),
      };
      sendCompanionState();
      if (currentSnapshot.track && currentSnapshot.hasActiveTrack) {
        void refreshSnapshotLyrics(currentSnapshot.track);
      }
    }
  });
}

function sendCompanionState(): void {
  if (!companionSocket || companionSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  try {
    companionSocket.send(
      JSON.stringify({
        type: 'COMPANION_STATE',
        snapshot: currentSnapshot,
        settings: cachedSettings,
      })
    );
  } catch {
    // Ignore transient send errors.
  }
}

function scheduleCompanionReconnect(): void {
  if (companionReconnectTimer !== null) return;
  companionReconnectTimer = setTimeout(() => {
    companionReconnectTimer = null;
    connectCompanionSocket();
  }, 3500);
}

function connectCompanionSocket(): void {
  if (
    companionSocket &&
    (companionSocket.readyState === WebSocket.OPEN ||
      companionSocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  try {
    const ws = new WebSocket(COMPANION_WS_URL);
    companionSocket = ws;

    ws.onopen = () => {
      sendCompanionState();
      if (companionKeepaliveTimer === null) {
        companionKeepaliveTimer = setInterval(() => {
          if (companionSocket?.readyState === WebSocket.OPEN) {
            try {
              companionSocket.send(JSON.stringify({ type: 'PING' }));
            } catch {
              // Ignore.
            }
          }
        }, 20000);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type?: string;
          command?: ExtensionMessage extends infer _ ? unknown : never;
          patch?: Partial<PlayerSettings>;
        };
        if (msg.type === 'PLAYER_COMMAND' && msg.command) {
          void findBestSpotifyTab().then((tab) => {
            if (tab?.id) {
              void sendToSpotifyTab(tab.id, {
                type: 'PLAYER_COMMAND',
                command: msg.command as Extract<
                  ExtensionMessage,
                  { type: 'PLAYER_COMMAND' }
                >['command'],
              });
            }
          });
        } else if (msg.type === 'OPEN_SPOTIFY_TAB') {
          void findBestSpotifyTab().then(async (existing) => {
            if (existing?.id) {
              await chrome.tabs.update(existing.id, { active: true });
              if (existing.windowId !== undefined) {
                await chrome.windows.update(existing.windowId, { focused: true });
              }
            } else {
              await chrome.tabs.create({
                url: 'https://open.spotify.com/',
                active: true,
              });
            }
          });
        } else if (msg.type === 'REFRESH_LYRICS') {
          void findBestSpotifyTab().then((tab) => {
            if (tab?.id) {
              void sendToSpotifyTab(tab.id, { type: 'REFRESH_LYRICS' });
            }
          });
        } else if (msg.type === 'UPDATE_SETTINGS' && msg.patch) {
          const next = { ...cachedSettings, ...msg.patch };
          cachedSettings = next;
          void saveSettings(next);
        }
      } catch {
        // Ignore malformed companion message.
      }
    };

    ws.onerror = () => {
      // Desktop app may not be running; reconnect quietly.
    };

    ws.onclose = () => {
      if (companionSocket === ws) {
        companionSocket = null;
      }
      if (companionKeepaliveTimer !== null) {
        clearInterval(companionKeepaliveTimer);
        companionKeepaliveTimer = null;
      }
      scheduleCompanionReconnect();
    };
  } catch {
    scheduleCompanionReconnect();
  }
}

connectCompanionSocket();

async function persistSessionSnapshot(snapshot: SpotifySnapshot): Promise<void> {
  if (chrome.storage?.session) {
    try {
      await chrome.storage.session.set({ [SESSION_SNAPSHOT_KEY]: snapshot });
    } catch {
      // Ignore session storage errors.
    }
  }
}

async function restoreSessionSnapshot(): Promise<void> {
  if (chrome.storage?.session) {
    try {
      const data = await chrome.storage.session.get(SESSION_SNAPSHOT_KEY);
      if (data[SESSION_SNAPSHOT_KEY]) {
        currentSnapshot = data[SESSION_SNAPSHOT_KEY] as SpotifySnapshot;
      }
    } catch {
      // Ignore.
    }
  }
}

function pushSnapshotToTab(tab: chrome.tabs.Tab): void {
  if (
    !cachedSettings.dynamicIslandEnabled ||
    !tab.id ||
    !tab.url ||
    tab.url.startsWith('https://open.spotify.com/') ||
    (!tab.url.startsWith('https://') && !tab.url.startsWith('http://'))
  ) {
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    { type: 'SNAPSHOT_UPDATED', snapshot: currentSnapshot } satisfies ExtensionMessage,
    () => {
      if (chrome.runtime.lastError && tab.id) {
        // Tab may have been open before extension load; inject island.js once
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ['island.js'] })
          .then(() => {
            if (!tab.id) return;
            chrome.tabs.sendMessage(
              tab.id,
              { type: 'SNAPSHOT_UPDATED', snapshot: currentSnapshot } satisfies ExtensionMessage,
              () => {
                void chrome.runtime.lastError;
              }
            );
          })
          .catch(() => {
            // Restricted pages (e.g. Chrome Web Store) cannot be scripted.
          });
      }
    }
  );
}

function broadcastSnapshot(): void {
  void persistSessionSnapshot(currentSnapshot);
  sendCompanionState();
  connectCompanionSocket();
  try {
    chrome.runtime.sendMessage(
      { type: 'SNAPSHOT_UPDATED', snapshot: currentSnapshot } satisfies ExtensionMessage,
      () => {
        // Ignore "Receiving end does not exist" when popup is closed.
        void chrome.runtime.lastError;
      }
    );
  } catch {
    // Ignore.
  }

  if (cachedSettings.dynamicIslandEnabled) {
    chrome.tabs.query({ active: true }, (tabs) => {
      for (const tab of tabs) {
        pushSnapshotToTab(tab);
      }
    });
  }
}

function mergeSnapshotWithDom(
  tabId: number,
  raw: RawSpotifyDomState,
  isFloatingOpen: boolean,
  floatingMode: FloatingDisplayMode
): SpotifySnapshot {
  const palette =
    ARTWORK_PALETTE[
      hashString(raw.trackKey || raw.title || 'spotify') % ARTWORK_PALETTE.length
    ];

  const domLyrics =
    raw.domLyrics && raw.domLyrics.lines.length > 0 ? raw.domLyrics : null;
  const lrc = raw.trackKey ? lrclibResultsByTrackKey.get(raw.trackKey) : undefined;
  const lrcLoading = raw.trackKey
    ? lrclibLoadingTrackKeys.has(raw.trackKey)
    : false;

  let lyrics: Track['lyrics'] = [];
  let isInstrumental = false;
  let isUnsyncedLyrics = false;
  let lyricsSource: Track['lyricsSource'] = 'none';
  let activeLyricIndexOverride: number | null = null;
  let lyricsStatus: LyricsLoadStatus = 'empty';

  if (lrc?.found && lrc.synced && lrc.lines.length > 0) {
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
  } else if (lrcLoading) {
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

  return {
    connectionStatus: 'connected',
    tabId,
    tabUrl: raw.pageUrl,
    hasPlayerControls: raw.hasPlayerControls,
    hasActiveTrack: raw.hasActiveTrack,
    track,
    isPlaying: raw.isPlaying,
    currentTimeSec: raw.currentTimeSec,
    volume: raw.volume,
    isMuted: raw.isMuted,
    isLiked: raw.isLiked,
    shuffle: raw.shuffle,
    repeat: raw.repeat,
    domLyrics,
    lyricsStatus,
    lyricsSource: lyricsSource ?? 'none',
    activeLyricIndexOverride,
    isFloatingOpen,
    floatingMode,
    pipSupported: raw.pipSupported,
    errorMessage: null,
    updatedAt: Date.now(),
  };
}

async function refreshSnapshotLyrics(track: Track): Promise<void> {
  if (!cachedSettings.lrclibEnabled || !track.id || track.id === 'spotify-idle') {
    return;
  }
  const trackKey = track.id;
  if (lrclibResultsByTrackKey.has(trackKey)) return;

  lrclibLoadingTrackKeys.add(trackKey);
  if (currentSnapshot.track?.id === trackKey && currentSnapshot.lyricsSource === 'none') {
    currentSnapshot = { ...currentSnapshot, lyricsStatus: 'loading' };
    broadcastSnapshot();
  }

  const res = await fetchLrclibLyrics({
    trackKey,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSec: track.durationSec,
  });

  lrclibLoadingTrackKeys.delete(trackKey);
  lrclibResultsByTrackKey.set(trackKey, res);

  if (currentSnapshot.track?.id === trackKey && currentSnapshot.lyricsSource !== 'spotify-dom') {
    if (res.found && res.lines.length > 0) {
      currentSnapshot = {
        ...currentSnapshot,
        lyricsStatus: 'ready',
        lyricsSource: 'lrclib',
        track: {
          ...currentSnapshot.track,
          lyrics: res.lines,
          isUnsyncedLyrics: !res.synced,
          isInstrumental: false,
          lyricsSource: 'lrclib',
        },
      };
    } else if (res.instrumental) {
      currentSnapshot = {
        ...currentSnapshot,
        lyricsStatus: 'empty',
        lyricsSource: 'lrclib',
        track: {
          ...currentSnapshot.track,
          isInstrumental: true,
          lyrics: [],
          lyricsSource: 'lrclib',
        },
      };
    } else {
      currentSnapshot = { ...currentSnapshot, lyricsStatus: 'empty' };
    }
    broadcastSnapshot();
  }
}

async function findBestSpotifyTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: SPOTIFY_URL_PATTERN });
  if (!tabs.length) return null;

  // Priority: 1) currently playing audible tab, 2) recorded snapshot tab, 3) active tab, 4) first tab
  const audible = tabs.find((t) => t.audible);
  if (audible) return audible;
  if (currentSnapshot.tabId !== null) {
    const existing = tabs.find((t) => t.id === currentSnapshot.tabId);
    if (existing) return existing;
  }
  const active = tabs.find((t) => t.active);
  return active ?? tabs[0];
}

async function sendToSpotifyTab(
  tabId: number,
  message: ExtensionMessage
): Promise<CommandAck> {
  try {
    const resp = (await chrome.tabs.sendMessage(tabId, message)) as
      | CommandAck
      | undefined;
    return resp ?? { ok: true };
  } catch {
    // Content script may not be loaded yet (e.g. tab existed before extension install/reload)
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      await new Promise((r) => setTimeout(r, 200));
      const retryResp = (await chrome.tabs.sendMessage(tabId, message)) as
        | CommandAck
        | undefined;
      return retryResp ?? { ok: true };
    } catch (injectErr) {
      return {
        ok: false,
        error:
          injectErr instanceof Error
            ? injectErr.message
            : 'Unable to connect to Spotify Web tab.',
      };
    }
  }
}

async function ensureConnectedSnapshot(): Promise<SpotifySnapshot> {
  const tab = await findBestSpotifyTab();
  if (!tab?.id) {
    currentSnapshot = createDisconnectedSnapshot(
      cachedSettings.defaultDisplayMode
    );
    broadcastSnapshot();
    return currentSnapshot;
  }

  // Ping content script to ensure fresh snapshot
  const ack = await sendToSpotifyTab(tab.id, { type: 'PING_CONTENT' });
  if (!ack.ok) {
    currentSnapshot = {
      ...createDisconnectedSnapshot(cachedSettings.defaultDisplayMode),
      tabId: tab.id,
      tabUrl: tab.url ?? null,
      errorMessage: ack.error ?? 'Could not reach Spotify Web player.',
    };
    broadcastSnapshot();
  }
  return currentSnapshot;
}

// Tab lifecycle listeners
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentSnapshot.tabId === tabId) {
    void ensureConnectedSnapshot();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (currentSnapshot.tabId === tabId && changeInfo.url) {
    if (!changeInfo.url.startsWith('https://open.spotify.com/')) {
      void ensureConnectedSnapshot();
    } else {
      void sendToSpotifyTab(tabId, { type: 'PING_CONTENT' });
    }
  } else if (
    changeInfo.status === 'complete' &&
    tab.url?.startsWith('https://open.spotify.com/') &&
    currentSnapshot.connectionStatus === 'disconnected'
  ) {
    void sendToSpotifyTab(tabId, { type: 'PING_CONTENT' });
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!cachedSettings.dynamicIslandEnabled) return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    pushSnapshotToTab(tab);
  });
});

// Central message router
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    switch (message.type) {
      case 'SPOTIFY_DOM_STATE': {
        const tabId = sender.tab?.id ?? currentSnapshot.tabId;
        if (tabId === null) {
          sendResponse({ ok: false });
          return false;
        }
        currentSnapshot = mergeSnapshotWithDom(
          tabId,
          message.payload,
          message.isFloatingOpen,
          message.floatingMode
        );
        broadcastSnapshot();
        sendResponse({ ok: true });
        return false;
      }

      case 'PIP_STATE_CHANGED': {
        currentSnapshot = {
          ...currentSnapshot,
          isFloatingOpen: message.isOpen,
          floatingMode: message.mode,
          errorMessage: message.error ?? null,
          updatedAt: Date.now(),
        };
        broadcastSnapshot();
        sendResponse({ ok: true });
        return false;
      }

      case 'FETCH_LRCLIB_LYRICS': {
        const req = message.request;
        lrclibLoadingTrackKeys.add(req.trackKey);
        void fetchLrclibLyrics(req).then((lyrics) => {
          lrclibLoadingTrackKeys.delete(req.trackKey);
          lrclibResultsByTrackKey.set(req.trackKey, lyrics);
          sendResponse({ ok: true, lyrics } satisfies CommandAck);
        });
        return true;
      }

      case 'GET_SNAPSHOT': {
        void (async () => {
          await restoreSessionSnapshot();
          const tab = await findBestSpotifyTab();
          if (!tab?.id) {
            currentSnapshot = createDisconnectedSnapshot(
              cachedSettings.defaultDisplayMode
            );
            sendResponse({ ok: true, snapshot: currentSnapshot } satisfies CommandAck);
            return;
          }
          const isStale = Date.now() - currentSnapshot.updatedAt > 1200;
          if (!sender.tab || isStale || currentSnapshot.connectionStatus !== 'connected') {
            await sendToSpotifyTab(tab.id, { type: 'PING_CONTENT' });
          }
          sendResponse({ ok: true, snapshot: currentSnapshot } satisfies CommandAck);
        })();
        return true;
      }

      case 'RECONNECT_SPOTIFY': {
        void ensureConnectedSnapshot().then((snapshot) => {
          sendResponse({ ok: true, snapshot } satisfies CommandAck);
        });
        return true;
      }

      case 'OPEN_SPOTIFY_TAB': {
        void (async () => {
          const existing = await findBestSpotifyTab();
          if (existing?.id) {
            await chrome.tabs.update(existing.id, { active: true });
            if (existing.windowId !== undefined) {
              await chrome.windows.update(existing.windowId, { focused: true });
            }
          } else {
            await chrome.tabs.create({ url: 'https://open.spotify.com/', active: true });
          }
          sendResponse({ ok: true } satisfies CommandAck);
        })();
        return true;
      }

      case 'PLAYER_COMMAND': {
        void (async () => {
          const tab = await findBestSpotifyTab();
          if (!tab?.id) {
            sendResponse({
              ok: false,
              error: 'No active Spotify Web tab found.',
            } satisfies CommandAck);
            return;
          }
          const ack = await sendToSpotifyTab(tab.id, message);
          sendResponse(ack);
        })();
        return true;
      }

      case 'REFRESH_LYRICS':
      case 'SET_FLOATING_MODE':
      case 'CLOSE_FLOATING_PLAYER': {
        void (async () => {
          const tab = await findBestSpotifyTab();
          if (!tab?.id) {
            sendResponse({
              ok: false,
              error: 'No active Spotify Web tab found.',
            } satisfies CommandAck);
            return;
          }
          const ack = await sendToSpotifyTab(tab.id, message);
          sendResponse(ack);
        })();
        return true;
      }

      case 'REQUEST_FLOATING_LAUNCH': {
        void (async () => {
          const tab = await findBestSpotifyTab();
          if (!tab?.id) {
            sendResponse({
              ok: false,
              error: 'Open Spotify Web first to launch the floating player.',
            } satisfies CommandAck);
            return;
          }
          const ack = await sendToSpotifyTab(tab.id, message);
          if (ack.needsPageGesture) {
            await chrome.tabs.update(tab.id, { active: true });
            if (tab.windowId !== undefined) {
              await chrome.windows.update(tab.windowId, { focused: true });
            }
          }
          sendResponse(ack);
        })();
        return true;
      }

      default:
        return false;
    }
  }
);
