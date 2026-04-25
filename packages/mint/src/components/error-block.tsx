'use client';

import { AlertTriangle, ZapOff, KeyRound, WifiOff, Bot, XCircle } from 'lucide-react';
import type { StreamErrorCode } from '@/types';

interface ErrorBlockProps {
  code: StreamErrorCode;
  message: string;
  onRetry?: () => void;
}

const ERROR_STYLES: Record<StreamErrorCode, {
  icon: typeof AlertTriangle;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
  label: string;
}> = {
  RATE_LIMITED: {
    icon: ZapOff,
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/20',
    textClass: 'text-warning',
    iconClass: 'text-warning',
    label: '额度已用尽',
  },
  AUTH_ERROR: {
    icon: KeyRound,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-600',
    iconClass: 'text-red-500',
    label: '认证错误',
  },
  PROVIDER_ERROR: {
    icon: Bot,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-600',
    iconClass: 'text-red-500',
    label: '服务错误',
  },
  NETWORK_ERROR: {
    icon: WifiOff,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-600',
    iconClass: 'text-red-500',
    label: '网络错误',
  },
  INTERNAL_ERROR: {
    icon: AlertTriangle,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-600',
    iconClass: 'text-red-500',
    label: '内部错误',
  },
};

export function ErrorBlock({ code, message, onRetry }: ErrorBlockProps) {
  const style = ERROR_STYLES[code] ?? ERROR_STYLES.INTERNAL_ERROR;

  return (
    <div className={`mt-2 rounded-lg border p-4 ${style.bgClass} ${style.borderClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <XCircle className={`h-4 w-4 shrink-0 ${style.iconClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${style.textClass}`}>
            {style.label}
          </div>
          <div className="mt-1 text-xs font-mono text-red-700/80 leading-relaxed break-all">
            {message}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
