import { BUILTIN_CORPUS, buildSearchResultsHtml } from '../data/webCorpus';
import type {
  AdBlockConfig,
  BfCacheSnapshot,
  BookmarkItem,
  BrowserState,
  BrowserViewMode,
  DataSaverConfig,
  EncryptedSyncEnvelope,
  FastDownloadItem,
  HistoryEntry,
  ReaderModeConfig,
  TabItem,
  TranslationConfig,
  VpnConfig,
} from '../types/browser';
import { extractDomain } from './adblockEngine';
import { processWebDocument } from './dataSaverEngine';

export const STORAGE_KEY = 'veloce_browser_state_v1';

export function resolveLocalCorpusHtml(url: string): {
  rawHtml: string;
  shortTitle: string;
  foundLocally: boolean;
} {
  if (url === 'veloce://inicio') {
    return {
      rawHtml: '<!doctype html><html lang="pt-BR"><head><title>Nova aba — Veloce</title></head><body></body></html>',
      shortTitle: 'Início',
      foundLocally: true,
    };
  }

  if (url.startsWith('veloce://busca')) {
    try {
      const q = new URL(url.replace('veloce://', 'https://veloce.local/')).searchParams.get('q') || '';
      const built = buildSearchResultsHtml(q);
      return {
        rawHtml: built.rawHtml,
        shortTitle: built.shortTitle,
        foundLocally: true,
      };
    } catch {
      const built = buildSearchResultsHtml('');
      return { rawHtml: built.rawHtml, shortTitle: 'Busca', foundLocally: true };
    }
  }

  const normalizedNoSlash = url.replace(/\/$/, '');
  const match = BUILTIN_CORPUS.find((c) => c.url.replace(/\/$/, '') === normalizedNoSlash);
  if (match) {
    return {
      rawHtml: match.rawHtml,
      shortTitle: match.shortTitle,
      foundLocally: true,
    };
  }

  return {
    rawHtml: '',
    shortTitle: extractDomain(url).slice(0, 14),
    foundLocally: false,
  };
}

export function buildTabFromRawHtml(params: {
  id: string;
  rawUrl: string;
  rawHtml: string;
  shortTitle?: string;
  isIncognito: boolean;
  adBlock: AdBlockConfig;
  dataSaver: DataSaverConfig;
  loadTimeMs: number;
  restoredFromBfCache?: boolean;
  historyStack?: string[];
  historyIndex?: number;
  statusNote?: string;
}): TabItem {
  const processed = processWebDocument(params.rawHtml, params.rawUrl, params.adBlock, params.dataSaver);
  const computedShort =
    params.shortTitle ||
    (processed.normalizedUrl === 'veloce://inicio'
      ? 'Início'
      : extractDomain(processed.normalizedUrl).replace(/^www\./, '').split('.')[0].slice(0, 14));

  const stack = params.historyStack ?? [processed.normalizedUrl];
  const idx = params.historyIndex ?? stack.length - 1;

  return {
    id: params.id,
    title: processed.normalizedUrl === 'veloce://inicio' ? 'Nova aba — Veloce' : processed.title,
    shortTitle: computedShort.charAt(0).toUpperCase() + computedShort.slice(1),
    url: processed.normalizedUrl,
    isIncognito: params.isIncognito,
    historyStack: stack,
    historyIndex: idx,
    loadTimeMs: params.loadTimeMs,
    restoredFromBfCache: params.restoredFromBfCache ?? false,
    securityInfo: processed.securityInfo,
    shieldReport: processed.shieldReport,
    sanitizedHtml: processed.sanitizedHtml,
    statusNote: params.statusNote,
  };
}

export function createInitialBrowserState(): BrowserState {
  const defaultAdBlock: AdBlockConfig = {
    enabled: true,
    blockAds: true,
    blockTrackers: true,
    blockFingerprinting: true,
    blockThirdPartyCookies: true,
    stripTrackingParams: true,
    dohProvider: 'quad9',
    blockWebRtcLeak: true,
    autoShredCookiesOnClose: true,
    whitelistedDomains: [],
    customRules: ['||telemetry-sdk.io^', '||popunder-ads.net^'],
  };

  const defaultDataSaver: DataSaverConfig = {
    enabled: true,
    compressHtml: true,
    deferHeavyMedia: true,
    stripExternalFonts: true,
    blockAutoplayMedia: true,
  };

  const defaultReaderMode: ReaderModeConfig = {
    enabled: false,
    fontSizePx: 17,
    textZoomPct: 100,
    boldTextBoost: false,
    theme: 'light',
    fontFamily: 'sans',
    lineHeight: 1.7,
    showKeyTakeaways: true,
  };

  const defaultTranslation: TranslationConfig = {
    autoTranslate: false,
    targetLang: 'original',
    translateImagesOcr: false,
    showOriginalComparison: false,
  };

  const defaultVpn: VpnConfig = {
    enabled: true,
    selectedLocationId: 'ch-zh',
    protocol: 'wireguard',
    killSwitch: true,
    dnsLeakProtection: true,
    bypassLocalLan: true,
    ipRotationNonce: 0,
    encryptedBytesTransferred: 14_820_400,
  };

  const site1 = BUILTIN_CORPUS[0];
  const site2 = BUILTIN_CORPUS[1];

  const tab1 = buildTabFromRawHtml({
    id: 'tab-1',
    rawUrl: site1.url,
    rawHtml: site1.rawHtml,
    shortTitle: site1.shortTitle,
    isIncognito: false,
    adBlock: defaultAdBlock,
    dataSaver: defaultDataSaver,
    loadTimeMs: 14,
    historyStack: [site2.url, site1.url],
    historyIndex: 1,
  });

  const tab2 = buildTabFromRawHtml({
    id: 'tab-2',
    rawUrl: site2.url,
    rawHtml: site2.rawHtml,
    shortTitle: site2.shortTitle,
    isIncognito: false,
    adBlock: defaultAdBlock,
    dataSaver: defaultDataSaver,
    loadTimeMs: 11,
  });

  const tab3 = buildTabFromRawHtml({
    id: 'tab-3',
    rawUrl: 'veloce://inicio',
    rawHtml: '<!doctype html><html lang="pt-BR"><head><title>Nova aba — Veloce</title></head><body></body></html>',
    shortTitle: 'Início',
    isIncognito: false,
    adBlock: defaultAdBlock,
    dataSaver: defaultDataSaver,
    loadTimeMs: 2,
  });

  const now = new Date();
  const fmtLocalIso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

  const initialBfCacheStore: Record<string, BfCacheSnapshot> = {
    [tab1.url]: {
      url: tab1.url,
      title: tab1.title,
      shortTitle: tab1.shortTitle,
      sanitizedHtml: tab1.sanitizedHtml,
      securityInfo: tab1.securityInfo,
      shieldReport: tab1.shieldReport,
      cachedAtIso: fmtLocalIso(4),
    },
    [tab2.url]: {
      url: tab2.url,
      title: tab2.title,
      shortTitle: tab2.shortTitle,
      sanitizedHtml: tab2.sanitizedHtml,
      securityInfo: tab2.securityInfo,
      shieldReport: tab2.shieldReport,
      cachedAtIso: fmtLocalIso(12),
    },
  };

  const initialHistory: HistoryEntry[] = [
    {
      id: 'hist-1',
      url: site1.url,
      title: site1.title,
      domain: extractDomain(site1.url),
      visitedAt: fmtLocalIso(4),
      loadTimeMs: 14,
      bytesSaved: tab1.shieldReport.adBlockSavedBytes + tab1.shieldReport.dataSaverSavedBytes,
      trackersBlocked: tab1.shieldReport.blockedItems.length,
    },
    {
      id: 'hist-2',
      url: site2.url,
      title: site2.title,
      domain: extractDomain(site2.url),
      visitedAt: fmtLocalIso(19),
      loadTimeMs: 11,
      bytesSaved: tab2.shieldReport.adBlockSavedBytes + tab2.shieldReport.dataSaverSavedBytes,
      trackersBlocked: tab2.shieldReport.blockedItems.length,
    },
    {
      id: 'hist-3',
      url: BUILTIN_CORPUS[2].url,
      title: BUILTIN_CORPUS[2].title,
      domain: extractDomain(BUILTIN_CORPUS[2].url),
      visitedAt: fmtLocalIso(47),
      loadTimeMs: 12,
      bytesSaved: 318_400,
      trackersBlocked: 2,
    },
    {
      id: 'hist-4',
      url: BUILTIN_CORPUS[4].url,
      title: BUILTIN_CORPUS[4].title,
      domain: extractDomain(BUILTIN_CORPUS[4].url),
      visitedAt: fmtLocalIso(95),
      loadTimeMs: 16,
      bytesSaved: 440_120,
      trackersBlocked: 1,
    },
  ];

  const initialBookmarks: BookmarkItem[] = [
    {
      id: 'bm-1',
      title: 'Auditoria de rastreadores e consumo móvel',
      url: 'https://privacidade.org.br/relatorio-2026',
      folder: 'Segurança',
      createdAt: fmtLocalIso(1440),
      deviceOrigin: 'Pixel 8 Pro · Kotlin',
    },
    {
      id: 'bm-2',
      title: 'Interceptação Android WebView em Kotlin',
      url: 'https://kotlinlang.org/docs/android-webview',
      folder: 'Engenharia Kotlin',
      createdAt: fmtLocalIso(2880),
      deviceOrigin: 'Pixel 8 Pro · Kotlin',
    },
    {
      id: 'bm-3',
      title: 'Sincronização E2EE via AES-256-GCM',
      url: 'https://criptografia.ufsc.br/aes-gcm',
      folder: 'Segurança',
      createdAt: fmtLocalIso(4100),
      deviceOrigin: 'Estação Web · Linux',
    },
    {
      id: 'bm-4',
      title: 'Software enxuto e navegadores minimalistas',
      url: 'https://arquitetura-limpa.dev/minimalismo',
      folder: 'Leitura rápida',
      createdAt: fmtLocalIso(5200),
      deviceOrigin: 'Galaxy Tab S9 · Kotlin',
    },
    {
      id: 'bm-5',
      title: 'Boletim hidrometeorológico nacional 2026',
      url: 'https://observatorio.clima.br/boletim',
      folder: 'Leitura rápida',
      createdAt: fmtLocalIso(6800),
      deviceOrigin: 'Estação Web · Linux',
    },
  ];

  return {
    tabs: [tab1, tab2, tab3],
    activeTabId: 'tab-1',
    viewMode: 'duas-versoes',
    history: initialHistory,
    bookmarks: initialBookmarks,
    devices: [
      {
        id: 'dev-android-phone',
        name: 'Pixel 8 Pro',
        platform: 'Android 15',
        engineLabel: 'Motor Kotlin 2.1 · APK 3,8 MB',
        lastSyncedAt: fmtLocalIso(8),
        bookmarkCount: 5,
      },
      {
        id: 'dev-web-workstation',
        name: 'Estação Linux',
        platform: 'Web Sandbox',
        engineLabel: 'Veloce Core · Sessão atual',
        lastSyncedAt: fmtLocalIso(2),
        bookmarkCount: 5,
        isCurrentDevice: true,
      },
      {
        id: 'dev-android-tablet',
        name: 'Galaxy Tab S9',
        platform: 'Android 14',
        engineLabel: 'Motor Kotlin 2.1 · ARM64',
        lastSyncedAt: fmtLocalIso(130),
        bookmarkCount: 5,
      },
    ],
    adBlock: defaultAdBlock,
    dataSaver: defaultDataSaver,
    readerMode: defaultReaderMode,
    translation: defaultTranslation,
    vpn: defaultVpn,
    bfCacheEnabled: true,
    bfCacheStore: initialBfCacheStore,
    downloads: [],
    stats: {
      pagesLoaded: 14,
      totalTrackersBlocked:
        tab1.shieldReport.blockedItems.length + tab2.shieldReport.blockedItems.length + 19,
      totalAdBlockBytesSaved:
        tab1.shieldReport.adBlockSavedBytes + tab2.shieldReport.adBlockSavedBytes + 1_180_000,
      totalDataSaverBytesSaved:
        tab1.shieldReport.dataSaverSavedBytes + tab2.shieldReport.dataSaverSavedBytes + 940_000,
      totalOriginalBytes:
        tab1.shieldReport.originalBytes + tab2.shieldReport.originalBytes + 3_250_000,
      bfCacheHits: 3,
    },
    syncPassphrase: 'veloce-prisma-titanio-2026',
    lastSyncEnvelope: null,
  };
}

export type BrowserAction =
  | { type: 'SET_VIEW_MODE'; viewMode: BrowserViewMode }
  | { type: 'SELECT_TAB'; tabId: string }
  | { type: 'OPEN_TAB'; url?: string; isIncognito: boolean }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SHRED_INCOGNITO_TABS' }
  | {
      type: 'COMMIT_NAVIGATION';
      tabId: string;
      rawUrl: string;
      rawHtml: string;
      shortTitle?: string;
      loadTimeMs: number;
      historyMode?: 'push' | 'replace' | 'stack-move';
      nextHistoryIndex?: number;
      statusNote?: string;
    }
  | { type: 'RESTORE_FROM_BFCACHE'; tabId: string; targetHistoryIndex: number }
  | { type: 'TOGGLE_BFCACHE' }
  | { type: 'UPDATE_TRANSLATION'; patch: Partial<TranslationConfig> }
  | { type: 'UPDATE_VPN'; patch: Partial<VpnConfig> }
  | { type: 'ROTATE_VPN_IP' }
  | { type: 'ADD_FAST_DOWNLOAD'; item: FastDownloadItem }
  | { type: 'CLEAR_FAST_DOWNLOADS' }
  | { type: 'TOGGLE_BOOKMARK_FOR_ACTIVE_TAB'; folder?: BookmarkItem['folder'] }
  | { type: 'ADD_BOOKMARK'; bookmark: BookmarkItem }
  | { type: 'DELETE_BOOKMARK'; bookmarkId: string }
  | { type: 'RESTORE_BOOKMARKS'; bookmarks: BookmarkItem[] }
  | { type: 'DELETE_HISTORY_ITEM'; historyId: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESTORE_HISTORY'; history: HistoryEntry[] }
  | { type: 'UPDATE_ADBLOCK'; patch: Partial<AdBlockConfig> }
  | { type: 'TOGGLE_DOMAIN_WHITELIST'; domain: string }
  | { type: 'ADD_CUSTOM_RULE'; rule: string }
  | { type: 'REMOVE_CUSTOM_RULE'; rule: string }
  | { type: 'UPDATE_DATASAVER'; patch: Partial<DataSaverConfig> }
  | { type: 'UPDATE_READER_MODE'; patch: Partial<ReaderModeConfig> }
  | { type: 'SET_SYNC_PASSPHRASE'; passphrase: string }
  | { type: 'RECORD_SYNC_SUCCESS'; envelope: EncryptedSyncEnvelope; mergedBookmarks?: BookmarkItem[] }
  | { type: 'RESET_ALL_DATA' };

function reprocessAllTabs(
  tabs: TabItem[],
  adBlock: AdBlockConfig,
  dataSaver: DataSaverConfig
): TabItem[] {
  return tabs.map((tab) => {
    const local = resolveLocalCorpusHtml(tab.url);
    if (!local.foundLocally) {
      return tab;
    }
    return buildTabFromRawHtml({
      id: tab.id,
      rawUrl: tab.url,
      rawHtml: local.rawHtml,
      shortTitle: tab.shortTitle,
      isIncognito: tab.isIncognito,
      adBlock,
      dataSaver,
      loadTimeMs: tab.loadTimeMs,
      historyStack: tab.historyStack,
      historyIndex: tab.historyIndex,
      statusNote: tab.statusNote,
    });
  });
}

export function browserReducer(state: BrowserState, action: BrowserAction): BrowserState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode };

    case 'SELECT_TAB': {
      if (!state.tabs.some((t) => t.id === action.tabId)) return state;
      return { ...state, activeTabId: action.tabId, viewMode: 'navegar' };
    }

    case 'OPEN_TAB': {
      const targetUrl = action.url || 'veloce://inicio';
      const local = resolveLocalCorpusHtml(targetUrl);
      const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newTab = buildTabFromRawHtml({
        id: newId,
        rawUrl: targetUrl,
        rawHtml:
          local.rawHtml ||
          `<!doctype html><html lang="pt-BR"><head><title>${targetUrl}</title></head><body></body></html>`,
        shortTitle: action.isIncognito && targetUrl === 'veloce://inicio' ? 'Anônima' : local.shortTitle,
        isIncognito: action.isIncognito,
        adBlock: state.adBlock,
        dataSaver: state.dataSaver,
        loadTimeMs: targetUrl === 'veloce://inicio' ? 2 : 12,
      });

      let nextHistory = state.history;
      if (!action.isIncognito && newTab.url !== 'veloce://inicio') {
        const entry: HistoryEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          url: newTab.url,
          title: newTab.title,
          domain: extractDomain(newTab.url),
          visitedAt: new Date().toISOString(),
          loadTimeMs: newTab.loadTimeMs,
          bytesSaved:
            newTab.shieldReport.adBlockSavedBytes + newTab.shieldReport.dataSaverSavedBytes,
          trackersBlocked: newTab.shieldReport.blockedItems.length,
        };
        nextHistory = [entry, ...state.history].slice(0, 120);
      }

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newId,
        viewMode: 'navegar',
        history: nextHistory,
      };
    }

    case 'CLOSE_TAB': {
      const remaining = state.tabs.filter((t) => t.id !== action.tabId);
      if (remaining.length === 0) {
        const fallbackTab = buildTabFromRawHtml({
          id: `tab-${Date.now()}`,
          rawUrl: 'veloce://inicio',
          rawHtml: '<!doctype html><html lang="pt-BR"><head><title>Nova aba — Veloce</title></head><body></body></html>',
          shortTitle: 'Início',
          isIncognito: false,
          adBlock: state.adBlock,
          dataSaver: state.dataSaver,
          loadTimeMs: 2,
        });
        return {
          ...state,
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
        };
      }
      const nextActiveId =
        state.activeTabId === action.tabId
          ? remaining[remaining.length - 1].id
          : state.activeTabId;
      return {
        ...state,
        tabs: remaining,
        activeTabId: nextActiveId,
      };
    }

    case 'SHRED_INCOGNITO_TABS': {
      const normalTabs = state.tabs.filter((t) => !t.isIncognito);
      if (normalTabs.length === 0) {
        const freshNormal = buildTabFromRawHtml({
          id: `tab-${Date.now()}`,
          rawUrl: 'veloce://inicio',
          rawHtml: '<!doctype html><html lang="pt-BR"><head><title>Nova aba — Veloce</title></head><body></body></html>',
          shortTitle: 'Início',
          isIncognito: false,
          adBlock: state.adBlock,
          dataSaver: state.dataSaver,
          loadTimeMs: 2,
        });
        return {
          ...state,
          tabs: [freshNormal],
          activeTabId: freshNormal.id,
          viewMode: 'navegar',
        };
      }
      const activeStillExists = normalTabs.some((t) => t.id === state.activeTabId);
      return {
        ...state,
        tabs: normalTabs,
        activeTabId: activeStillExists ? state.activeTabId : normalTabs[0].id,
        viewMode: 'navegar',
      };
    }

    case 'COMMIT_NAVIGATION': {
      const targetTab = state.tabs.find((t) => t.id === action.tabId);
      if (!targetTab) return state;

      const tempTab = buildTabFromRawHtml({
        id: targetTab.id,
        rawUrl: action.rawUrl,
        rawHtml: action.rawHtml,
        shortTitle: action.shortTitle,
        isIncognito: targetTab.isIncognito,
        adBlock: state.adBlock,
        dataSaver: state.dataSaver,
        loadTimeMs: action.loadTimeMs,
        statusNote: action.statusNote,
      });

      let nextStack = targetTab.historyStack;
      let nextIndex = targetTab.historyIndex;

      if (action.historyMode === 'stack-move' && typeof action.nextHistoryIndex === 'number') {
        nextIndex = Math.max(0, Math.min(targetTab.historyStack.length - 1, action.nextHistoryIndex));
      } else if (action.historyMode === 'replace') {
        nextStack = [...targetTab.historyStack];
        nextStack[nextIndex] = tempTab.url;
      } else {
        const sliced = targetTab.historyStack.slice(0, targetTab.historyIndex + 1);
        if (sliced[sliced.length - 1] !== tempTab.url) {
          nextStack = [...sliced, tempTab.url];
          nextIndex = nextStack.length - 1;
        }
      }

      const updatedTab: TabItem = {
        ...tempTab,
        historyStack: nextStack,
        historyIndex: nextIndex,
      };

      const nextTabs = state.tabs.map((t) => (t.id === updatedTab.id ? updatedTab : t));

      // CRITICAL PRIVACY RULE: Incognito tabs NEVER record entries to History!
      let nextHistory = state.history;
      if (
        !updatedTab.isIncognito &&
        updatedTab.url !== 'veloce://inicio' &&
        action.historyMode !== 'replace'
      ) {
        const entry: HistoryEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          url: updatedTab.url,
          title: updatedTab.title,
          domain: extractDomain(updatedTab.url),
          visitedAt: new Date().toISOString(),
          loadTimeMs: updatedTab.loadTimeMs,
          bytesSaved:
            updatedTab.shieldReport.adBlockSavedBytes + updatedTab.shieldReport.dataSaverSavedBytes,
          trackersBlocked: updatedTab.shieldReport.blockedItems.length,
        };
        nextHistory = [entry, ...state.history].slice(0, 120);
      }

      const nextStats =
        updatedTab.url === 'veloce://inicio'
          ? state.stats
          : {
              ...state.stats,
              pagesLoaded: state.stats.pagesLoaded + 1,
              totalTrackersBlocked:
                state.stats.totalTrackersBlocked + updatedTab.shieldReport.blockedItems.length,
              totalAdBlockBytesSaved:
                state.stats.totalAdBlockBytesSaved + updatedTab.shieldReport.adBlockSavedBytes,
              totalDataSaverBytesSaved:
                state.stats.totalDataSaverBytesSaved + updatedTab.shieldReport.dataSaverSavedBytes,
              totalOriginalBytes:
                state.stats.totalOriginalBytes + updatedTab.shieldReport.originalBytes,
            };

      const nextBfCacheStore =
        state.bfCacheEnabled && updatedTab.url !== 'veloce://inicio'
          ? {
              ...state.bfCacheStore,
              [updatedTab.url]: {
                url: updatedTab.url,
                title: updatedTab.title,
                shortTitle: updatedTab.shortTitle,
                sanitizedHtml: updatedTab.sanitizedHtml,
                securityInfo: updatedTab.securityInfo,
                shieldReport: updatedTab.shieldReport,
                cachedAtIso: new Date().toISOString(),
              },
            }
          : state.bfCacheStore;

      const nextVpn =
        state.vpn.enabled && updatedTab.url !== 'veloce://inicio'
          ? {
              ...state.vpn,
              encryptedBytesTransferred:
                state.vpn.encryptedBytesTransferred + updatedTab.shieldReport.finalBytes,
            }
          : state.vpn;

      return {
        ...state,
        tabs: nextTabs,
        history: nextHistory,
        bfCacheStore: nextBfCacheStore,
        stats: nextStats,
        vpn: nextVpn,
      };
    }

    case 'RESTORE_FROM_BFCACHE': {
      const targetTab = state.tabs.find((t) => t.id === action.tabId);
      if (!targetTab) return state;

      const boundedIdx = Math.max(
        0,
        Math.min(targetTab.historyStack.length - 1, action.targetHistoryIndex)
      );
      const targetUrl = targetTab.historyStack[boundedIdx];
      const snapshot = state.bfCacheStore[targetUrl];
      if (!snapshot) return state;

      const restoredTab: TabItem = {
        ...targetTab,
        url: snapshot.url,
        title: snapshot.title,
        shortTitle: snapshot.shortTitle,
        sanitizedHtml: snapshot.sanitizedHtml,
        securityInfo: snapshot.securityInfo,
        shieldReport: snapshot.shieldReport,
        historyIndex: boundedIdx,
        loadTimeMs: 0,
        restoredFromBfCache: true,
        statusNote: 'Instantâneo BFCache (0 ms): página restaurada da memória RAM sem recarregar nem gastar dados.',
      };

      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === restoredTab.id ? restoredTab : t)),
        stats: {
          ...state.stats,
          bfCacheHits: state.stats.bfCacheHits + 1,
        },
      };
    }

    case 'TOGGLE_BFCACHE':
      return {
        ...state,
        bfCacheEnabled: !state.bfCacheEnabled,
      };

    case 'UPDATE_TRANSLATION':
      return {
        ...state,
        translation: { ...state.translation, ...action.patch },
      };

    case 'UPDATE_VPN':
      return {
        ...state,
        vpn: { ...state.vpn, ...action.patch },
      };

    case 'ROTATE_VPN_IP':
      return {
        ...state,
        vpn: {
          ...state.vpn,
          enabled: true,
          ipRotationNonce: state.vpn.ipRotationNonce + 1,
        },
      };

    case 'ADD_FAST_DOWNLOAD':
      return {
        ...state,
        downloads: [action.item, ...state.downloads].slice(0, 25),
      };

    case 'CLEAR_FAST_DOWNLOADS':
      return {
        ...state,
        downloads: [],
      };

    case 'TOGGLE_BOOKMARK_FOR_ACTIVE_TAB': {
      const active = state.tabs.find((t) => t.id === state.activeTabId);
      if (!active || active.url === 'veloce://inicio') return state;
      const existing = state.bookmarks.find((b) => b.url === active.url);
      if (existing) {
        return {
          ...state,
          bookmarks: state.bookmarks.filter((b) => b.id !== existing.id),
        };
      }
      const created: BookmarkItem = {
        id: `bm-${Date.now()}`,
        title: active.title,
        url: active.url,
        folder: action.folder || 'Segurança',
        createdAt: new Date().toISOString(),
        deviceOrigin: 'Estação Web · Veloce',
      };
      return {
        ...state,
        bookmarks: [created, ...state.bookmarks],
      };
    }

    case 'ADD_BOOKMARK':
      return {
        ...state,
        bookmarks: [action.bookmark, ...state.bookmarks.filter((b) => b.url !== action.bookmark.url)],
      };

    case 'DELETE_BOOKMARK':
      return {
        ...state,
        bookmarks: state.bookmarks.filter((b) => b.id !== action.bookmarkId),
      };

    case 'RESTORE_BOOKMARKS':
      return {
        ...state,
        bookmarks: action.bookmarks,
      };

    case 'DELETE_HISTORY_ITEM':
      return {
        ...state,
        history: state.history.filter((h) => h.id !== action.historyId),
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
      };

    case 'RESTORE_HISTORY':
      return {
        ...state,
        history: action.history,
      };

    case 'UPDATE_ADBLOCK': {
      const nextAdBlock = { ...state.adBlock, ...action.patch };
      return {
        ...state,
        adBlock: nextAdBlock,
        tabs: reprocessAllTabs(state.tabs, nextAdBlock, state.dataSaver),
      };
    }

    case 'TOGGLE_DOMAIN_WHITELIST': {
      const clean = action.domain.toLowerCase().trim();
      if (!clean) return state;
      const exists = state.adBlock.whitelistedDomains.includes(clean);
      const whitelistedDomains = exists
        ? state.adBlock.whitelistedDomains.filter((d) => d !== clean)
        : [...state.adBlock.whitelistedDomains, clean];
      const nextAdBlock = { ...state.adBlock, whitelistedDomains };
      return {
        ...state,
        adBlock: nextAdBlock,
        tabs: reprocessAllTabs(state.tabs, nextAdBlock, state.dataSaver),
      };
    }

    case 'ADD_CUSTOM_RULE': {
      const clean = action.rule.trim();
      if (!clean || state.adBlock.customRules.includes(clean)) return state;
      const nextAdBlock = {
        ...state.adBlock,
        customRules: [clean, ...state.adBlock.customRules],
      };
      return {
        ...state,
        adBlock: nextAdBlock,
        tabs: reprocessAllTabs(state.tabs, nextAdBlock, state.dataSaver),
      };
    }

    case 'REMOVE_CUSTOM_RULE': {
      const nextAdBlock = {
        ...state.adBlock,
        customRules: state.adBlock.customRules.filter((r) => r !== action.rule),
      };
      return {
        ...state,
        adBlock: nextAdBlock,
        tabs: reprocessAllTabs(state.tabs, nextAdBlock, state.dataSaver),
      };
    }

    case 'UPDATE_DATASAVER': {
      const nextDataSaver = { ...state.dataSaver, ...action.patch };
      return {
        ...state,
        dataSaver: nextDataSaver,
        tabs: reprocessAllTabs(state.tabs, state.adBlock, nextDataSaver),
      };
    }

    case 'UPDATE_READER_MODE': {
      return {
        ...state,
        readerMode: { ...state.readerMode, ...action.patch },
      };
    }

    case 'SET_SYNC_PASSPHRASE':
      return {
        ...state,
        syncPassphrase: action.passphrase,
      };

    case 'RECORD_SYNC_SUCCESS': {
      const nextBookmarks = action.mergedBookmarks ?? state.bookmarks;
      const nowIso = new Date().toISOString();
      const nextDevices = state.devices.map((d) =>
        d.isCurrentDevice
          ? { ...d, lastSyncedAt: nowIso, bookmarkCount: nextBookmarks.length }
          : { ...d, bookmarkCount: nextBookmarks.length }
      );
      return {
        ...state,
        bookmarks: nextBookmarks,
        lastSyncEnvelope: action.envelope,
        devices: nextDevices,
      };
    }

    case 'RESET_ALL_DATA':
      return createInitialBrowserState();

    default:
      return state;
  }
}

export function serializeStateForStorage(state: BrowserState): string {
  // Never persist incognito tabs to disk!
  const nonIncognitoTabs = state.tabs.filter((t) => !t.isIncognito);
  const safeActiveId = nonIncognitoTabs.some((t) => t.id === state.activeTabId)
    ? state.activeTabId
    : nonIncognitoTabs[0]?.id || 'tab-1';

  const persisted = {
    version: 1,
    activeTabId: safeActiveId,
    tabUrls: nonIncognitoTabs.map((t) => ({
      id: t.id,
      url: t.url,
      shortTitle: t.shortTitle,
      historyStack: t.historyStack,
      historyIndex: t.historyIndex,
    })),
    history: state.history,
    bookmarks: state.bookmarks,
    adBlock: state.adBlock,
    dataSaver: state.dataSaver,
    vpn: state.vpn,
    stats: state.stats,
    lastSyncEnvelope: state.lastSyncEnvelope,
  };
  return JSON.stringify(persisted);
}

export function loadStateFromStorage(): BrowserState {
  const fallback = createInitialBrowserState();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.bookmarks)) {
      return fallback;
    }

    const adBlock: AdBlockConfig = { ...fallback.adBlock, ...(parsed.adBlock || {}) };
    const dataSaver: DataSaverConfig = { ...fallback.dataSaver, ...(parsed.dataSaver || {}) };
    const vpn: VpnConfig = { ...fallback.vpn, ...(parsed.vpn || {}) };

    const restoredTabs: TabItem[] = Array.isArray(parsed.tabUrls) && parsed.tabUrls.length > 0
      ? parsed.tabUrls.map(
          (
            item: {
              id?: string;
              url?: string;
              shortTitle?: string;
              historyStack?: string[];
              historyIndex?: number;
            },
            index: number
          ) => {
            const targetUrl = typeof item.url === 'string' ? item.url : 'veloce://inicio';
            const local = resolveLocalCorpusHtml(targetUrl);
            const defaultStack =
              index === 0 && (!Array.isArray(item.historyStack) || item.historyStack.length < 2)
                ? [BUILTIN_CORPUS[1].url, targetUrl]
                : Array.isArray(item.historyStack) && item.historyStack.length > 0
                  ? item.historyStack
                  : [targetUrl];
            const defaultIdx =
              typeof item.historyIndex === 'number' && item.historyIndex < defaultStack.length
                ? item.historyIndex
                : defaultStack.length - 1;
            return buildTabFromRawHtml({
              id: typeof item.id === 'string' ? item.id : `tab-restored-${index}`,
              rawUrl: targetUrl,
              rawHtml:
                local.rawHtml ||
                `<!doctype html><html lang="pt-BR"><head><title>${targetUrl}</title></head><body></body></html>`,
              shortTitle: item.shortTitle || local.shortTitle,
              isIncognito: false,
              adBlock,
              dataSaver,
              loadTimeMs: 11,
              historyStack: defaultStack,
              historyIndex: defaultIdx,
            });
          }
        )
      : fallback.tabs;

    const activeId = restoredTabs.some((t) => t.id === parsed.activeTabId)
      ? parsed.activeTabId
      : restoredTabs[0].id;

    return {
      ...fallback,
      tabs: restoredTabs,
      activeTabId: activeId,
      history: Array.isArray(parsed.history) ? parsed.history : fallback.history,
      bookmarks: parsed.bookmarks,
      adBlock,
      dataSaver,
      vpn,
      stats: parsed.stats ? { ...fallback.stats, ...parsed.stats } : fallback.stats,
      lastSyncEnvelope: parsed.lastSyncEnvelope ?? null,
    };
  } catch {
    return fallback;
  }
}
