const numberFmtOne = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFmtInt = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export function formatBytes(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe < 1024) {
    return `${numberFmtInt.format(safe)} B`;
  }
  const kb = safe / 1024;
  if (kb < 1024) {
    return `${numberFmtOne.format(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${numberFmtOne.format(mb)} MB`;
}

export function formatPercent(saved: number, total: number): string {
  if (!Number.isFinite(saved) || !Number.isFinite(total) || total <= 0) {
    return '0,0%';
  }
  const clamped = Math.max(0, Math.min(100, (saved / total) * 100));
  return `${numberFmtOne.format(clamped)}%`;
}

export function formatInt(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return numberFmtInt.format(safe);
}

export function formatLocalTimestamp(isoString: string): string {
  try {
    const dt = new Date(isoString);
    if (Number.isNaN(dt.getTime())) return 'Agora';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt);
  } catch {
    return 'Agora';
  }
}
