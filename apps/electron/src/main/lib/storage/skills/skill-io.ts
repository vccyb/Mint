import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { parseFrontmatter } from './skill-parser';
import type { SkillMeta, SkillContent } from './skill-parser';

// ── Paths ──────────────────────────────────────────────

export const USER_SKILLS_DIR = () => path.join(os.homedir(), '.mint', 'skills');
export const USER_INACTIVE_DIR = () => path.join(os.homedir(), '.mint', 'skills-inactive');

export function getBuiltinSkillsDir(): string {
  return path.join(process.cwd(), 'mint-skills');
}

// ── Read skill directories ─────────────────────────────

async function readSkillDir(baseDir: string, level: 'builtin' | 'user'): Promise<SkillMeta[]> {
  const skills: SkillMeta[] = [];
  let entries;
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(baseDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      const meta = parseFrontmatter(content);
      skills.push({
        name: meta.name ?? entry.name,
        description: meta.description ?? '',
        version: meta.version ?? '1.0.0',
        enabled: true,
        level,
      });
    } catch {
      skills.push({
        name: entry.name,
        description: '',
        version: '1.0.0',
        enabled: true,
        level,
      });
    }
  }
  return skills;
}

async function readInactiveSkills(): Promise<SkillMeta[]> {
  const inactiveDir = USER_INACTIVE_DIR();
  const skills: SkillMeta[] = [];
  let entries;
  try {
    entries = await fs.readdir(inactiveDir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(inactiveDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      const meta = parseFrontmatter(content);
      skills.push({
        name: meta.name ?? entry.name,
        description: meta.description ?? '',
        version: meta.version ?? '1.0.0',
        enabled: false,
        level: 'user',
      });
    } catch {
      skills.push({
        name: entry.name,
        description: '',
        version: '1.0.0',
        enabled: false,
        level: 'user',
      });
    }
  }
  return skills;
}

// ── Directory & listing ────────────────────────────────

export async function ensureSkillsDirs(): Promise<void> {
  await fs.mkdir(USER_SKILLS_DIR(), { recursive: true });
  await fs.mkdir(USER_INACTIVE_DIR(), { recursive: true });
}

export async function listSkills(): Promise<SkillMeta[]> {
  await ensureSkillsDirs();
  const builtins = await readSkillDir(getBuiltinSkillsDir(), 'builtin');
  const userActive = await readSkillDir(USER_SKILLS_DIR(), 'user');
  const userInactive = await readInactiveSkills();
  return [...builtins, ...userActive, ...userInactive];
}

export async function loadActiveSkills(): Promise<SkillContent[]> {
  await ensureSkillsDirs();
  const skills: SkillContent[] = [];

  // Built-in skills
  const builtinDir = getBuiltinSkillsDir();
  const builtinEntries = await fs.readdir(builtinDir, { withFileTypes: true }).catch(() => []);
  for (const entry of builtinEntries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(builtinDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      const meta = parseFrontmatter(content);
      skills.push({
        name: meta.name ?? entry.name,
        description: meta.description ?? '',
        version: meta.version ?? '1.0.0',
        content,
        level: 'builtin',
      });
    } catch {
      // skip
    }
  }

  // User skills
  const userDir = USER_SKILLS_DIR();
  const userEntries = await fs.readdir(userDir, { withFileTypes: true }).catch(() => []);
  for (const entry of userEntries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(userDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillFile, 'utf-8');
      const meta = parseFrontmatter(content);
      skills.push({
        name: meta.name ?? entry.name,
        description: meta.description ?? '',
        version: meta.version ?? '1.0.0',
        content,
        level: 'user',
      });
    } catch {
      // skip
    }
  }

  return skills;
}

// ── Toggle / Delete / Create ───────────────────────────

export async function toggleSkill(name: string): Promise<boolean> {
  const activePath = path.join(USER_SKILLS_DIR(), name);
  const inactivePath = path.join(USER_INACTIVE_DIR(), name);

  const activeExists = await fs.access(activePath).then(() => true, () => false);
  const inactiveExists = await fs.access(inactivePath).then(() => true, () => false);

  if (activeExists) {
    await fs.rename(activePath, inactivePath);
    return false;
  } else if (inactiveExists) {
    await fs.rename(inactivePath, activePath);
    return true;
  }

  throw new Error(`Skill "${name}" not found`);
}

export async function deleteSkill(name: string): Promise<void> {
  const activePath = path.join(USER_SKILLS_DIR(), name);
  const inactivePath = path.join(USER_INACTIVE_DIR(), name);

  const activeExists = await fs.access(activePath).then(() => true, () => false);
  const inactiveExists = await fs.access(inactivePath).then(() => true, () => false);

  if (activeExists) {
    await fs.rm(activePath, { recursive: true });
  } else if (inactiveExists) {
    await fs.rm(inactivePath, { recursive: true });
  } else {
    throw new Error(`Skill "${name}" not found`);
  }
}

export async function createSkill(
  name: string,
  description: string,
  content: string,
): Promise<SkillMeta> {
  const userDir = USER_SKILLS_DIR();
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const skillDir = path.join(userDir, safeName);

  const exists = await fs.access(skillDir).then(() => true, () => false);
  if (exists) {
    throw new Error(`Skill "${safeName}" already exists`);
  }

  await fs.mkdir(skillDir, { recursive: true });

  const skillContent = `---
name: ${safeName}
description: "${description.replace(/"/g, '\\"')}"
version: "1.0.0"
---

${content}
`;

  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

  return { name: safeName, description, version: '1.0.0', enabled: true, level: 'user' };
}

export async function getSkillContent(
  name: string,
): Promise<{ content: string; level: 'builtin' | 'user' }> {
  // Check user skills first
  for (const base of [USER_SKILLS_DIR(), USER_INACTIVE_DIR()]) {
    const skillFile = path.join(base, name, 'SKILL.md');
    const exists = await fs.access(skillFile).then(() => true, () => false);
    if (exists) {
      return { content: await fs.readFile(skillFile, 'utf-8'), level: 'user' };
    }
  }

  // Check built-in skills
  const builtinFile = path.join(getBuiltinSkillsDir(), name, 'SKILL.md');
  const builtinExists = await fs.access(builtinFile).then(() => true, () => false);
  if (builtinExists) {
    return { content: await fs.readFile(builtinFile, 'utf-8'), level: 'builtin' };
  }

  throw new Error(`Skill "${name}" not found`);
}

export async function updateSkillContent(name: string, content: string): Promise<void> {
  for (const base of [USER_SKILLS_DIR(), USER_INACTIVE_DIR()]) {
    const skillFile = path.join(base, name, 'SKILL.md');
    const exists = await fs.access(skillFile).then(() => true, () => false);
    if (exists) {
      await fs.writeFile(skillFile, content);
      return;
    }
  }

  throw new Error(`Skill "${name}" not found (built-in skills are read-only)`);
}
