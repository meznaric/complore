import fs from 'node:fs';

export function buildHtmlReport({ data, components }) {
  const tailwind = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  const esc = (s) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const { items, maxes } = data;

  // Derive common root to trim leading folders
  function commonPrefix(paths) {
    if (!paths.length) return '';
    const split = paths.map(p => p.split('/'));
    const minLen = Math.min(...split.map(a => a.length));
    const out = [];
    for (let i = 0; i < minLen; i++) {
      const seg = split[0][i];
      if (split.every(a => a[i] === seg)) out.push(seg); else break;
    }
    return out.join('/');
  }
  const allPaths = items.map(it => it.path);
  const rootTrim = commonPrefix(allPaths);
  const trim = (p) => rootTrim && p.startsWith(rootTrim + '/') ? p.slice(rootTrim.length + 1) : p;

  function scale(v, k) {
    const m = maxes[k] || 1;
    return m ? v / m : 0;
  }

  // Build tree from paths (trimmed)
  const root = { name: '', path: '', children: new Map(), files: [], aggregate: null };
  for (const it of items) {
    const parts = trim(it.path).split('/').filter(Boolean);
    if (parts.length === 0) { root.files.push(it); continue; }
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.children.has(seg)) node.children.set(seg, { name: seg, path: (node.path ? node.path + '/' : '') + seg, children: new Map(), files: [] });
      node = node.children.get(seg);
    }
    node.files.push({ ...it });
  }

  function renderBar(it, fullHeight) {
    const h = scale(it[components.height], components.height);
    const c = scale(it[components.color], components.color);
    const color = `hsl(${(1 - c) * 120}, 85%, 45%)`;
    let height = 12 + Math.round(h * 180);
    if (fullHeight) height = "auto";
    const extraClass = fullHeight ? "self-stretch" : "";
    return `<div class=\"w-2 rounded ${extraClass}\" style=\"height:${height}px;background:${color}\"></div>`;
  }

  function renderFile(it) {
    return `<div class="flex items-center space-x-2 py-0.5 px-1 hover:bg-gray-50">
      ${renderBar(it)}
      <div class="flex-1 gap-1 flex flex-row">
        <div class="text-xs text-gray-700">${esc(it.path.split('/').pop())}</div>
        <div class="text-xs text-gray-400">loc ${it.loc} · act ${it.activity} · fn ${it.functions} · imp ${it.imports} · maxf ${it.maxfunc}</div>
      </div>
    </div>`;
  }

  function aggregateNode(node) {
    const acc = { loc:0, activity:0, functions:0, imports:0, maxfunc:0 };
    for (const f of node.files) {
      acc.loc += f.loc; acc.activity += f.activity; acc.functions += f.functions; acc.imports += f.imports; acc.maxfunc = Math.max(acc.maxfunc, f.maxfunc);
    }
    for (const child of node.children.values()) {
      const a = aggregateNode(child);
      acc.loc += a.loc; acc.activity += a.activity; acc.functions += a.functions; acc.imports += a.imports; acc.maxfunc = Math.max(acc.maxfunc, a.maxfunc);
    }
    node.aggregate = acc;
    return acc;
  }
  aggregateNode(root);

  function renderNode(node, depth = 0, idpath = '') {
    const id = (idpath || 'root') + (node.name ? '/' + node.name : '');
    const open = (typeof window === 'undefined') ? true : (localStorage.getItem('open:' + id) !== '0');
    const label = node.name || 'root';

    // If a folder has exactly one file and no subfolders, compress display as single child item
    if (node.files.length === 1 && node.children.size === 0 && node.name) {
      const f = node.files[0];
      const bar = renderBar({ ...node.aggregate, path: node.path });
      const fileHtml = renderFile({ ...f, path: f.path });
      return `<div class=\"flex items-center space-x-2 py-0.5 px-1\">${bar}<div class=\"text-sm font-medium\">${esc(label)}/</div>${fileHtml}</div>`;
    }

    const childrenHtml = Array.from(node.children.values()).map(ch => renderNode(ch, depth + 1, id)).join('');
    const filesHtml = node.files.map(f => renderFile(f)).join('');

    const bar = node.aggregate && node.name ? renderBar({ ...node.aggregate, path: node.path }, true) : '';

    return `<div>
      <div class=\"flex items-start space-x-2 py-1 px-1 bg-gray-50 rounded\">
        ${bar}
        <div>
          <div class=\"flex items-center gap-1\">
            <div class=\"text-sm font-medium toggle\" data-id=\"${esc(id)}\">${esc(label || '/')}</div>
            <div class=\"text-sm text-gray-400">loc ${node.aggregate?.loc||0} · act ${node.aggregate?.activity||0}</div>
          </div>
          <div class=\"children ml-6\" data-id=\"${esc(id)}\" style=\"display:${open?'block':'none'}\">
            <div class="tree-files">${filesHtml}</div>
            ${childrenHtml}
          </div>
        </div>
      </div>
    </div>`;
  }

  const legend = `<div class="text-sm">Height: ${components.height} · Color: ${components.color}
    <div class="mt-2 space-x-2">
      <button id="expandAll" class="text-xs px-2 py-1 rounded border">Expand all</button>
      <button id="collapseAll" class="text-xs px-2 py-1 rounded border">Collapse all</button>
    </div>
  </div>`;

  const treeHtml = renderNode(root);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>complore report</title>
  <link rel="stylesheet" href="${tailwind}"/>
  <style>
    body { font-feature-settings: "liga" 1, "calt" 1; }
    .container { max-width: 980px; }
    .tree-scroll { overflow-x: auto; overflow-y: hidden; }
    .flame { white-space: nowrap; }
    .flame .children { border-left: 1px dashed #eee; margin-left: 8px; padding-left: 8px; }
    .tree-files { margin-top: 4px; }
    .rotate-90 { transform: rotate(90deg); }
  </style>
</head>
<body class="bg-gray-50 text-gray-900">
  <div class="container mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold mb-2">complore report</h1>
    ${legend}
    <div class="mt-4 bg-white shadow rounded p-2 tree-scroll flame">
      ${treeHtml}
    </div>
  </div>
  <script>
    function setOpen(id, open) {
      const sec = document.querySelector('.children[data-id="' + id + '"]');
      const btn = document.querySelector('.toggle[data-id="' + id + '"]');
      if (!sec || !btn) return;
      sec.style.display = open ? 'block' : 'none';
      // btn.textContent = open ? '▾' : '▸';
      localStorage.setItem('open:' + id, open ? '1' : '0');
    }
    document.querySelectorAll('.toggle').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const stored = localStorage.getItem('open:' + id);
      const open = stored === null ? true : stored === '1';
      setOpen(id, open);
      btn.addEventListener('click', () => {
        const sec = document.querySelector('.children[data-id="' + id + '"]');
        const now = sec.style.display !== 'block';
        setOpen(id, now);
      });
    });
    document.getElementById('expandAll').addEventListener('click', () => {
      document.querySelectorAll('.children').forEach(sec => setOpen(sec.getAttribute('data-id'), true));
    });
    document.getElementById('collapseAll').addEventListener('click', () => {
      document.querySelectorAll('.children').forEach(sec => setOpen(sec.getAttribute('data-id'), false));
    });
  </script>
</body>
</html>`;
}
