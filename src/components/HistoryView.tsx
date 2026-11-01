import React, { useState } from 'react';
import { ArrowLeft, EyeOff, Search, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '../types/browser';
import { formatBytes, formatLocalTimestamp } from '../utils/formatters';
import { Button } from './ui';

interface HistoryViewProps {
  history: HistoryEntry[];
  onOpenUrl: (url: string, incognito: boolean) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onRestoreHistory: (entries: HistoryEntry[]) => void;
  onReturnToBrowser: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onOpenUrl,
  onDeleteHistoryItem,
  onClearHistory,
  onRestoreHistory,
  onReturnToBrowser,
}) => {
  const [query, setQuery] = useState('');
  const [undoBackup, setUndoBackup] = useState<HistoryEntry[] | null>(null);

  const lower = query.trim().toLowerCase();
  const filtered = history.filter(
    (entry) =>
      !lower ||
      entry.title.toLowerCase().includes(lower) ||
      entry.url.toLowerCase().includes(lower) ||
      entry.domain.toLowerCase().includes(lower)
  );

  const handleClearAll = () => {
    if (history.length === 0) return;
    setUndoBackup([...history]);
    onClearHistory();
  };

  return (
    <section className="flex-1 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight text-foreground">
              Histórico de navegação local
            </h1>
            <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span>
                Páginas abertas em abas anônimas são isoladas em memória e jamais aparecem neste registro.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {history.length > 0 ? (
              <Button tone="danger" size="sm" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Limpar histórico</span>
              </Button>
            ) : null}
            <Button tone="quiet" size="sm" onClick={onReturnToBrowser}>
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Voltar à aba ativa</span>
            </Button>
          </div>
        </div>

        {undoBackup ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 border border-border rounded-control bg-background text-sm"
          >
            <span>
              Histórico apagado ({undoBackup.length} registros removidos deste dispositivo).
            </span>
            <button
              type="button"
              onClick={() => {
                onRestoreHistory(undoBackup);
                setUndoBackup(null);
              }}
              className="font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Desfazer limpeza
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 rounded-control border border-border bg-background px-3 min-h-11 focus-within:outline-2 focus-within:outline-primary">
            <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filtrar histórico por título ou domínio"
              placeholder="Filtrar histórico"
              className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
          <span className="text-xs text-muted tabular-nums">
            {filtered.length} de {history.length} visitas registradas localmente
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 border-t border-border text-sm text-muted">
            {history.length === 0
              ? 'Nenhum endereço gravado no histórico local. Navegue em uma aba padrão para registrar páginas.'
              : 'Nenhum item do histórico corresponde à busca informada.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-card">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Horário
                  </th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Página visitada
                  </th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Latência
                  </th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Economia / Escudo
                  </th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 text-xs text-muted tabular-nums whitespace-nowrap">
                      {formatLocalTimestamp(item.visitedAt)}
                    </td>
                    <td className="py-3 px-3 min-w-[240px]">
                      <button
                        type="button"
                        onClick={() => onOpenUrl(item.url, false)}
                        className="text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {item.title}
                      </button>
                      <div className="text-xs font-mono text-muted mt-0.5">{item.url}</div>
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums text-muted whitespace-nowrap">
                      {item.loadTimeMs} ms
                    </td>
                    <td className="py-3 px-3 text-right text-xs tabular-nums whitespace-nowrap">
                      <span className="font-medium text-primary">
                        −{formatBytes(item.bytesSaved)}
                      </span>{' '}
                      <span className="text-muted">({item.trackersBlocked} bloq.)</span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteHistoryItem(item.id)}
                        aria-label={`Remover visita ${item.title}`}
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-control text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
