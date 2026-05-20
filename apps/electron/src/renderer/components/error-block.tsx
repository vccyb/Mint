
import { AlertTriangle, ZapOff, KeyRound, WifiOff, Bot, XCircle, FileText } from 'lucide-react';
import type { StreamErrorCode } from '@/types';

interface ErrorBlockProps {
  code: StreamErrorCode;
  message: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const ERROR_STYLES: Record<
  StreamErrorCode,
  {
    icon: typeof AlertTriangle;
    bgClass: string;
    borderClass: string;
    textClass: string;
    iconClass: string;
    label: string;
  }
> = {
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
    bgClass: 'bg-destructive/8',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
    label: '认证错误',
  },
  PROVIDER_ERROR: {
    icon: Bot,
    bgClass: 'bg-destructive/8',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
    label: '服务错误',
  },
  NETWORK_ERROR: {
    icon: WifiOff,
    bgClass: 'bg-destructive/8',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
    label: '网络错误',
  },
  PROMPT_TOO_LONG: {
    icon: FileText,
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/20',
    textClass: 'text-warning',
    iconClass: 'text-warning',
    label: '上下文过长',
  },
  INTERNAL_ERROR: {
    icon: AlertTriangle,
    bgClass: 'bg-destructive/8',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
    label: '内部错误',
  },
};

export function ErrorBlock({ code, message, onRetry, onOpenSettings }: ErrorBlockProps) {
  const style = ERROR_STYLES[code] ?? ERROR_STYLES.INTERNAL_ERROR;

  return (
    <div className={`mt-2 rounded-lg border p-4 ${style.bgClass} ${style.borderClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <XCircle className={`h-4 w-4 shrink-0 ${style.iconClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${style.textClass}`}>{style.label}</div>
          <div className="mt-1 text-xs font-mono text-destructive/80 leading-relaxed break-all">
            {message}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/20 hover:bg-destructive/8 transition-colors cursor-pointer"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              重试
            </button>
          )}
          {code === 'AUTH_ERROR' && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="mt-2.5 ml-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              打开设置
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
