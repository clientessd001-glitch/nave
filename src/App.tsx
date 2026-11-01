import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { BookmarksSyncView } from './components/BookmarksSyncView';
import { type ActiveBrowserToolPanel, BrowserChrome } from './components/BrowserChrome';
import { DualVersionsView } from './components/DualVersionsView';
import { HistoryView } from './components/HistoryView';
import { KotlinArchitectureView } from './components/KotlinArchitectureView';
import { triggerFileDownload } from './components/MediaAndDocumentToolsPanel';
import { ShieldAndDataView } from './components/ShieldAndDataView';
import { ErrorBoundary } from './components/ui';
import { WebViewStage } from './components/WebViewStage';
import { buildSearchResultsHtml } from './data/webCorpus';
import { extractDomain, normalizeNavigationInput } from './engine/adblockEngine';
import {
  browserReducer,
  loadStateFromStorage,
  resolveLocalCorpusHtml,
  serializeStateForStorage,
  STORAGE_KEY,
} from './engine/browserState';
import {
  buildBatchImagesHtmlArchive,
  extractPageImagesForGallery,
} from './engine/mediaAndDocumentEngine';

function VeloceBrowserShell() {
  const [state, dispatch] = useReducer(browserReducer, undefined, loadStateFromStorage);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState<ActiveBrowserToolPanel>('none');
  const [batchSaveNotification, setBatchSaveNotification] = useState<string | null>(null);

  const activeTab =
    state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];

  // Persist non-incognito browser state safely
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeStateForStorage(state));
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }, [state]);

  // Sync document title with active tab
  useEffect(() => {
    document.title = activeTab.isIncognito
      ? `${activeTab.shortTitle} (Anônimo) — Veloce`
      : `${activeTab.shortTitle} — Veloce`;
  }, [activeTab.shortTitle, activeTab.isIncognito]);

  const navigateTab = useCallback(
    async (
      tabId: string,
      rawInput: string,
      historyMode: 'push' | 'replace' | 'stack-move' = 'push',
      nextHistoryIndex?: number
    ) => {
      const t0 = performance.now();
      const { normalizedUrl } = normalizeNavigationInput(
        rawInput,
        state.adBlock.enabled && state.adBlock.stripTrackingParams
      );

      const local = resolveLocalCorpusHtml(normalizedUrl);
      if (local.foundLocally) {
        const elapsed = Math.max(2, Math.round(performance.now() - t0) + 4);
        dispatch({
          type: 'COMMIT_NAVIGATION',
          tabId,
          rawUrl: rawInput,
          rawHtml: local.rawHtml,
          shortTitle: local.shortTitle,
          loadTimeMs: elapsed,
          historyMode,
          nextHistoryIndex,
        });
        return;
      }

      // Attempt live server proxy fetch for arbitrary HTTP/HTTPS URLs
      setIsNavigating(true);
      try {
        const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(normalizedUrl)}`);
        if (res.ok) {
          const payload = (await res.json()) as {
            ok: boolean;
            finalUrl?: string;
            rawHtml?: string;
          };
          if (payload.ok && payload.rawHtml) {
            const elapsed = Math.max(8, Math.round(performance.now() - t0));
            const hostLabel = extractDomain(payload.finalUrl || normalizedUrl)
              .replace(/^www\./, '')
              .split('.')[0]
              .slice(0, 14);
            dispatch({
              type: 'COMMIT_NAVIGATION',
              tabId,
              rawUrl: payload.finalUrl || normalizedUrl,
              rawHtml: payload.rawHtml,
              shortTitle: hostLabel.charAt(0).toUpperCase() + hostLabel.slice(1),
              loadTimeMs: elapsed,
              historyMode,
              nextHistoryIndex,
            });
            return;
          }
        }
      } catch {
        // Handled by local offline search fallback below
      } finally {
        setIsNavigating(false);
      }

      // Clean fallback to local private search index if host is unreachable
      const domainQuery = extractDomain(normalizedUrl);
      const fallbackSearch = buildSearchResultsHtml(domainQuery);
      const elapsed = Math.max(5, Math.round(performance.now() - t0));
      dispatch({
        type: 'COMMIT_NAVIGATION',
        tabId,
        rawUrl: normalizedUrl,
        rawHtml: fallbackSearch.rawHtml,
        shortTitle: domainQuery.slice(0, 12),
        loadTimeMs: elapsed,
        historyMode,
        nextHistoryIndex,
        statusNote: `Host externo indisponível na rede local — exibindo índice privado verificado para ${domainQuery}.`,
      });
    },
    [state.adBlock.enabled, state.adBlock.stripTrackingParams]
  );

  // Listen for link clicks from inside sandboxed srcDoc pages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; url?: string; openInNewTab?: boolean }
        | undefined;
      if (!data || data.type !== 'VELOCE_NAVIGATE' || typeof data.url !== 'string') {
        return;
      }
      if (data.openInNewTab) {
        dispatch({
          type: 'OPEN_TAB',
          url: data.url,
          isIncognito: activeTab.isIncognito,
        });
      } else {
        void navigateTab(activeTab.id, data.url, 'push');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTab.id, activeTab.isIncognito, navigateTab]);

  const handleGoBack = () => {
    if (activeTab.historyIndex <= 0) return;
    const prevIdx = activeTab.historyIndex - 1;
    const targetUrl = activeTab.historyStack[prevIdx];
    if (state.bfCacheEnabled && state.bfCacheStore[targetUrl]) {
      dispatch({
        type: 'RESTORE_FROM_BFCACHE',
        tabId: activeTab.id,
        targetHistoryIndex: prevIdx,
      });
      return;
    }
    void navigateTab(activeTab.id, targetUrl, 'stack-move', prevIdx);
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex >= activeTab.historyStack.length - 1) return;
    const nextIdx = activeTab.historyIndex + 1;
    const targetUrl = activeTab.historyStack[nextIdx];
    if (state.bfCacheEnabled && state.bfCacheStore[targetUrl]) {
      dispatch({
        type: 'RESTORE_FROM_BFCACHE',
        tabId: activeTab.id,
        targetHistoryIndex: nextIdx,
      });
      return;
    }
    void navigateTab(activeTab.id, targetUrl, 'stack-move', nextIdx);
  };

  const handleReload = () => {
    void navigateTab(activeTab.id, activeTab.url, 'replace');
  };

  const handleOpenUrlFromPanel = (url: string, incognito: boolean) => {
    if (incognito) {
      dispatch({ type: 'OPEN_TAB', url, isIncognito: true });
    } else {
      dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' });
      void navigateTab(activeTab.id, url, 'push');
    }
  };

  const isCurrentBookmarked = state.bookmarks.some((b) => b.url === activeTab.url);
  const prevHistoryUrl =
    activeTab.historyIndex > 0
      ? activeTab.historyStack[activeTab.historyIndex - 1]
      : undefined;
  const hasBfCacheForPrev = Boolean(prevHistoryUrl && state.bfCacheStore[prevHistoryUrl]);

  return (
    <div
      data-incognito={activeTab.isIncognito ? 'true' : 'false'}
      className="min-h-dvh flex flex-col bg-background text-foreground"
    >
      <BrowserChrome
        tabs={state.tabs}
        activeTab={activeTab}
        viewMode={state.viewMode}
        isBookmarked={isCurrentBookmarked}
        adBlockEnabled={state.adBlock.enabled}
        dataSaverEnabled={state.dataSaver.enabled}
        readerMode={state.readerMode}
        bfCacheEnabled={state.bfCacheEnabled}
        bfCacheHits={state.stats.bfCacheHits}
        hasBfCacheForPrev={hasBfCacheForPrev}
        translation={state.translation}
        vpn={state.vpn}
        downloadsCount={state.downloads.length}
        activeToolPanel={activeToolPanel}
        isNavigating={isNavigating}
        onSelectTab={(tabId) => dispatch({ type: 'SELECT_TAB', tabId })}
        onCloseTab={(tabId) => dispatch({ type: 'CLOSE_TAB', tabId })}
        onOpenTab={(isIncognito) => dispatch({ type: 'OPEN_TAB', isIncognito })}
        onShredIncognito={() => dispatch({ type: 'SHRED_INCOGNITO_TABS' })}
        onSetViewMode={(viewMode) => dispatch({ type: 'SET_VIEW_MODE', viewMode })}
        onNavigateSubmit={(rawInput) => void navigateTab(activeTab.id, rawInput, 'push')}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onToggleBfCache={() => dispatch({ type: 'TOGGLE_BFCACHE' })}
        onToggleBookmark={() => dispatch({ type: 'TOGGLE_BOOKMARK_FOR_ACTIVE_TAB' })}
        onToggleReaderMode={() => {
          const nextEnabled = !state.readerMode.enabled;
          if (nextEnabled && activeTab.url === 'veloce://inicio') {
            void navigateTab(
              activeTab.id,
              'https://arquitetura.veloce.dev/motor-zero-telemetria',
              'push'
            );
          }
          dispatch({
            type: 'UPDATE_READER_MODE',
            patch: { enabled: nextEnabled },
          });
        }}
        onUpdateReaderMode={(patch) => {
          if (patch.enabled && activeTab.url === 'veloce://inicio') {
            void navigateTab(
              activeTab.id,
              'https://arquitetura.veloce.dev/motor-zero-telemetria',
              'push'
            );
          }
          dispatch({ type: 'UPDATE_READER_MODE', patch });
        }}
        onStepTextZoom={(delta) =>
          dispatch({
            type: 'UPDATE_READER_MODE',
            patch: {
              textZoomPct: Math.max(85, Math.min(200, state.readerMode.textZoomPct + delta)),
            },
          })
        }
        onUpdateTranslation={(patch) => dispatch({ type: 'UPDATE_TRANSLATION', patch })}
        onUpdateVpn={(patch) => dispatch({ type: 'UPDATE_VPN', patch })}
        onRotateVpnIp={() => dispatch({ type: 'ROTATE_VPN_IP' })}
        onToggleAdBlock={() =>
          dispatch({
            type: 'UPDATE_ADBLOCK',
            patch: { enabled: !state.adBlock.enabled },
          })
        }
        onToggleDataSaver={() =>
          dispatch({
            type: 'UPDATE_DATASAVER',
            patch: { enabled: !state.dataSaver.enabled },
          })
        }
        onToggleToolPanel={(panel) =>
          setActiveToolPanel((curr) => (curr === panel ? 'none' : panel))
        }
        onTriggerSaveAllImages={() => {
          const imgs = extractPageImagesForGallery(activeTab);
          const archive = buildBatchImagesHtmlArchive(activeTab, imgs);
          triggerFileDownload(archive.filename, archive.content, archive.mimeType);
          dispatch({
            type: 'ADD_FAST_DOWNLOAD',
            item: {
              id: `dl-batch-img-${Date.now()}`,
              filename: archive.filename,
              sourceUrl: activeTab.url,
              format: 'Pacote Imagens',
              sizeBytes: archive.sizeBytes,
              parallelChunks: 4,
              durationMs: 16,
              sha256Prefix: '8a1f39c47e20d56b',
              completedAt: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              contentBlobText: archive.content,
              mimeType: archive.mimeType,
            },
          });
          setBatchSaveNotification(`${imgs.length} imagens salvas no pacote offline!`);
          setTimeout(() => setBatchSaveNotification(null), 4000);
        }}
      />

      <main className="flex-1 flex flex-col min-h-0">
        {state.viewMode === 'duas-versoes' ? (
          <DualVersionsView
            tabs={state.tabs}
            activeTab={activeTab}
            adBlock={state.adBlock}
            dataSaver={state.dataSaver}
            stats={state.stats}
            bookmarks={state.bookmarks}
            history={state.history}
            onSelectTab={(tabId) => dispatch({ type: 'SELECT_TAB', tabId })}
            onOpenTab={(isIncognito) => dispatch({ type: 'OPEN_TAB', isIncognito })}
            onNavigate={(url, openInNewTab) => {
              if (openInNewTab) {
                dispatch({
                  type: 'OPEN_TAB',
                  url,
                  isIncognito: activeTab.isIncognito,
                });
              } else {
                void navigateTab(activeTab.id, url, 'push');
              }
            }}
            onUpdateAdBlock={(patch) => dispatch({ type: 'UPDATE_ADBLOCK', patch })}
            onUpdateDataSaver={(patch) => dispatch({ type: 'UPDATE_DATASAVER', patch })}
            onOpenFullKotlin={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'kotlin' })}
            onReturnToSingle={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' })}
          />
        ) : null}

        {state.viewMode === 'navegar' ? (
          <WebViewStage
            activeTab={activeTab}
            stats={state.stats}
            bookmarks={state.bookmarks}
            adBlockEnabled={state.adBlock.enabled}
            dataSaverEnabled={state.dataSaver.enabled}
            bfCacheEnabled={state.bfCacheEnabled}
            readerMode={state.readerMode}
            translation={state.translation}
            vpn={state.vpn}
            downloads={state.downloads}
            activeToolPanel={activeToolPanel}
            batchSaveNotification={batchSaveNotification}
            onCloseToolPanel={() => setActiveToolPanel('none')}
            onTriggerBatchSaveImages={() => {
              const imgs = extractPageImagesForGallery(activeTab);
              const archive = buildBatchImagesHtmlArchive(activeTab, imgs);
              triggerFileDownload(archive.filename, archive.content, archive.mimeType);
              dispatch({
                type: 'ADD_FAST_DOWNLOAD',
                item: {
                  id: `dl-batch-img-${Date.now()}`,
                  filename: archive.filename,
                  sourceUrl: activeTab.url,
                  format: 'Pacote Imagens',
                  sizeBytes: archive.sizeBytes,
                  parallelChunks: 4,
                  durationMs: 16,
                  sha256Prefix: '8a1f39c47e20d56b',
                  completedAt: new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }),
                  contentBlobText: archive.content,
                  mimeType: archive.mimeType,
                },
              });
              setBatchSaveNotification(`${imgs.length} imagens salvas no pacote offline!`);
              setTimeout(() => setBatchSaveNotification(null), 4000);
            }}
            onUpdateReaderMode={(patch) =>
              dispatch({ type: 'UPDATE_READER_MODE', patch })
            }
            onUpdateTranslation={(patch) =>
              dispatch({ type: 'UPDATE_TRANSLATION', patch })
            }
            onUpdateVpn={(patch) => dispatch({ type: 'UPDATE_VPN', patch })}
            onRotateVpnIp={() => dispatch({ type: 'ROTATE_VPN_IP' })}
            onAddFastDownload={(item) =>
              dispatch({ type: 'ADD_FAST_DOWNLOAD', item })
            }
            onClearFastDownloads={() =>
              dispatch({ type: 'CLEAR_FAST_DOWNLOADS' })
            }
            onNavigate={(url, openInNewTab) => {
              if (openInNewTab) {
                dispatch({
                  type: 'OPEN_TAB',
                  url,
                  isIncognito: activeTab.isIncognito,
                });
              } else {
                void navigateTab(activeTab.id, url, 'push');
              }
            }}
            onOpenShield={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'escudo' })}
          />
        ) : null}

        {state.viewMode === 'escudo' ? (
          <ShieldAndDataView
            activeTab={activeTab}
            adBlock={state.adBlock}
            dataSaver={state.dataSaver}
            stats={state.stats}
            onUpdateAdBlock={(patch) => dispatch({ type: 'UPDATE_ADBLOCK', patch })}
            onToggleWhitelistDomain={(domain) =>
              dispatch({ type: 'TOGGLE_DOMAIN_WHITELIST', domain })
            }
            onAddCustomRule={(rule) => dispatch({ type: 'ADD_CUSTOM_RULE', rule })}
            onRemoveCustomRule={(rule) => dispatch({ type: 'REMOVE_CUSTOM_RULE', rule })}
            onUpdateDataSaver={(patch) => dispatch({ type: 'UPDATE_DATASAVER', patch })}
            onReturnToBrowser={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' })}
          />
        ) : null}

        {state.viewMode === 'favoritos' ? (
          <BookmarksSyncView
            bookmarks={state.bookmarks}
            devices={state.devices}
            syncPassphrase={state.syncPassphrase}
            lastSyncEnvelope={state.lastSyncEnvelope}
            onSetSyncPassphrase={(passphrase) =>
              dispatch({ type: 'SET_SYNC_PASSPHRASE', passphrase })
            }
            onSyncSuccess={(envelope, mergedBookmarks) =>
              dispatch({ type: 'RECORD_SYNC_SUCCESS', envelope, mergedBookmarks })
            }
            onAddBookmark={(bookmark) => dispatch({ type: 'ADD_BOOKMARK', bookmark })}
            onDeleteBookmark={(bookmarkId) =>
              dispatch({ type: 'DELETE_BOOKMARK', bookmarkId })
            }
            onRestoreBookmarks={(bookmarks) =>
              dispatch({ type: 'RESTORE_BOOKMARKS', bookmarks })
            }
            onOpenUrl={handleOpenUrlFromPanel}
            onReturnToBrowser={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' })}
          />
        ) : null}

        {state.viewMode === 'historico' ? (
          <HistoryView
            history={state.history}
            onOpenUrl={handleOpenUrlFromPanel}
            onDeleteHistoryItem={(historyId) =>
              dispatch({ type: 'DELETE_HISTORY_ITEM', historyId })
            }
            onClearHistory={() => dispatch({ type: 'CLEAR_HISTORY' })}
            onRestoreHistory={(history) => dispatch({ type: 'RESTORE_HISTORY', history })}
            onReturnToBrowser={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' })}
          />
        ) : null}

        {state.viewMode === 'kotlin' ? (
          <KotlinArchitectureView
            onReturnToBrowser={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: 'navegar' })}
          />
        ) : null}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VeloceBrowserShell />
    </ErrorBoundary>
  );
}
