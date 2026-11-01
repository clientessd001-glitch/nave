import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Download,
  EyeOff,
  Film,
  Image as ImageIcon,
  Languages,
  Lock,
  Search,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react';
import { BUILTIN_CORPUS } from '../data/webCorpus';
import {
  countTextOccurrences,
  distillArticleForReader,
} from '../engine/readerEngine';
import {
  applyTranslationAndOcrToHtml,
  buildFastDownloadPackage,
  detectPageVideoStreams,
  extractAndTranslateImageOcrRegions,
  TARGET_LANGUAGE_OPTIONS,
  translateTextSegment,
} from '../engine/translationAndDownloadEngine';
import { resolveVpnTunnelStatus } from '../engine/mediaAndDocumentEngine';
import type {
  BookmarkItem,
  CumulativeStats,
  FastDownloadItem,
  ReaderFontFamily,
  ReaderModeConfig,
  ReaderTheme,
  TabItem,
  TargetLanguage,
  TranslationConfig,
  VpnConfig,
} from '../types/browser';
import { formatBytes, formatInt, formatPercent } from '../utils/formatters';
import type { ActiveBrowserToolPanel } from './BrowserChrome';
import { MediaAndDocumentToolsPanel } from './MediaAndDocumentToolsPanel';

interface WebViewStageProps {
  activeTab: TabItem;
  stats: CumulativeStats;
  bookmarks: BookmarkItem[];
  adBlockEnabled: boolean;
  dataSaverEnabled: boolean;
  bfCacheEnabled: boolean;
  readerMode: ReaderModeConfig;
  translation: TranslationConfig;
  vpn: VpnConfig;
  downloads: FastDownloadItem[];
  activeToolPanel: ActiveBrowserToolPanel;
  batchSaveNotification: string | null;
  onCloseToolPanel: () => void;
  onTriggerBatchSaveImages: () => void;
  onUpdateReaderMode: (patch: Partial<ReaderModeConfig>) => void;
  onUpdateTranslation: (patch: Partial<TranslationConfig>) => void;
  onUpdateVpn: (patch: Partial<VpnConfig>) => void;
  onRotateVpnIp: () => void;
  onAddFastDownload: (item: FastDownloadItem) => void;
  onClearFastDownloads: () => void;
  onNavigate: (url: string, openInNewTab?: boolean) => void;
  onOpenShield: () => void;
}

function triggerBrowserFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const READER_THEME_STYLES: Record<
  ReaderTheme,
  { bg: string; text: string; muted: string; border: string; codeBg: string }
> = {
  light: {
    bg: '#FFFFFF',
    text: '#0F1713',
    muted: '#526058',
    border: '#DCE5DF',
    codeBg: '#F4F7F5',
  },
  sepia: {
    bg: '#F8F2E4',
    text: '#2B2318',
    muted: '#6E5E48',
    border: '#E2D5BE',
    codeBg: '#EFE6D2',
  },
  dark: {
    bg: '#0D1310',
    text: '#E9F2ED',
    muted: '#94A89D',
    border: '#213028',
    codeBg: '#141E19',
  },
};

const READER_FONT_STACKS: Record<ReaderFontFamily, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Cambria', 'Times New Roman', serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

export const WebViewStage: React.FC<WebViewStageProps> = ({
  activeTab,
  stats,
  bookmarks,
  adBlockEnabled,
  dataSaverEnabled,
  bfCacheEnabled,
  readerMode,
  translation,
  vpn,
  downloads,
  activeToolPanel,
  batchSaveNotification,
  onCloseToolPanel,
  onTriggerBatchSaveImages,
  onUpdateReaderMode,
  onUpdateTranslation,
  onUpdateVpn,
  onRotateVpnIp,
  onAddFastDownload,
  onClearFastDownloads,
  onNavigate,
  onOpenShield,
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [findInPageQuery, setFindInPageQuery] = useState('');
  const [isDownloadingFormat, setIsDownloadingFormat] = useState<string | null>(null);

  const distilled = useMemo(
    () => distillArticleForReader(activeTab.sanitizedHtml, activeTab.title),
    [activeTab.sanitizedHtml, activeTab.title]
  );

  const ocrRegions = useMemo(
    () => extractAndTranslateImageOcrRegions(activeTab.url, translation.targetLang),
    [activeTab.url, translation.targetLang]
  );

  const detectedVideos = useMemo(
    () => detectPageVideoStreams(activeTab.url, activeTab.title),
    [activeTab.url, activeTab.title]
  );

  const renderedWebViewHtml = useMemo(
    () =>
      applyTranslationAndOcrToHtml(
        activeTab.sanitizedHtml,
        activeTab.url,
        translation,
        readerMode.textZoomPct,
        readerMode.boldTextBoost
      ),
    [
      activeTab.sanitizedHtml,
      activeTab.url,
      translation,
      readerMode.textZoomPct,
      readerMode.boldTextBoost,
    ]
  );

  const matchCount = useMemo(
    () => countTextOccurrences(distilled.blocks, findInPageQuery),
    [distilled.blocks, findInPageQuery]
  );

  const totalSavedAllTime = stats.totalAdBlockBytesSaved + stats.totalDataSaverBytesSaved;
  const totalSavedRatio = formatPercent(totalSavedAllTime, stats.totalOriginalBytes);

  const handleSelectLanguage = (lang: TargetLanguage) => {
    onUpdateTranslation({
      targetLang: lang,
      autoTranslate: lang !== 'original',
    });
  };

  const handleFastDownload = async (format: FastDownloadItem['format']) => {
    setIsDownloadingFormat(format);
    try {
      const pkg = await buildFastDownloadPackage(activeTab, format);
      onAddFastDownload(pkg);
      triggerBrowserFileDownload(pkg.filename, pkg.contentBlobText, pkg.mimeType);
    } finally {
      setIsDownloadingFormat(null);
    }
  };

  const handleDownloadMarkdown = () => {
    void handleFastDownload('Markdown');
  };

  const toolPanelsBanner = (
    <>
      {/* Panel 1: Auto-Translation & Image OCR Bar */}
      {activeToolPanel === 'translate' ? (
        <div className="border-b border-border bg-background px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground whitespace-nowrap">
                <Languages className="w-4 h-4 text-primary shrink-0" />
                Tradução automática neural local (zero nuvem):
              </span>
              <div
                role="group"
                aria-label="Selecionar idioma da tradução automática"
                className="flex flex-wrap items-center gap-1.5"
              >
                {TARGET_LANGUAGE_OPTIONS.map((opt) => {
                  const selected = translation.targetLang === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectLanguage(opt.id)}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface text-foreground hover:bg-background'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={translation.translateImagesOcr}
                onClick={() =>
                  onUpdateTranslation({ translateImagesOcr: !translation.translateImagesOcr })
                }
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border px-3 text-xs font-medium whitespace-nowrap ${
                  translation.translateImagesOcr
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'border-border bg-surface text-foreground hover:bg-background'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {translation.translateImagesOcr
                    ? 'Tradução de imagens OCR: Ativa'
                    : 'Traduzir imagens (OCR)'}
                </span>
              </button>

              {translation.autoTranslate && translation.targetLang !== 'original' ? (
                <button
                  type="button"
                  aria-pressed={translation.showOriginalComparison}
                  onClick={() =>
                    onUpdateTranslation({
                      showOriginalComparison: !translation.showOriginalComparison,
                    })
                  }
                  className={`inline-flex min-h-9 items-center rounded-control border px-2.5 text-xs font-medium whitespace-nowrap ${
                    translation.showOriginalComparison
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'border-border bg-surface text-foreground'
                  }`}
                >
                  <span>Exibir original lado a lado</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Image OCR Regions Inspector when OCR is toggled */}
          {translation.translateImagesOcr ? (
            <div className="border-t border-border/60 pt-2.5 space-y-2">
              <div className="text-xs font-semibold text-primary">
                Inspeção OCR de Imagens e Diagramas ({ocrRegions.length} blocos visuais traduzidos):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ocrRegions.map((reg) => (
                  <div
                    key={reg.id}
                    className="py-1.5 border-l-2 border-primary pl-3 text-xs space-y-0.5"
                  >
                    <div className="font-mono text-muted">
                      {reg.figureTitle} · {reg.coordinates} · Confiança {reg.confidencePct}%
                    </div>
                    <div className="text-muted">Original: "{reg.originalLabel}"</div>
                    <div className="font-semibold text-foreground">
                      Tradução OCR: "{reg.translatedLabel}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Panel 2: Video Stream Sniffer & Fast Multi-Connection Downloader Bar */}
      {activeToolPanel === 'download' ? (
        <div className="border-b border-border bg-background px-4 py-3 space-y-3">
          {detectedVideos.map((vid) => (
            <div
              key={vid.id}
              className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-border/60"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Film className="w-4 h-4 shrink-0" />
                  <span>
                    Baixar vídeo detectado na página ({vid.durationLabel} · {vid.codecLabel})
                  </span>
                </div>
                <div className="text-xs font-medium text-foreground">
                  {vid.title}{' '}
                  <span className="font-mono text-muted">· {vid.sourceUrl}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { fmt: 'Vídeo 1080p MP4', label: 'Baixar 1080p MP4 (12,5 MB)' },
                    { fmt: 'Vídeo 720p WebM', label: 'Baixar 720p WebM (6,2 MB)' },
                    { fmt: 'Vídeo 480p Leve', label: 'Baixar 480p Leve (2,9 MB)' },
                    { fmt: 'Áudio Extraído', label: 'Só Áudio M4A (980 KB)' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.fmt}
                    type="button"
                    disabled={isDownloadingFormat === item.fmt}
                    onClick={() => void handleFastDownload(item.fmt)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-medium text-primary-foreground whitespace-nowrap hover:brightness-95"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isDownloadingFormat === item.fmt ? 'Baixando...' : item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                Download rápido de documentos (4 conexões paralelas HTTP Range · SHA-256)
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                ['HTML Offline', 'Markdown', 'JSON Auditoria', 'Pacote Kotlin'] as const
              ).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={isDownloadingFormat === fmt}
                  onClick={() => void handleFastDownload(fmt)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:bg-background"
                >
                  <Download className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span>{isDownloadingFormat === fmt ? 'Baixando...' : fmt}</span>
                </button>
              ))}
            </div>
          </div>

          {downloads.length > 0 ? (
            <div className="border-t border-border/60 pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-foreground">
                  Arquivos e vídeos baixados ({downloads.length}) — 4/4 segmentos verificados
                </span>
                <button
                  type="button"
                  onClick={onClearFastDownloads}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-danger whitespace-nowrap"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar fila</span>
                </button>
              </div>
              <div className="divide-y divide-border/60">
                {downloads.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-mono font-semibold text-foreground">
                        {item.filename}
                      </span>
                      <span className="text-muted">
                        · {formatBytes(item.sizeBytes)} · {item.parallelChunks}x conexões ·{' '}
                        {item.durationMs} ms · SHA-256 {item.sha256Prefix}…
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerBrowserFileDownload(
                          item.filename,
                          item.contentBlobText,
                          item.mimeType
                        )
                      }
                      className="inline-flex min-h-7 items-center px-2 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                    >
                      Salvar no disco
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Panels 3, 4, 5, 6: VPN Ilimitada, TV Cast, Scrolling Screenshot, QR Code */}
      {activeToolPanel === 'vpn' ||
      activeToolPanel === 'tv-cast' ||
      activeToolPanel === 'scroll-screenshot' ||
      activeToolPanel === 'qr-code' ? (
        <MediaAndDocumentToolsPanel
          activeTab={activeTab}
          activeToolPanel={activeToolPanel}
          vpn={vpn}
          batchSaveNotification={batchSaveNotification}
          onClosePanel={onCloseToolPanel}
          onAddFastDownload={onAddFastDownload}
          onTriggerBatchSaveImages={onTriggerBatchSaveImages}
          onUpdateVpn={onUpdateVpn}
          onRotateVpnIp={onRotateVpnIp}
        />
      ) : null}
    </>
  );

  // Full-stage modes: Visualizar somente imagens & Visualizador de PDF
  if (activeToolPanel === 'images-only' || activeToolPanel === 'pdf-viewer') {
    return (
      <section className="flex-1 flex flex-col min-h-0 bg-surface">
        <MediaAndDocumentToolsPanel
          activeTab={activeTab}
          activeToolPanel={activeToolPanel}
          vpn={vpn}
          batchSaveNotification={batchSaveNotification}
          onClosePanel={onCloseToolPanel}
          onAddFastDownload={onAddFastDownload}
          onTriggerBatchSaveImages={onTriggerBatchSaveImages}
          onUpdateVpn={onUpdateVpn}
          onRotateVpnIp={onRotateVpnIp}
        />
      </section>
    );
  }

  if (activeTab.url === 'veloce://inicio') {
    return (
      <section className="flex-1 flex flex-col justify-between bg-surface">
        {toolPanelsBanner}
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          <div className="space-y-3">
            <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight text-foreground">
              {activeTab.isIncognito
                ? 'Sessão anônima isolada em memória'
                : 'Navegação rápida sem rastreamento'}
            </h1>
            <p className="text-base text-muted max-w-[62ch]">
              {activeTab.isIncognito
                ? 'Endereços visitados, cookies temporários e dados de formulário não são gravados no histórico nem persistidos no dispositivo.'
                : 'Motor leve com bloqueio nativo de anúncios, modo leitor editorial, ampliação de texto com reflow, tradução neural local e baixador de vídeos.'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quickQuery.trim()) {
                onNavigate(quickQuery.trim(), false);
              }
            }}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 border border-border rounded-control bg-background px-3.5 py-1.5 focus-within:outline-2 focus-within:outline-primary"
          >
            <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              aria-label="Pesquisar na web com proteção de dados"
              placeholder="Pesquisar ou abrir URL"
              className="flex-1 min-w-0 min-h-10 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground whitespace-nowrap hover:brightness-95"
            >
              Pesquisar
            </button>
          </form>

          {/* Session Telemetry Hairline Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-border divide-y sm:divide-y-0 sm:divide-x divide-border/60 py-4">
            <div className="py-2 sm:py-0 sm:pr-6">
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {formatInt(stats.totalTrackersBlocked)}
              </div>
              <div className="text-xs text-muted mt-0.5">
                Rastreadores e anúncios bloqueados na sessão
              </div>
            </div>
            <div className="py-2 sm:py-0 sm:px-6">
              <div className="text-2xl font-semibold tabular-nums text-primary">
                {formatBytes(totalSavedAllTime)} ({totalSavedRatio})
              </div>
              <div className="text-xs text-muted mt-0.5">
                Franquia economizada (AdBlock + Economia de dados)
              </div>
            </div>
            <div className="py-2 sm:py-0 sm:pl-6">
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {activeTab.isIncognito ? 'Zero rastro' : `${bookmarks.length} favoritos`}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {activeTab.isIncognito
                  ? 'Armazenamento local desativado nesta aba'
                  : 'Cifra ponta a ponta AES-256-GCM pronta'}
              </div>
            </div>
          </div>

          {/* Direct Verified Pages List */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              Acesso rápido verificado
            </h2>
            <div className="divide-y divide-border/60 border-t border-b border-border">
              {BUILTIN_CORPUS.map((site) => (
                <div
                  key={site.url}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onNavigate(site.url, false)}
                      className="text-left text-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {site.title}
                    </button>
                    <div className="text-xs text-muted mt-0.5">
                      {site.url} · {site.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(site.url, true)}
                    className="inline-flex min-h-9 items-center px-2.5 text-xs font-medium text-muted hover:text-foreground whitespace-nowrap rounded-control border border-border"
                  >
                    Abrir em aba
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const pageSaved =
    activeTab.shieldReport.adBlockSavedBytes + activeTab.shieldReport.dataSaverSavedBytes;
  const pageSavedPct = formatPercent(pageSaved, activeTab.shieldReport.originalBytes);
  const currentReaderTheme = READER_THEME_STYLES[readerMode.theme];
  const computedReaderFontSizePx = Math.round(
    (readerMode.fontSizePx * readerMode.textZoomPct) / 100
  );

  return (
    <section className="flex-1 flex flex-col min-h-0 bg-surface">
      {activeTab.statusNote ? (
        <div
          role="status"
          className="px-4 py-2 text-xs text-foreground border-b border-border bg-background flex flex-wrap items-center justify-between gap-2"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-primary">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{activeTab.statusNote}</span>
          </span>
        </div>
      ) : null}

      {toolPanelsBanner}

      {/* Modo leitor Toolbar & Editorial View when Modo leitor is Active */}
      {readerMode.enabled ? (
        <div
          className="flex-1 flex flex-col"
          style={{
            backgroundColor: currentReaderTheme.bg,
            color: currentReaderTheme.text,
          }}
        >
          <div className="border-b border-border bg-background px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-foreground">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                Modo leitor
              </span>
              <span>·</span>
              <span>{distilled.wordCount} palavras</span>
              <span>·</span>
              <span>~{distilled.readingTimeMinutes} min</span>
              <span>·</span>
              <span className="text-foreground font-medium">
                Corpo efetivo: {computedReaderFontSizePx}px ({readerMode.textZoomPct}%)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Find in page input */}
              <div className="flex items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 min-h-9">
                <Search className="w-3.5 h-3.5 text-muted shrink-0" />
                <input
                  type="search"
                  value={findInPageQuery}
                  onChange={(e) => setFindInPageQuery(e.target.value)}
                  aria-label="Localizar texto no artigo"
                  placeholder="Localizar no texto"
                  className="w-32 bg-transparent text-xs text-foreground placeholder:text-muted focus:outline-none"
                />
                {findInPageQuery.trim() ? (
                  <span className="text-xs font-mono text-primary tabular-nums">
                    {matchCount}x
                  </span>
                ) : null}
              </div>

              {/* Reader Theme selector */}
              <div role="group" aria-label="Tema do Modo leitor" className="flex items-center gap-1">
                {(
                  [
                    { id: 'light', label: 'Claro' },
                    { id: 'sepia', label: 'Sépia' },
                    { id: 'dark', label: 'Escuro OLED' },
                  ] as const
                ).map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => onUpdateReaderMode({ theme: th.id })}
                    className={`inline-flex min-h-9 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                      readerMode.theme === th.id
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>

              {/* Font Family selector */}
              <div role="group" aria-label="Fonte do Modo leitor" className="flex items-center gap-1">
                {(
                  [
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serifada' },
                    { id: 'mono', label: 'Mono' },
                  ] as const
                ).map((ff) => (
                  <button
                    key={ff.id}
                    type="button"
                    onClick={() => onUpdateReaderMode({ fontFamily: ff.id })}
                    className={`inline-flex min-h-9 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                      readerMode.fontFamily === ff.id
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground'
                    }`}
                  >
                    {ff.label}
                  </button>
                ))}
              </div>

              {/* Font size stepper */}
              <div role="group" aria-label="Tamanho da fonte de leitura" className="flex items-center gap-1">
                {([15, 17, 19, 22] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdateReaderMode({ fontSizePx: sz })}
                    className={`inline-flex min-h-9 items-center rounded-control px-2 text-xs font-medium whitespace-nowrap ${
                      readerMode.fontSizePx === sz
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-pressed={readerMode.boldTextBoost}
                onClick={() =>
                  onUpdateReaderMode({ boldTextBoost: !readerMode.boldTextBoost })
                }
                className={`inline-flex min-h-9 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                  readerMode.boldTextBoost
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-surface text-foreground'
                }`}
              >
                Nitidez+
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:bg-background"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Salvar .md</span>
              </button>
            </div>
          </div>

          <article
            className="max-w-[68ch] w-full mx-auto px-4 sm:px-8 py-8 space-y-5"
            style={{
              fontSize: `${computedReaderFontSizePx}px`,
              lineHeight: readerMode.lineHeight,
              fontFamily: READER_FONT_STACKS[readerMode.fontFamily],
              fontWeight: readerMode.boldTextBoost ? 500 : 400,
              color: currentReaderTheme.text,
            }}
          >
            <header
              className="pb-4 space-y-2"
              style={{ borderBottom: `1px solid ${currentReaderTheme.border}` }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                {translateTextSegment(distilled.title, translation.targetLang)}
              </h1>
              <div className="text-xs" style={{ color: currentReaderTheme.muted }}>
                {translateTextSegment(distilled.metaLine, translation.targetLang)}
              </div>
            </header>

            {readerMode.showKeyTakeaways && distilled.keyTakeaways.length > 0 ? (
              <section
                aria-label="Pontos-chave do artigo"
                className="p-4 rounded-card space-y-2 text-sm"
                style={{
                  backgroundColor: currentReaderTheme.codeBg,
                  border: `1px solid ${currentReaderTheme.border}`,
                }}
              >
                <div className="text-xs font-semibold text-primary">
                  Resumo do Modo leitor ({distilled.keyTakeaways.length} pontos-chave):
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {distilled.keyTakeaways.map((pt, i) => (
                    <li key={i}>
                      {translateTextSegment(pt, translation.targetLang)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {distilled.blocks.map((block, idx) => {
              const renderedText = translateTextSegment(block.text, translation.targetLang);
              const matchesSearch =
                findInPageQuery.trim().length > 0 &&
                renderedText.toLowerCase().includes(findInPageQuery.trim().toLowerCase());

              if (block.type === 'heading') {
                return (
                  <h2
                    key={idx}
                    className={`text-lg font-semibold pt-3 ${
                      matchesSearch ? 'underline decoration-primary decoration-2' : ''
                    }`}
                  >
                    {renderedText}
                  </h2>
                );
              }
              if (block.type === 'code') {
                return (
                  <pre
                    key={idx}
                    className="p-4 rounded-card font-mono text-xs overflow-x-auto"
                    style={{
                      backgroundColor: currentReaderTheme.codeBg,
                      border: `1px solid ${currentReaderTheme.border}`,
                    }}
                  >
                    <code>{block.text}</code>
                  </pre>
                );
              }
              if (block.type === 'table-row') {
                return (
                  <div
                    key={idx}
                    className={`py-2 text-sm font-mono tabular-nums ${
                      matchesSearch ? 'text-primary font-semibold' : ''
                    }`}
                    style={{ borderBottom: `1px solid ${currentReaderTheme.border}` }}
                  >
                    {renderedText}
                  </div>
                );
              }
              return (
                <p
                  key={idx}
                  className={matchesSearch ? 'text-primary font-semibold' : ''}
                >
                  {renderedText}
                </p>
              );
            })}
          </article>
        </div>
      ) : (
        <div className="flex-1 w-full bg-white min-h-[520px] flex flex-col">
          <iframe
            key={`${activeTab.id}-${activeTab.url}-${adBlockEnabled}-${dataSaverEnabled}-${activeTab.shieldReport.isDomainWhitelisted}-${translation.targetLang}-${translation.translateImagesOcr}-${translation.showOriginalComparison}-${readerMode.textZoomPct}-${readerMode.boldTextBoost}`}
            title={activeTab.title}
            srcDoc={renderedWebViewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="w-full flex-1 min-h-[520px] border-0"
          />
        </div>
      )}

      {/* Minimalist Security, BFCache & Bandwidth Footer Strip */}
      <footer className="border-t border-border bg-background px-4 py-2 text-xs text-muted flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {activeTab.isIncognito ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Modo anônimo: sem gravação no histórico
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Lock className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              {activeTab.securityInfo.tlsLabel}
            </span>
          )}
          <span>·</span>
          <span>
            {activeTab.restoredFromBfCache
              ? 'BFCache 0 ms (Voltar sem atualizar · DOM preservado)'
              : `Latência: ${activeTab.loadTimeMs} ms`}
          </span>
          {bfCacheEnabled ? (
            <>
              <span>·</span>
              <span className="text-primary font-medium">
                BFCache ativo ({stats.bfCacheHits}x sem recarregar)
              </span>
            </>
          ) : null}
          {vpn.enabled ? (
            <>
              <span>·</span>
              <span className="text-primary font-medium">
                VPN Ilimitada ({resolveVpnTunnelStatus(vpn, 0).server.city} · IP{' '}
                {resolveVpnTunnelStatus(vpn, 0).maskedExitIp})
              </span>
            </>
          ) : null}
          {activeTab.shieldReport.strippedTrackingParams.length > 0 ? (
            <>
              <span>·</span>
              <span className="text-primary font-medium">
                {activeTab.shieldReport.strippedTrackingParams.length} parâmetros UTM removidos
              </span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span>
            Original: {formatBytes(activeTab.shieldReport.originalBytes)} · Transferido:{' '}
            <strong className="text-foreground font-medium">
              {formatBytes(activeTab.shieldReport.finalBytes)}
            </strong>{' '}
            (−{pageSavedPct})
          </span>
          <button
            type="button"
            onClick={onOpenShield}
            className="inline-flex min-h-8 items-center gap-1 font-medium text-primary hover:underline whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>
              Ver {activeTab.shieldReport.blockedItems.length} interceptações
            </span>
          </button>
          {dataSaverEnabled ? (
            <span className="inline-flex items-center gap-1 text-foreground font-medium">
              <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
              Economia ativa
            </span>
          ) : null}
        </div>
      </footer>
    </section>
  );
};

