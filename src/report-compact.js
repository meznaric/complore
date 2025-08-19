export function buildCompactReport({ data, components }) {
  const esc = (s) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const { items, maxes } = data;

  const PX_PER_10_LOC = 1; // 10 LOC = 1px height
  const COL_WIDTH = 10;     // 3px width per item
  const GAP_Y = 1;         // 1px vertical gap between items/groups
  const FOLDER_PAD = 0;    // no inner padding for folders
  const FOLDER_BORDER = 0; // no border around folders

  function scale(v, k) {
    const m = maxes[k] || 1;
    return m ? v / m : 0;
  }

  // Tree
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

  const root = { name: '', path: '', children: new Map(), files: [] };
  for (const it of items) {
    const parts = trim(it.path).split('/').filter(Boolean);
    if (!parts.length) { root.files.push(it); continue; }
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.children.has(seg)) node.children.set(seg, { name: seg, path: (node.path ? node.path + '/' : '') + seg, children: new Map(), files: [] });
      node = node.children.get(seg);
    }
    node.files.push(it);
  }

  // Layout pass: compute height of each node column (sum of files and subgroups plus gaps)
  function fileHeightPx(f) {
    const loc = f.loc || 0;
    return Math.max(1, Math.ceil((loc / 10) * PX_PER_10_LOC));
  }

  let maxDepth = 0;
  function aggregateLayout(node, depth = 0) {
    node._depth = depth;
    if (depth > maxDepth) maxDepth = depth;
    // Folder shows its own bar at top, then files, then child folders
    // Folder bar height based on aggregate loc
    let aggLoc = 0;
    let filesHeight = 0;
    for (let i = 0; i < node.files.length; i++) {
      const f = node.files[i];
      aggLoc += f.loc || 0;
      filesHeight += fileHeightPx(f);
      if (i < node.files.length - 1) filesHeight += GAP_Y;
    }
    let childrenTotal = 0;
    let childCount = 0;
    for (const child of node.children.values()) {
      const h = aggregateLayout(child, depth + 1);
      childrenTotal += h;
      childCount += 1;
      // also include child aggregate loc into this aggregate
      aggLoc += (child._aggLoc || 0);
    }
    if (childCount > 0) {
      childrenTotal += GAP_Y * (childCount - 1);
      if (filesHeight > 0) childrenTotal += GAP_Y;
    }
    const folderBarH = Math.max(1, Math.ceil(((aggLoc || 0) / 10) * PX_PER_10_LOC));
    // Note: add gap below folder bar if it has any content under it
    let inner = folderBarH;
    if (filesHeight > 0 || childrenTotal > 0) inner += GAP_Y;
    inner += filesHeight + childrenTotal;

    const chrome = (node !== root ? (FOLDER_PAD * 2 + FOLDER_BORDER * 2) : 0);
    const height = inner + chrome;
    node._height = Math.max(1, height);
    node._aggLoc = aggLoc;
    node._folderBarH = folderBarH;
    return node._height;
  }
  aggregateLayout(root, 0);

  // Rendering: build nested flex-based markup
  function colorFor(it) {
    const c = scale(it[components.color], components.color);
    const hue = (1 - c) * 120;
    return `hsl(${hue},85%,45%)`;
  }

  function renderNode(node) {
    // folder bar height from layout
    const folderBar = `<div class=\"bar folder\" data-type=\"folder\" data-path=\"${esc(node.path)}\" title=\"${esc(node.path || '(root)')}\" style=\"width:${COL_WIDTH}px;height:${node._folderBarH}px;background:hsl(210,10%,70%)\"></div>`;

    // children stack: first files (bars), then child folders recursively
    const children = [];

    for (let i = 0; i < node.files.length; i++) {
      const f = node.files[i];
      const h = fileHeightPx(f);
      const title = `${esc(f.path)}\\nloc ${f.loc} · act ${f.activity} · fn ${f.functions} · imp ${f.imports} · maxf ${f.maxfunc}`;
      children.push(`<div class=\"h\"><div class=\"bar file\" data-type=\"file\" data-path=\"${esc(f.path)}\" title=\"${title}\" style=\"width:${COL_WIDTH}px;height:${h}px;background:${colorFor(f)}\"></div></div>`);
    }

    if (node.children.size) {
      if (node.files.length) children.push(`<div class=\"spacer\" style=\"height:${GAP_Y}px\"></div>`);
      for (const child of node.children.values()) {
        children.push(renderNode(child));
      }
    }

    return `<div class=\"h\"><div class=\"bar\" style=\"width:${COL_WIDTH}px;height:${node._folderBarH}px;background:hsl(210,10%,70%)\" data-type=\"folder\" data-path=\"${esc(node.path)}\" title=\"${esc(node.path || '(root)')}\"></div><div class=\"v\" style=\"gap:${GAP_Y}px\">${children.join('')}</div></div>`;
  }

  const bodyMarkup = renderNode(root);

  const style = `
    .wrap{background:#fff;}
    .canvas{display:inline-block;}
    .h{display:flex;align-items:flex-start;}
    .v{display:flex;flex-direction:column;}
    .bar{outline:0; margin-right: 1px;}
    .bar:hover{outline:1px solid #000;}
    .tooltip{position:fixed;pointer-events:none;background:rgba(0,0,0,0.85);color:#fff;padding:4px 6px;border-radius:3px;font:12px/1.2 -apple-system,system-ui,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;z-index:1000;}
  `;

  const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><title>complore compact</title><style>${style}</style></head><body style=\"margin:8px;background:#f7fafc;color:#111;font:14px/1.4 -apple-system,system-ui,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;\">
  <div class=\"wrap\">
    <div id=\"canvas\" class=\"canvas\">${bodyMarkup}</div>
  </div>
  <div id=\"tt\" class=\"tooltip\" style=\"display:none\"></div>
  <script>
    const tt = document.getElementById('tt');
    const rootEl = document.getElementById('canvas');
    rootEl.addEventListener('mousemove', (e) => {
      const t = e.target.closest('.bar');
      if (t) {
        const title = t.getAttribute('title');
        tt.textContent = title;
        tt.style.display = 'block';
        const x = e.clientX + 10; const y = e.clientY + 10;
        tt.style.left = x + 'px'; tt.style.top = y + 'px';
      } else {
        tt.style.display = 'none';
      }
    });
  </script>
</body></html>`;

  return html;
}
