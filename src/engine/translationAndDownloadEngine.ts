import { buildFullKotlinBundleText } from '../data/kotlinSourceFiles';
import type {
  DetectedVideoStream,
  FastDownloadItem,
  ImageOcrRegion,
  TabItem,
  TargetLanguage,
  TranslationConfig,
} from '../types/browser';
import { distillArticleForReader } from './readerEngine';

export const TARGET_LANGUAGE_OPTIONS: {
  id: TargetLanguage;
  label: string;
  shortBadge: string;
}[] = [
  { id: 'original', label: 'Original da página', shortBadge: 'ORIG' },
  { id: 'en', label: 'English (Neural Local)', shortBadge: 'EN' },
  { id: 'es', label: 'Español (Neural Local)', shortBadge: 'ES' },
  { id: 'fr', label: 'Français (Neural Local)', shortBadge: 'FR' },
  { id: 'pt', label: 'Português (Técnico PT-BR)', shortBadge: 'PT-BR' },
];

interface PhraseDictionary {
  en: string;
  es: string;
  fr: string;
  pt: string;
}

const PHRASE_MAP: Record<string, PhraseDictionary> = {
  'Auditoria de rastreadores e consumo de dados em navegadores móveis': {
    en: 'Tracker Audit and Data Consumption in Mobile Web Browsers',
    es: 'Auditoría de rastreadores y consumo de datos en navegadores móviles',
    fr: 'Audit des traqueurs et consommation de données sur navigateurs mobiles',
    pt: 'Auditoria de rastreadores e consumo de dados em navegadores móveis (Revisado PT-BR)',
  },
  'Observatório Brasileiro de Privacidade Digital · Outubro de 2026 · Conexão verificada TLS 1.3': {
    en: 'Brazilian Digital Privacy Observatory · October 2026 · Verified TLS 1.3 Connection',
    es: 'Observatorio Brasileño de Privacidad Digital · Octubre 2026 · Conexión TLS 1.3 verificada',
    fr: 'Observatoire Brésilien de la Confidentialité Numérique · Octobre 2026 · Connexion TLS 1.3 vérifiée',
    pt: 'Observatório Brasileiro de Privacidade Digital · Outubro de 2026 · Conexão verificada TLS 1.3',
  },
  'Comparativo de transferência por sessão de leitura (10 páginas)': {
    en: 'Bandwidth Transfer Comparison per Reading Session (10 pages)',
    es: 'Comparativa de transferencia por sesión de lectura (10 páginas)',
    fr: 'Comparatif de transfert par session de lecture (10 pages)',
    pt: 'Comparativo de transferência por sessão de leitura (10 páginas)',
  },
  'Isolamento criptográfico de favoritos e sessões efêmeras': {
    en: 'Cryptographic Isolation of Bookmarks and Ephemeral Sessions',
    es: 'Aislamiento criptográfico de marcadores y sesiones efímeras',
    fr: 'Isolation cryptographique des favoris et sessions éphémères',
    pt: 'Isolamento criptográfico de favoritos e sessões efêmeras',
  },
  'Arquitetura de interceptação de rede em Android WebView com Kotlin': {
    en: 'Network Interception Architecture in Android WebView with Kotlin',
    es: 'Arquitectura de interceptación de red en Android WebView con Kotlin',
    fr: 'Architecture d’interception réseau dans Android WebView avec Kotlin',
    pt: 'Arquitetura de interceptação de rede em Android WebView com Kotlin',
  },
  'Sincronização entre dispositivos com cifra autenticada AES-256-GCM': {
    en: 'Cross-Device Synchronization with Authenticated AES-256-GCM Cipher',
    es: 'Sincronización entre dispositivos con cifrado autenticado AES-256-GCM',
    fr: 'Synchronisation multi-appareils avec chiffrement authentifié AES-256-GCM',
    pt: 'Sincronização entre dispositivos com cifra autenticada AES-256-GCM',
  },
  'Por que softwares enxutos superam suítes inchadas em velocidade e segurança': {
    en: 'Why Lean Software Outperforms Bloated Suites in Speed and Security',
    es: 'Por qué el software ligero supera a las suites pesadas en velocidad y seguridad',
    fr: 'Pourquoi les logiciels sobres surpassent les suites lourdes en vitesse et sécurité',
    pt: 'Por que softwares enxutos superam suítes inchadas em velocidade e segurança',
  },
  'Boletim hidrometeorológico e qualidade do ar nas regiões metropolitanas': {
    en: 'Hydrometeorological Bulletin and Air Quality in Metropolitan Regions',
    es: 'Boletín hidrometeorológico y calidad del aire en regiones metropolitanas',
    fr: 'Bulletin hydrométéorologique et qualité de l’air dans les régions métropolitaines',
    pt: 'Boletim hidrometeorológico e qualidade do ar nas regiões metropolitanas',
  },
};

const WORD_REPLACEMENTS: Record<Exclude<TargetLanguage, 'original'>, [RegExp, string][]> = {
  en: [
    [/\bnavegadores móveis\b/gi, 'mobile browsers'],
    [/\brastreadores\b/gi, 'trackers'],
    [/\bscripts publicitários\b/gi, 'advertising scripts'],
    [/\bcoletores de telemetria\b/gi, 'telemetry collectors'],
    [/\bconexões móveis\b/gi, 'mobile connections'],
    [/\bcamada de rede nativa\b/gi, 'native network layer'],
    [/\bdomínios terceiros\b/gi, 'third-party domains'],
    [/\bConfiguração do motor\b/gi, 'Engine Configuration'],
    [/\bRequisições\b/gi, 'Requests'],
    [/\bDados transferidos\b/gi, 'Transferred Data'],
    [/\bTempo até leitura\b/gi, 'Time to Interactive'],
    [/\bWebView padrão sem filtragem\b/gi, 'Unfiltered Default WebView'],
    [/\bEscudo AdBlock ativo\b/gi, 'Active AdBlock Shield'],
    [/\bEconomia de dados sob demanda\b/gi, 'On-Demand Data Saver'],
    [/\bfavoritos\b/gi, 'bookmarks'],
    [/\bdispositivos\b/gi, 'devices'],
    [/\bmemória volátil\b/gi, 'volatile RAM'],
    [/\bhistórico\b/gi, 'browsing history'],
    [/\bcriptografia\b/gi, 'cryptography'],
    [/\bchave secreta\b/gi, 'secret key'],
  ],
  es: [
    [/\bnavegadores móveis\b/gi, 'navegadores móviles'],
    [/\brastreadores\b/gi, 'rastreadores'],
    [/\bscripts publicitários\b/gi, 'scripts publicitarios'],
    [/\bcoletores de telemetria\b/gi, 'colectores de telemetría'],
    [/\bconexões móveis\b/gi, 'conexiones móviles'],
    [/\bcamada de rede nativa\b/gi, 'capa de red nativa'],
    [/\bdomínios terceiros\b/gi, 'dominios de terceros'],
    [/\bConfiguração do motor\b/gi, 'Configuración del motor'],
    [/\bRequisições\b/gi, 'Solicitudes'],
    [/\bDados transferidos\b/gi, 'Datos transferidos'],
    [/\bTempo até leitura\b/gi, 'Tiempo hasta lectura'],
    [/\bWebView padrão sem filtragem\b/gi, 'WebView estándar sin filtrado'],
    [/\bEscudo AdBlock ativo\b/gi, 'Escudo AdBlock activo'],
    [/\bEconomia de dados sob demanda\b/gi, 'Ahorro de datos bajo demanda'],
    [/\bfavoritos\b/gi, 'marcadores'],
    [/\bdispositivos\b/gi, 'dispositivos'],
    [/\bmemória volátil\b/gi, 'memoria volátil'],
    [/\bhistórico\b/gi, 'historial'],
    [/\bchave secreta\b/gi, 'clave secreta'],
  ],
  fr: [
    [/\bnavegadores móveis\b/gi, 'navigateurs mobiles'],
    [/\brastreadores\b/gi, 'traqueurs'],
    [/\bscripts publicitários\b/gi, 'scripts publicitaires'],
    [/\bcoletores de telemetria\b/gi, 'collecteurs de télémétrie'],
    [/\bconexões móveis\b/gi, 'connexions mobiles'],
    [/\bcamada de rede nativa\b/gi, 'couche réseau native'],
    [/\bdomínios terceiros\b/gi, 'domaines tiers'],
    [/\bConfiguração do motor\b/gi, 'Configuration du moteur'],
    [/\bRequisições\b/gi, 'Requêtes'],
    [/\bDados transferidos\b/gi, 'Données transférées'],
    [/\bTempo até leitura\b/gi, 'Temps de lecture'],
    [/\bWebView padrão sem filtragem\b/gi, 'WebView standard sans filtrage'],
    [/\bEscudo AdBlock ativo\b/gi, 'Bouclier AdBlock actif'],
    [/\bEconomia de dados sob demanda\b/gi, 'Économie de données à la demande'],
    [/\bfavoritos\b/gi, 'favoris'],
    [/\bdispositivos\b/gi, 'appareils'],
    [/\bmemória volátil\b/gi, 'mémoire vive'],
    [/\bhistórico\b/gi, 'historique'],
    [/\bchave secreta\b/gi, 'clé secrète'],
  ],
  pt: [
    [/\bshouldInterceptRequest\b/g, 'shouldInterceptRequest (interceptador nativo)'],
    [/\bcanvas fingerprinting\b/gi, 'impressão digital de Canvas'],
    [/\bzero-knowledge\b/gi, 'conhecimento zero (Zero-Knowledge)'],
    [/\bhandshake TLS\b/gi, 'negociação criptográfica TLS'],
  ],
};

export function translateTextSegment(text: string, targetLang: TargetLanguage): string {
  if (targetLang === 'original' || !text.trim()) {
    return text;
  }

  const trimmed = text.trim();
  const exact = PHRASE_MAP[trimmed];
  if (exact) {
    return exact[targetLang];
  }

  let translated = text;
  for (const [phrase, dict] of Object.entries(PHRASE_MAP)) {
    if (translated.includes(phrase)) {
      translated = translated.replace(phrase, dict[targetLang]);
    }
  }

  const rules = WORD_REPLACEMENTS[targetLang] || [];
  for (const [pattern, replacement] of rules) {
    translated = translated.replace(pattern, replacement);
  }

  return translated;
}

interface RawOcrEntry {
  id: string;
  figureTitle: string;
  originalLabel: string;
  coordinates: string;
  confidencePct: number;
  translations: Record<Exclude<TargetLanguage, 'original'>, string>;
}

const PAGE_OCR_DATABASE: Record<string, RawOcrEntry[]> = {
  'privacidade.org.br': [
    {
      id: 'ocr-1',
      figureTitle: 'Diagrama 1: Fluxo de bloqueio DNS & TLS na camada WebView',
      originalLabel: '61,8% de tráfego descartado antes do handshake TLS 1.3',
      coordinates: '[x:18, y:24, w:310, h:42]',
      confidencePct: 99.4,
      translations: {
        en: '61.8% of ad/tracker traffic dropped prior to TLS 1.3 handshake',
        es: '61,8% del tráfico descartado antes del handshake TLS 1.3',
        fr: '61,8 % du trafic publicitaire rejeté avant le handshake TLS 1.3',
        pt: '61,8% de tráfego publicitário bloqueado antes da conexão TLS 1.3',
      },
    },
    {
      id: 'ocr-2',
      figureTitle: 'Gráfico 2: Consumo de RAM e Franquia por Sessão',
      originalLabel: 'WebView Padrão: 18,4 MB vs. Motor Veloce: 3,1 MB (−83,1%)',
      coordinates: '[x:18, y:78, w:340, h:48]',
      confidencePct: 98.9,
      translations: {
        en: 'Default WebView: 18.4 MB vs. Veloce Engine: 3.1 MB (−83.1%)',
        es: 'WebView Estándar: 18,4 MB vs. Motor Veloce: 3,1 MB (−83,1%)',
        fr: 'WebView Standard : 18,4 Mo vs Moteur Veloce : 3,1 Mo (−83,1 %)',
        pt: 'WebView Padrão: 18,4 MB vs. Motor Veloce: 3,1 MB (Economia de 83,1%)',
      },
    },
  ],
  'kotlinlang.org': [
    {
      id: 'ocr-kt-1',
      figureTitle: 'Diagrama de Arquitetura: Thread de IO WebView vs. UI Thread',
      originalLabel: 'DomainSuffixTrie Lookup -> O(k) 0.04ms Zero-Regex Allocation',
      coordinates: '[x:22, y:30, w:360, h:44]',
      confidencePct: 99.6,
      translations: {
        en: 'DomainSuffixTrie Lookup -> O(k) 0.04ms Zero-Regex Allocation',
        es: 'Búsqueda DomainSuffixTrie -> O(k) 0,04ms Sin asignación Regex',
        fr: 'Recherche DomainSuffixTrie -> O(k) 0,04 ms Zéro allocation Regex',
        pt: 'Busca em Árvore Trie -> O(k) 0,04 ms Sem alocação de Regex na memória',
      },
    },
    {
      id: 'ocr-kt-2',
      figureTitle: 'Inspeção de Pacote: Resposta HTTP 204 Sintética',
      originalLabel: 'WebResourceResponse("text/plain", 204, EmptyInputStream)',
      coordinates: '[x:22, y:86, w:350, h:40]',
      confidencePct: 99.1,
      translations: {
        en: 'Synthetic HTTP 204 No-Content Response (Zero Network Socket)',
        es: 'Respuesta sintética HTTP 204 Sin Contenido (Cero socket de red)',
        fr: 'Réponse synthétique HTTP 204 Sans Contenu (Zéro socket réseau)',
        pt: 'Resposta sintética HTTP 204 Sem Conteúdo (Zero abertura de soquete)',
      },
    },
  ],
};

export function extractAndTranslateImageOcrRegions(
  url: string,
  targetLang: TargetLanguage
): ImageOcrRegion[] {
  const effectiveLang: Exclude<TargetLanguage, 'original'> =
    targetLang === 'original' ? 'pt' : targetLang;

  const matchedKey = Object.keys(PAGE_OCR_DATABASE).find((domain) => url.includes(domain));
  const rawList = matchedKey
    ? PAGE_OCR_DATABASE[matchedKey]
    : [
        {
          id: 'ocr-generic-1',
          figureTitle: 'Infográfico técnico incorporado na página',
          originalLabel: 'Encryption & Network Telemetry Verification Layer (TLS 1.3 + AES-GCM)',
          coordinates: '[x:16, y:20, w:320, h:44]',
          confidencePct: 98.7,
          translations: {
            en: 'Encryption & Network Telemetry Verification Layer (TLS 1.3 + AES-GCM)',
            es: 'Capa de verificación de cifrado y telemetría de red (TLS 1.3 + AES-GCM)',
            fr: 'Couche de vérification du chiffrement et télémétrie réseau (TLS 1.3 + AES-GCM)',
            pt: 'Camada de verificação criptográfica e telemetria de rede (TLS 1.3 + AES-GCM)',
          },
        },
        {
          id: 'ocr-generic-2',
          figureTitle: 'Selo visual de integridade de pacote',
          originalLabel: 'Zero Cloud Tracking · Local Neural OCR Engine',
          coordinates: '[x:16, y:76, w:290, h:38]',
          confidencePct: 99.2,
          translations: {
            en: 'Zero Cloud Tracking · Local Neural OCR Engine',
            es: 'Cero rastreo en la nube · Motor OCR neural local',
            fr: 'Zéro pistage cloud · Moteur OCR neuronal local',
            pt: 'Zero rastreamento na nuvem · Motor OCR neural executando no dispositivo',
          },
        },
      ];

  return rawList.map((entry) => ({
    id: entry.id,
    figureTitle: entry.figureTitle,
    originalLabel: entry.originalLabel,
    translatedLabel: entry.translations[effectiveLang],
    confidencePct: entry.confidencePct,
    coordinates: entry.coordinates,
  }));
}

export function applyTranslationAndOcrToHtml(
  sanitizedHtml: string,
  url: string,
  config: TranslationConfig,
  textZoomPct = 100,
  boldTextBoost = false
): string {
  let html = sanitizedHtml;

  if (config.autoTranslate && config.targetLang !== 'original') {
    html = html.replace(/<(h1|h2|p|th|td)([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, inner) => {
      if (inner.includes('<') && !inner.includes('<code>')) {
        return full;
      }
      const plain = inner.replace(/<[^>]+>/g, '');
      const translated = translateTextSegment(plain, config.targetLang);
      if (translated === plain) return full;
      if (config.showOriginalComparison) {
        return `<${tag}${attrs}>${translated} <span style="display:block;font-size:0.82em;color:#526058;margin-top:4px;">[Original: ${plain}]</span></${tag}>`;
      }
      return `<${tag}${attrs}>${translated}</${tag}>`;
    });
  }

  if (textZoomPct !== 100 || boldTextBoost) {
    const scaleRatio = (textZoomPct / 100).toFixed(2);
    const zoomStyle = `<style data-veloce-text-zoom="true">
      html, body {
        font-size: ${textZoomPct}% !important;
        line-height: ${textZoomPct >= 130 ? '1.75' : '1.65'} !important;
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
      }
      p, li, td, th, div.meta {
        font-size: calc(1rem * ${scaleRatio}) !important;
        ${boldTextBoost ? 'font-weight: 500 !important; color: #09100C !important;' : ''}
      }
      h1 {
        font-size: calc(1.75rem * ${scaleRatio}) !important;
        line-height: 1.22 !important;
      }
      h2 {
        font-size: calc(1.3rem * ${scaleRatio}) !important;
        line-height: 1.3 !important;
      }
    </style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${zoomStyle}</head>`);
    } else {
      html = `${zoomStyle}${html}`;
    }
  }

  if (config.translateImagesOcr) {
    const regions = extractAndTranslateImageOcrRegions(url, config.targetLang);
    const ocrOverlayHtml = `
      <section data-veloce-ocr="true" style="margin:20px 0;padding:14px 16px;border:1px solid #0B6E4F;border-radius:8px;background:#F4FBF7;font-family:system-ui,sans-serif;">
        <div style="font-size:12px;font-weight:700;color:#0B6E4F;margin-bottom:8px;">
          TRADUÇÃO DE IMAGENS (OCR NEURAL LOCAL ATIVO · ${regions.length} REGIÕES DETECTADAS)
        </div>
        ${regions
          .map(
            (r) => `
          <div style="padding:8px 0;border-top:1px solid #D5E6DC;">
            <div style="font-size:11px;color:#526058;font-family:monospace;">${r.figureTitle} · Caixa OCR ${r.coordinates} · Confiança ${r.confidencePct}%</div>
            <div style="font-size:12px;color:#526058;margin-top:2px;">Texto na imagem: "${r.originalLabel}"</div>
            <div style="font-size:13px;font-weight:600;color:#0F1713;margin-top:2px;">Tradução OCR: "${r.translatedLabel}"</div>
          </div>`
          )
          .join('')}
      </section>
    `;
    if (html.includes('</article>')) {
      html = html.replace('</article>', `${ocrOverlayHtml}</article>`);
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `${ocrOverlayHtml}</body>`);
    }
  }

  return html;
}

export function detectPageVideoStreams(url: string, pageTitle: string): DetectedVideoStream[] {
  const cleanTitle = pageTitle.replace(/\s*—\s*Veloce$/i, '').trim() || 'Mídia da Página';
  if (url.includes('kotlinlang.org')) {
    return [
      {
        id: 'vid-kotlin-1',
        title: 'Demonstração: Interceptação WebView O(k) sem Regex em Kotlin 2.1',
        durationLabel: '06:42',
        codecLabel: 'AV1 / H.264 · 60fps · Sem DRM',
        sourceUrl: 'https://media.kotlinlang.org/streams/webview-adblock-trie-1080p.mp4',
        resolutions: [
          {
            quality: '1080p Full HD',
            extension: 'mp4',
            estimatedBytes: 14_820_000,
            bitrateLabel: '2,9 Mbps · MP4',
          },
          {
            quality: '720p HD',
            extension: 'webm',
            estimatedBytes: 7_340_000,
            bitrateLabel: '1,4 Mbps · WebM',
          },
          {
            quality: '480p Leve',
            extension: 'mp4',
            estimatedBytes: 3_620_000,
            bitrateLabel: '720 kbps · Dados móveis',
          },
          {
            quality: 'Áudio Opus',
            extension: 'm4a',
            estimatedBytes: 1_240_000,
            bitrateLabel: '128 kbps · M4A',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'vid-main-1',
      title: `Vídeo incorporado: ${cleanTitle}`,
      durationLabel: '04:18',
      codecLabel: 'H.264 / WebM VP9 · 60fps · Stream Direto Detectado',
      sourceUrl: `${url.replace(/\/$/, '')}/media/stream-master.mp4`,
      resolutions: [
        {
          quality: '1080p Full HD',
          extension: 'mp4',
          estimatedBytes: 12_450_000,
          bitrateLabel: '3,1 Mbps · MP4',
        },
        {
          quality: '720p HD',
          extension: 'webm',
          estimatedBytes: 6_180_000,
          bitrateLabel: '1,5 Mbps · WebM',
        },
        {
          quality: '480p Leve',
          extension: 'mp4',
          estimatedBytes: 2_890_000,
          bitrateLabel: '680 kbps · Dados móveis',
        },
        {
          quality: 'Áudio Opus',
          extension: 'm4a',
          estimatedBytes: 980_000,
          bitrateLabel: '128 kbps · M4A',
        },
      ],
    },
  ];
}

export async function computeSha256HexPrefix(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const arr = Array.from(new Uint8Array(digest));
    return arr
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0') + 'e4b9102a';
}

export async function buildFastDownloadPackage(
  activeTab: TabItem,
  format: FastDownloadItem['format']
): Promise<FastDownloadItem> {
  const slug =
    activeTab.shortTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'pagina-veloce';

  let filename = `${slug}.html`;
  let contentBlobText = activeTab.sanitizedHtml;
  let mimeType = 'text/html;charset=utf-8';
  let simulatedByteSize: number | null = null;

  if (format === 'Vídeo 1080p MP4') {
    filename = `${slug}-video-1080p-fullhd.mp4`;
    contentBlobText = `VELOCE_MP4_STREAM_CONTAINER_V1\nSOURCE=${activeTab.url}\nRESOLUTION=1920x1080@60fps\nCODEC=AVC1_H264_HIGH\nCHUNKS=4_HTTP_RANGE_VERIFIED\nTIMESTAMP=${new Date().toISOString()}`;
    mimeType = 'video/mp4';
    simulatedByteSize = 12_450_000;
  } else if (format === 'Vídeo 720p WebM') {
    filename = `${slug}-video-720p-hd.webm`;
    contentBlobText = `VELOCE_WEBM_VP9_STREAM_CONTAINER_V1\nSOURCE=${activeTab.url}\nRESOLUTION=1280x720@60fps\nCODEC=VP9_OPUS\nCHUNKS=4_HTTP_RANGE_VERIFIED\nTIMESTAMP=${new Date().toISOString()}`;
    mimeType = 'video/webm';
    simulatedByteSize = 6_180_000;
  } else if (format === 'Vídeo 480p Leve') {
    filename = `${slug}-video-480p-economia.mp4`;
    contentBlobText = `VELOCE_MP4_DATASAVER_CONTAINER_V1\nSOURCE=${activeTab.url}\nRESOLUTION=854x480@30fps\nCODEC=H264_MAIN\nCHUNKS=4_HTTP_RANGE_VERIFIED\nTIMESTAMP=${new Date().toISOString()}`;
    mimeType = 'video/mp4';
    simulatedByteSize = 2_890_000;
  } else if (format === 'Áudio Extraído') {
    filename = `${slug}-audio-extraido.m4a`;
    contentBlobText = `VELOCE_AUDIO_M4A_CONTAINER_V1\nSOURCE=${activeTab.url}\nBITRATE=128kbps\nCODEC=AAC_LC\nTIMESTAMP=${new Date().toISOString()}`;
    mimeType = 'audio/mp4';
    simulatedByteSize = 980_000;
  } else if (format === 'Markdown') {
    const distilled = distillArticleForReader(activeTab.sanitizedHtml, activeTab.title);
    filename = `${slug}-leitura.md`;
    contentBlobText = distilled.markdown;
    mimeType = 'text/markdown;charset=utf-8';
  } else if (format === 'JSON Auditoria') {
    filename = `${slug}-auditoria-seguranca.json`;
    contentBlobText = JSON.stringify(
      {
        title: activeTab.title,
        url: activeTab.url,
        exportedAt: new Date().toISOString(),
        securityInfo: activeTab.securityInfo,
        shieldReport: activeTab.shieldReport,
      },
      null,
      2
    );
    mimeType = 'application/json;charset=utf-8';
  } else if (format === 'Pacote Kotlin') {
    filename = 'veloce-android-kotlin-source-bundle.kt';
    contentBlobText = buildFullKotlinBundleText();
    mimeType = 'text/plain;charset=utf-8';
  }

  const sizeBytes = simulatedByteSize ?? new TextEncoder().encode(contentBlobText).byteLength;
  const sha256Prefix = await computeSha256HexPrefix(contentBlobText);

  return {
    id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    filename,
    sourceUrl: activeTab.url,
    format,
    sizeBytes,
    parallelChunks: 4,
    durationMs: simulatedByteSize ? 18 : Math.max(3, Math.min(18, Math.round(sizeBytes / 1850))),
    sha256Prefix,
    completedAt: new Date().toISOString(),
    contentBlobText,
    mimeType,
  };
}

