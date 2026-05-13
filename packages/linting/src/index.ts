/**
 * Architecture constraint linter for the Harness project.
 *
 * Enforces:
 * - Dependency direction (Types → Config → Repo → Service → Runtime → UI)
 * - File size limits (max 300 lines)
 * - Naming conventions (kebab-case files, PascalCase types, etc.)
 * - Structured logging (no console.log, use structured logger)
 *
 * Error messages include fix instructions for agents to self-correct.
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { checkDependencyRules } from './dependency-rules.js';
import { checkNamingConventions } from './naming-conventions.js';
import { checkFileSizeLimits } from './file-size-limits.js';
import { checkStructuredLogging } from './structured-logging.js';

interface LintResult {
  rule: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGES_DIR = resolve(__dirname, '../../');

function main(): void {
  const results: LintResult[] = [
    ...checkDependencyRules(PACKAGES_DIR),
    ...checkFileSizeLimits(PACKAGES_DIR),
    ...checkNamingConventions(PACKAGES_DIR),
    ...checkStructuredLogging(PACKAGES_DIR),
  ];

  if (results.length === 0) {
    console.error('[arch-lint] All checks passed.');
    process.exit(0);
  }

  console.error(`[arch-lint] Found ${results.length} violation(s):\n`);
  for (const r of results) {
    const location = r.line ? `${r.file}:${r.line}` : r.file;
    console.error(`  ✗ [${r.rule}] ${location}`);
    console.error(`    ${r.message}`);
    console.error(`    Fix: ${r.fix}\n`);
  }

  process.exit(1);
}

main();
