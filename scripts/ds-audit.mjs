#!/usr/bin/env node
/**
 * Auditoria do design system — a métrica de progresso das Fases 2 e 3 do
 * UX_IMPLEMENTATION_PLAN.md.
 *
 * O ESLint impede que código NOVO regrida (a catraca em eslint.config.mjs).
 * Este script mede o passivo que ainda existe, que o lint não mostra porque
 * está isento pela lista de legado.
 *
 *   npm run ds:audit
 *   npm run ds:audit -- --json    (saída para CI)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components'];

/** A landing tem identidade própria e está fora do escopo da revisão. */
const EXCLUDED = ['app/preview', 'app/page.tsx'];

const CHECKS = [
  {
    id: 'native-dialogs',
    label: 'Diálogos nativos (alert/confirm/prompt)',
    pattern: /(?<![.\w])(?:alert|confirm|prompt)\s*\(|window\.(?:alert|confirm|prompt)\s*\(/g,
    target: 0,
    // `useConfirm()` cria uma variável local chamada `confirm`; a chamada
    // dela não é diálogo nativo e não deve contar.
    ignoreFile: (source) => source.includes('useConfirm()'),
  },
  {
    id: 'color-literals',
    label: 'Cores fora dos tokens (slate/emerald/zinc/gray/neutral)',
    pattern:
      /(?:bg|text|border|divide|ring|from|via|to|shadow|outline|accent|fill|stroke)-(?:slate|emerald|zinc|gray|neutral)-[0-9]{2,3}/g,
    target: 0,
  },
  {
    id: 'tiny-text',
    label: 'Texto abaixo do piso de 12px',
    pattern: /text-\[(?:[0-9]|1[01])px\]/g,
    target: 0,
  },
  {
    id: 'raw-xs',
    label: 'text-xs avulso (fora da escala de 7 degraus)',
    pattern: /\btext-xs\b/g,
    target: 0,
  },
  {
    id: 'ad-hoc-skeleton',
    label: 'animate-pulse fora do componente Skeleton',
    pattern: /animate-pulse/g,
    target: 0,
    skipPath: (path) => path.includes(`ui${sep}Skeleton`),
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(full);
  }
  return files;
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir))).filter((file) => {
  const rel = relative(ROOT, file).split(sep).join('/');
  return !EXCLUDED.some((prefix) => rel.startsWith(prefix));
});

/**
 * Remove comentários antes de medir. Sem isto, a própria documentação conta
 * como violação — `Toast.tsx` aparecia como usuário de `alert()` só por
 * explicar, num comentário, que veio para substituí-lo.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const results = CHECKS.map((check) => {
  let count = 0;
  const offenders = new Map();

  for (const file of files) {
    if (check.skipPath?.(file)) continue;
    const raw = readFileSync(file, 'utf8');
    if (check.ignoreFile?.(raw)) continue;
    const source = stripComments(raw);

    const hits = source.match(check.pattern);
    if (!hits) continue;

    count += hits.length;
    offenders.set(relative(ROOT, file).split(sep).join('/'), hits.length);
  }

  return {
    id: check.id,
    label: check.label,
    count,
    target: check.target,
    files: offenders.size,
    // As piores primeiro: é por onde a Fase 2 deve começar.
    worst: [...offenders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ files: files.length, results }, null, 2));
  process.exit(0);
}

const pad = (value, width) => String(value).padStart(width);
const totalOpen = results.reduce((sum, r) => sum + (r.count > r.target ? 1 : 0), 0);

console.log(`\n  Auditoria do design system — ${files.length} arquivos\n`);

for (const result of results) {
  const ok = result.count <= result.target;
  console.log(
    `  ${ok ? '[ok]  ' : '[    ]'} ${pad(result.count, 5)}  ${result.label}` +
      (ok ? '' : `  (${result.files} arquivos)`),
  );
  if (!ok) {
    for (const [file, hits] of result.worst) {
      console.log(`             ${pad(hits, 5)}  ${file}`);
    }
  }
}

console.log(
  totalOpen === 0
    ? '\n  Tudo dentro da meta. A lista de legado do eslint.config.mjs pode ser apagada.\n'
    : `\n  ${totalOpen} de ${results.length} indicadores acima da meta. Ver UX_IMPLEMENTATION_PLAN.md, Fase 2.\n`,
);

// Sai com 0 de propósito: isto é um relatório de progresso, não um portão.
// O portão é o ESLint, que já falha em código novo.
process.exit(0);
