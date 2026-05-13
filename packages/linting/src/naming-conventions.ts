/**
 * Naming convention checker.
 *
 * Validates file and symbol naming:
 * - Files: kebab-case
 * - Test files: <name>.test.ts
 * - Directories: kebab-case
 */

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface LintResult {
  rule: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
}

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.(ts|tsx)$/;
const KEBAB_CASE_DIR = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function checkNamingConventions(packagesDir: string): LintResult[] {
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
        if (!KEBAB_CASE_DIR.test(entry)) {
          results.push({
            rule: 'naming-conventions',
            file: relative(packagesDir, fullPath),
            message: `Directory "${entry}" does not follow kebab-case convention.`,
            fix: `Rename directory to kebab-case: use lowercase letters and hyphens (e.g., "my-module").`,
          });
        }
        walk(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        if (entry === 'index.ts' || entry === 'index.tsx') continue;
        if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx') || entry.endsWith('.d.ts')) continue;
        if (!KEBAB_CASE.test(entry)) {
          results.push({
            rule: 'naming-conventions',
            file: relative(packagesDir, fullPath),
            message: `File "${entry}" does not follow kebab-case convention.`,
            fix: `Rename file to kebab-case: use lowercase letters and hyphens (e.g., "my-component.tsx").`,
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
