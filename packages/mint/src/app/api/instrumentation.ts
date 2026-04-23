export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { createLogger } = await import('@/lib/logger');
    const log = createLogger('startup');

    log.info('Mint server starting', {
      nodeEnv: process.env['NODE_ENV'],
      port: process.env['PORT'] ?? '3000 (default)',
      hasApiKey: !!(process.env['ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_AUTH_TOKEN']),
      baseUrl: process.env['ANTHROPIC_BASE_URL'] ?? 'default',
    });
  }
}
