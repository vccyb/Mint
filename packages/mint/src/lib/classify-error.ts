import type { StreamErrorCode } from '@/types';

export interface ClassifiedError {
  readonly code: StreamErrorCode;
  readonly userMessage: string;
}

export function classifyError(rawError: string, httpStatus?: number): ClassifiedError {
  const lower = rawError.toLowerCase();

  // Rate limit: 429 status or common rate limit keywords
  if (
    httpStatus === 429 ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('usage limit') ||
    lower.includes('quota exceeded') ||
    lower.includes('quota reached')
  ) {
    return {
      code: 'RATE_LIMITED',
      userMessage: 'API 额度已用尽，请稍后再试',
    };
  }

  // Auth errors: 401/403 or auth-related keywords
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    lower.includes('invalid api key') ||
    lower.includes('authentication') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    return {
      code: 'AUTH_ERROR',
      userMessage: 'API 密钥无效或未授权，请检查配置',
    };
  }

  // Provider errors: 5xx or provider-related keywords
  if (
    (httpStatus && httpStatus >= 500) ||
    lower.includes('overloaded') ||
    lower.includes('server error') ||
    lower.includes('internal server error')
  ) {
    return {
      code: 'PROVIDER_ERROR',
      userMessage: '服务暂时不可用，请稍后重试',
    };
  }

  // Network errors
  if (
    lower.includes('network') ||
    lower.includes('connection refused') ||
    lower.includes('fetch failed') ||
    lower.includes('fetcherror') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused')
  ) {
    return {
      code: 'NETWORK_ERROR',
      userMessage: '网络连接失败，请检查网络',
    };
  }

  // Prompt too long errors
  if (
    lower.includes('prompt is too long') ||
    lower.includes('prompt_too_long') ||
    lower.includes('input is too long') ||
    lower.includes('context_length_exceeded') ||
    lower.includes('maximum context length') ||
    lower.includes('token limit') ||
    lower.includes('exceeds the model')
  ) {
    return {
      code: 'PROMPT_TOO_LONG',
      userMessage: '上下文过长，请开启新会话或压缩对话历史',
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    userMessage: rawError || '发生了未知错误',
  };
}
