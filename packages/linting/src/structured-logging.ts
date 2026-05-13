/**
 * Structured logging checker.
 *
 * Enforces that all logging uses structured logging (JSON format) instead of
 * raw console.log/console.info calls. Warn/error are allowed for tool output.
 *
 * Pattern: console.log(...) and console.info(...) are forbidden in source code
 * (excluding test files and the linting/tools packages themselves).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface LintResult {
  rule: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
}

const FORBIDDEN_PATTERNS = [
  /\bconsole\.log\s*\(/,
  /\bconsole\.info\s*\(/,
];

export function checkStructuredLogging(packagesDir: string): LintResult[] {
  const results: LintResult[] = [];
  const srcDirs = [
    join(packagesDir, 'packages/shared/src'),
    join(packagesDir, 'packages/server/src'),
    join(packagesDir, 'packages/web/src'),
  ];

  function walk(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
        walk(fullPath);
      } else if (
        (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
        !entry.endsWith('.test.ts') &&
        !entry.endsWith('.test.tsx')
      ) {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? '';
          for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(line)) {
              results.push({
                rule: 'structured-logging',
                file: relative(packagesDir, fullPath),
                line: i + 1,
                message: `Found forbidden console.log/console.info call.`,
                fix: `Replace with structured logger: import { logger } from '@harness/shared'; logger.info({ event: 'description', key: value });`,
              });
              break;
            }
          }
        }
      }
    }
  }

  for (const srcDir of srcDirs) {
    walk(srcDir);
  }
  return results;
}
