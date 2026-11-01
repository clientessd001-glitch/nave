import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_CORPUS } from '../data/webCorpus';
import { normalizeNavigationInput, runAdBlockFilter } from './adblockEngine';
import { processWebDocument, runDataSaverOptimizer } from './dataSaverEngine';
import {
  browserReducer,
  createInitialBrowserState,
  serializeStateForStorage,
} from './browserState';
import {
  countTextOccurrences,
  diagnoseUrlSecurity,
  distillArticleForReader,
} from './readerEngine';
import {
  applyTranslationAndOcrToHtml,
  buildFastDownloadPackage,
  detectPageVideoStreams,
  extractAndTranslateImageOcrRegions,
  translateTextSegment,
} from './translationAndDownloadEngine';
import { decryptBookmarksPayload, deriveVaultId, encryptBookmarksPayload } from './syncCrypto';
import {
  buildBatchImagesHtmlArchive,
  buildCastStreamManifest,
  buildQrCodeSvgMarkup,
  captureFullPageScrollingScreenshot,
  discoverLocalCastReceivers,
  extractPageImagesForGallery,
  generateDeterministicQrMatrix,
  generateStandardsCompliantPdfString,
  generateWireGuardConfigFile,
  getBuiltInPdfDocumentsForTab,
  getVpnServerNodes,
  resolveVpnTunnelStatus,
} from './mediaAndDocumentEngine';

test('AdBlockEngine strips trackers, ads, and fingerprinting probes while respecting domain whitelist', () => {
  const sample = BUILTIN_CORPUS[0];
  const activeConfig = {
    enabled: true,
    blockAds: true,
    blockTrackers: true,
    blockFingerprinting: true,
    blockThirdPartyCookies: true,
    stripTrackingParams: true,
    dohProvider: 'quad9' as const,
    blockWebRtcLeak: true,
    autoShredCookiesOnClose: true,
    whitelistedDomains: [],
    customRules: ['||custom-ad-network.org^'],
  };

  const result = runAdBlockFilter(sample.rawHtml, sample.url, activeConfig);
  assert.equal(result.isDomainWhitelisted, false);
  assert.ok(result.blockedItems.length >= 6, 'Expected at least 6 blocked trackers/ads on report page');
  assert.ok(result.savedBytes > 400_000, 'Expected substantial byte savings from blocked scripts/banners');
  assert.equal(result.filteredHtml.includes('googlesyndication.com'), false);
  assert.equal(result.filteredHtml.includes('data-fingerprint="canvas-probe"'), false);

  // Whitelisting the host must bypass blocking cleanly
  const whitelistedResult = runAdBlockFilter(sample.rawHtml, sample.url, {
    ...activeConfig,
    whitelistedDomains: ['privacidade.org.br'],
  });
  assert.equal(whitelistedResult.isDomainWhitelisted, true);
  assert.equal(whitelistedResult.blockedItems.length, 0);
  assert.equal(whitelistedResult.savedBytes, 0);
});

test('URL normalizer removes UTM and click-ID tracking parameters without altering clean parameters', () => {
  const res = normalizeNavigationInput(
    'https://privacidade.org.br/relatorio-2026?secao=rede&utm_source=social&fbclid=IwAR99281&gclid=test1',
    true
  );
  assert.equal(res.normalizedUrl, 'https://privacidade.org.br/relatorio-2026?secao=rede');
  assert.deepEqual(res.strippedParams.sort(), ['fbclid', 'gclid', 'utm_source']);
  assert.equal(res.securityInfo.isSecure, true);
});

test('DataSaverEngine compresses HTML, strips remote fonts, defers heavy figures, and preserves byte invariant', () => {
  const sample = BUILTIN_CORPUS[0];
  const out = runDataSaverOptimizer(sample.rawHtml, {
    enabled: true,
    compressHtml: true,
    deferHeavyMedia: true,
    stripExternalFonts: true,
    blockAutoplayMedia: true,
  });

  assert.equal(out.deferredMediaCount, 1);
  assert.ok(out.savedBytes >= 400_000);
  assert.equal(out.optimizedHtml.includes('heavy-editorial-font.woff2'), false);
  assert.equal(out.optimizedHtml.includes('deferred-media-btn'), true);

  const pipeline = processWebDocument(
    sample.rawHtml,
    sample.url,
    {
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
      customRules: [],
    },
    {
      enabled: true,
      compressHtml: true,
      deferHeavyMedia: true,
      stripExternalFonts: true,
      blockAutoplayMedia: true,
    }
  );
  assert.ok(pipeline.shieldReport.finalBytes < pipeline.shieldReport.originalBytes);
});

test('BrowserState strictly isolates Incognito tabs from History and localStorage persistence', () => {
  let state = createInitialBrowserState();
  const initialHistoryCount = state.history.length;

  // 1. Open an Incognito tab and navigate to an article
  state = browserReducer(state, {
    type: 'OPEN_TAB',
    url: 'https://criptografia.ufsc.br/aes-gcm',
    isIncognito: true,
  });

  const incognitoTab = state.tabs.find((t) => t.id === state.activeTabId);
  assert.ok(incognitoTab?.isIncognito);
  assert.equal(
    state.history.length,
    initialHistoryCount,
    'Opening/navigating in Incognito tab must NEVER add to history'
  );

  // Navigate further inside Incognito tab
  state = browserReducer(state, {
    type: 'COMMIT_NAVIGATION',
    tabId: state.activeTabId,
    rawUrl: 'https://arquitetura-limpa.dev/minimalismo',
    rawHtml: BUILTIN_CORPUS[3].rawHtml,
    loadTimeMs: 9,
  });
  assert.equal(
    state.history.length,
    initialHistoryCount,
    'Subsequent navigation in Incognito tab must NEVER add to history'
  );

  // Verify serializer strips incognito tabs from disk persistence
  const serialized = JSON.parse(serializeStateForStorage(state));
  assert.equal(
    serialized.tabUrls.some((t: { id: string }) => t.id === incognitoTab?.id),
    false,
    'Incognito tab must never be serialized to localStorage'
  );

  // Shred all incognito tabs
  state = browserReducer(state, { type: 'SHRED_INCOGNITO_TABS' });
  assert.equal(state.tabs.some((t) => t.isIncognito), false);
});

test('SyncCryptoEngine performs authentic AES-256-GCM encryption/decryption and rejects tampering', async () => {
  const initial = createInitialBrowserState();
  const passphrase = 'chave-secreta-teste-veloce';

  const vaultA = await deriveVaultId(passphrase);
  const vaultB = await deriveVaultId(passphrase);
  assert.equal(vaultA, vaultB);

  const envelope = await encryptBookmarksPayload(initial.bookmarks, passphrase, 'Pixel 8 Pro');
  assert.ok(envelope.ciphertextBase64.length > 40);
  assert.equal(envelope.ciphertextBase64.includes('privacidade.org.br'), false);

  const decrypted = await decryptBookmarksPayload(envelope, passphrase);
  assert.equal(decrypted.length, initial.bookmarks.length);
  assert.equal(decrypted[0].url, initial.bookmarks[0].url);

  await assert.rejects(
    () => decryptBookmarksPayload(envelope, 'chave-incorreta-999'),
    /Falha na autenticação GCM/
  );
});

test('ReaderEngine distills article blocks, computes word count and Markdown, and diagnoses URL security', () => {
  const sample = BUILTIN_CORPUS[0];
  const distilled = distillArticleForReader(sample.rawHtml, sample.title);
  assert.equal(distilled.title, sample.title);
  assert.ok(distilled.wordCount > 60);
  assert.ok(distilled.readingTimeMinutes >= 1);
  assert.ok(distilled.markdown.includes('# Auditoria de rastreadores'));

  const hits = countTextOccurrences(distilled.blocks, 'TLS');
  assert.ok(hits >= 1);

  const state = createInitialBrowserState();
  const diagBlocked = diagnoseUrlSecurity(
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?utm_source=ad',
    state.adBlock
  );
  assert.equal(diagBlocked.isBlockedDomain, true);
  assert.deepEqual(diagBlocked.strippedParams, ['utm_source']);
});

test('Auto-Translation, Image OCR, Instant BFCache (Voltar sem atualizar) and Fast Multi-Chunk Download work end-to-end', async () => {
  // 1. Auto-Translation
  const translatedTitle = translateTextSegment(
    'Auditoria de rastreadores e consumo de dados em navegadores móveis',
    'en'
  );
  assert.equal(translatedTitle, 'Tracker Audit and Data Consumption in Mobile Web Browsers');

  // 2. Image OCR Translation
  const ocrRegions = extractAndTranslateImageOcrRegions(
    'https://privacidade.org.br/relatorio-2026',
    'en'
  );
  assert.ok(ocrRegions.length >= 2);
  assert.ok(ocrRegions[0].translatedLabel.includes('61.8%'));

  // 3. Apply translation + OCR overlay + Text Zoom (Ampliar texto 130%) to HTML
  let state = createInitialBrowserState();
  const activeTab = state.tabs[0];
  const htmlWithOcrAndZoom = applyTranslationAndOcrToHtml(
    activeTab.sanitizedHtml,
    activeTab.url,
    {
      autoTranslate: true,
      targetLang: 'en',
      translateImagesOcr: true,
      showOriginalComparison: false,
    },
    130,
    true
  );
  assert.equal(htmlWithOcrAndZoom.includes('data-veloce-ocr="true"'), true);
  assert.equal(htmlWithOcrAndZoom.includes('data-veloce-text-zoom="true"'), true);
  assert.equal(htmlWithOcrAndZoom.includes('font-size: 130%'), true);
  assert.equal(htmlWithOcrAndZoom.includes('Tracker Audit and Data Consumption'), true);

  // 4. Instant BFCache (Voltar sem atualizar -> 0ms latency)
  const initialHits = state.stats.bfCacheHits;
  state = browserReducer(state, {
    type: 'RESTORE_FROM_BFCACHE',
    tabId: activeTab.id,
    targetHistoryIndex: 0,
  });
  const restoredTab = state.tabs.find((t) => t.id === activeTab.id)!;
  assert.equal(restoredTab.loadTimeMs, 0);
  assert.equal(restoredTab.restoredFromBfCache, true);
  assert.equal(state.stats.bfCacheHits, initialHits + 1);

  // 5. Video Stream Detection & Multi-Connection Video Download
  const videos = detectPageVideoStreams(activeTab.url, activeTab.title);
  assert.ok(videos.length >= 1);
  assert.equal(videos[0].resolutions[0].quality, '1080p Full HD');

  const videoPkg = await buildFastDownloadPackage(activeTab, 'Vídeo 1080p MP4');
  assert.equal(videoPkg.parallelChunks, 4);
  assert.equal(videoPkg.mimeType, 'video/mp4');
  assert.ok(videoPkg.filename.endsWith('.mp4'));
  assert.equal(videoPkg.sha256Prefix.length, 16);
});

test('TV Casting, Scrolling Screenshot, Image Gallery & Batch Save, QR Code, and PDF Viewer engines work deterministically', () => {
  const state = createInitialBrowserState();
  const activeTab = state.tabs[0];

  // 1. TV Casting (Transmissão para TV)
  const receivers = discoverLocalCastReceivers();
  assert.ok(receivers.length >= 4);
  const castManifest = buildCastStreamManifest(activeTab, receivers[0], 'video-direct');
  assert.ok(castManifest.endpointUrl.includes(receivers[0].localIp));
  assert.ok(castManifest.manifestSummary.includes(receivers[0].name));

  // 2. Full-Page Scrolling Screenshot (Captura de tela com rolagem)
  const scrollCap = captureFullPageScrollingScreenshot(activeTab, true);
  assert.equal(scrollCap.widthPx, 1200);
  assert.ok(scrollCap.heightPx > 700);
  assert.ok(scrollCap.stitchedSections >= 2);
  assert.ok(scrollCap.svgMarkup.startsWith('<svg'));
  assert.ok(scrollCap.svgMarkup.includes('CAPTURA DE TELA COM ROLAGEM COMPLETA'));

  // 3. View Only Images & Save All Images (Visualizar somente imagens / Salvar todas as imagens)
  const pageImages = extractPageImagesForGallery(activeTab);
  assert.equal(pageImages.length, 4);
  assert.ok(pageImages.every((img) => img.svgContent.includes('<svg')));

  const batchArchive = buildBatchImagesHtmlArchive(activeTab, pageImages);
  assert.ok(batchArchive.filename.endsWith('.html'));
  assert.ok(batchArchive.content.includes('Pacote Completo de Imagens Salvas (4 imagens)'));
  assert.ok(batchArchive.sizeBytes > 1500);

  // 4. Offline QR Code Generator (Código QR)
  const qrMatrix = generateDeterministicQrMatrix(activeTab.url);
  assert.equal(qrMatrix.length, 25);
  assert.equal(qrMatrix[0].length, 25);
  assert.equal(qrMatrix[0][0], true); // Top-left finder corner
  assert.equal(qrMatrix[0][6], true);
  assert.equal(qrMatrix[3][3], true); // Finder center

  const qrSvg = buildQrCodeSvgMarkup(activeTab.url, 280);
  assert.ok(qrSvg.startsWith('<svg'));
  assert.ok(qrSvg.includes('shape-rendering="crispEdges"'));

  // 5. Built-in PDF Viewer & Standards-Compliant %PDF-1.4 Generator (Visualizador de PDF)
  const pdfDocs = getBuiltInPdfDocumentsForTab(activeTab);
  assert.ok(pdfDocs.length >= 2);
  const rawPdf = generateStandardsCompliantPdfString(pdfDocs[0]);
  assert.ok(rawPdf.startsWith('%PDF-1.4'));
  assert.ok(rawPdf.trim().endsWith('%%EOF'));
});

test('Unlimited Built-in VPN (VPN Ilimitada WireGuard) resolves servers, rotates masked IPs, and exports .conf profiles', () => {
  let state = createInitialBrowserState();
  assert.equal(state.vpn.enabled, true);
  assert.equal(state.vpn.selectedLocationId, 'ch-zh');

  const nodes = getVpnServerNodes();
  assert.equal(nodes.length, 6);

  const initialStatus = resolveVpnTunnelStatus(state.vpn, 50_000);
  assert.equal(initialStatus.server.country, 'Suíça');
  assert.ok(initialStatus.maskedExitIp.startsWith('185.212.164.'));
  assert.ok(initialStatus.bandwidthPolicyLabel.includes('Ilimitada'));

  // Rotate masked IP
  state = browserReducer(state, { type: 'ROTATE_VPN_IP' });
  const rotatedStatus = resolveVpnTunnelStatus(state.vpn, 50_000);
  assert.notEqual(rotatedStatus.maskedExitIp, initialStatus.maskedExitIp);

  // Switch server location to São Paulo, Brasil
  state = browserReducer(state, {
    type: 'UPDATE_VPN',
    patch: { selectedLocationId: 'br-sp', protocol: 'multihop-double' },
  });
  const brStatus = resolveVpnTunnelStatus(state.vpn, 0);
  assert.equal(brStatus.server.city, 'São Paulo');
  assert.ok(brStatus.maskedExitIp.startsWith('177.54.148.'));
  assert.ok(brStatus.protocolLabel.includes('Multi-Hop'));

  // Generate WireGuard .conf file
  const wgConf = generateWireGuardConfigFile(state.vpn);
  assert.equal(wgConf.filename, 'veloce-vpn-ilimitada-br-sp.conf');
  assert.ok(wgConf.content.includes('[Interface]'));
  assert.ok(wgConf.content.includes('[Peer]'));
  assert.ok(wgConf.sizeBytes > 200);
});



