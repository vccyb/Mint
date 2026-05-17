import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import fs from 'fs';
import path from 'path';

export default function nextConfig(phase: string): NextConfig {
  // Clean up dev artifacts before production build to avoid rootDir conflicts
  if (phase !== PHASE_DEVELOPMENT_SERVER) {
    const devDir = path.join(process.cwd(), '.next-dev');
    if (fs.existsSync(devDir)) {
      fs.rmSync(devDir, { recursive: true, force: true });
    }
  }

  return {
    serverExternalPackages: ['@anthropic-ai/claude-agent-sdk', 'ws'],
    // Keep development artifacts separate from production build output so
    // `next dev` does not corrupt a previously built `.next` directory.
    ...(phase === PHASE_DEVELOPMENT_SERVER ? { distDir: '.next-dev' } : {}),
  };
}
