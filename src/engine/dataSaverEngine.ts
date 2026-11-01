import type { AdBlockConfig, DataSaverConfig, SecurityInfo, ShieldReport } from '../types/browser';
import { normalizeNavigationInput, runAdBlockFilter, utf8ByteLength } from './adblockEngine';

export interface DataSaverOutput {
  optimizedHtml: string;
  savedBytes: number;
  deferredMediaCount: number;
}

export function runDataSaverOptimizer(rawHtml: string, config: DataSaverConfig): DataSaverOutput {
  if (!config.enabled) {
    return {
      optimizedHtml: rawHtml,
      savedBytes: 0,
      deferredMediaCount: 0,
    };
  }

  let working = rawHtml;
  let savedBytes = 0;
  let deferredMediaCount = 0;

  // 1. Strip external heavy web fonts
  if (config.stripExternalFonts) {
    working = working.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*(?:font|woff2)[^"']*["'][^>]*\/?>/gi,
      (fullTag) => {
        const fontBytesMatch = fullTag.match(/data-font-bytes=["'](\d+)["']/i);
        savedBytes += fontBytesMatch ? Number(fontBytesMatch[1]) : 96_000;
        return '';
      }
    );
  }

  // 2. Block autoplay video streams
  if (config.blockAutoplayMedia) {
    working = working.replace(/<video\b[^>]*\bautoplay\b[^>]*>[\s\S]*?<\/video>/gi, (fullTag) => {
      const videoBytesMatch = fullTag.match(/data-autoplay-bytes=["'](\d+)["']/i);
      savedBytes += videoBytesMatch ? Number(videoBytesMatch[1]) : 280_000;
      return '';
    });
  }

  // 3. Defer heavy figures/diagrams until explicit user tap
  if (config.deferHeavyMedia) {
    let mediaIndex = 0;
    working = working.replace(
      /<figure\b[^>]*data-heavy-media=["']([^"']+)["'][^>]*data-heavy-bytes=["'](\d+)["'][^>]*data-label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/figure>/gi,
      (_full, mediaId: string, bytesStr: string, label: string, innerContent: string) => {
        const mediaBytes = Number(bytesStr) || 180_000;
        savedBytes += mediaBytes;
        deferredMediaCount += 1;
        mediaIndex += 1;
        const kbLabel = Math.round(mediaBytes / 1024);
        const encodedInner = encodeURIComponent(innerContent);
        const safeId = `veloce-deferred-${mediaIndex}-${mediaId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        return `<figure id="${safeId}">
          <button type="button" class="deferred-media-btn" data-expand-target="${safeId}" data-encoded-html="${encodedInner}">
            Carregar gráfico sob demanda · ${label} (${kbLabel} KB poupados)
          </button>
        </figure>`;
      }
    );
  }

  // 4. Minify HTML comments and redundant whitespace
  if (config.compressHtml) {
    const beforeLen = utf8ByteLength(working);
    working = working
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\n\s+/g, '\n')
      .replace(/\s{2,}/g, ' ');
    const afterLen = utf8ByteLength(working);
    if (beforeLen > afterLen) {
      savedBytes += beforeLen - afterLen;
    }
  }

  return {
    optimizedHtml: working,
    savedBytes,
    deferredMediaCount,
  };
}

const NAVIGATION_BRIDGE_SCRIPT = `<script>
(function(){
  document.addEventListener('click', function(ev) {
    var expandBtn = ev.target && ev.target.closest ? ev.target.closest('[data-expand-target]') : null;
    if (expandBtn) {
      ev.preventDefault();
      var targetId = expandBtn.getAttribute('data-expand-target');
      var encoded = expandBtn.getAttribute('data-encoded-html');
      var container = targetId ? document.getElementById(targetId) : null;
      if (container && encoded) {
        container.innerHTML = decodeURIComponent(encoded);
      }
      return;
    }
    var anchor = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    ev.preventDefault();
    var resolved = href;
    try {
      resolved = new URL(href, document.baseURI || 'https://privacidade.org.br/').toString();
    } catch (_) {}
    window.parent.postMessage({
      type: 'VELOCE_NAVIGATE',
      url: resolved,
      openInNewTab: Boolean(ev.metaKey || ev.ctrlKey || anchor.target === '_blank')
    }, '*');
  });
})();
</script>`;

export interface PipelineOutput {
  normalizedUrl: string;
  sanitizedHtml: string;
  title: string;
  securityInfo: SecurityInfo;
  shieldReport: ShieldReport;
}

export function processWebDocument(
  rawHtml: string,
  rawUrl: string,
  adBlockConfig: AdBlockConfig,
  dataSaverConfig: DataSaverConfig
): PipelineOutput {
  const { normalizedUrl, strippedParams, securityInfo } = normalizeNavigationInput(
    rawUrl,
    adBlockConfig.enabled && adBlockConfig.stripTrackingParams
  );

  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const extractedTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : normalizedUrl;

  const baseRawBytes = utf8ByteLength(rawHtml);

  const adBlockOut = runAdBlockFilter(rawHtml, normalizedUrl, adBlockConfig);
  const dataSaverOut = runDataSaverOptimizer(adBlockOut.filteredHtml, dataSaverConfig);

  const htmlBytesAfter = utf8ByteLength(dataSaverOut.optimizedHtml);
  const totalDeclaredSavings = adBlockOut.savedBytes + dataSaverOut.savedBytes;
  const originalBytes = htmlBytesAfter + totalDeclaredSavings || baseRawBytes;
  const finalBytes = htmlBytesAfter;

  const withBridge = dataSaverOut.optimizedHtml.includes('</body>')
    ? dataSaverOut.optimizedHtml.replace('</body>', `${NAVIGATION_BRIDGE_SCRIPT}</body>`)
    : `${dataSaverOut.optimizedHtml}${NAVIGATION_BRIDGE_SCRIPT}`;

  return {
    normalizedUrl,
    sanitizedHtml: withBridge,
    title: extractedTitle,
    securityInfo,
    shieldReport: {
      originalBytes,
      finalBytes,
      adBlockSavedBytes: adBlockOut.savedBytes,
      dataSaverSavedBytes: dataSaverOut.savedBytes,
      blockedItems: adBlockOut.blockedItems,
      deferredMediaCount: dataSaverOut.deferredMediaCount,
      strippedTrackingParams: strippedParams,
      isDomainWhitelisted: adBlockOut.isDomainWhitelisted,
    },
  };
}
