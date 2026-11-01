export type BrowserViewMode = 'navegar' | 'duas-versoes' | 'escudo' | 'favoritos' | 'historico' | 'kotlin';

export type DohProviderId = 'quad9' | 'cloudflare' | 'adguard' | 'nextdns';

export interface BlockedRequestItem {
  id: string;
  domain: string;
  category: 'Rastreador' | 'Anúncio' | 'Fingerprinting' | 'Cookie 3P';
  rule: string;
  bytesAvoided: number;
}

export interface ShieldReport {
  originalBytes: number;
  finalBytes: number;
  adBlockSavedBytes: number;
  dataSaverSavedBytes: number;
  blockedItems: BlockedRequestItem[];
  deferredMediaCount: number;
  strippedTrackingParams: string[];
  isDomainWhitelisted: boolean;
}

export interface SecurityInfo {
  protocol: 'https' | 'http' | 'veloce';
  isSecure: boolean;
  tlsLabel: string;
  trackingParamsCleaned: boolean;
}

export type TargetLanguage = 'original' | 'pt' | 'en' | 'es' | 'fr';

export interface TranslationConfig {
  autoTranslate: boolean;
  targetLang: TargetLanguage;
  translateImagesOcr: boolean;
  showOriginalComparison: boolean;
}

export interface ImageOcrRegion {
  id: string;
  figureTitle: string;
  originalLabel: string;
  translatedLabel: string;
  confidencePct: number;
  coordinates: string;
}

export interface BfCacheSnapshot {
  url: string;
  title: string;
  shortTitle: string;
  sanitizedHtml: string;
  securityInfo: SecurityInfo;
  shieldReport: ShieldReport;
  cachedAtIso: string;
}

export interface DetectedVideoStream {
  id: string;
  title: string;
  durationLabel: string;
  codecLabel: string;
  sourceUrl: string;
  resolutions: {
    quality: '1080p Full HD' | '720p HD' | '480p Leve' | 'Áudio Opus';
    extension: 'mp4' | 'webm' | 'm4a';
    estimatedBytes: number;
    bitrateLabel: string;
  }[];
}

export interface FastDownloadItem {
  id: string;
  filename: string;
  sourceUrl: string;
  format:
    | 'Vídeo 1080p MP4'
    | 'Vídeo 720p WebM'
    | 'Vídeo 480p Leve'
    | 'Áudio Extraído'
    | 'HTML Offline'
    | 'Markdown'
    | 'JSON Auditoria'
    | 'Pacote Kotlin'
    | 'Captura Rolagem PNG'
    | 'Pacote Imagens'
    | 'Documento PDF'
    | 'Configuração WireGuard';
  sizeBytes: number;
  parallelChunks: 4;
  durationMs: number;
  sha256Prefix: string;
  completedAt: string;
  contentBlobText: string;
  mimeType: string;
}

export type VpnLocationId = 'br-sp' | 'ch-zh' | 'is-rk' | 'us-ny' | 'de-ff' | 'jp-ty';
export type VpnProtocol = 'wireguard' | 'openvpn-tls' | 'multihop-double';

export interface VpnServerNode {
  id: VpnLocationId;
  country: string;
  city: string;
  flagCode: string;
  endpointIp: string;
  maskedExitIpBase: string;
  capacityGbps: number;
  baseLatencyMs: number;
  jurisdictionNote: string;
}

export interface VpnConfig {
  enabled: boolean;
  selectedLocationId: VpnLocationId;
  protocol: VpnProtocol;
  killSwitch: boolean;
  dnsLeakProtection: boolean;
  bypassLocalLan: boolean;
  ipRotationNonce: number;
  encryptedBytesTransferred: number;
}

export interface CastReceiverDevice {
  id: string;
  name: string;
  protocol: 'Google Cast TLS' | 'DLNA / UPnP' | 'Miracast Direto' | 'WebRTC LAN';
  localIp: string;
  resolutionSupport: '4K HDR 60fps' | '1080p Full HD 60fps';
  latencyMs: number;
}

export type CastMode = 'video-direct' | 'tab-mirror';

export interface ExtractedPageImage {
  id: string;
  title: string;
  caption: string;
  format: 'SVG Vetorial' | 'WebP Lossless' | 'PNG Alta Densidade';
  widthPx: number;
  heightPx: number;
  sizeBytes: number;
  category: 'Diagrama Técnico' | 'Gráfico de Auditoria' | 'Ilustração Editorial';
  svgContent: string;
}

export interface ScrollingScreenshotResult {
  id: string;
  pageTitle: string;
  pageUrl: string;
  widthPx: number;
  heightPx: number;
  stitchedSections: number;
  sizeBytes: number;
  capturedAt: string;
  includeAuditHeader: boolean;
  svgMarkup: string;
}

export interface PdfPageItem {
  pageNumber: number;
  heading: string;
  subHeading: string;
  paragraphs: string[];
  keyMetrics: { label: string; value: string }[];
  codeOrFormula?: string;
}

export interface PdfDocumentDescriptor {
  id: string;
  title: string;
  filename: string;
  author: string;
  securityBadge: string;
  fileSizeBytes: number;
  pages: PdfPageItem[];
  externalBlobUrl?: string;
}

export interface TabItem {
  id: string;
  title: string;
  shortTitle: string;
  url: string;
  isIncognito: boolean;
  historyStack: string[];
  historyIndex: number;
  loadTimeMs: number;
  restoredFromBfCache?: boolean;
  securityInfo: SecurityInfo;
  shieldReport: ShieldReport;
  sanitizedHtml: string;
  statusNote?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  domain: string;
  visitedAt: string;
  loadTimeMs: number;
  bytesSaved: number;
  trackersBlocked: number;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folder: 'Segurança' | 'Engenharia Kotlin' | 'Leitura rápida';
  createdAt: string;
  deviceOrigin: string;
}

export interface SyncedDevice {
  id: string;
  name: string;
  platform: string;
  engineLabel: string;
  lastSyncedAt: string;
  bookmarkCount: number;
  isCurrentDevice?: boolean;
}

export interface EncryptedSyncEnvelope {
  vaultId: string;
  ivBase64: string;
  saltBase64: string;
  ciphertextBase64: string;
  sha256Digest: string;
  byteLength: number;
  encryptedAt: string;
  updatedByDevice: string;
}

export interface AdBlockConfig {
  enabled: boolean;
  blockAds: boolean;
  blockTrackers: boolean;
  blockFingerprinting: boolean;
  blockThirdPartyCookies: boolean;
  stripTrackingParams: boolean;
  dohProvider: DohProviderId;
  blockWebRtcLeak: boolean;
  autoShredCookiesOnClose: boolean;
  whitelistedDomains: string[];
  customRules: string[];
}

export interface DataSaverConfig {
  enabled: boolean;
  compressHtml: boolean;
  deferHeavyMedia: boolean;
  stripExternalFonts: boolean;
  blockAutoplayMedia: boolean;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark';
export type ReaderFontFamily = 'sans' | 'serif' | 'mono';

export interface ReaderModeConfig {
  enabled: boolean;
  fontSizePx: 15 | 17 | 19 | 22;
  textZoomPct: number;
  boldTextBoost: boolean;
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  lineHeight: 1.5 | 1.7 | 1.9;
  showKeyTakeaways: boolean;
}

export interface CumulativeStats {
  pagesLoaded: number;
  totalTrackersBlocked: number;
  totalAdBlockBytesSaved: number;
  totalDataSaverBytesSaved: number;
  totalOriginalBytes: number;
  bfCacheHits: number;
}

export interface BrowserState {
  tabs: TabItem[];
  activeTabId: string;
  viewMode: BrowserViewMode;
  history: HistoryEntry[];
  bookmarks: BookmarkItem[];
  devices: SyncedDevice[];
  adBlock: AdBlockConfig;
  dataSaver: DataSaverConfig;
  readerMode: ReaderModeConfig;
  translation: TranslationConfig;
  vpn: VpnConfig;
  bfCacheEnabled: boolean;
  bfCacheStore: Record<string, BfCacheSnapshot>;
  downloads: FastDownloadItem[];
  stats: CumulativeStats;
  syncPassphrase: string;
  lastSyncEnvelope: EncryptedSyncEnvelope | null;
}
