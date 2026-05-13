/**
 * File size limit checker.
 *
 * Enforces a maximum of 300 lines per source file.
 * This prevents agents from generating overly large files and encourages modular design.
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

const MAX_LINES = 300;

export function checkFileSizeLimits(packagesDir: string): LintResult[] {
  const results: LintResult[] = [];
  const srcDirs = [
    join(packagesDir, 'packages/shared/src'),
    join(packagesDir, 'packages/server/src'),
    join(packagesDir, 'packages/web/src'),
    join(packagesDir, 'packages/linting/src'),
    join(packagesDir, 'packages/tools/scripts'),
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
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        const content = readFileSync(fullPath, 'utf-8');
        const lineCount = content.split('\n').length;
        if (lineCount > MAX_LINES) {
          results.push({
            rule: 'file-size-limit',
            file: relative(packagesDir, fullPath),
            message: `File has ${lineCount} lines (max: ${MAX_LINES}).`,
            fix: `Extract responsibilities into separate modules. Consider splitting by concern — each file should have a single responsibility.`,
          });
        }
      }
    }
  }

  for (const srcDir of srcDirs) {
    walk(srcDir);
  }
  return results;
}
