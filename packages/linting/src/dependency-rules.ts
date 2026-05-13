/**
 * Dependency direction checker.
 *
 * Validates that imports follow the layered architecture:
 *   Types → Config → Repo → Service → Runtime → UI
 *
 * Cross-cutting concerns enter via Providers with explicit interfaces.
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

/**
 * Layer hierarchy — lower index = lower layer. A layer may only import from equal or lower layers.
 */
const LAYER_ORDER: Record<string, number> = {
  types: 0,
  config: 1,
  repo: 2,
  providers: 3,
  services: 4,
  runtime: 5,
};

const MAX_LINE_LENGTH = 1000;

function getLayerForFile(filePath: string): string | null {
  const parts = filePath.split('/');
  const srcIndex = parts.indexOf('src');
  if (srcIndex === -1 || srcIndex + 1 >= parts.length) return null;
  return parts[srcIndex + 1] ?? null;
}

function extractImports(content: string): { importPath: string; line: number }[] {
  const imports: { importPath: string; line: number }[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.length > MAX_LINE_LENGTH) continue;
    const match = line.match(/from\s+['"](\.{1,2}\/[^'"]+)['"]/);
    if (match?.[1]) {
      imports.push({ importPath: match[1], line: i + 1 });
    }
  }
  return imports;
}

function resolveLayerFromImport(importPath: string, sourceFile: string): string | null {
  const sourceDir = sourceFile.substring(0, sourceFile.lastIndexOf('/'));
  const segments = importPath.split('/');
  const resolved: string[] = [...sourceDir.split('/')];
  for (const seg of segments) {
    if (seg === '..') {
      resolved.pop();
    } else if (seg !== '.') {
      resolved.push(seg);
    }
  }
  return getLayerForFile(resolved.join('/'));
}

export function checkDependencyRules(packagesDir: string): LintResult[] {
  const results: LintResult[] = [];
  const serverDir = join(packagesDir, 'packages/server/src');

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
        walk(fullPath);
      } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts')) {
        const content = readFileSync(fullPath, 'utf-8');
        const relativePath = relative(packagesDir, fullPath);
        const sourceLayer = getLayerForFile(relativePath);
        if (!sourceLayer || !(sourceLayer in LAYER_ORDER)) continue;

        const imports = extractImports(content);
        for (const imp of imports) {
          const targetLayer = resolveLayerFromImport(imp.importPath, relativePath);
          if (!targetLayer || !(targetLayer in LAYER_ORDER)) continue;

          const sourceOrder = LAYER_ORDER[sourceLayer]!;
          const targetOrder = LAYER_ORDER[targetLayer]!;

          if (targetOrder > sourceOrder) {
            results.push({
              rule: 'dependency-direction',
              file: relativePath,
              line: imp.line,
              message: `Layer "${sourceLayer}" (order ${sourceOrder}) imports from higher layer "${targetLayer}" (order ${targetOrder}).`,
              fix: `Move the shared logic down to the "${sourceLayer}" layer or "${targetLayer}" layer, or use dependency injection through a Provider interface.`,
            });
          }
        }
      }
    }
  }

  walk(serverDir);
  return results;
}
