// Checks every skill in this repository:
//   - SKILL.md starts with frontmatter whose name and description meet the Agent Skills rules;
//   - every references/… or examples/… path SKILL.md mentions exists;
//   - no file contains anything shaped like a Cortex client id or secret;
//   - the plugin and marketplace manifests parse and point at real folders.
// Usage: node scripts/check.mjs   (exit code 1 on any problem)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const problems = [];
const fail = (where, what) => problems.push(`${relative(root, where) || '.'}: ${what}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === '.git' || name === 'node_modules') return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);

// Manifests.
const marketplacePath = join(root, '.claude-plugin', 'marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
for (const plugin of marketplace.plugins ?? []) {
  const dir = join(root, plugin.source);
  const manifest = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifest)) {
    fail(marketplacePath, `plugin ${plugin.name} has no ${relative(root, manifest)}`);
    continue;
  }
  const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (name !== plugin.name) fail(manifest, `name "${name}" differs from the marketplace entry "${plugin.name}"`);
}

// Skills.
const skills = files.filter((f) => f.endsWith(`${'SKILL.md'}`));
if (skills.length === 0) fail(root, 'no SKILL.md found');
for (const skill of skills) {
  const text = readFileSync(skill, 'utf8').replace(/\r\n/g, '\n');
  const front = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  if (!front) {
    fail(skill, 'missing frontmatter');
    continue;
  }
  const name = front.match(/^name: (.+)$/m)?.[1]?.trim();
  const description = front.match(/^description: (.+)$/m)?.[1]?.trim();
  const folder = skill.split(/[\\/]/).at(-2);
  if (!name || !/^[a-z0-9-]{1,64}$/.test(name)) fail(skill, 'name must be 1-64 lowercase letters, digits or hyphens');
  if (name !== folder) fail(skill, `name "${name}" should match its folder "${folder}"`);
  if (!description || description.length > 1024) fail(skill, 'description must be present and at most 1024 characters');
  const dir = join(skill, '..');
  for (const [, path] of text.matchAll(/`((?:references|examples|scripts)\/[^`]+)`/g)) {
    if (!existsSync(join(dir, path))) fail(skill, `mentions ${path}, which does not exist`);
  }
}

// Credentials. Cortex client ids are 40 alphanumerics; secrets are longer.
for (const file of files) {
  if (!/\.(md|js|mjs|json|ts|dart|txt)$/.test(file)) continue;
  if (/\b[A-Za-z0-9]{40,}\b/.test(readFileSync(file, 'utf8'))) fail(file, 'contains a credential-shaped string');
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${skills.length} skill(s), ${files.length} files checked`);
