import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import ignoreLib from 'ignore';
import { execFileSync } from 'node:child_process';

export async function scanPaths({ paths, ignore = [], foldersOnly = false }) {
  const ig = ignoreLib();
  const gitignore = tryRead('.gitignore');
  if (gitignore) ig.add(gitignore);
  if (ignore?.length) ig.add(ignore);

  const entries = await fg(paths, { dot: true, onlyFiles: true, unique: true, followSymbolicLinks: false, ignore: ['**/node_modules/**', '**/.git/**'] });
  const files = entries.filter(p => !ig.ignores(p));

  const items = files.map((file) => analyzeFile(file));
  const all = await Promise.all(items);

  if (foldersOnly) {
    const byDir = new Map();
    for (const f of all) {
      const dir = path.dirname(f.path) || '.';
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir).push(f);
    }
    const aggs = [];
    for (const [dir, arr] of byDir.entries()) {
      aggs.push(aggregate(dir, arr));
    }
    const maxes = computeMaxes(aggs);
    return { files: aggs, maxes };
  }

  const maxes = computeMaxes(all);
  return { files: all, maxes };
}

function tryRead(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

async function analyzeFile(file) {
  const content = tryRead(file);
  const loc = content ? content.split(/\r?\n/).length : 0;
  const activity = gitActivity(file);
  // Placeholders for Tree-sitter derived metrics
  const functions = countByRegex(content, /\bfunction\b|=>|def\s+\w+\s*\(|class\s+\w+\{/g);
  const imports = countByRegex(content, /\bimport\b|require\(|from\s+['"]/g);
  const maxfunc = maxFunctionLen(content);
  return { path: file, loc, activity, functions, imports, maxfunc };
}

function countByRegex(text, re) {
  if (!text) return 0;
  const m = text.match(re);
  return m ? m.length : 0;
}

function maxFunctionLen(text) {
  if (!text) return 0;
  const lines = text.split(/\r?\n/);
  let max = 0; let cur = 0; let depth = 0;
  for (const line of lines) {
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    if (/function\b|=>|def\s+\w+\s*\(|class\s+\w+/.test(line)) {
      cur = 0; depth = Math.max(depth, 1);
    }
    depth += open - close;
    if (depth > 0) cur++;
    if (depth <= 0) { max = Math.max(max, cur); cur = 0; }
  }
  return Math.max(max, cur);
}

function gitActivity(file) {
  try {
    const out = execFileSync('git', ['log', '--pretty=oneline', '--', file], { encoding: 'utf8' });
    return out ? out.split('\n').filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

function aggregate(dir, arr) {
  const sum = (k) => arr.reduce((a, b) => a + (b[k] || 0), 0);
  const max = (k) => arr.reduce((a, b) => Math.max(a, b[k] || 0), 0);
  return {
    path: dir,
    loc: sum('loc'),
    activity: sum('activity'),
    functions: sum('functions'),
    imports: sum('imports'),
    maxfunc: max('maxfunc')
  };
}

function computeMaxes(items) {
  const maxOf = (k) => items.reduce((m, it) => Math.max(m, it[k] || 0), 0);
  return {
    loc: maxOf('loc'),
    activity: maxOf('activity'),
    functions: maxOf('functions'),
    imports: maxOf('imports'),
    maxfunc: maxOf('maxfunc')
  };
}
