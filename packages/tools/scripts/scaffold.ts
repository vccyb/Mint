#!/usr/bin/env npx tsx
/**
 * Scaffold Generator
 *
 * Generates new modules that conform to the project's architecture rules.
 * Supports generating: service, repo, provider, component, hook
 *
 * Usage: pnpm scaffold <type> <name>
 *   type: service | repo | provider | component | hook
 *   name: kebab-case module name
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../../../..');

type ScaffoldType = 'service' | 'repo' | 'provider' | 'component' | 'hook';

const VALID_TYPES: ScaffoldType[] = ['service', 'repo', 'provider', 'component', 'hook'];

const args = process.argv.slice(2);
const type = args[0] as ScaffoldType | undefined;
const name = args[1];

if (!type || !name) {
  console.error('Usage: pnpm scaffold <type> <name>');
  console.error(`  type: ${VALID_TYPES.join(' | ')}`);
  console.error('  name: kebab-case module name (e.g., user-profile)');
  process.exit(1);
}

if (!VALID_TYPES.includes(type)) {
  console.error(`Invalid type "${type}". Must be one of: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  console.error(`Invalid name "${name}". Must be kebab-case (lowercase letters, numbers, hyphens).`);
  process.exit(1);
}

const pascalName = name
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

const camelName = name
  .split('-')
  .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
  .join('');

function scaffoldService(): void {
  const dir = join(ROOT_DIR, 'packages/server/src/services', name);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, `${name}.service.ts`),
    `/**
 * ${pascalName} Service
 *
 * Business logic for ${name}.
 */

export interface ${pascalName}ServiceDeps {
  // Inject dependencies here
}

export class ${pascalName}Service {
  constructor(private readonly deps: ${pascalName}ServiceDeps) {}
}
`,
  );

  writeFileSync(
    join(dir, `${name}.service.test.ts`),
    `import { describe, it, expect } from 'vitest';
import { ${pascalName}Service } from './${name}.service.js';

describe('${pascalName}Service', () => {
  it('should be instantiable', () => {
    const service = new ${pascalName}Service({});
    expect(service).toBeDefined();
  });
});
`,
  );

  writeFileSync(join(dir, 'index.ts'), `export { ${pascalName}Service } from './${name}.service.js';\nexport type { ${pascalName}ServiceDeps } from './${name}.service.js';\n`);

  console.error(`[scaffold] Created service: packages/server/src/services/${name}/`);
}

function scaffoldRepo(): void {
  const dir = join(ROOT_DIR, 'packages/server/src/repo', name);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, `${name}-repository.ts`),
    `/**
 * ${pascalName} Repository
 *
 * Data access layer for ${name}.
 */

export interface ${pascalName}Record {
  id: string;
  // TODO: Define record shape
}

export interface ${pascalName}Repository {
  findById(id: string): Promise<${pascalName}Record | null>;
  // TODO: Define data access methods
}
`,
  );

  writeFileSync(
    join(dir, `${name}-repository.test.ts`),
    `import { describe, it, expect } from 'vitest';

describe('${pascalName}Repository', () => {
  it('should define the interface', () => {
    // TODO: Add repository tests
    expect(true).toBe(true);
  });
});
`,
  );

  writeFileSync(join(dir, 'index.ts'), `export type { ${pascalName}Record, ${pascalName}Repository } from './${name}-repository.js';\n`);

  console.error(`[scaffold] Created repo: packages/server/src/repo/${name}/`);
}

function scaffoldProvider(): void {
  const dir = join(ROOT_DIR, 'packages/server/src/providers', name);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, `${name}-provider.ts`),
    `/**
 * ${pascalName} Provider
 *
 * Cross-cutting concern provider for ${name}.
 * Providers handle external integrations and cross-cutting concerns.
 */

export interface ${pascalName}Provider {
  // Define provider interface methods
}
`,
  );

  writeFileSync(join(dir, 'index.ts'), `export type { ${pascalName}Provider } from './${name}-provider.js';\n`);

  console.error(`[scaffold] Created provider: packages/server/src/providers/${name}/`);
}

function scaffoldComponent(): void {
  const dir = join(ROOT_DIR, 'packages/web/src/components', pascalName);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, `${pascalName}.tsx`),
    `export interface ${pascalName}Props {
  // TODO: Define component props
}

export function ${pascalName}(props: ${pascalName}Props) {
  return <div>${pascalName}</div>;
}
`,
  );

  writeFileSync(
    join(dir, `${pascalName}.test.tsx`),
    `import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ${pascalName} } from './${pascalName}';

describe('${pascalName}', () => {
  it('renders without crashing', () => {
    const { container } = render(<${pascalName} />);
    expect(container).toBeDefined();
  });
});
`,
  );

  writeFileSync(join(dir, 'index.ts'), `export { ${pascalName} } from './${pascalName}';\nexport type { ${pascalName}Props } from './${pascalName}';\n`);

  console.error(`[scaffold] Created component: packages/web/src/components/${pascalName}/`);
}

function scaffoldHook(): void {
  const dir = join(ROOT_DIR, 'packages/web/src/hooks');
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, `use-${name}.ts`),
    `/**
 * use${pascalName} hook
 *
 * Custom hook for ${name} functionality.
 */

export function use${pascalName}() {
  // TODO: Implement hook
}
`,
  );

  writeFileSync(
    join(dir, `use-${name}.test.ts`),
    `import { describe, it, expect } from 'vitest';
import { use${pascalName} } from './use-${name}';

describe('use${pascalName}', () => {
  it('should be a function', () => {
    expect(typeof use${pascalName}).toBe('function');
  });
});
`,
  );

  console.error(`[scaffold] Created hook: packages/web/src/hooks/use-${name}.ts`);
}

const scaffolders: Record<ScaffoldType, () => void> = {
  service: scaffoldService,
  repo: scaffoldRepo,
  provider: scaffoldProvider,
  component: scaffoldComponent,
  hook: scaffoldHook,
};

scaffolders[type]();
