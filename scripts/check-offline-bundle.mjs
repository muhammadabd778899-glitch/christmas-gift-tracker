#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const forbidden = [
  { label: 'Supabase client/runtime', pattern: /supabase/i },
  { label: 'Supabase environment variable', pattern: /VITE_SUPABASE/ },
  { label: 'Supabase sync RPC', pattern: /sync_upsert|sync_list_changes|sync_delete/ },
  {
    label: 'Supabase auth call',
    pattern: /signInWithPassword|signUpWithPassword|resetPasswordForEmail/,
  },
  { label: 'Privileged key name', pattern: /service_role|SUPABASE_SERVICE_ROLE/i },
  {
    label: 'Runtime third-party asset',
    pattern:
      /fonts\.googleapis\.com|cdn\.jsdelivr\.net|unpkg\.com|googletagmanager|google-analytics|gtag\(/i,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (/\.(js|mjs|css|html|webmanifest|json|map)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  try {
    const info = await stat(distDir);
    if (!info.isDirectory()) {
      throw new Error('not a directory');
    }
  } catch {
    console.error('Offline bundle check failed: dist/ does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  const files = await collectFiles(distDir);
  const scripts = files.filter((file) => /\.(js|mjs)$/.test(file));

  if (scripts.length === 0) {
    console.error('Offline bundle check failed: dist/ contains no JavaScript bundles.');
    process.exit(1);
  }

  const failures = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) {
        failures.push(`${relative(process.cwd(), file)}: ${rule.label}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('Offline bundle contains online-edition code or disallowed runtime assets:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Offline bundle verified: ${scripts.length} script files scanned, no accounts, sync, privileged keys, or runtime third-party assets found.`,
  );
}

await main();
