import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

/**
 * Higher-order function that wraps a Next.js route handler with automatic
 * request/response logging. Records method, path, status, and duration.
 * Catches unhandled errors, logs them, and returns a 500 response.
 */
export function withLogging(scope: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const reqId = generateId();
    const log = createRequestLogger(scope, reqId);
    const start = Date.now();
    const url = new URL(request.url);

    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;
      log.info(`${request.method} ${url.pathname}`, {
        status: response.status,
        duration,
      });
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Unhandled error in ${scope}`, { error: errorMessage, duration });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  };
}
