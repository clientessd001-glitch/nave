import React, { Component } from 'react';
import type { ComponentProps, ErrorInfo, ReactNode } from 'react';

export const Surface = ({
  inset = false,
  className = '',
  ...props
}: ComponentProps<'div'> & { inset?: boolean }) => (
  <div
    className={`min-w-0 rounded-card text-foreground ${
      inset ? 'bg-background' : 'bg-surface shadow-surface'
    } ${className}`}
    {...props}
  />
);

const buttonTones = {
  primary: 'bg-primary text-primary-foreground border border-transparent',
  quiet: 'border border-border bg-surface text-foreground hover:bg-background',
  ghost: 'border border-transparent bg-transparent text-foreground hover:bg-background',
  danger: 'bg-danger text-primary-foreground border border-transparent',
};

export const Button = ({
  tone = 'primary',
  type = 'button',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & {
  tone?: keyof typeof buttonTones;
  size?: 'sm' | 'md';
}) => {
  const sizeCls = size === 'sm' ? 'min-h-10 px-3 text-sm' : 'min-h-11 px-4 text-sm';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${sizeCls} ${buttonTones[tone]} ${className}`}
      {...props}
    />
  );
};

export const Field = ({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="min-w-0 flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-foreground">
      {label}
    </label>
    {children}
    {hint ? <p className="text-xs text-muted">{hint}</p> : null}
  </div>
);

export const SwitchRow = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 py-3.5">
    <div className="min-w-0">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <p className="mt-0.5 text-sm text-muted leading-snug">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 inline-flex min-h-10 min-w-16 items-center justify-center rounded-control border px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45 ${
        checked
          ? 'bg-primary text-primary-foreground border-transparent'
          : 'bg-background text-muted border-border'
      }`}
    >
      {checked ? 'Ativo' : 'Inativo'}
    </button>
  </div>
);

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado ao renderizar o navegador.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Veloce ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full border border-border bg-surface rounded-card p-6 space-y-4">
            <h1 className="text-lg font-semibold">Falha na interface do navegador</h1>
            <p className="text-sm text-muted">{this.state.message}</p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
            >
              Recarregar navegador
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
