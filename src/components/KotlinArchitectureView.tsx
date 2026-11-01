import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, Download } from 'lucide-react';
import {
  buildFullKotlinBundleText,
  KOTLIN_SOURCE_FILES,
} from '../data/kotlinSourceFiles';
import { Button } from './ui';

interface KotlinArchitectureViewProps {
  onReturnToBrowser: () => void;
}

export const KotlinArchitectureView: React.FC<KotlinArchitectureViewProps> = ({
  onReturnToBrowser,
}) => {
  const [selectedId, setSelectedId] = useState<string>(KOTLIN_SOURCE_FILES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentFile =
    KOTLIN_SOURCE_FILES.find((f) => f.id === selectedId) || KOTLIN_SOURCE_FILES[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.code);
      setCopiedId(currentFile.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      // Fallback for restricted clipboard contexts
    }
  };

  const triggerDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex-1 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight text-foreground">
              Arquitetura nativa Android em Kotlin
            </h1>
            <p className="text-sm text-muted mt-1">
              Módulos prontos para Android Studio com Jetpack Compose, WebView endurecido, Trie AdBlock e cifra AES-256-GCM
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="primary"
              size="sm"
              onClick={() =>
                triggerDownload('VeloceBrowser-Kotlin-Android.kt.txt', buildFullKotlinBundleText())
              }
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Baixar pacote Kotlin</span>
            </Button>
            <Button tone="quiet" size="sm" onClick={onReturnToBrowser}>
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Voltar à aba ativa</span>
            </Button>
          </div>
        </div>

        {/* Engineering Footprint Figures Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-border pb-5 gap-y-4 sm:divide-x divide-border/60">
          <div className="sm:pr-6">
            <div className="text-2xl font-semibold tabular-nums text-foreground">3,8 MB</div>
            <div className="text-xs text-muted mt-0.5">
              Tamanho estimado do APK assinado com R8 e ShrinkResources ativos
            </div>
          </div>
          <div className="sm:px-6">
            <div className="text-2xl font-semibold tabular-nums text-primary">0,04 ms</div>
            <div className="text-xs text-muted mt-0.5">
              Custo médio de consulta por domínio na Trie reversa em Kotlin
            </div>
          </div>
          <div className="sm:pl-6">
            <div className="text-2xl font-semibold tabular-nums text-foreground">API 29–35</div>
            <div className="text-xs text-muted mt-0.5">
              Compatibilidade Android 10 a Android 15 com FLAG_SECURE anônimo
            </div>
          </div>
        </div>

        {/* File Selector Tabs */}
        <div
          role="tablist"
          aria-label="Arquivos-fonte Kotlin"
          className="flex flex-wrap items-center gap-1.5"
        >
          {KOTLIN_SOURCE_FILES.map((file) => {
            const active = file.id === currentFile.id;
            return (
              <button
                key={file.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedId(file.id)}
                className={`inline-flex min-h-10 items-center rounded-control px-3 text-xs font-mono font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-foreground hover:bg-surface'
                }`}
              >
                {file.filename}
              </button>
            );
          })}
        </div>

        {/* Selected File Header & Recessed Code Stage */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3 py-2 border-b border-border/60">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {currentFile.roleTitle}
              </h2>
              <p className="text-sm text-muted mt-0.5">{currentFile.summary}</p>
              <div className="text-xs text-muted font-mono mt-1">
                {currentFile.packagePath} · {currentFile.complexityNote}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button tone="quiet" size="sm" onClick={handleCopyCode}>
                {copiedId === currentFile.id ? (
                  <>
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Copiar arquivo</span>
                  </>
                )}
              </Button>
              <Button
                tone="quiet"
                size="sm"
                onClick={() => triggerDownload(currentFile.filename, currentFile.code)}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Baixar .kt</span>
              </Button>
            </div>
          </div>

          <div className="rounded-card border border-border bg-background overflow-x-auto">
            <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono leading-relaxed text-foreground">
              <code>{currentFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
