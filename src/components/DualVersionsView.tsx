import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Code2,
  Copy,
  EyeOff,
  History,
  Lock,
  Maximize2,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import { KOTLIN_SOURCE_FILES } from '../data/kotlinSourceFiles';
import { BUILTIN_CORPUS } from '../data/webCorpus';
import { processWebDocument } from '../engine/dataSaverEngine';
import type {
  AdBlockConfig,
  BookmarkItem,
  CumulativeStats,
  DataSaverConfig,
  HistoryEntry,
  TabItem,
} from '../types/browser';
import { formatBytes, formatInt, formatPercent } from '../utils/formatters';
import { Button } from './ui';

interface DualVersionsViewProps {
  tabs: TabItem[];
  activeTab: TabItem;
  adBlock: AdBlockConfig;
  dataSaver: DataSaverConfig;
  stats: CumulativeStats;
  bookmarks: BookmarkItem[];
  history: HistoryEntry[];
  onSelectTab: (tabId: string) => void;
  onOpenTab: (isIncognito: boolean) => void;
  onNavigate: (url: string, openInNewTab?: boolean) => void;
  onUpdateAdBlock: (patch: Partial<AdBlockConfig>) => void;
  onUpdateDataSaver: (patch: Partial<DataSaverConfig>) => void;
  onOpenFullKotlin: () => void;
  onReturnToSingle: () => void;
}

type MiniPreviewTab = 'pagina' | 'escudo' | 'kotlin';

export const DualVersionsView: React.FC<DualVersionsViewProps> = ({
  activeTab,
  adBlock,
  dataSaver,
  stats,
  bookmarks,
  history,
  onOpenTab,
  onNavigate,
  onUpdateAdBlock,
  onUpdateDataSaver,
  onOpenFullKotlin,
  onReturnToSingle,
}) => {
  // Independent state for Preview A (Versão 1 — Clara / Web & Desktop)
  const [previewAUrl, setPreviewAUrl] = useState<string>(
    activeTab.url === 'veloce://inicio' ? BUILTIN_CORPUS[0].url : activeTab.url
  );
  const [previewAPane, setPreviewAPane] = useState<MiniPreviewTab>('pagina');

  // Independent state for Preview B (Versão 2 — Escura Anônima / Mobile Kotlin)
  const [previewBUrl, setPreviewBUrl] = useState<string>(BUILTIN_CORPUS[1].url);
  const [previewBPane, setPreviewBPane] = useState<MiniPreviewTab>('pagina');
  const [selectedKotlinId, setSelectedKotlinId] = useState<string>('adblock');
  const [copiedKotlin, setCopiedKotlin] = useState<boolean>(false);

  const siteA =
    BUILTIN_CORPUS.find((s) => s.url === previewAUrl) || BUILTIN_CORPUS[0];
  const processedA = processWebDocument(siteA.rawHtml, siteA.url, adBlock, dataSaver);
  const savedBytesA =
    processedA.shieldReport.adBlockSavedBytes + processedA.shieldReport.dataSaverSavedBytes;
  const savedPctA = formatPercent(savedBytesA, processedA.shieldReport.originalBytes);

  const siteB =
    BUILTIN_CORPUS.find((s) => s.url === previewBUrl) || BUILTIN_CORPUS[1];
  const processedB = processWebDocument(siteB.rawHtml, siteB.url, adBlock, dataSaver);
  const savedBytesB =
    processedB.shieldReport.adBlockSavedBytes + processedB.shieldReport.dataSaverSavedBytes;
  const savedPctB = formatPercent(savedBytesB, processedB.shieldReport.originalBytes);

  const activeKotlinFile =
    KOTLIN_SOURCE_FILES.find((f) => f.id === selectedKotlinId) || KOTLIN_SOURCE_FILES[0];

  const handleCopyKotlin = async () => {
    try {
      await navigator.clipboard.writeText(activeKotlinFile.code);
      setCopiedKotlin(true);
      setTimeout(() => setCopiedKotlin(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <section className="flex-1 bg-surface">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Visualização dupla — Os 2 Previews interativos lado a lado
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Compare e teste as duas versões ao mesmo tempo, ou clique em “Expandir este preview” na versão preferida
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="quiet"
              size="sm"
              onClick={() => {
                onNavigate(previewAUrl, false);
                onReturnToSingle();
              }}
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Abrir Preview 1 em tela cheia</span>
            </Button>
            <Button
              tone="primary"
              size="sm"
              onClick={() => {
                onOpenTab(true);
              }}
            >
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
              <span>Abrir Preview 2 (Anônimo) em tela cheia</span>
            </Button>
          </div>
        </div>

        {/* Side-by-Side 2 Live Previews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 lg:divide-x divide-border">
          {/* ===================================================================
              PREVIEW 1 (LEFT): Versão 1 — Tema Mineral Claro (Navegação Padrão)
             =================================================================== */}
          <div className="lg:col-span-6 lg:pr-5 space-y-3 min-w-0 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-base font-semibold text-foreground">
                  Preview 1 · Versão Clara (Padrão + Sincronização)
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewAPane('pagina')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewAPane === 'pagina'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Página web
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAPane('escudo')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewAPane === 'escudo'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Escudo ({processedA.shieldReport.blockedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAPane('kotlin')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewAPane === 'kotlin'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                   Favoritos &amp; Histórico
                </button>
              </div>
            </div>

            {/* Address & Tab Strip for Preview 1 */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {BUILTIN_CORPUS.map((site) => (
                  <button
                    key={site.url}
                    type="button"
                    onClick={() => {
                      setPreviewAUrl(site.url);
                      setPreviewAPane('pagina');
                    }}
                    className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                      previewAUrl === site.url
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    {site.shortTitle}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-primary tabular-nums">
                −{savedPctA} ({formatBytes(savedBytesA)} poupados)
              </span>
            </div>

            {/* Preview 1 Stage */}
            {previewAPane === 'pagina' ? (
              <div className="border border-border rounded-card overflow-hidden bg-white flex-1 min-h-[480px] flex flex-col">
                <div className="px-3 py-2 bg-background border-b border-border flex items-center justify-between gap-2 text-xs font-mono text-foreground">
                  <span className="truncate">{siteA.url}</span>
                  <span className="text-primary shrink-0">HTTPS · TLS 1.3</span>
                </div>
                <iframe
                  title={`Preview 1 — ${siteA.title}`}
                  srcDoc={processedA.sanitizedHtml}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full flex-1 min-h-[435px] border-0"
                />
              </div>
            ) : previewAPane === 'escudo' ? (
              <div className="border border-border rounded-card p-4 bg-background flex-1 min-h-[480px] space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Interceptações ativas no Preview 1
                    </h3>
                    <p className="text-xs text-muted">
                      Original: {formatBytes(processedA.shieldReport.originalBytes)} → Transferido: {formatBytes(processedA.shieldReport.finalBytes)}
                    </p>
                  </div>
                  <Button
                    tone="quiet"
                    size="sm"
                    onClick={() => onUpdateAdBlock({ enabled: !adBlock.enabled })}
                  >
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>{adBlock.enabled ? 'AdBlock Ativo' : 'AdBlock Pausado'}</span>
                  </Button>
                </div>
                <div className="divide-y divide-border/60 text-xs">
                  {processedA.shieldReport.blockedItems.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-foreground">{item.domain}</span>
                      <span className="text-muted">{item.category}</span>
                      <span className="font-mono text-primary tabular-nums">
                        −{formatBytes(item.bytesAvoided)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-card p-4 bg-background flex-1 min-h-[480px] space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-primary" />
                    <span>Favoritos sincronizados via AES-256-GCM ({bookmarks.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-border/60 text-xs">
                  {bookmarks.map((bm) => (
                    <div key={bm.id} className="py-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewAUrl(bm.url);
                          setPreviewAPane('pagina');
                        }}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {bm.title}
                      </button>
                      <span className="text-muted shrink-0">{bm.deviceOrigin}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <History className="w-4 h-4 text-primary" />
                    <span>Últimas visitas no histórico local ({history.length})</span>
                  </h3>
                  <div className="divide-y divide-border/60 text-xs">
                    {history.slice(0, 3).map((h) => (
                      <div key={h.id} className="py-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">{h.title}</span>
                        <span className="text-primary tabular-nums shrink-0">
                          −{formatBytes(h.bytesSaved)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================================================================
              PREVIEW 2 (RIGHT): Versão 2 — Anônima Blindada & Motor Android Kotlin
             =================================================================== */}
          <div className="lg:col-span-6 lg:pl-5 space-y-3 min-w-0 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-base font-semibold text-foreground">
                  Preview 2 · Versão Anônima &amp; App Android Kotlin
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewBPane('pagina')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewBPane === 'pagina'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Página blindada
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBPane('kotlin')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewBPane === 'kotlin'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Código Kotlin (.kt)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBPane('escudo')}
                  className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                    previewBPane === 'escudo'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Economia (−{savedPctB})
                </button>
              </div>
            </div>

            {/* Address & Tab Strip for Preview 2 */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {BUILTIN_CORPUS.map((site) => (
                  <button
                    key={site.url}
                    type="button"
                    onClick={() => {
                      setPreviewBUrl(site.url);
                      setPreviewBPane('pagina');
                    }}
                    className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium whitespace-nowrap ${
                      previewBUrl === site.url
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    {site.shortTitle}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-primary tabular-nums">
                Zero rastro · FLAG_SECURE
              </span>
            </div>

            {/* Preview 2 Stage */}
            {previewBPane === 'pagina' ? (
              <div className="border border-border rounded-card overflow-hidden bg-white flex-1 min-h-[480px] flex flex-col">
                <div className="px-3 py-2 bg-background border-b border-border flex items-center justify-between gap-2 text-xs font-mono text-foreground">
                  <span className="truncate">{siteB.url}</span>
                  <span className="text-primary shrink-0">
                    Anônimo · {processedB.shieldReport.blockedItems.length} bloqueios
                  </span>
                </div>
                <iframe
                  title={`Preview 2 — ${siteB.title}`}
                  srcDoc={processedB.sanitizedHtml}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full flex-1 min-h-[435px] border-0"
                />
              </div>
            ) : previewBPane === 'kotlin' ? (
              <div className="border border-border rounded-card overflow-hidden bg-background flex-1 min-h-[480px] flex flex-col">
                <div className="px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {KOTLIN_SOURCE_FILES.map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedKotlinId(mod.id)}
                        className={`inline-flex min-h-8 items-center rounded-control px-2 text-xs font-mono whitespace-nowrap ${
                          selectedKotlinId === mod.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {mod.filename}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyKotlin}
                      className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
                    >
                      {copiedKotlin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKotlin ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenFullKotlin}
                      className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-foreground hover:underline whitespace-nowrap"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Tela cheia</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3.5 text-xs font-mono leading-relaxed text-foreground overflow-x-auto flex-1 max-h-[420px]">
                  <code>{activeKotlinFile.code}</code>
                </pre>
              </div>
            ) : (
              <div className="border border-border rounded-card p-4 bg-background flex-1 min-h-[480px] space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Economia de Dados e Isolamento Anônimo (Preview 2)
                    </h3>
                    <p className="text-xs text-muted">
                      {formatInt(stats.totalTrackersBlocked)} rastreadores bloqueados · Zero gravação em SQLite/Room
                    </p>
                  </div>
                  <Button
                    tone="quiet"
                    size="sm"
                    onClick={() => onUpdateDataSaver({ enabled: !dataSaver.enabled })}
                  >
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>{dataSaver.enabled ? 'Economia Ativa' : 'Economia Pausada'}</span>
                  </Button>
                </div>
                <div className="divide-y divide-border/60 text-xs">
                  {processedB.shieldReport.blockedItems.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-foreground">{item.domain}</span>
                      <span className="text-muted">{item.category}</span>
                      <span className="font-mono text-primary tabular-nums">
                        −{formatBytes(item.bytesAvoided)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
