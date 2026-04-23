'use client';

import { AlertTriangle, ZapOff, KeyRound, WifiOff, Bot } from 'lucide-react';
import type { StreamErrorCode } from '@/types';

interface ErrorBlockProps {
  code: StreamErrorCode;
  message: string;
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
    bgClass: 'bg-orange-50/60',
    borderClass: 'border-orange-200/60',
    textClass: 'text-orange-800',
    iconClass: 'text-orange-500',
    label: '额度已用尽',
  },
  AUTH_ERROR: {
    icon: KeyRound,
    bgClass: 'bg-red-50/60',
    borderClass: 'border-red-200/60',
    textClass: 'text-red-800',
    iconClass: 'text-red-500',
    label: '认证错误',
  },
  PROVIDER_ERROR: {
    icon: Bot,
    bgClass: 'bg-amber-50/60',
    borderClass: 'border-amber-200/60',
    textClass: 'text-amber-800',
    iconClass: 'text-amber-500',
    label: '服务错误',
  },
  NETWORK_ERROR: {
    icon: WifiOff,
    bgClass: 'bg-slate-50/60',
    borderClass: 'border-slate-200/60',
    textClass: 'text-slate-800',
    iconClass: 'text-slate-500',
    label: '网络错误',
  },
  INTERNAL_ERROR: {
    icon: AlertTriangle,
    bgClass: 'bg-red-50/40',
    borderClass: 'border-red-200/40',
    textClass: 'text-red-800',
    iconClass: 'text-red-400',
    label: '内部错误',
  },
};

export function ErrorBlock({ code, message }: ErrorBlockProps) {
  const style = ERROR_STYLES[code] ?? ERROR_STYLES.INTERNAL_ERROR;
  const Icon = style.icon;

  return (
    <div className={`mt-2 rounded-lg border px-3 py-2.5 ${style.bgClass} ${style.borderClass}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.iconClass}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${style.textClass}`}>
            {style.label}
          </div>
          <div className={`text-xs mt-0.5 ${style.textClass} opacity-80`}>
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
