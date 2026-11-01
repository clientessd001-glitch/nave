import type { AdBlockConfig, BlockedRequestItem, SecurityInfo } from '../types/browser';

export interface DefaultBlockRule {
  pattern: string;
  domainMatch: string;
  category: 'Rastreador' | 'Anúncio' | 'Fingerprinting' | 'Cookie 3P';
}

export const BUILTIN_EASYLIST_RULES: DefaultBlockRule[] = [
  { pattern: '||googlesyndication.com^', domainMatch: 'googlesyndication.com', category: 'Anúncio' },
  { pattern: '||doubleclick.net^', domainMatch: 'doubleclick.net', category: 'Anúncio' },
  { pattern: '||pubmatic.com^', domainMatch: 'pubmatic.com', category: 'Anúncio' },
  { pattern: '||criteo.net^', domainMatch: 'criteo.net', category: 'Anúncio' },
  { pattern: '||ad-video-stream.net^', domainMatch: 'ad-video-stream.net', category: 'Anúncio' },
  { pattern: '||google-analytics.com^', domainMatch: 'google-analytics.com', category: 'Rastreador' },
  { pattern: '||googletagmanager.com^', domainMatch: 'googletagmanager.com', category: 'Rastreador' },
  { pattern: '||connect.facebook.net^', domainMatch: 'connect.facebook.net', category: 'Rastreador' },
  { pattern: '||scorecardresearch.com^', domainMatch: 'scorecardresearch.com', category: 'Rastreador' },
  { pattern: '||hotjar.com^', domainMatch: 'hotjar.com', category: 'Rastreador' },
  { pattern: '||bat.bing.com^', domainMatch: 'bat.bing.com', category: 'Rastreador' },
];

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'yclid',
  '_hsenc',
]);

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function extractDomain(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('veloce://')) {
    return trimmed.replace('veloce://', '').split(/[/?#]/)[0] || 'inicio';
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.toLowerCase();
  } catch {
    return trimmed.split('/')[0].toLowerCase() || 'desconhecido';
  }
}

export function normalizeNavigationInput(
  rawInput: string,
  stripTrackingParams: boolean
): { normalizedUrl: string; strippedParams: string[]; securityInfo: SecurityInfo } {
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed === 'veloce://inicio' || trimmed === 'about:blank') {
    return {
      normalizedUrl: 'veloce://inicio',
      strippedParams: [],
      securityInfo: {
        protocol: 'veloce',
        isSecure: true,
        tlsLabel: 'Página interna isolada',
        trackingParamsCleaned: false,
      },
    };
  }

  if (trimmed.startsWith('veloce://')) {
    return {
      normalizedUrl: trimmed,
      strippedParams: [],
      securityInfo: {
        protocol: 'veloce',
        isSecure: true,
        tlsLabel: 'Motor local isolado',
        trackingParamsCleaned: false,
      },
    };
  }

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed) && !trimmed.includes(' '));

  if (!looksLikeUrl) {
    return {
      normalizedUrl: `veloce://busca?q=${encodeURIComponent(trimmed)}`,
      strippedParams: [],
      securityInfo: {
        protocol: 'veloce',
        isSecure: true,
        tlsLabel: 'Busca privada local',
        trackingParamsCleaned: false,
      },
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    const strippedParams: string[] = [];
    if (stripTrackingParams) {
      for (const key of [...parsed.searchParams.keys()]) {
        if (TRACKING_QUERY_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
          parsed.searchParams.delete(key);
          strippedParams.push(key);
        }
      }
    }
    const isHttps = parsed.protocol === 'https:';
    return {
      normalizedUrl: parsed.toString().replace(/\/$/, parsed.pathname === '/' && !parsed.search ? '' : '/'),
      strippedParams,
      securityInfo: {
        protocol: isHttps ? 'https' : 'http',
        isSecure: isHttps,
        tlsLabel: isHttps ? 'HTTPS · TLS 1.3 verificado' : 'HTTP sem criptografia de transporte',
        trackingParamsCleaned: strippedParams.length > 0,
      },
    };
  } catch {
    return {
      normalizedUrl: `veloce://busca?q=${encodeURIComponent(trimmed)}`,
      strippedParams: [],
      securityInfo: {
        protocol: 'veloce',
        isSecure: true,
        tlsLabel: 'Busca privada local',
        trackingParamsCleaned: false,
      },
    };
  }
}

export function normalizeCustomRuleToDomain(rule: string): string | null {
  const cleaned = rule
    .trim()
    .toLowerCase()
    .replace(/^\|\|/, '')
    .replace(/\^.*$/, '')
    .replace(/^https?:\/\//, '')
    .split('/')[0];
  return cleaned.length >= 3 ? cleaned : null;
}

export function matchesDomainRule(hostOrUrl: string, domainRule: string): boolean {
  const lowerTarget = hostOrUrl.toLowerCase();
  let host = lowerTarget;
  try {
    if (lowerTarget.startsWith('http://') || lowerTarget.startsWith('https://')) {
      host = new URL(lowerTarget).hostname.toLowerCase();
    }
  } catch {
    // Keep raw target if not full URL
  }
  return host === domainRule || host.endsWith(`.${domainRule}`) || lowerTarget.includes(domainRule);
}

export interface AdBlockFilterOutput {
  filteredHtml: string;
  blockedItems: BlockedRequestItem[];
  savedBytes: number;
  isDomainWhitelisted: boolean;
}

export function runAdBlockFilter(
  rawHtml: string,
  pageUrl: string,
  config: AdBlockConfig
): AdBlockFilterOutput {
  const domain = extractDomain(pageUrl);
  const isDomainWhitelisted = config.whitelistedDomains.some(
    (w) => w.toLowerCase() === domain || domain.endsWith(`.${w.toLowerCase()}`)
  );

  if (!config.enabled || isDomainWhitelisted) {
    return {
      filteredHtml: rawHtml,
      blockedItems: [],
      savedBytes: 0,
      isDomainWhitelisted,
    };
  }

  const blockedItems: BlockedRequestItem[] = [];
  let savedBytes = 0;
  let seq = 1;

  const customRuleDomains = config.customRules
    .map((r) => ({ raw: r, parsed: normalizeCustomRuleToDomain(r) }))
    .filter((x): x is { raw: string; parsed: string } => x.parsed !== null);

  let workingHtml = rawHtml;

  // 1. Intercept external <script src="..."> matching ad/tracker/custom rules
  workingHtml = workingHtml.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi,
    (fullTag, srcUrl: string) => {
      const dataBytesMatch = fullTag.match(/data-bytes=["'](\d+)["']/i);
      const declaredBytes = dataBytesMatch ? Number(dataBytesMatch[1]) : utf8ByteLength(fullTag) + 28_000;

      for (const rule of BUILTIN_EASYLIST_RULES) {
        const categoryEnabled =
          (rule.category === 'Anúncio' && config.blockAds) ||
          (rule.category === 'Rastreador' && config.blockTrackers);
        if (categoryEnabled && matchesDomainRule(srcUrl, rule.domainMatch)) {
          blockedItems.push({
            id: `blk-${seq++}`,
            domain: extractDomain(srcUrl),
            category: rule.category,
            rule: rule.pattern,
            bytesAvoided: declaredBytes,
          });
          savedBytes += declaredBytes;
          return '';
        }
      }

      for (const custom of customRuleDomains) {
        if (matchesDomainRule(srcUrl, custom.parsed)) {
          blockedItems.push({
            id: `blk-${seq++}`,
            domain: extractDomain(srcUrl),
            category: 'Anúncio',
            rule: custom.raw,
            bytesAvoided: declaredBytes,
          });
          savedBytes += declaredBytes;
          return '';
        }
      }

      return fullTag;
    }
  );

  // 2. Block Canvas/Audio/WebGL fingerprinting inline probes
  if (config.blockFingerprinting) {
    workingHtml = workingHtml.replace(
      /<script\b[^>]*data-fingerprint=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi,
      (fullTag, fpName: string) => {
        const dataBytesMatch = fullTag.match(/data-bytes=["'](\d+)["']/i);
        const declaredBytes = dataBytesMatch ? Number(dataBytesMatch[1]) : utf8ByteLength(fullTag) + 12_000;
        blockedItems.push({
          id: `blk-${seq++}`,
          domain: `${domain} (${fpName})`,
          category: 'Fingerprinting',
          rule: '##script[data-fingerprint]',
          bytesAvoided: declaredBytes,
        });
        savedBytes += declaredBytes;
        return '';
      }
    );
  }

  // 3. Block 1x1 tracking pixels
  if (config.blockTrackers) {
    workingHtml = workingHtml.replace(
      /<img\b[^>]*data-tracker-pixel=["']true["'][^>]*\/?>/gi,
      (fullTag) => {
        const srcMatch = fullTag.match(/src=["']([^"']+)["']/i);
        const dataBytesMatch = fullTag.match(/data-bytes=["'](\d+)["']/i);
        const declaredBytes = dataBytesMatch ? Number(dataBytesMatch[1]) : 8_400;
        const pixelDomain = srcMatch ? extractDomain(srcMatch[1]) : 'pixel.tracker';
        blockedItems.push({
          id: `blk-${seq++}`,
          domain: pixelDomain,
          category: 'Cookie 3P',
          rule: `||${pixelDomain}^$image,third-party`,
          bytesAvoided: declaredBytes,
        });
        savedBytes += declaredBytes;
        return '';
      }
    );
  }

  // 4. Cosmetic Ad Slot stripping (.ad-slot / [data-ad-unit])
  if (config.blockAds) {
    workingHtml = workingHtml.replace(
      /<div\b[^>]*(?:class=["'][^"']*\bad-slot\b[^"']*["']|data-ad-unit=["'][^"']+["'])[^>]*>[\s\S]*?<\/div>/gi,
      (fullTag) => {
        const unitMatch = fullTag.match(/data-ad-unit=["']([^"']+)["']/i);
        const dataBytesMatch = fullTag.match(/data-bytes=["'](\d+)["']/i);
        const declaredBytes = dataBytesMatch ? Number(dataBytesMatch[1]) : utf8ByteLength(fullTag) + 45_000;
        blockedItems.push({
          id: `blk-${seq++}`,
          domain: `${domain} [${unitMatch ? unitMatch[1] : 'banner'}]`,
          category: 'Anúncio',
          rule: '##.ad-slot, [data-ad-unit]',
          bytesAvoided: declaredBytes,
        });
        savedBytes += declaredBytes;
        return '';
      }
    );
  }

  return {
    filteredHtml: workingHtml,
    blockedItems,
    savedBytes,
    isDomainWhitelisted: false,
  };
}
