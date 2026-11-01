export interface CorpusSite {
  url: string;
  title: string;
  shortTitle: string;
  summary: string;
  category: string;
  rawHtml: string;
}

const SHARED_PAGE_STYLES = `
  body {
    margin: 0;
    padding: 28px 32px 48px;
    font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #1e252b;
    background: #fcfdfd;
    line-height: 1.62;
    font-size: 16px;
  }
  main {
    max-width: 720px;
    margin: 0 auto;
  }
  header {
    padding-bottom: 18px;
    margin-bottom: 24px;
    border-bottom: 1px solid #d5dde2;
  }
  h1 {
    font-size: 28px;
    line-height: 1.18;
    font-weight: 600;
    margin: 0 0 10px;
    color: #12181d;
  }
  h2 {
    font-size: 19px;
    line-height: 1.25;
    font-weight: 600;
    margin: 28px 0 10px;
    color: #151c22;
  }
  p {
    margin: 0 0 16px;
    color: #2a333b;
  }
  .meta {
    font-size: 13px;
    color: #54616c;
  }
  a {
    color: #145a4b;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0 24px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #dde4e8;
  }
  th {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #52606b;
    font-weight: 600;
  }
  td.num, th.num {
    text-align: right;
  }
  pre {
    background: #f2f5f7;
    border: 1px solid #d8e0e5;
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #182026;
  }
  figure {
    margin: 22px 0;
    padding: 16px 0;
    border-top: 1px solid #dde4e8;
    border-bottom: 1px solid #dde4e8;
  }
  figcaption {
    font-size: 13px;
    color: #54616c;
    margin-top: 8px;
  }
  .ad-slot, [data-ad-unit] {
    border: 1px dashed #c89b6e;
    padding: 14px;
    margin: 16px 0;
    background: #fff9f2;
    font-size: 13px;
    color: #6e4e2e;
  }
  .deferred-media-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 8px 14px;
    border: 1px solid #9ab0ba;
    border-radius: 6px;
    background: #ffffff;
    color: #164e41;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .deferred-media-btn:hover {
    background: #f3f7f8;
  }
  nav.related {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #d5dde2;
    font-size: 14px;
  }
`;

export const BUILTIN_CORPUS: CorpusSite[] = [
  {
    url: 'https://privacidade.org.br/relatorio-2026',
    title: 'Auditoria de rastreadores e consumo de dados em navegadores móveis',
    shortTitle: 'Relatório TLS',
    summary: 'Medição empírica de scripts de terceiros, fingerprinting de Canvas e impacto de bloqueadores nativos na latência de páginas.',
    category: 'Segurança',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Auditoria de rastreadores e consumo de dados em navegadores móveis</title>
  <link rel="stylesheet" href="https://fonts.cdn-tracker.net/heavy-editorial-font.woff2" data-font-bytes="164000" />
  <script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" data-bytes="148200"></script>
  <script src="https://www.google-analytics.com/analytics.js" data-bytes="52400"></script>
  <script src="https://connect.facebook.net/en_US/fbevents.js" data-bytes="96800"></script>
  <script data-fingerprint="canvas-probe" data-bytes="38900">
    /* Probe de entropia Canvas e WebGL para identificação silenciosa de dispositivo */
    window.__fpProbe = function() { return navigator.hardwareConcurrency + ':' + screen.colorDepth; };
  </script>
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <!-- Comentário extenso de telemetria legado removido pelo compactador de HTML em modo de economia de dados para reduzir bytes transferidos em redes móveis 4G/5G -->
  <main>
    <header>
      <h1>Auditoria de rastreadores e consumo de dados em navegadores móveis</h1>
      <div class="meta">Observatório Brasileiro de Privacidade Digital · Outubro de 2026 · Conexão verificada TLS 1.3</div>
    </header>

    <div class="ad-slot" data-ad-unit="leaderboard-top" data-bytes="118500">
      Publicidade programática segmentada · Leilão em tempo real (RTB) · 118 KB de mídia externa
    </div>

    <p>
      Em testes realizados em 1.200 portais lusófonos sobre conexões móveis de 20 Mbps, scripts publicitários e coletores de telemetria representaram <strong>61,8% dos bytes transferidos</strong> antes da primeira pintura de texto útil. A interceptação direta na camada de rede nativa (<code>shouldInterceptRequest</code> no Android WebView em Kotlin) elimina a resolução DNS e o handshake TLS de domínios terceiros.
    </p>

    <h2>Comparativo de transferência por sessão de leitura (10 páginas)</h2>
    <table>
      <thead>
        <tr>
          <th>Configuração do motor</th>
          <th class="num">Requisições</th>
          <th class="num">Dados transferidos</th>
          <th class="num">Tempo até leitura</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>WebView padrão sem filtragem</td>
          <td class="num">412</td>
          <td class="num">18,4 MB</td>
          <td class="num">3.420 ms</td>
        </tr>
        <tr>
          <td>Escudo AdBlock ativo (Trie em memória)</td>
          <td class="num">118</td>
          <td class="num">7,9 MB</td>
          <td class="num">1.180 ms</td>
        </tr>
        <tr>
          <td>AdBlock + Economia de dados sob demanda</td>
          <td class="num">64</td>
          <td class="num">3,1 MB</td>
          <td class="num">490 ms</td>
        </tr>
      </tbody>
    </table>

    <figure data-heavy-media="grafico-latencia" data-heavy-bytes="246000" data-label="Diagrama vetorial de distribuição de latência por camada TLS (240 KB)">
      <svg viewBox="0 0 640 170" width="100%" height="auto" role="img" aria-label="Comparação de latência entre navegação comum e filtrada">
        <rect x="0" y="0" width="640" height="170" fill="#f6f9fa" />
        <text x="16" y="28" font-size="13" font-weight="600" fill="#182229">Tempo acumulado de carregamento por etapa (ms)</text>
        <text x="16" y="64" font-size="13" fill="#32404a">Sem bloqueio</text>
        <rect x="140" y="48" width="440" height="22" rx="3" fill="#c98a5b" />
        <text x="588" y="64" font-size="13" fill="#182229">3.420 ms</text>
        <text x="16" y="104" font-size="13" fill="#32404a">Escudo AdBlock</text>
        <rect x="140" y="88" width="152" height="22" rx="3" fill="#2f7a67" />
        <text x="300" y="104" font-size="13" fill="#182229">1.180 ms</text>
        <text x="16" y="144" font-size="13" fill="#32404a">Economia máxima</text>
        <rect x="140" y="128" width="64" height="22" rx="3" fill="#185949" />
        <text x="212" y="144" font-size="13" fill="#182229">490 ms</text>
      </svg>
      <figcaption>Figura 1 · Mediana medida em aparelhos intermediários Android 15 (escala em milissegundos, menor é melhor).</figcaption>
    </figure>

    <div class="ad-slot" data-ad-unit="mid-article-native" data-bytes="89400">
      Conteúdo patrocinado externo · Pixel de conversão scorecardresearch.com
    </div>
    <img src="https://sb.scorecardresearch.com/p?c1=2&c2=99102" width="1" height="1" alt="" data-tracker-pixel="true" data-bytes="14200" />

    <h2>Isolamento criptográfico de favoritos e sessões efêmeras</h2>
    <p>
      Diferente de sincronizadores baseados em conta centralizada, a derivação local de chave via <code>PBKDF2-HMAC-SHA256</code> combinada com cifra autenticada <code>AES-256-GCM</code> garante que o servidor de retransmissão armazene apenas texto cifrado opaco e vetor de inicialização aleatório.
    </p>

    <nav class="related">
      Leitura relacionada:
      <a href="https://kotlinlang.org/docs/android-webview">Arquitetura Android WebView em Kotlin</a> ·
      <a href="https://criptografia.ufsc.br/aes-gcm">Especificação prática AES-256-GCM</a> ·
      <a href="https://arquitetura-limpa.dev/minimalismo">Interfaces minimalistas de baixa memória</a>
    </nav>
  </main>
</body>
</html>`,
  },
  {
    url: 'https://kotlinlang.org/docs/android-webview',
    title: 'Interceptação de rede e isolamento de estado com Kotlin e Jetpack Compose',
    shortTitle: 'Kotlin Docs',
    summary: 'Guia técnico de implementação de WebViewClient seguro, bloqueio O(k) por Trie de domínios e limpeza determinística de sessão anônima.',
    category: 'Engenharia Kotlin',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Interceptação de rede e isolamento de estado com Kotlin e Jetpack Compose</title>
  <script src="https://static.criteo.net/js/ld/publishertag.js" data-bytes="112000"></script>
  <script src="https://script.hotjar.com/modules.8492.js" data-bytes="134600"></script>
  <link rel="stylesheet" href="https://fonts.tracker-cdn.io/jetbrains-heavy.woff2" data-font-bytes="142000" />
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>Interceptação de rede e isolamento de estado com Kotlin e Jetpack Compose</h1>
      <div class="meta">Documentação de Engenharia Android · Motor Kotlin 2.1 · API 29+</div>
    </header>

    <p>
      Em navegadores Android de alto desempenho escritos em Kotlin, cada sub-recurso solicitado pela página passa pelo método síncrono <code>shouldInterceptRequest</code> em uma thread de I/O dedicada do Chromium. Responder imediatamente com um fluxo vazio para domínios bloqueados evita alocação de buffers de rede e decodificação V8.
    </p>

    <div class="ad-slot" data-ad-unit="dev-banner" data-bytes="94000">
      Banner patrocinado de telemetria APM · 94 KB
    </div>

    <h2>Estrutura recomendada de interceptação sem regex lento</h2>
    <pre>override fun shouldInterceptRequest(
    view: WebView,
    request: WebResourceRequest
): WebResourceResponse? {
    val host = request.url.host?.lowercase() ?: return null
    if (adBlockTrie.matchesDomain(host)) {
        statsRepository.recordBlocked(host)
        return WebResourceResponse("text/plain", "utf-8", 204, "Blocked", emptyMap(), EmptyInputStream)
    }
    return super.shouldInterceptRequest(view, request)
}</pre>

    <h2>Política rigorosa para abas anônimas</h2>
    <p>
      Uma aba anônima nunca deve compartilhar <code>CookieManager</code> persistente nem gravar entradas no banco Room de histórico. Ao encerrar a última aba privada, o gerenciador executa limpeza atômica de cache em memória, <code>WebStorage</code> e sinaliza <code>WindowManager.LayoutParams.FLAG_SECURE</code> para impedir capturas acidentais na lista de aplicativos recentes.
    </p>

    <table>
      <thead>
        <tr>
          <th>Componente Kotlin</th>
          <th>Responsabilidade</th>
          <th class="num">Custo de memória</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>DomainTrieFilter</td>
          <td>Busca de sufixos DNS bloqueados em O(k)</td>
          <td class="num">1,1 MB</td>
        </tr>
        <tr>
          <td>DataSaverInterceptor</td>
          <td>Remoção de fontes remotas e compressão Brotli</td>
          <td class="num">0,3 MB</td>
        </tr>
        <tr>
          <td>BookmarkSyncCrypto</td>
          <td>Cifra AES-256-GCM via javax.crypto</td>
          <td class="num">0,2 MB</td>
        </tr>
      </tbody>
    </table>

    <nav class="related">
      Próximos tópicos:
      <a href="https://privacidade.org.br/relatorio-2026">Relatório de rastreadores 2026</a> ·
      <a href="https://criptografia.ufsc.br/aes-gcm">Sincronização E2EE com AES-GCM</a>
    </nav>
  </main>
</body>
</html>`,
  },
  {
    url: 'https://criptografia.ufsc.br/aes-gcm',
    title: 'Sincronização entre dispositivos com conhecimento zero via AES-256-GCM',
    shortTitle: 'Cripto AES',
    summary: 'Arquitetura criptográfica ponta a ponta para sincronizar favoritos entre celular Android Kotlin e desktop sem expor metadados.',
    category: 'Segurança',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Sincronização entre dispositivos com conhecimento zero via AES-256-GCM</title>
  <script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX" data-bytes="88400"></script>
  <script data-fingerprint="audio-context-fp" data-bytes="29100">
    window.__audioFp = true;
  </script>
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>Sincronização entre dispositivos com conhecimento zero via AES-256-GCM</h1>
      <div class="meta">Laboratório de Segurança Computacional · Nota Técnica 14/2026 · TLS 1.3</div>
    </header>

    <p>
      Para que um navegador mantenha favoritos acessíveis entre smartphone Android e estação desktop sem exigir e-mail, telefone ou conta rastreável, os dispositivos compartilham apenas uma frase-chave secreta de sincronização.
    </p>

    <h2>Etapas do protocolo de envelope autenticado</h2>
    <table>
      <thead>
        <tr>
          <th>Etapa</th>
          <th>Algoritmo</th>
          <th>Garantia de segurança</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Identificador do cofre</td>
          <td>SHA-256 truncado com domínio separado</td>
          <td>Servidor localiza o pacote sem conhecer a frase-chave</td>
        </tr>
        <tr>
          <td>Derivação de chave</td>
          <td>PBKDF2-HMAC-SHA256 (100.000 iterações + sal de 16 B)</td>
          <td>Resistência contra força bruta offline</td>
        </tr>
        <tr>
          <td>Cifra autenticada</td>
          <td>AES-256-GCM com IV aleatório de 96 bits</td>
          <td>Confidencialidade total + detecção de adulteração (tag 128 bits)</td>
        </tr>
      </tbody>
    </table>

    <figure data-heavy-media="fluxo-e2ee" data-heavy-bytes="198000" data-label="Esquema do fluxo criptográfico ponta a ponta entre Android Kotlin e Web (193 KB)">
      <svg viewBox="0 0 640 120" width="100%" height="auto" role="img" aria-label="Fluxo criptográfico entre dispositivos">
        <rect x="0" y="0" width="640" height="120" fill="#f6f9fa" />
        <rect x="20" y="34" width="168" height="52" rx="6" fill="#ffffff" stroke="#8aa2ad" />
        <text x="36" y="57" font-size="13" font-weight="600" fill="#162028">Android (Kotlin)</text>
        <text x="36" y="75" font-size="12" fill="#4f5f6a">Cifra AES-GCM local</text>
        <line x1="188" y1="60" x2="236" y2="60" stroke="#2f7a67" stroke-width="2" />
        <rect x="236" y="34" width="168" height="52" rx="6" fill="#ffffff" stroke="#8aa2ad" />
        <text x="252" y="57" font-size="13" font-weight="600" fill="#162028">Cofre de Retransmissão</text>
        <text x="252" y="75" font-size="12" fill="#4f5f6a">Apenas bytes cifrados</text>
        <line x1="404" y1="60" x2="452" y2="60" stroke="#2f7a67" stroke-width="2" />
        <rect x="452" y="34" width="168" height="52" rx="6" fill="#ffffff" stroke="#8aa2ad" />
        <text x="468" y="57" font-size="13" font-weight="600" fill="#162028">Estação Desktop</text>
        <text x="468" y="75" font-size="12" fill="#4f5f6a">Valida tag GCM e abre</text>
      </svg>
      <figcaption>Figura 1 · Nenhum título, URL ou pasta de favoritos transita em texto claro fora dos dispositivos do usuário.</figcaption>
    </figure>

    <nav class="related">
      Ver também:
      <a href="https://privacidade.org.br/relatorio-2026">Auditoria de rastreadores</a> ·
      <a href="https://kotlinlang.org/docs/android-webview">Implementação em Kotlin</a>
    </nav>
  </main>
</body>
</html>`,
  },
  {
    url: 'https://arquitetura-limpa.dev/minimalismo',
    title: 'Software enxuto: por que navegadores modernos precisam voltar ao essencial',
    shortTitle: 'Minimalismo',
    summary: 'Ensaio sobre redução de superfície de ataque, ausência de telemetria oculta e economia real de bateria e franquia móvel.',
    category: 'Leitura rápida',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Software enxuto: por que navegadores modernos precisam voltar ao essencial</title>
  <script src="https://ads.pubmatic.com/AdServer/js/pwt.js" data-bytes="156000"></script>
  <script src="https://bat.bing.com/bat.js" data-bytes="47200"></script>
  <link rel="stylesheet" href="https://fonts.cdn-tracker.net/serif-pack.woff2" data-font-bytes="210000" />
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>Software enxuto: por que navegadores modernos precisam voltar ao essencial</h1>
      <div class="meta">Revista Arquitetura Limpa · Edição 42 · Leitura de 3 minutos</div>
    </header>

    <div class="ad-slot" data-ad-unit="top-takeover" data-bytes="174000">
      Vídeo promocional em reprodução automática · 174 KB iniciais
    </div>
    <video autoplay muted src="https://cdn.ad-video-stream.net/promo.mp4" data-autoplay-bytes="320000"></video>

    <p>
      Quando um aplicativo navegador acumula feeds de notícias patrocinadas, carteiras não solicitadas e dezenas de processos auxiliares em segundo plano, dois custos recaem imediatamente sobre quem lê: lentidão perceptível ao alternar abas e superfície ampliada para vazamento de dados.
    </p>

    <p>
      Um navegador focado em segurança trata a barra de endereços, o isolamento de abas e o filtro de rede como instrumentos de precisão. Menos código executando significa inicialização a frio abaixo de 180 ms e respeito integral ao pacote de dados do usuário.
    </p>

    <nav class="related">
      Continuar lendo:
      <a href="https://observatorio.clima.br/boletim">Boletim Climático Sul-Americano</a> ·
      <a href="https://privacidade.org.br/relatorio-2026">Auditoria de rastreadores</a>
    </nav>
  </main>
</body>
</html>`,
  },
  {
    url: 'https://observatorio.clima.br/boletim',
    title: 'Boletim hidrometeorológico das bacias brasileiras — Outubro de 2026',
    shortTitle: 'Clima 2026',
    summary: 'Dados consolidados de precipitação, reservatórios e temperatura superficial com tabelas leves otimizadas para conexões rurais e móveis.',
    category: 'Leitura rápida',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Boletim hidrometeorológico das bacias brasileiras — Outubro de 2026</title>
  <script src="https://pagead2.googlesyndication.com/pagead/show_ads.js" data-bytes="128000"></script>
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>Boletim hidrometeorológico das bacias brasileiras — Outubro de 2026</h1>
      <div class="meta">Rede Nacional de Monitoramento Ambiental · Atualizado em 31/10/2026</div>
    </header>

    <p>
      Os volumes armazenados nos subsistemas Sudeste/Centro-Oeste e Sul encerraram outubro dentro da faixa operacional prevista, favorecidos pela entrada de frentes úmidas na segunda quinzena do mês.
    </p>

    <table>
      <thead>
        <tr>
          <th>Subsistema hídrico</th>
          <th class="num">Volume útil (%)</th>
          <th class="num">Chuva 30 dias (mm)</th>
          <th class="num">Variação mensal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sudeste / Centro-Oeste</td>
          <td class="num">64,2%</td>
          <td class="num">142 mm</td>
          <td class="num">+3,8 p.p.</td>
        </tr>
        <tr>
          <td>Sul</td>
          <td class="num">78,9%</td>
          <td class="num">198 mm</td>
          <td class="num">+6,1 p.p.</td>
        </tr>
        <tr>
          <td>Nordeste</td>
          <td class="num">57,4%</td>
          <td class="num">34 mm</td>
          <td class="num">-1,2 p.p.</td>
        </tr>
        <tr>
          <td>Norte</td>
          <td class="num">69,1%</td>
          <td class="num">116 mm</td>
          <td class="num">+2,4 p.p.</td>
        </tr>
      </tbody>
    </table>

    <figure data-heavy-media="mapa-bacias" data-heavy-bytes="312000" data-label="Gráfico regional de volume útil por bacia hidrográfica (304 KB)">
      <svg viewBox="0 0 640 150" width="100%" height="auto" role="img" aria-label="Volume útil por subsistema hídrico">
        <rect x="0" y="0" width="640" height="150" fill="#f6f9fa" />
        <text x="16" y="26" font-size="13" font-weight="600" fill="#182229">Volume útil armazenado por região (%)</text>
        <text x="16" y="58" font-size="13" fill="#32404a">Sudeste / CO</text>
        <rect x="140" y="43" width="256" height="18" rx="3" fill="#2f7a67" />
        <text x="406" y="57" font-size="13" fill="#182229">64,2%</text>
        <text x="16" y="88" font-size="13" fill="#32404a">Sul</text>
        <rect x="140" y="73" width="315" height="18" rx="3" fill="#185949" />
        <text x="465" y="87" font-size="13" fill="#182229">78,9%</text>
        <text x="16" y="118" font-size="13" fill="#32404a">Nordeste</text>
        <rect x="140" y="103" width="229" height="18" rx="3" fill="#4f8f7e" />
        <text x="379" y="117" font-size="13" fill="#182229">57,4%</text>
      </svg>
      <figcaption>Figura 1 · Proporção de reservação útil medida em 31/10/2026 (escala 0 a 100%).</figcaption>
    </figure>

    <nav class="related">
      Fontes relacionadas:
      <a href="https://arquitetura-limpa.dev/minimalismo">Interfaces leves para campo</a> ·
      <a href="https://privacidade.org.br/relatorio-2026">Economia de dados em redes móveis</a>
    </nav>
  </main>
</body>
</html>`,
  },
];

export function buildSearchResultsHtml(query: string): { title: string; shortTitle: string; rawHtml: string } {
  const cleanQ = query.trim();
  const lower = cleanQ.toLowerCase();
  const matches = BUILTIN_CORPUS.filter(
    (s) =>
      !lower ||
      s.title.toLowerCase().includes(lower) ||
      s.summary.toLowerCase().includes(lower) ||
      s.url.toLowerCase().includes(lower) ||
      s.category.toLowerCase().includes(lower)
  );

  const listItems = (matches.length > 0 ? matches : BUILTIN_CORPUS)
    .map(
      (item) => `
      <article style="padding: 16px 0; border-bottom: 1px solid #dde4e8;">
        <div class="meta" style="margin-bottom: 4px;">${escapeHtml(item.url)} · ${escapeHtml(item.category)}</div>
        <h2 style="margin: 0 0 6px; font-size: 18px;">
          <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>
        </h2>
        <p style="margin: 0; font-size: 15px;">${escapeHtml(item.summary)}</p>
      </article>
    `
    )
    .join('\n');

  const heading =
    matches.length > 0
      ? `Resultados privados para “${escapeHtml(cleanQ)}” (${matches.length})`
      : `Nenhum resultado exato para “${escapeHtml(cleanQ)}” — páginas verificadas sugeridas`;

  return {
    title: `Busca privada: ${cleanQ || 'índice'}`,
    shortTitle: 'Busca',
    rawHtml: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Busca privada — ${escapeHtml(cleanQ)}</title>
  <style>${SHARED_PAGE_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>${heading}</h1>
      <div class="meta">Pesquisa local sem rastreamento de IP, sem perfilamento comportamental e zero cookies de terceiros</div>
    </header>
    ${listItems}
  </main>
</body>
</html>`,
  };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
