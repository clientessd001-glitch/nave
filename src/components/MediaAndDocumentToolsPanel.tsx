import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  FolderDown,
  Globe,
  Images,
  Lock,
  Pause,
  Play,
  QrCode,
  RotateCw,
  Search,
  Shield,
  Tv,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  buildBatchImagesHtmlArchive,
  buildCastStreamManifest,
  buildQrCodeSvgMarkup,
  captureFullPageScrollingScreenshot,
  discoverLocalCastReceivers,
  extractPageImagesForGallery,
  generateStandardsCompliantPdfString,
  generateWireGuardConfigFile,
  getBuiltInPdfDocumentsForTab,
  getVpnServerNodes,
  resolveVpnTunnelStatus,
} from '../engine/mediaAndDocumentEngine';
import type {
  CastMode,
  ExtractedPageImage,
  FastDownloadItem,
  TabItem,
  VpnConfig,
  VpnProtocol,
} from '../types/browser';
import { formatBytes } from '../utils/formatters';
import type { ActiveBrowserToolPanel } from './BrowserChrome';

interface MediaAndDocumentToolsPanelProps {
  activeTab: TabItem;
  activeToolPanel: ActiveBrowserToolPanel;
  vpn: VpnConfig;
  batchSaveNotification: string | null;
  onClosePanel: () => void;
  onAddFastDownload: (item: FastDownloadItem) => void;
  onTriggerBatchSaveImages: () => void;
  onUpdateVpn: (patch: Partial<VpnConfig>) => void;
  onRotateVpnIp: () => void;
}

export function triggerFileDownload(filename: string, content: string, mimeType: string) {
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

async function renderSvgToPngAndDownload(
  svgMarkup: string,
  widthPx: number,
  heightPx: number,
  filename: string
): Promise<void> {
  return new Promise((resolve) => {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, widthPx, heightPx);
        ctx.drawImage(img, 0, 0, widthPx, heightPx);
      }
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
        } else {
          triggerFileDownload(filename.replace(/\.png$/, '.svg'), svgMarkup, 'image/svg+xml');
        }
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      triggerFileDownload(filename.replace(/\.png$/, '.svg'), svgMarkup, 'image/svg+xml');
      resolve();
    };
    img.src = url;
  });
}

export const MediaAndDocumentToolsPanel: React.FC<MediaAndDocumentToolsPanelProps> = ({
  activeTab,
  activeToolPanel,
  vpn,
  batchSaveNotification,
  onClosePanel,
  onAddFastDownload,
  onTriggerBatchSaveImages,
  onUpdateVpn,
  onRotateVpnIp,
}) => {
  // 1. TV Cast State
  const receivers = useMemo(() => discoverLocalCastReceivers(), []);
  const [selectedReceiverId, setSelectedReceiverId] = useState(receivers[0].id);
  const [castMode, setCastMode] = useState<CastMode>('video-direct');
  const [isCasting, setIsCasting] = useState(true);
  const [isCastPlaying, setIsCastPlaying] = useState(true);
  const [isCastMuted, setIsCastMuted] = useState(false);
  const [castVolumePct, setCastVolumePct] = useState(80);

  // 2. Scrolling Screenshot State
  const [includeAuditHeader, setIncludeAuditHeader] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);

  // 3. Images Only & Batch Save State
  const [imageCategoryFilter, setImageCategoryFilter] = useState<string>('Todas');
  const [selectedLightboxImageId, setSelectedLightboxImageId] = useState<string | null>(null);

  // 4. QR Code State
  const [customQrPayload, setCustomQrPayload] = useState<string>('');
  const [copiedQrText, setCopiedQrText] = useState(false);

  // 5. PDF Viewer State
  const builtInPdfs = useMemo(() => getBuiltInPdfDocumentsForTab(activeTab), [activeTab]);
  const [selectedPdfId, setSelectedPdfId] = useState<string>(builtInPdfs[0].id);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [pdfZoomPct, setPdfZoomPct] = useState<number>(100);
  const [pdfColorMode, setPdfColorMode] = useState<'light' | 'sepia' | 'dark'>('light');
  const [pdfSearchQuery, setPdfSearchQuery] = useState<string>('');
  const [uploadedPdfFile, setUploadedPdfFile] = useState<{
    name: string;
    sizeBytes: number;
    blobUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedReceiver =
    receivers.find((r) => r.id === selectedReceiverId) || receivers[0];
  const castManifest = useMemo(
    () => buildCastStreamManifest(activeTab, selectedReceiver, castMode),
    [activeTab, selectedReceiver, castMode]
  );

  const scrollingScreenshot = useMemo(
    () => captureFullPageScrollingScreenshot(activeTab, includeAuditHeader),
    [activeTab, includeAuditHeader]
  );

  const extractedImages = useMemo(
    () => extractPageImagesForGallery(activeTab),
    [activeTab]
  );

  const filteredImages = useMemo(() => {
    if (imageCategoryFilter === 'Todas') return extractedImages;
    return extractedImages.filter((img) => img.category === imageCategoryFilter);
  }, [extractedImages, imageCategoryFilter]);

  const effectiveQrPayload =
    customQrPayload.trim() ||
    (activeTab.url === 'veloce://inicio'
      ? 'https://arquitetura.veloce.dev/motor-zero-telemetria'
      : activeTab.url);

  const qrSvgMarkup = useMemo(
    () => buildQrCodeSvgMarkup(effectiveQrPayload, 240),
    [effectiveQrPayload]
  );

  const activePdfDoc =
    builtInPdfs.find((d) => d.id === selectedPdfId) || builtInPdfs[0];

  const handleDownloadScrollingScreenshotPng = async () => {
    setIsExportingPng(true);
    try {
      const filename = `veloce-captura-rolagem-${Date.now().toString(36).slice(-4)}.png`;
      await renderSvgToPngAndDownload(
        scrollingScreenshot.svgMarkup,
        scrollingScreenshot.widthPx,
        scrollingScreenshot.heightPx,
        filename
      );
      onAddFastDownload({
        id: `dl-scroll-${Date.now()}`,
        filename,
        sourceUrl: activeTab.url,
        format: 'Captura Rolagem PNG',
        sizeBytes: scrollingScreenshot.sizeBytes,
        parallelChunks: 4,
        durationMs: 14,
        sha256Prefix: '9f4a8c2e1b7d603a',
        completedAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        contentBlobText: scrollingScreenshot.svgMarkup,
        mimeType: 'image/svg+xml',
      });
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadSingleImage = async (img: ExtractedPageImage, asPng: boolean) => {
    const slug = img.id.replace(/[^a-z0-9-]/gi, '-');
    if (asPng) {
      await renderSvgToPngAndDownload(
        img.svgContent,
        img.widthPx,
        img.heightPx,
        `veloce-${slug}.png`
      );
    } else {
      triggerFileDownload(`veloce-${slug}.svg`, img.svgContent, 'image/svg+xml');
    }
  };

  const handleDownloadAllImagesIndividually = () => {
    extractedImages.forEach((img, idx) => {
      setTimeout(() => {
        triggerFileDownload(
          `veloce-imagem-${idx + 1}-${img.id}.svg`,
          img.svgContent,
          'image/svg+xml'
        );
      }, idx * 120);
    });
    const archive = buildBatchImagesHtmlArchive(activeTab, extractedImages);
    onAddFastDownload({
      id: `dl-imgs-${Date.now()}`,
      filename: archive.filename,
      sourceUrl: activeTab.url,
      format: 'Pacote Imagens',
      sizeBytes: archive.sizeBytes,
      parallelChunks: 4,
      durationMs: 18,
      sha256Prefix: '7c3e91a04f8b2d15',
      completedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      contentBlobText: archive.content,
      mimeType: archive.mimeType,
    });
  };

  const handleDownloadPdfDocument = () => {
    const rawPdf = generateStandardsCompliantPdfString(activePdfDoc);
    triggerFileDownload(activePdfDoc.filename, rawPdf, 'application/pdf');
    onAddFastDownload({
      id: `dl-pdf-${Date.now()}`,
      filename: activePdfDoc.filename,
      sourceUrl: activeTab.url,
      format: 'Documento PDF',
      sizeBytes: new TextEncoder().encode(rawPdf).byteLength,
      parallelChunks: 4,
      durationMs: 11,
      sha256Prefix: 'e41b80c53a927f61',
      completedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      contentBlobText: rawPdf,
      mimeType: 'application/pdf',
    });
  };

  const handleDownloadWireGuardConfig = () => {
    const wgFile = generateWireGuardConfigFile(vpn);
    triggerFileDownload(wgFile.filename, wgFile.content, 'text/plain;charset=utf-8');
    onAddFastDownload({
      id: `dl-wg-${Date.now()}`,
      filename: wgFile.filename,
      sourceUrl: activeTab.url,
      format: 'Configuração WireGuard',
      sizeBytes: wgFile.sizeBytes,
      parallelChunks: 4,
      durationMs: 4,
      sha256Prefix: '6d2f90e41c8a73b5',
      completedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      contentBlobText: wgFile.content,
      mimeType: 'text/plain;charset=utf-8',
    });
  };

  // 0. Painel de VPN Ilimitada (WireGuard · Sem Franquia · Zero-Logs RAM)
  if (activeToolPanel === 'vpn') {
    const vpnNodes = getVpnServerNodes();
    const vpnStatus = resolveVpnTunnelStatus(vpn, activeTab.shieldReport.finalBytes);

    return (
      <div className="border-b border-border bg-background px-4 py-4 space-y-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border">
            <div className="flex flex-wrap items-center gap-2">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">
                VPN Ilimitada Nativa (WireGuard ChaCha20-Poly1305 · Sem Franquia · 10 Gbps Zero-Logs)
              </h3>
              <span className="text-xs font-mono text-primary tabular-nums">
                · {vpn.enabled ? `ATIVA (${vpnStatus.server.city} · ${vpnStatus.maskedExitIp})` : 'PAUSADA'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={vpn.enabled}
                onClick={() => onUpdateVpn({ enabled: !vpn.enabled })}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-3 text-xs font-semibold ${
                  vpn.enabled
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-surface text-foreground'
                }`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{vpn.enabled ? 'Túnel Ativo (Desconectar)' : 'Conectar VPN Ilimitada'}</span>
              </button>

              <button
                type="button"
                onClick={onRotateVpnIp}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <RotateCw className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Rotacionar IP Mascarado</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWireGuardConfig}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Exportar Perfil WireGuard (.conf)</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          {/* Telemetry & Unlimited Policy Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="rounded-card border border-border bg-surface p-2.5">
              <div className="text-[11px] text-muted">Status de Banda & Franquia</div>
              <div className="text-xs font-mono font-semibold text-primary mt-0.5">
                Ilimitado ∞ (10 Gbps s/ Throttling)
              </div>
            </div>
            <div className="rounded-card border border-border bg-surface p-2.5">
              <div className="text-[11px] text-muted">IP de Saída Mascarado</div>
              <div className="text-xs font-mono font-semibold text-foreground mt-0.5 tabular-nums">
                {vpn.enabled ? `${vpnStatus.maskedExitIp} (${vpnStatus.server.flagCode})` : 'IP Local Exposto'}
              </div>
            </div>
            <div className="rounded-card border border-border bg-surface p-2.5">
              <div className="text-[11px] text-muted">Criptografia do Túnel</div>
              <div className="text-xs font-mono font-semibold text-foreground mt-0.5">
                {vpnStatus.cipherSuite.split('·')[0].trim()}
              </div>
            </div>
            <div className="rounded-card border border-border bg-surface p-2.5">
              <div className="text-[11px] text-muted">Tráfego Protegido na Sessão</div>
              <div className="text-xs font-mono font-semibold text-primary mt-0.5 tabular-nums">
                {formatBytes(vpnStatus.totalEncryptedBytes)} · {vpnStatus.effectiveLatencyMs} ms
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Global RAM-Only Server Nodes */}
            <div className="md:col-span-2 space-y-2">
              <div className="text-xs font-semibold text-muted">
                Servidores Globais 10 Gbps em Memória RAM (Zero-Logs · Tráfego Ilimitado):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {vpnNodes.map((node) => {
                  const selected = node.id === vpn.selectedLocationId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onUpdateVpn({ selectedLocationId: node.id, enabled: true })}
                      className={`text-left rounded-card border p-2.5 transition-colors ${
                        selected && vpn.enabled
                          ? 'border-primary bg-surface text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold">
                          {node.flagCode} · {node.city} ({node.country})
                        </span>
                        {selected && vpn.enabled ? (
                          <span className="text-[10px] font-mono font-semibold text-primary">
                            ATIVO
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] font-mono text-muted mt-1 tabular-nums">
                        {node.endpointIp} · {node.baseLatencyMs}ms · {node.capacityGbps}Gbps
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 line-clamp-1">
                        {node.jurisdictionNote}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Protocol & Security Hardening Controls */}
            <div className="rounded-card border border-border bg-surface p-3 space-y-2.5">
              <div className="text-xs font-semibold text-foreground">
                Protocolo & Blindagem de Rede
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'wireguard', label: 'WireGuard' },
                    { id: 'openvpn-tls', label: 'OpenVPN TLS' },
                    { id: 'multihop-double', label: 'Multi-Hop 2x' },
                  ] as { id: VpnProtocol; label: string }[]
                ).map((proto) => (
                  <button
                    key={proto.id}
                    type="button"
                    onClick={() => onUpdateVpn({ protocol: proto.id, enabled: true })}
                    className={`inline-flex min-h-8 items-center justify-center rounded-control px-2 text-xs font-medium ${
                      vpn.protocol === proto.id
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground'
                    }`}
                  >
                    {proto.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  aria-pressed={vpn.killSwitch}
                  onClick={() => onUpdateVpn({ killSwitch: !vpn.killSwitch })}
                  className="w-full flex items-center justify-between rounded-control border border-border bg-background px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">Kill Switch Automático</span>
                  <span className="font-mono text-primary font-semibold">
                    {vpn.killSwitch ? 'ATIVO' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={vpn.dnsLeakProtection}
                  onClick={() => onUpdateVpn({ dnsLeakProtection: !vpn.dnsLeakProtection })}
                  className="w-full flex items-center justify-between rounded-control border border-border bg-background px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">Anti-Vazamento DNS / IPv6</span>
                  <span className="font-mono text-primary font-semibold">
                    {vpn.dnsLeakProtection ? 'ATIVO' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={vpn.bypassLocalLan}
                  onClick={() => onUpdateVpn({ bypassLocalLan: !vpn.bypassLocalLan })}
                  className="w-full flex items-center justify-between rounded-control border border-border bg-background px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">Bypass LAN (Smart TV / Cast)</span>
                  <span className="font-mono text-primary font-semibold">
                    {vpn.bypassLocalLan ? 'ATIVO' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-mono text-muted flex flex-wrap items-center justify-between gap-2">
            <span>{vpnStatus.statusHeadline}</span>
            <span className="text-primary font-semibold">
              Chave {vpnStatus.publicKeyFingerprint}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 1. Transmissão para TV Panel
  if (activeToolPanel === 'tv-cast') {
    return (
      <div className="border-b border-border bg-background px-4 py-4 space-y-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">
                Transmissão para TV (DLNA / Google Cast TLS / Miracast Local)
              </h3>
              <span className="text-xs font-mono text-primary">
                · {isCasting ? `Transmitindo para ${selectedReceiver.name}` : 'Pronto para transmitir'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClosePanel}
              className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Receivers selector */}
            <div className="md:col-span-2 space-y-2">
              <div className="text-xs font-semibold text-muted">
                Dispositivos e Smart TVs detectados na rede local (zero nuvem):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {receivers.map((rec) => {
                  const selected = rec.id === selectedReceiver.id;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        setSelectedReceiverId(rec.id);
                        setIsCasting(true);
                      }}
                      className={`text-left rounded-card border p-3 transition-colors ${
                        selected
                          ? 'border-primary bg-surface text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{rec.name}</span>
                        {selected && isCasting ? (
                          <span className="text-[11px] font-mono font-semibold text-primary">
                            CONECTADO
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] font-mono text-muted mt-1">
                        {rec.protocol} · {rec.localIp} · {rec.resolutionSupport} · {rec.latencyMs}ms
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cast Mode & Playback Remote Control */}
            <div className="rounded-card border border-border bg-surface p-3 space-y-3">
              <div className="text-xs font-semibold text-foreground">
                Modo de Transmissão & Controle Remoto
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCastMode('video-direct')}
                  className={`inline-flex min-h-8 flex-1 items-center justify-center rounded-control px-2 text-xs font-medium ${
                    castMode === 'video-direct'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground'
                  }`}
                >
                  Vídeo Direto 4K
                </button>
                <button
                  type="button"
                  onClick={() => setCastMode('tab-mirror')}
                  className={`inline-flex min-h-8 flex-1 items-center justify-center rounded-control px-2 text-xs font-medium ${
                    castMode === 'tab-mirror'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground'
                  }`}
                >
                  Espelhar Aba
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCastPlaying((p) => !p)}
                  disabled={!isCasting}
                  className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {isCastPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pausar na TV</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Retomar na TV</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCastMuted((m) => !m)}
                  disabled={!isCasting}
                  aria-label="Alternar mudo na TV"
                  className="inline-flex min-h-9 items-center justify-center rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground disabled:opacity-40"
                >
                  {isCastMuted ? (
                    <VolumeX className="w-4 h-4 text-danger" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-primary" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCasting((c) => !c)}
                  className="inline-flex min-h-9 items-center justify-center rounded-control border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-surface"
                >
                  {isCasting ? 'Desconectar' : 'Conectar'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-muted tabular-nums">
                <span>Volume da TV: {isCastMuted ? 'Mudo (0%)' : `${castVolumePct}%`}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCastVolumePct((v) => Math.max(0, v - 10))}
                    className="px-2 py-0.5 rounded-control border border-border bg-background text-foreground"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setCastVolumePct((v) => Math.min(100, v + 10))}
                    className="px-2 py-0.5 rounded-control border border-border bg-background text-foreground"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-mono text-muted flex flex-wrap items-center justify-between gap-2">
            <span>{castManifest.manifestSummary}</span>
            <span className="text-primary font-semibold">{castManifest.codecProfile}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Captura de Tela com Rolagem Panel
  if (activeToolPanel === 'scroll-screenshot') {
    return (
      <div className="border-b border-border bg-background px-4 py-4 space-y-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">
                Captura de Tela com Rolagem Completa ({scrollingScreenshot.widthPx} ×{' '}
                {scrollingScreenshot.heightPx} px · {scrollingScreenshot.stitchedSections} seções costuradas)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={includeAuditHeader}
                onClick={() => setIncludeAuditHeader((v) => !v)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium ${
                  includeAuditHeader
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-surface text-foreground'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Carimbo Auditoria TLS</span>
              </button>

              <button
                type="button"
                disabled={isExportingPng}
                onClick={() => void handleDownloadScrollingScreenshotPng()}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isExportingPng
                    ? 'Renderizando PNG...'
                    : `Salvar Captura Inteira (.PNG · ${formatBytes(scrollingScreenshot.sizeBytes)})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerFileDownload(
                    `veloce-captura-rolagem-${Date.now().toString(36).slice(-4)}.svg`,
                    scrollingScreenshot.svgMarkup,
                    'image/svg+xml'
                  )
                }
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Salvar Vetorial (.SVG)</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-card border border-border bg-surface p-3">
            <div
              className="w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: scrollingScreenshot.svgMarkup }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. Código QR Offline Panel
  if (activeToolPanel === 'qr-code') {
    return (
      <div className="border-b border-border bg-background px-4 py-4 space-y-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">
                Gerador e Compartilhador de Código QR Local (100% Offline · Zero Rastreamento)
              </h3>
            </div>
            <button
              type="button"
              onClick={onClosePanel}
              className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col items-center justify-center rounded-card border border-border bg-surface p-4">
              <div
                aria-label="Código QR gerado localmente"
                className="p-2 bg-white rounded-card border border-border"
                dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
              />
              <span className="text-[11px] font-mono text-muted mt-2">
                Matriz 25×25 ISO/IEC 18004 · Gerado na RAM
              </span>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground block">
                  URL da página ou texto codificado no Código QR:
                </label>
                <input
                  type="text"
                  value={customQrPayload}
                  onChange={(e) => setCustomQrPayload(e.target.value)}
                  placeholder={effectiveQrPayload}
                  aria-label="Texto ou endereço para gerar Código QR"
                  className="w-full min-h-10 rounded-control border border-border bg-surface px-3 text-sm font-mono text-foreground placeholder:text-muted focus:outline-2 focus:outline-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomQrPayload('')}
                  className="inline-flex min-h-8 items-center rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
                >
                  Usar URL da aba atual
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomQrPayload('WIFI:S:Veloce_Private_5G;T:WPA3;P:ZeroTelemetry2026;;')
                  }
                  className="inline-flex min-h-8 items-center rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
                >
                  Predefinição Wi-Fi Seguro
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() =>
                    void renderSvgToPngAndDownload(
                      qrSvgMarkup,
                      560,
                      560,
                      'veloce-qrcode-pagina.png'
                    )
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Baixar Código QR (.PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    triggerFileDownload(
                      'veloce-qrcode-pagina.svg',
                      qrSvgMarkup,
                      'image/svg+xml'
                    )
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-background"
                >
                  <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Baixar Vetorial (.SVG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(effectiveQrPayload);
                    setCopiedQrText(true);
                    setTimeout(() => setCopiedQrText(false), 2000);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-background"
                >
                  {copiedQrText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span>Link copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-primary" />
                      <span>Copiar endereço</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Visualizar Somente Imagens & Salvar Todas as Imagens (Full-Stage Mode)
  if (activeToolPanel === 'images-only') {
    const lightboxImage = extractedImages.find((i) => i.id === selectedLightboxImageId);

    return (
      <div className="flex-1 flex flex-col bg-surface border-b border-border">
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Images className="w-4 h-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">
                Modo Visualizar Somente Imagens ({filteredImages.length} de {extractedImages.length}{' '}
                ativos visuais extraídos)
              </h3>
              {batchSaveNotification ? (
                <span className="inline-flex items-center gap-1 rounded-control bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  <Check className="w-3 h-3" />
                  {batchSaveNotification}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['Todas', 'Diagrama Técnico', 'Gráfico de Auditoria', 'Ilustração Editorial'] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setImageCategoryFilter(cat)}
                    className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium ${
                      imageCategoryFilter === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground hover:bg-background'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onTriggerBatchSaveImages}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95"
              >
                <FolderDown className="w-3.5 h-3.5 shrink-0" />
                <span>Salvar todas as imagens (Pacote HTML)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAllImagesIndividually}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Baixar 4 arquivos separados</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <X className="w-3.5 h-3.5" />
                <span>Voltar à página normal</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
          {lightboxImage ? (
            <div className="rounded-card border border-primary bg-background p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{lightboxImage.title}</h4>
                  <p className="text-xs text-muted">
                    {lightboxImage.caption} · {lightboxImage.widthPx}×{lightboxImage.heightPx} px
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadSingleImage(lightboxImage, true)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLightboxImageId(null)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Fechar ampliação</span>
                  </button>
                </div>
              </div>
              <div
                className="w-full overflow-x-auto rounded-control border border-border"
                dangerouslySetInnerHTML={{ __html: lightboxImage.svgContent }}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredImages.map((img) => (
              <article
                key={img.id}
                className="rounded-card border border-border bg-background p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{img.category}</span>
                    <span className="text-xs font-mono text-muted tabular-nums">
                      {img.format} · {img.widthPx}×{img.heightPx} · {formatBytes(img.sizeBytes)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{img.title}</h4>
                  <p className="text-xs text-muted">{img.caption}</p>
                </div>

                <div
                  onClick={() => setSelectedLightboxImageId(img.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedLightboxImageId(img.id);
                    }
                  }}
                  className="w-full overflow-hidden rounded-control border border-border cursor-pointer hover:border-primary transition-colors"
                  dangerouslySetInnerHTML={{ __html: img.svgContent }}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setSelectedLightboxImageId(img.id)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Inspecionar em tela cheia
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleDownloadSingleImage(img, true)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-control bg-primary px-2.5 text-xs font-medium text-primary-foreground"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadSingleImage(img, false)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground"
                    >
                      <Download className="w-3 h-3 text-primary" />
                      <span>SVG</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. Visualizador de PDF Nativo Blindado
  if (activeToolPanel === 'pdf-viewer') {
    const totalPages = activePdfDoc.pages.length;
    const safePageIdx = Math.min(totalPages, Math.max(1, currentPdfPage)) - 1;
    const pageData = activePdfDoc.pages[safePageIdx] || activePdfDoc.pages[0];

    const pdfSurfaceStyles = {
      light: { bg: '#FFFFFF', text: '#0F1713', muted: '#526058', border: '#D6E0DA' },
      sepia: { bg: '#F8F2E4', text: '#2B2318', muted: '#6E5E48', border: '#E2D5BE' },
      dark: { bg: '#101814', text: '#E8F5F0', muted: '#94A89D', border: '#24382E' },
    }[pdfColorMode];

    return (
      <div className="flex-1 flex flex-col bg-surface border-b border-border">
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">
                Visualizador de PDF Nativo:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {builtInPdfs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setUploadedPdfFile(null);
                      setSelectedPdfId(doc.id);
                      setCurrentPdfPage(1);
                    }}
                    className={`inline-flex min-h-8 items-center rounded-control px-2.5 text-xs font-medium ${
                      !uploadedPdfFile && activePdfDoc.id === doc.id
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-surface text-foreground hover:bg-background'
                    }`}
                  >
                    {doc.id === 'pdf-current-page' ? 'PDF da Página Atual' : 'Especificação Kotlin PDF'}
                  </button>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const blobUrl = URL.createObjectURL(file);
                      setUploadedPdfFile({
                        name: file.name,
                        sizeBytes: file.size,
                        blobUrl,
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
                >
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span>Abrir PDF do dispositivo</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!uploadedPdfFile ? (
                <>
                  <div className="flex items-center gap-1 rounded-control border border-border bg-surface px-2 min-h-8 text-xs tabular-nums">
                    <button
                      type="button"
                      disabled={currentPdfPage <= 1}
                      onClick={() => setCurrentPdfPage((p) => Math.max(1, p - 1))}
                      aria-label="Página anterior do PDF"
                      className="p-1 disabled:opacity-35"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span>
                      Pág. {safePageIdx + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPdfPage >= totalPages}
                      onClick={() => setCurrentPdfPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Próxima página do PDF"
                      className="p-1 disabled:opacity-35"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {(['light', 'sepia', 'dark'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPdfColorMode(m)}
                        className={`inline-flex min-h-8 items-center rounded-control px-2 text-xs font-medium ${
                          pdfColorMode === m
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-surface text-foreground'
                        }`}
                      >
                        {m === 'light' ? 'Papel' : m === 'sepia' ? 'Sépia' : 'Noturno'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPdfZoomPct((z) => Math.max(85, z - 15))}
                      className="inline-flex min-h-8 items-center rounded-control border border-border bg-surface px-2 text-xs font-semibold"
                    >
                      −
                    </button>
                    <span className="text-xs font-mono tabular-nums px-1">{pdfZoomPct}%</span>
                    <button
                      type="button"
                      onClick={() => setPdfZoomPct((z) => Math.min(160, z + 15))}
                      className="inline-flex min-h-8 items-center rounded-control border border-border bg-surface px-2 text-xs font-semibold"
                    >
                      +
                    </button>
                  </div>
                </>
              ) : null}

              <button
                type="button"
                onClick={handleDownloadPdfDocument}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Baixar .PDF ({formatBytes(activePdfDoc.fileSizeBytes)})</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-background"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar PDF</span>
              </button>
            </div>
          </div>
        </div>

        {uploadedPdfFile ? (
          <div className="flex-1 flex flex-col p-4 max-w-5xl w-full mx-auto space-y-2">
            <div className="text-xs font-mono text-primary">
              Arquivo local aberto em Sandbox isolado: {uploadedPdfFile.name} (
              {formatBytes(uploadedPdfFile.sizeBytes)})
            </div>
            <iframe
              title={uploadedPdfFile.name}
              src={uploadedPdfFile.blobUrl}
              className="w-full flex-1 min-h-[520px] rounded-card border border-border bg-white"
            />
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <Shield className="w-3.5 h-3.5" />
                {activePdfDoc.securityBadge}
              </span>
              <div className="flex items-center gap-1.5 rounded-control border border-border bg-background px-2.5 min-h-8">
                <Search className="w-3.5 h-3.5 text-muted" />
                <input
                  type="search"
                  value={pdfSearchQuery}
                  onChange={(e) => setPdfSearchQuery(e.target.value)}
                  placeholder="Pesquisar no PDF..."
                  aria-label="Pesquisar texto dentro do documento PDF"
                  className="bg-transparent text-xs text-foreground placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            <article
              className="rounded-card shadow-sm p-6 sm:p-10 space-y-6 transition-all"
              style={{
                backgroundColor: pdfSurfaceStyles.bg,
                color: pdfSurfaceStyles.text,
                border: `1px solid ${pdfSurfaceStyles.border}`,
                fontSize: `${Math.round((16 * pdfZoomPct) / 100)}px`,
              }}
            >
              <header
                className="pb-4 flex flex-wrap items-start justify-between gap-3"
                style={{ borderBottom: `2px solid ${pdfSurfaceStyles.border}` }}
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-wider text-primary">
                    {activePdfDoc.filename} · Página {pageData.pageNumber} de {totalPages}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                    {pageData.heading}
                  </h2>
                  <p className="text-xs" style={{ color: pdfSurfaceStyles.muted }}>
                    {pageData.subHeading}
                  </p>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {pageData.keyMetrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-control p-3"
                    style={{ border: `1px solid ${pdfSurfaceStyles.border}` }}
                  >
                    <div className="text-xs" style={{ color: pdfSurfaceStyles.muted }}>
                      {m.label}
                    </div>
                    <div className="text-sm font-mono font-bold text-primary mt-0.5">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 leading-relaxed">
                {pageData.paragraphs.map((p, i) => {
                  const highlighted =
                    pdfSearchQuery.trim().length > 0 &&
                    p.toLowerCase().includes(pdfSearchQuery.trim().toLowerCase());
                  return (
                    <p
                      key={i}
                      className={
                        highlighted ? 'underline decoration-primary decoration-2 font-semibold' : ''
                      }
                    >
                      {p}
                    </p>
                  );
                })}
              </div>

              {pageData.codeOrFormula ? (
                <pre
                  className="p-4 rounded-control font-mono text-xs overflow-x-auto"
                  style={{
                    backgroundColor: '#0F1713',
                    color: '#A6F4C5',
                  }}
                >
                  <code>{pageData.codeOrFormula}</code>
                </pre>
              ) : null}

              <footer
                className="pt-4 flex items-center justify-between text-xs font-mono"
                style={{
                  borderTop: `1px solid ${pdfSurfaceStyles.border}`,
                  color: pdfSurfaceStyles.muted,
                }}
              >
                <span>{activePdfDoc.author}</span>
                <span>
                  Página {pageData.pageNumber} / {totalPages}
                </span>
              </footer>
            </article>
          </div>
        )}
      </div>
    );
  }

  return null;
};
