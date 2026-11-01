import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Code2,
  Columns2,
  Download,
  EyeOff,
  FileText,
  Film,
  FolderDown,
  Globe,
  History,
  Image as ImageIcon,
  Images,
  Languages,
  Lock,
  Menu,
  Plus,
  QrCode,
  RotateCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  TriangleAlert,
  Tv,
  Type,
  X,
  Zap,
} from 'lucide-react';
import {
  getVpnServerNodes,
  resolveVpnTunnelStatus,
} from '../engine/mediaAndDocumentEngine';
import { TARGET_LANGUAGE_OPTIONS } from '../engine/translationAndDownloadEngine';
import type {
  BrowserViewMode,
  ReaderModeConfig,
  ReaderTheme,
  TabItem,
  TargetLanguage,
  TranslationConfig,
  VpnConfig,
} from '../types/browser';
import { formatPercent } from '../utils/formatters';

export type ActiveBrowserToolPanel =
  | 'none'
  | 'translate'
  | 'download'
  | 'tv-cast'
  | 'scroll-screenshot'
  | 'images-only'
  | 'qr-code'
  | 'pdf-viewer'
  | 'vpn';

interface BrowserChromeProps {
  tabs: TabItem[];
  activeTab: TabItem;
  viewMode: BrowserViewMode;
  isBookmarked: boolean;
  adBlockEnabled: boolean;
  dataSaverEnabled: boolean;
  readerMode: ReaderModeConfig;
  bfCacheEnabled: boolean;
  bfCacheHits: number;
  hasBfCacheForPrev: boolean;
  translation: TranslationConfig;
  vpn: VpnConfig;
  downloadsCount: number;
  activeToolPanel: ActiveBrowserToolPanel;
  isNavigating: boolean;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenTab: (isIncognito: boolean) => void;
  onShredIncognito: () => void;
  onSetViewMode: (mode: BrowserViewMode) => void;
  onNavigateSubmit: (rawInput: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onToggleBfCache: () => void;
  onToggleBookmark: () => void;
  onToggleReaderMode: () => void;
  onUpdateReaderMode: (patch: Partial<ReaderModeConfig>) => void;
  onStepTextZoom: (delta: number) => void;
  onUpdateTranslation: (patch: Partial<TranslationConfig>) => void;
  onUpdateVpn: (patch: Partial<VpnConfig>) => void;
  onRotateVpnIp: () => void;
  onToggleAdBlock: () => void;
  onToggleDataSaver: () => void;
  onToggleToolPanel: (panel: Exclude<ActiveBrowserToolPanel, 'none'>) => void;
  onTriggerSaveAllImages: () => void;
}

export const BrowserChrome: React.FC<BrowserChromeProps> = ({
  tabs,
  activeTab,
  viewMode,
  isBookmarked,
  adBlockEnabled,
  dataSaverEnabled,
  readerMode,
  bfCacheEnabled,
  bfCacheHits,
  hasBfCacheForPrev,
  translation,
  vpn,
  downloadsCount,
  activeToolPanel,
  isNavigating,
  onSelectTab,
  onCloseTab,
  onOpenTab,
  onShredIncognito,
  onSetViewMode,
  onNavigateSubmit,
  onGoBack,
  onGoForward,
  onReload,
  onToggleBfCache,
  onToggleBookmark,
  onToggleReaderMode,
  onUpdateReaderMode,
  onStepTextZoom,
  onUpdateTranslation,
  onUpdateVpn,
  onRotateVpnIp,
  onToggleAdBlock,
  onToggleDataSaver,
  onToggleToolPanel,
  onTriggerSaveAllImages,
}) => {
  const [addressValue, setAddressValue] = useState(
    activeTab.url === 'veloce://inicio' ? '' : activeTab.url
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAddressValue(activeTab.url === 'veloce://inicio' ? '' : activeTab.url);
  }, [activeTab.id, activeTab.url]);

  // Close menu on Escape key or click outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isMenuOpen]);

  const hasIncognitoTabs = tabs.some((t) => t.isIncognito);
  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.historyStack.length - 1;

  const pageSavedBytes =
    activeTab.shieldReport.adBlockSavedBytes + activeTab.shieldReport.dataSaverSavedBytes;
  const pageSavedRatio = formatPercent(pageSavedBytes, activeTab.shieldReport.originalBytes);

  const isTranslateActive =
    activeToolPanel === 'translate' ||
    (translation.autoTranslate && translation.targetLang !== 'original') ||
    translation.translateImagesOcr;

  const isDownloadActive = activeToolPanel === 'download';
  const vpnStatus = resolveVpnTunnelStatus(vpn, activeTab.shieldReport.finalBytes);
  const vpnNodes = getVpnServerNodes();

  const activeFeaturesCount = [
    adBlockEnabled,
    dataSaverEnabled,
    bfCacheEnabled,
    vpn.enabled,
    readerMode.enabled,
    readerMode.textZoomPct !== 100,
    translation.autoTranslate && translation.targetLang !== 'original',
    translation.translateImagesOcr,
    activeToolPanel !== 'none',
  ].filter(Boolean).length;

  const navItems: { mode: BrowserViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'duas-versoes', label: '2 Versões', icon: <Columns2 className="w-4 h-4 shrink-0" /> },
    { mode: 'navegar', label: 'Navegar', icon: <Lock className="w-4 h-4 shrink-0" /> },
    { mode: 'escudo', label: 'Escudo', icon: <Shield className="w-4 h-4 shrink-0" /> },
    { mode: 'favoritos', label: 'Favoritos', icon: <Bookmark className="w-4 h-4 shrink-0" /> },
    { mode: 'historico', label: 'Histórico', icon: <History className="w-4 h-4 shrink-0" /> },
    { mode: 'kotlin', label: 'Kotlin', icon: <Code2 className="w-4 h-4 shrink-0" /> },
  ];

  const handleSelectLanguageFromMenu = (lang: TargetLanguage) => {
    onSetViewMode('navegar');
    onUpdateTranslation({
      targetLang: lang,
      autoTranslate: lang !== 'original',
    });
  };

  const handleThemeChangeFromMenu = (theme: ReaderTheme) => {
    onSetViewMode('navegar');
    onUpdateReaderMode({ theme, enabled: true });
  };

  const openPanelFromMenu = (panel: Exclude<ActiveBrowserToolPanel, 'none'>) => {
    onSetViewMode('navegar');
    if (activeToolPanel !== panel) {
      onToggleToolPanel(panel);
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="border-b border-border bg-background relative z-30" ref={menuContainerRef}>
      {/* Row 1: Brand, Tabs, New Tab / Incognito Controls, and View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 pr-2 text-sm font-semibold tracking-tight text-foreground whitespace-nowrap shrink-0">
            Veloce
            {activeTab.isIncognito ? (
              <span className="text-xs font-medium text-primary">· Anônimo</span>
            ) : null}
          </span>

          <div
            role="tablist"
            aria-label="Abas abertas"
            className="flex flex-wrap items-center gap-1 min-w-0"
          >
            {tabs.map((tab) => {
              const isSelected = tab.id === activeTab.id && viewMode === 'navegar';
              return (
                <div
                  key={tab.id}
                  className={`inline-flex items-center rounded-control border transition-colors ${
                    isSelected
                      ? 'bg-surface border-border text-foreground'
                      : 'bg-transparent border-transparent text-muted hover:text-foreground hover:bg-surface/60'
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onSelectTab(tab.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 pl-2.5 pr-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary rounded-control"
                  >
                    {tab.isIncognito ? (
                      <EyeOff className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    ) : null}
                    <span>{tab.shortTitle}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Fechar aba ${tab.shortTitle}`}
                    onClick={() => onCloseTab(tab.id)}
                    className="inline-flex min-h-9 min-w-8 items-center justify-center px-1.5 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary rounded-control"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onOpenTab(false)}
            aria-label="Nova aba padrão"
            className="inline-flex min-h-9 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Nova aba</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenTab(true)}
            aria-label="Nova aba anônima"
            className="inline-flex min-h-9 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <EyeOff className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>Anônima</span>
          </button>

          {hasIncognitoTabs ? (
            <button
              type="button"
              onClick={onShredIncognito}
              aria-label="Destruir todas as abas anônimas"
              className="inline-flex min-h-9 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-danger whitespace-nowrap hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Encerrar anônimas</span>
            </button>
          ) : null}
        </div>

        {/* Workspace Section Switcher (Desktop inline; always in Menu on all screens) */}
        <nav aria-label="Módulos do navegador" className="hidden lg:flex flex-wrap items-center gap-1">
          {navItems.map((item) => {
            const active = viewMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSetViewMode(item.mode)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Row 2: Navigation Controls, Omnibox, Shield Status & Unified Options Menu Button */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-surface">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSetViewMode('navegar');
              onGoBack();
            }}
            disabled={!canGoBack}
            title={
              bfCacheEnabled && hasBfCacheForPrev
                ? 'Voltar sem atualizar (BFCache instantâneo 0 ms na RAM)'
                : 'Voltar página'
            }
            aria-label="Voltar sem atualizar"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:bg-surface disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="hidden sm:inline">
              {bfCacheEnabled ? 'Voltar s/ atualizar' : 'Voltar'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSetViewMode('navegar');
              onGoForward();
            }}
            disabled={!canGoForward}
            aria-label="Avançar página"
            className="inline-flex min-h-10 min-w-9 items-center justify-center rounded-control border border-border bg-background text-foreground hover:bg-surface disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onReload}
            aria-label="Recarregar página"
            className="inline-flex min-h-10 min-w-9 items-center justify-center rounded-control border border-border bg-background text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isNavigating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSetViewMode('navegar');
            onNavigateSubmit(addressValue || 'veloce://inicio');
          }}
          className="flex-1 min-w-[180px] flex items-center gap-2 rounded-control border border-border bg-background px-3 min-h-10 focus-within:outline-2 focus-within:outline-primary"
        >
          <span
            title={activeTab.securityInfo.tlsLabel}
            className="inline-flex items-center gap-1 text-xs font-medium shrink-0 text-primary"
          >
            {activeTab.securityInfo.isSecure ? (
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <TriangleAlert className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {activeTab.securityInfo.protocol === 'https'
                ? 'HTTPS'
                : activeTab.securityInfo.protocol === 'veloce'
                  ? 'Local'
                  : 'HTTP'}
            </span>
          </span>

          <input
            type="text"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            aria-label="Endereço web ou pesquisa privada"
            placeholder="Endereço ou busca"
            className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none font-mono"
          />

          {activeTab.url !== 'veloce://inicio' ? (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-control shrink-0 focus-visible:outline-2 focus-visible:outline-primary ${
                isBookmarked ? 'text-primary' : 'text-muted hover:text-foreground'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          ) : null}

          <button
            type="submit"
            className="inline-flex min-h-8 items-center px-2 text-xs font-semibold text-primary whitespace-nowrap hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Ir
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Quick Unlimited VPN Status & Panel Trigger */}
          <button
            type="button"
            onClick={() => {
              onSetViewMode('navegar');
              onToggleToolPanel('vpn');
            }}
            aria-pressed={activeToolPanel === 'vpn'}
            aria-label="Abrir painel de VPN Ilimitada WireGuard"
            title={vpnStatus.statusHeadline}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary tabular-nums ${
              activeToolPanel === 'vpn'
                ? 'bg-primary text-primary-foreground border-transparent'
                : vpn.enabled
                  ? 'border-primary/40 bg-background text-primary hover:bg-surface'
                  : 'border-border bg-background text-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>
              {vpn.enabled
                ? `VPN Ilimitada · ${vpnStatus.server.flagCode}`
                : 'VPN Off'}
            </span>
          </button>

          {/* Quick Shield Status */}
          <button
            type="button"
            onClick={() => onSetViewMode(viewMode === 'escudo' ? 'navegar' : 'escudo')}
            aria-label="Inspecionar escudo AdBlock e economia de dados"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground whitespace-nowrap hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary tabular-nums"
          >
            {adBlockEnabled ? (
              <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0" />
            )}
            <span className="hidden md:inline">
              {activeTab.url === 'veloce://inicio'
                ? adBlockEnabled
                  ? 'Escudo ativo'
                  : 'Escudo pausado'
                : `${activeTab.shieldReport.blockedItems.length} bloqueios · −${
                    dataSaverEnabled || adBlockEnabled ? pageSavedRatio : '0,0%'
                  }`}
            </span>
          </button>

          {/* Unified Browser Options & Features Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="dialog"
            aria-label="Abrir menu de opções e recursos do navegador"
            className={`inline-flex min-h-10 items-center gap-2 rounded-control border px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
              isMenuOpen
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'border-primary/40 bg-background text-foreground hover:bg-surface'
            }`}
          >
            <Menu className="w-4 h-4 shrink-0 text-current" />
            <span>Menu de Opções</span>
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded-control ${
                isMenuOpen
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-surface text-primary border border-border'
              }`}
            >
              {activeFeaturesCount}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                isMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Unified Dropdown / Drawer Menu with all 12 Browser Features */}
      {isMenuOpen ? (
        <div
          role="dialog"
          aria-label="Menu de opções e ferramentas do Veloce"
          className="border-t border-border bg-background shadow-lg px-4 py-4 sm:px-6 max-h-[82dvh] overflow-y-auto"
        >
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-foreground">
                  Menu de Recursos e Ferramentas do Veloce
                </h2>
                <span className="text-xs text-muted">
                  · 13 ferramentas nativas: VPN Ilimitada, leitura, mídia, captura, imagens, QR e PDF
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Fechar menu de opções"
                className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar menu</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Ampliar Texto & Modo Leitor */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Type className="w-4 h-4 text-primary shrink-0" />
                    1. Ampliar Texto & Modo Leitor
                  </span>
                  <span className="text-xs font-mono text-primary tabular-nums">
                    Zoom {readerMode.textZoomPct}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Ampliação de texto com reflow automático:
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSetViewMode('navegar');
                        onStepTextZoom(-15);
                      }}
                      disabled={readerMode.textZoomPct <= 85}
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-control border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-surface disabled:opacity-40"
                    >
                      A− Reduzir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSetViewMode('navegar');
                        onUpdateReaderMode({ textZoomPct: 100 });
                      }}
                      title="Restaurar tamanho original (100%)"
                      className="inline-flex min-h-9 items-center justify-center rounded-control border border-border bg-background px-2.5 text-xs font-mono font-semibold text-primary hover:bg-surface tabular-nums"
                    >
                      {readerMode.textZoomPct}%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSetViewMode('navegar');
                        onStepTextZoom(15);
                      }}
                      disabled={readerMode.textZoomPct >= 200}
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-control border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-surface disabled:opacity-40"
                    >
                      A+ Ampliar
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSetViewMode('navegar');
                        onToggleReaderMode();
                      }}
                      aria-pressed={readerMode.enabled}
                      className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-semibold transition-colors ${
                        readerMode.enabled
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-foreground hover:bg-surface'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {readerMode.enabled ? 'Modo Leitor: Ativo' : 'Ativar Modo Leitor'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSetViewMode('navegar');
                        onUpdateReaderMode({ boldTextBoost: !readerMode.boldTextBoost });
                      }}
                      aria-pressed={readerMode.boldTextBoost}
                      className={`inline-flex min-h-9 items-center justify-center rounded-control px-2.5 text-xs font-medium ${
                        readerMode.boldTextBoost
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-foreground'
                      }`}
                    >
                      Nitidez+
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
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
                        onClick={() => handleThemeChangeFromMenu(th.id)}
                        className={`inline-flex min-h-8 flex-1 items-center justify-center rounded-control text-xs font-medium ${
                          readerMode.enabled && readerMode.theme === th.id
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Tradução Automática & Tradução de Imagens (OCR) */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Languages className="w-4 h-4 text-primary shrink-0" />
                    2. Tradução Automática & Imagens
                  </span>
                  <span className="text-xs font-mono text-primary">
                    {translation.targetLang === 'original'
                      ? 'Original'
                      : translation.targetLang.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Idioma da página (motor neural local sem nuvem):
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TARGET_LANGUAGE_OPTIONS.map((opt) => {
                      const selected = translation.targetLang === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectLanguageFromMenu(opt.id)}
                          className={`inline-flex min-h-8 items-center justify-center rounded-control px-2 text-xs font-medium whitespace-nowrap ${
                            selected
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-background text-foreground hover:bg-surface'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <button
                    type="button"
                    aria-pressed={translation.translateImagesOcr}
                    onClick={() => {
                      onSetViewMode('navegar');
                      onUpdateTranslation({
                        translateImagesOcr: !translation.translateImagesOcr,
                      });
                    }}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-medium ${
                      translation.translateImagesOcr
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Traduzir textos em imagens (OCR)</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {translation.translateImagesOcr ? 'ATIVO' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('translate')}
                    className="w-full inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-primary hover:underline"
                  >
                    <span>
                      {isTranslateActive
                        ? 'Alternar barra de tradução e OCR na página'
                        : 'Abrir barra de tradução e OCR na página'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 3: Baixar Vídeos, Download Rápido & Voltar s/ Atualizar */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Film className="w-4 h-4 text-primary shrink-0" />
                    3. Baixar Vídeos & Download Rápido
                  </span>
                  <span className="text-xs font-mono text-primary tabular-nums">
                    {downloadsCount} salvos
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Captura de streams de vídeo (MP4/WebM/Áudio) e pacotes offline em 4 conexões:
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('download')}
                    className={`w-full inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-semibold ${
                      isDownloadActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground hover:brightness-95'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Abrir Baixador de Vídeos e Download Rápido
                      {downloadsCount > 0 ? ` (${downloadsCount})` : ''}
                    </span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Voltar sem atualizar (BFCache 0ms RAM):</span>
                    <span className="font-mono text-primary tabular-nums">
                      {bfCacheHits}x instantâneos
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={bfCacheEnabled}
                      onClick={onToggleBfCache}
                      className={`inline-flex min-h-9 flex-1 items-center justify-between gap-1.5 rounded-control px-3 text-xs font-medium ${
                        bfCacheEnabled
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-foreground'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        <span>BFCache Instantâneo</span>
                      </span>
                      <span className="font-mono text-[11px]">
                        {bfCacheEnabled ? '0ms ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!canGoBack}
                      onClick={() => {
                        onSetViewMode('navegar');
                        onGoBack();
                        setIsMenuOpen(false);
                      }}
                      className="inline-flex min-h-9 items-center gap-1 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-40"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                      <span>Voltar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Transmissão para TV & Código QR */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Tv className="w-4 h-4 text-primary shrink-0" />
                    4. Transmissão para TV & Código QR
                  </span>
                  <span className="text-xs font-mono text-primary">LAN / Offline</span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Transmitir vídeo ou espelhar aba para Smart TVs (DLNA, Chromecast, Miracast):
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('tv-cast')}
                    aria-pressed={activeToolPanel === 'tv-cast'}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-semibold ${
                      activeToolPanel === 'tv-cast'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Transmissão para TV</span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">4 TVs na rede</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="text-xs text-muted">
                    Gerar e escanear Código QR vetorial 100% offline da página ou Wi-Fi:
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('qr-code')}
                    aria-pressed={activeToolPanel === 'qr-code'}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-semibold ${
                      activeToolPanel === 'qr-code'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Código QR da Página</span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">SVG / PNG</span>
                  </button>
                </div>
              </div>

              {/* Card 5: Captura de Tela com Rolagem & Visualizador de PDF */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Camera className="w-4 h-4 text-primary shrink-0" />
                    5. Captura com Rolagem & PDF
                  </span>
                  <span className="text-xs font-mono text-primary">Página Inteira</span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Capturar página inteira costurada do topo ao rodapé com auditoria TLS:
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('scroll-screenshot')}
                    aria-pressed={activeToolPanel === 'scroll-screenshot'}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-semibold ${
                      activeToolPanel === 'scroll-screenshot'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Captura de tela com rolagem</span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">Full-Page</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="text-xs text-muted">
                    Leitor de PDF isolado (sem JS malicioso) e exportador de página para PDF:
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('pdf-viewer')}
                    aria-pressed={activeToolPanel === 'pdf-viewer'}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-semibold ${
                      activeToolPanel === 'pdf-viewer'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Visualizador de PDF</span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">Leitor + Exportar</span>
                  </button>
                </div>
              </div>

              {/* Card 6: Visualizar Somente Imagens & Salvar Todas as Imagens */}
              <div className="rounded-card border border-border bg-surface p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Images className="w-4 h-4 text-primary shrink-0" />
                    6. Somente Imagens & Salvar Todas
                  </span>
                  <span className="text-xs font-mono text-primary">4 ativos HD</span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted">
                    Ocultar textos da página e inspecionar exclusivamente imagens e diagramas:
                  </div>
                  <button
                    type="button"
                    onClick={() => openPanelFromMenu('images-only')}
                    aria-pressed={activeToolPanel === 'images-only'}
                    className={`w-full inline-flex min-h-9 items-center justify-between gap-2 rounded-control px-3 text-xs font-semibold ${
                      activeToolPanel === 'images-only'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Images className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Visualizar somente imagens</span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">Modo Galeria</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="text-xs text-muted">
                    Extrair e salvar todas as imagens da página em pacote offline verificado:
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSetViewMode('navegar');
                      onTriggerSaveAllImages();
                      if (activeToolPanel !== 'images-only') {
                        onToggleToolPanel('images-only');
                      }
                      setIsMenuOpen(false);
                    }}
                    className="w-full inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95"
                  >
                    <FolderDown className="w-3.5 h-3.5 shrink-0" />
                    <span>Salvar todas as imagens (Lote HD)</span>
                  </button>
                </div>
              </div>

              {/* Card 7: VPN Ilimitada (WireGuard · Sem Limite de Banda · Zero-Logs RAM) */}
              <div className="rounded-card border border-primary/50 bg-surface p-3.5 space-y-3 md:col-span-2 lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Globe className="w-4 h-4 text-primary shrink-0" />
                      7. VPN Ilimitada Integrada (WireGuard ChaCha20 · Sem Franquia de Dados · 10 Gbps)
                    </span>
                    <span className="text-xs font-mono text-primary tabular-nums">
                      · {vpn.enabled ? `CONECTADA (${vpnStatus.server.city} · IP ${vpnStatus.maskedExitIp})` : 'DESATIVADA'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={vpn.enabled}
                      onClick={() => onUpdateVpn({ enabled: !vpn.enabled })}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-3 text-xs font-semibold ${
                        vpn.enabled
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-background text-foreground'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>{vpn.enabled ? 'VPN Ilimitada: ATIVA' : 'Ativar VPN Ilimitada'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRotateVpnIp}
                      className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-surface"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Novo IP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPanelFromMenu('vpn')}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-primary/40 bg-background px-3 text-xs font-semibold text-primary hover:bg-surface"
                    >
                      <span>Abrir Painel de VPN Ilimitada</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                  {vpnNodes.map((node) => {
                    const isSelected = vpn.selectedLocationId === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          onUpdateVpn({ selectedLocationId: node.id, enabled: true });
                        }}
                        className={`text-left rounded-control border px-2.5 py-2 text-xs transition-colors ${
                          isSelected && vpn.enabled
                            ? 'bg-primary text-primary-foreground border-transparent font-semibold'
                            : 'border-border bg-background text-foreground hover:bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>
                            {node.flagCode} · {node.country}
                          </span>
                          <span className="font-mono text-[10px] opacity-85 tabular-nums">
                            {node.baseLatencyMs}ms
                          </span>
                        </div>
                        <div className="text-[11px] font-mono opacity-80 truncate mt-0.5">
                          {node.city} · 10 Gbps ∞
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Strip inside Menu: Escudo, Abas & Módulos */}
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">
                  Escudo, VPN & Economia:
                </span>
                <button
                  type="button"
                  aria-pressed={vpn.enabled}
                  onClick={() => onUpdateVpn({ enabled: !vpn.enabled })}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium ${
                    vpn.enabled
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface text-foreground'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>VPN Ilimitada {vpn.enabled ? `ON (${vpnStatus.server.flagCode})` : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={adBlockEnabled}
                  onClick={onToggleAdBlock}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium ${
                    adBlockEnabled
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface text-foreground'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>AdBlock {adBlockEnabled ? 'Ativo' : 'Pausado'}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={dataSaverEnabled}
                  onClick={onToggleDataSaver}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium ${
                    dataSaverEnabled
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface text-foreground'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Economia de Dados {dataSaverEnabled ? 'Ativa' : 'Pausada'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-muted mr-1">
                  Ir para módulo:
                </span>
                {navItems.map((item) => {
                  const active = viewMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => {
                        onSetViewMode(item.mode);
                        setIsMenuOpen(false);
                      }}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface text-foreground hover:bg-background'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {active ? <Check className="w-3 h-3 shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
