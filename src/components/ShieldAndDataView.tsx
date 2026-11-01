import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Globe, Plus, Shield, Trash2 } from 'lucide-react';
import { extractDomain } from '../engine/adblockEngine';
import { diagnoseUrlSecurity } from '../engine/readerEngine';
import type {
  AdBlockConfig,
  CumulativeStats,
  DataSaverConfig,
  DohProviderId,
  TabItem,
} from '../types/browser';
import { formatBytes, formatInt, formatPercent } from '../utils/formatters';
import { Button, Field, SwitchRow } from './ui';

interface ShieldAndDataViewProps {
  activeTab: TabItem;
  adBlock: AdBlockConfig;
  dataSaver: DataSaverConfig;
  stats: CumulativeStats;
  onUpdateAdBlock: (patch: Partial<AdBlockConfig>) => void;
  onToggleWhitelistDomain: (domain: string) => void;
  onAddCustomRule: (rule: string) => void;
  onRemoveCustomRule: (rule: string) => void;
  onUpdateDataSaver: (patch: Partial<DataSaverConfig>) => void;
  onReturnToBrowser: () => void;
}

const DOH_OPTIONS: { id: DohProviderId; label: string; endpoint: string }[] = [
  { id: 'quad9', label: 'Quad9 (9.9.9.9)', endpoint: 'https://dns.quad9.net/dns-query' },
  { id: 'cloudflare', label: 'Cloudflare (1.1.1.1)', endpoint: 'https://cloudflare-dns.com/dns-query' },
  { id: 'adguard', label: 'AdGuard DNS', endpoint: 'https://dns.adguard-dns.com/dns-query' },
  { id: 'nextdns', label: 'NextDNS Zero-Log', endpoint: 'https://dns.nextdns.io/veloce-shield' },
];

export const ShieldAndDataView: React.FC<ShieldAndDataViewProps> = ({
  activeTab,
  adBlock,
  dataSaver,
  stats,
  onUpdateAdBlock,
  onToggleWhitelistDomain,
  onAddCustomRule,
  onRemoveCustomRule,
  onUpdateDataSaver,
  onReturnToBrowser,
}) => {
  const [ruleInput, setRuleInput] = useState('');
  const [ruleError, setRuleError] = useState('');
  const [testUrlInput, setTestUrlInput] = useState(
    'https://privacidade.org.br/relatorio-2026?utm_source=newsletter&fbclid=IwAR92831&gclid=Cj0KCQ'
  );

  const diagnostic = useMemo(
    () => diagnoseUrlSecurity(testUrlInput, adBlock),
    [testUrlInput, adBlock]
  );

  const currentDomain = extractDomain(activeTab.url);
  const canWhitelistDomain = activeTab.securityInfo.protocol !== 'veloce' && currentDomain.includes('.');
  const isWhitelisted = adBlock.whitelistedDomains.includes(currentDomain);

  const cumulativeSaved = stats.totalAdBlockBytesSaved + stats.totalDataSaverBytesSaved;
  const cumulativePct = formatPercent(cumulativeSaved, stats.totalOriginalBytes);

  const tabReport = activeTab.shieldReport;
  const tabTotalSaved = tabReport.adBlockSavedBytes + tabReport.dataSaverSavedBytes;
  const tabAdPct =
    tabReport.originalBytes > 0
      ? Math.round((tabReport.adBlockSavedBytes / tabReport.originalBytes) * 100)
      : 0;
  const tabSaverPct =
    tabReport.originalBytes > 0
      ? Math.round((tabReport.dataSaverSavedBytes / tabReport.originalBytes) * 100)
      : 0;
  const tabFinalPct = Math.max(0, 100 - tabAdPct - tabSaverPct);

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = ruleInput.trim();
    if (cleaned.length < 4 || !cleaned.includes('.')) {
      setRuleError('Informe um domínio ou regra válida, por exemplo: ||ads.portal.com.br^');
      return;
    }
    const formatted = cleaned.startsWith('||') ? cleaned : `||${cleaned.replace(/^https?:\/\//, '')}^`;
    onAddCustomRule(formatted);
    setRuleInput('');
    setRuleError('');
  };

  return (
    <section className="flex-1 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        {/* Workspace Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight text-foreground">
              Escudo de privacidade, DNS e economia de dados
            </h1>
            <p className="text-sm text-muted mt-1">
              Filtragem síncrona de rede, DNS sobre HTTPS (DoH) e compressão de carga para máxima velocidade
            </p>
          </div>
          <Button tone="quiet" size="sm" onClick={onReturnToBrowser}>
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Voltar à aba ativa</span>
          </Button>
        </div>

        {/* Lead Figure & Secondary Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-border pb-6 gap-y-4 sm:gap-y-6 lg:divide-x divide-border/60">
          <div className="lg:pr-6">
            <div className="text-3xl sm:text-4xl font-semibold tabular-nums text-primary">
              {formatBytes(cumulativeSaved)}
            </div>
            <div className="text-xs text-muted mt-1">
              Dados totais economizados ({cumulativePct} da franquia bruta)
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {formatInt(stats.totalTrackersBlocked)}
            </div>
            <div className="text-xs text-muted mt-1">
              Rastreadores, banners e sondas bloqueados na sessão
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {formatBytes(stats.totalAdBlockBytesSaved)}
            </div>
            <div className="text-xs text-muted mt-1">
              Economia gerada exclusivamente pelo bloqueador AdBlock
            </div>
          </div>

          <div className="lg:pl-6">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {formatBytes(stats.totalDataSaverBytesSaved)}
            </div>
            <div className="text-xs text-muted mt-1">
              Economia por compressão HTML, fontes e mídia sob demanda
            </div>
          </div>
        </div>

        {/* Two-Column Controls & Active Tab Inspection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 lg:divide-x divide-border/60">
          {/* Column 1: Integrated AdBlocker + DoH */}
          <div className="lg:pr-8 space-y-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Bloqueador integrado AdBlock &amp; Anti-Rastreio
              </h2>
              {canWhitelistDomain ? (
                <Button
                  tone="quiet"
                  size="sm"
                  onClick={() => onToggleWhitelistDomain(currentDomain)}
                >
                  {isWhitelisted
                    ? `Reativar escudo em ${currentDomain}`
                    : `Pausar em ${currentDomain}`}
                </Button>
              ) : null}
            </div>

            <div className="divide-y divide-border/60 border-y border-border">
              <SwitchRow
                label="Escudo global AdBlock"
                description="Intercepta domínios publicitários e coletores antes da conexão TLS."
                checked={adBlock.enabled}
                onChange={(enabled) => onUpdateAdBlock({ enabled })}
              />
              <SwitchRow
                label="Bloquear anúncios e espaços patrocinados"
                description="Remove scripts de leilão programático e oculta contêineres vazios."
                checked={adBlock.blockAds}
                disabled={!adBlock.enabled}
                onChange={(blockAds) => onUpdateAdBlock({ blockAds })}
              />
              <SwitchRow
                label="Bloquear rastreadores analíticos e pixels"
                description="Impede perfilamento cruzado entre sites e beacons invisíveis 1x1."
                checked={adBlock.blockTrackers}
                disabled={!adBlock.enabled}
                onChange={(blockTrackers) => onUpdateAdBlock({ blockTrackers })}
              />
              <SwitchRow
                label="Proteção contra fingerprinting de dispositivo"
                description="Neutraliza scripts que extraem assinatura de Canvas, WebGL e áudio."
                checked={adBlock.blockFingerprinting}
                disabled={!adBlock.enabled}
                onChange={(blockFingerprinting) => onUpdateAdBlock({ blockFingerprinting })}
              />
              <SwitchRow
                label="Limpar parâmetros UTM, fbclid e gclid das URLs"
                description="Remove identificadores de campanha automaticamente ao navegar."
                checked={adBlock.stripTrackingParams}
                disabled={!adBlock.enabled}
                onChange={(stripTrackingParams) => onUpdateAdBlock({ stripTrackingParams })}
              />
              <SwitchRow
                label="Bloquear vazamento de IP local via WebRTC"
                description="Impede que scripts STUN/TURN descubram seu IP real sob VPN ou proxy."
                checked={adBlock.blockWebRtcLeak}
                onChange={(blockWebRtcLeak) => onUpdateAdBlock({ blockWebRtcLeak })}
              />
              <SwitchRow
                label="Auto-destruir cookies de sessão ao fechar aba"
                description="Limpa armazenamento volátil de cada domínio assim que sua aba é encerrada."
                checked={adBlock.autoShredCookiesOnClose}
                onChange={(autoShredCookiesOnClose) =>
                  onUpdateAdBlock({ autoShredCookiesOnClose })
                }
              />
            </div>

            {/* Custom Filter Rules */}
            <div className="space-y-3 pt-2">
              <form onSubmit={handleRuleSubmit} className="space-y-2">
                <Field
                  id="custom-adblock-rule"
                  label="Regras personalizadas (formato EasyList)"
                  hint="Adicione domínios para bloqueio imediato no motor."
                >
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      id="custom-adblock-rule"
                      type="text"
                      value={ruleInput}
                      onChange={(e) => {
                        setRuleInput(e.target.value);
                        if (ruleError) setRuleError('');
                      }}
                      placeholder="||tracker.exemplo.com.br^"
                      className="flex-1 min-w-0 min-h-11 rounded-control border border-border bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted focus:outline-2 focus:outline-primary"
                    />
                    <Button type="submit" tone="primary">
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </Field>
                {ruleError ? (
                  <p role="alert" className="text-xs text-danger font-medium">
                    {ruleError}
                  </p>
                ) : null}
              </form>

              {adBlock.customRules.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {adBlock.customRules.map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => onRemoveCustomRule(rule)}
                      aria-label={`Remover regra ${rule}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-background px-2.5 text-xs font-mono text-foreground whitespace-nowrap hover:border-danger hover:text-danger"
                    >
                      <span>{rule}</span>
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Column 2: Data Saver, DoH Resolver & Live URL Auditor */}
          <div className="lg:pl-8 space-y-6 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              Modo de economia de dados e DNS sobre HTTPS (DoH)
            </h2>

            {/* DNS over HTTPS Selector */}
            <div className="space-y-2 pb-2 border-b border-border">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span>Resolvedor DNS sobre HTTPS (DoH) criptografado</span>
              </div>
              <div
                role="group"
                aria-label="Selecionar provedor DNS sobre HTTPS"
                className="flex flex-wrap gap-1.5 pt-1"
              >
                {DOH_OPTIONS.map((opt) => {
                  const selected = adBlock.dohProvider === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateAdBlock({ dohProvider: opt.id })}
                      className={`inline-flex min-h-9 items-center rounded-control px-3 text-xs font-medium whitespace-nowrap transition-colors ${
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
              <div className="text-xs font-mono text-muted pt-0.5">
                Endpoint ativo: {DOH_OPTIONS.find((o) => o.id === adBlock.dohProvider)?.endpoint}
              </div>
            </div>

            <div className="divide-y divide-border/60 border-b border-border">
              <SwitchRow
                label="Economia ativa de dados móveis"
                description="Reduz consumo de memória RAM e tráfego de rede em conexões limitadas."
                checked={dataSaver.enabled}
                onChange={(enabled) => onUpdateDataSaver({ enabled })}
              />
              <SwitchRow
                label="Carregar gráficos e imagens pesadas sob demanda"
                description="Substitui mídias volumosas por botões leves até que você toque para abrir."
                checked={dataSaver.deferHeavyMedia}
                disabled={!dataSaver.enabled}
                onChange={(deferHeavyMedia) => onUpdateDataSaver({ deferHeavyMedia })}
              />
              <SwitchRow
                label="Bloquear download de fontes externas (.woff2)"
                description="Usa fontes locais nítidas evitando centenas de kilobytes extras por página."
                checked={dataSaver.stripExternalFonts}
                disabled={!dataSaver.enabled}
                onChange={(stripExternalFonts) => onUpdateDataSaver({ stripExternalFonts })}
              />
              <SwitchRow
                label="Compactar HTML e comentários ociosos"
                description="Enxuga espaços redundantes e blocos ocultos antes de renderizar."
                checked={dataSaver.compressHtml}
                disabled={!dataSaver.enabled}
                onChange={(compressHtml) => onUpdateDataSaver({ compressHtml })}
              />
              <SwitchRow
                label="Impedir vídeos em reprodução automática"
                description="Bloqueia fluxos de vídeo que iniciam sem gesto explícito do usuário."
                checked={dataSaver.blockAutoplayMedia}
                disabled={!dataSaver.enabled}
                onChange={(blockAutoplayMedia) => onUpdateDataSaver({ blockAutoplayMedia })}
              />
            </div>

            {/* Active Tab Breakdown */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Diagnóstico da aba atual ({activeTab.shortTitle})
                </h3>
                <span className="text-xs text-muted tabular-nums">
                  Economia de {formatBytes(tabTotalSaved)} sobre {formatBytes(tabReport.originalBytes)}
                </span>
              </div>

              {activeTab.url !== 'veloce://inicio' ? (
                <div className="space-y-2">
                  <div
                    className="w-full h-3 rounded-control overflow-hidden flex bg-background border border-border"
                    role="img"
                    aria-label={`Composição de bytes: ${tabFinalPct}% transferido, ${tabAdPct}% evitado por AdBlock, ${tabSaverPct}% evitado por economia de dados`}
                  >
                    <div
                      className="bg-foreground h-full"
                      style={{ width: `${tabFinalPct}%` }}
                    />
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${tabAdPct}%` }}
                    />
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${tabSaverPct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums">
                    <span>
                      Transferido: <strong className="text-foreground">{formatBytes(tabReport.finalBytes)}</strong> ({tabFinalPct}%)
                    </span>
                    <span>
                      AdBlock: <strong className="text-primary">{formatBytes(tabReport.adBlockSavedBytes)}</strong> ({tabAdPct}%)
                    </span>
                    <span>
                      Economia de dados: <strong className="text-accent">{formatBytes(tabReport.dataSaverSavedBytes)}</strong> ({tabSaverPct}%)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Abra qualquer site na aba ativa para inspecionar os recursos interceptados em tempo real.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live URL & Tracker Rule Diagnostic Sandbox */}
        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Simulador e auditor de URL em tempo real
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Teste qualquer endereço para verificar remoção de rastreadores (`utm_*`, `fbclid`, `gclid`) e regras da Trie AdBlock
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={testUrlInput}
              onChange={(e) => setTestUrlInput(e.target.value)}
              aria-label="URL para auditoria de segurança"
              placeholder="Cole uma URL com parâmetros de rastreio ou domínio de anúncio"
              className="flex-1 min-w-[240px] min-h-11 rounded-control border border-border bg-background px-3 text-sm font-mono text-foreground focus:outline-2 focus:outline-primary"
            />
            <Button
              tone="quiet"
              size="sm"
              onClick={() =>
                setTestUrlInput(
                  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?utm_campaign=rtb&gclid=9981'
                )
              }
            >
              <span>Testar script de anúncio</span>
            </Button>
          </div>

          <div className="divide-y divide-border/60 border-y border-border text-xs font-mono">
            <div className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">URL limpa resultante:</span>
              <span className="text-foreground font-medium break-all">{diagnostic.cleanedUrl}</span>
            </div>
            <div className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">Parâmetros de rastreio removidos:</span>
              <span className="text-primary font-medium">
                {diagnostic.strippedParams.length > 0
                  ? diagnostic.strippedParams.join(', ')
                  : 'Nenhum parâmetro rastreador detectado'}
              </span>
            </div>
            <div className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">Veredito da Trie AdBlock:</span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  diagnostic.isBlockedDomain ? 'text-danger' : 'text-primary'
                }`}
              >
                {diagnostic.isBlockedDomain ? (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>
                      BLOQUEADO ({diagnostic.matchedCategory} · Regra {diagnostic.matchedRule})
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>PERMITIDO · Resolução via {diagnostic.dohEndpoint}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Intercepted Requests Table for Active Tab */}
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              Requisições bloqueadas na página atual
            </h2>
            <span className="text-xs text-muted tabular-nums">
              {tabReport.blockedItems.length} itens bloqueados · dados medidos em bytes de sub-recurso
            </span>
          </div>

          {tabReport.blockedItems.length === 0 ? (
            <p className="text-sm text-muted py-4">
              {tabReport.isDomainWhitelisted
                ? `O escudo está pausado manualmente para ${currentDomain}.`
                : 'Nenhum rastreador ou anúncio detectado nesta página.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-card">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      Domínio / Origem
                    </th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      Categoria
                    </th>
                    <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      Regra acionada
                    </th>
                    <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                      Dados evitados
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tabReport.blockedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-mono text-xs text-foreground">
                        {item.domain}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted">{item.category}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted">{item.rule}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-primary">
                        {formatBytes(item.bytesAvoided)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
