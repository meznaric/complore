import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import minimist from 'minimist';
import { scanPaths } from './scan.js';
import { buildJsonReport } from './report-json.js';
import { buildHtmlReport } from './report-html.js';
import { buildCompactReport } from './report-compact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readConfig(configPath) {
  if (!configPath) return {};
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = minimist(argv, {
    boolean: ['help', 'foldersOnly'],
    string: ['out', 'config', 'report', 'height', 'color'],
    alias: { h: 'help' },
    default: { report: 'html' }
  });

  if (args.help || argv.length === 0) {
    console.log(`complore - explore code complexity\n\nUsage: complore [paths..] [options]\n\nOptions:\n  --config <file>        JSON config file\n  --out <path>           Output file (report.html or report.json)\n  --report <html|json|compact>   Output format (default: html)\n  --height <metric>      Metric for height (loc|activity|functions|imports|maxfunc)\n  --color <metric>       Metric for color (loc|activity|functions|imports|maxfunc)\n  --foldersOnly          Aggregate by folders only\n  --help                 Show help\n\nExamples:\n  complore src --report html --out report.html\n  complore . --report json --out report.json --ignore dist,node_modules\n`);
    return;
  }

  const config = { ...readConfig(args.config) };
  const inputPaths = args._.length ? args._ : (config.paths || ['.']);
  const ignore = parseList(args.ignore || config.ignore);
  const components = {
    height: args.height || config.height || 'loc',
    color: args.color || config.color || 'activity'
  };
  const foldersOnly = Boolean(args.foldersOnly || config.foldersOnly);
  const outPath = args.out || config.out || ((args.report || config.report) === 'json' ? 'report.json' : 'report.html');

  const scan = await scanPaths({ paths: inputPaths, ignore, foldersOnly });
  const jsonReport = buildJsonReport({ scan, components });

  if ((args.report || config.report) === 'json') {
    fs.writeFileSync(outPath, JSON.stringify(jsonReport, null, 2));
    console.log(`Wrote ${path.resolve(outPath)}`);
    return;
  }

  const useReport = (args.report || config.report) || 'html';
  const html = useReport === 'compact'
    ? buildCompactReport({ data: jsonReport, components })
    : buildHtmlReport({ data: jsonReport, components });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${path.resolve(outPath)}`);
}

function parseList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}
