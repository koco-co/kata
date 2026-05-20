// kata console — read-only dashboard frontend (zero-build, vanilla ES module).

const state = {
  project: null,
  features: [],
  featureId: null,
  tab: "archive",
};

const $ = (sel) => document.querySelector(sel);

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Projects ────────────────────────────────────────────────
async function loadProjects() {
  const projects = await api("/api/projects");
  const total = projects.reduce((n, p) => n + p.featureCount, 0);
  $("#topbar-meta").textContent = `${projects.length} 项目 · ${total} features`;
  const ul = $("#project-list");
  ul.innerHTML = "";
  for (const p of projects) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="badge">${p.featureCount}</span>`;
    li.onclick = () => selectProject(p.name, li);
    ul.appendChild(li);
  }
}

async function selectProject(name, li) {
  state.project = name;
  state.featureId = null;
  document.querySelectorAll(".project-list li").forEach((el) => {
    el.classList.remove("active");
  });
  li.classList.add("active");
  $("#filters").hidden = false;
  $("#detail-pane").innerHTML = '<div class="empty">选择一个 feature 查看详情</div>';
  state.features = await api(`/api/projects/${encodeURIComponent(name)}/features`);
  buildModuleFilter();
  renderFeatureList();
}

function buildModuleFilter() {
  const modules = [...new Set(state.features.flatMap((f) => f.modules))].sort();
  const sel = $("#f-module");
  sel.innerHTML = '<option value="">全部模块</option>';
  for (const m of modules) {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    sel.appendChild(o);
  }
}

function filteredFeatures() {
  const q = $("#search").value.trim().toLowerCase();
  const mod = $("#f-module").value;
  const auto = $("#f-automation").value;
  return state.features.filter((f) => {
    if (mod && !f.modules.includes(mod)) return false;
    if (auto && f.automationStatus !== auto) return false;
    if (q && !`${f.id} ${f.displayName}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderFeatureList() {
  const rows = filteredFeatures();
  $("#list-count").textContent = `${rows.length} / ${state.features.length}`;
  const list = $("#feature-list");
  list.innerHTML = "";
  if (rows.length === 0) {
    list.innerHTML = '<div class="empty">无匹配 feature</div>';
    return;
  }
  for (const f of rows) {
    const row = document.createElement("div");
    row.className = `feature-row${f.id === state.featureId ? " active" : ""}`;
    const mods = f.modules.map((m) => `<span class="tag mod">${escapeHtml(m)}</span>`).join("");
    row.innerHTML = `
      <div class="fr-name">${escapeHtml(f.displayName || f.id)}</div>
      <div class="fr-meta">
        ${mods}
        <span class="tag auto-${escapeHtml(f.automationStatus)}">⚙ ${escapeHtml(f.automationStatus)}</span>
        <span class="tag">▶ ${escapeHtml(f.lastRunStatus)}</span>
      </div>`;
    row.onclick = () => selectFeature(f.id);
    list.appendChild(row);
  }
}

// ── Feature detail ──────────────────────────────────────────
async function selectFeature(featureId) {
  state.featureId = featureId;
  renderFeatureList();
  const pane = $("#detail-pane");
  pane.innerHTML = '<div class="empty">加载中…</div>';
  try {
    const detail = await api(
      `/api/projects/${encodeURIComponent(state.project)}/features/${encodeURIComponent(featureId)}`,
    );
    renderDetail(detail);
  } catch (e) {
    pane.innerHTML = `<div class="error">加载失败：${escapeHtml(e.message)}</div>`;
  }
}

function renderDetail(detail) {
  const m = detail.metadata || {};
  const man = detail.manifest || {};
  const hasXmind = detail.artifacts.some((a) => a.name === "cases.xmind");
  const hasArchive = detail.artifacts.some((a) => a.name === "archive.md");
  const cd = man.case_drafting || {};
  const auto = man.automation || {};

  const pane = $("#detail-pane");
  pane.innerHTML = `
    <div class="detail-head">
      <h1>${escapeHtml(m.display_name || m.id)}</h1>
      <div class="kv">
        <span><b>${escapeHtml(m.id || "")}</b></span>
        <span>状态 <b>${escapeHtml(m.status || "?")}</b></span>
        <span>模块 <b>${escapeHtml((m.modules || []).join(", ") || "—")}</b></span>
        <span>用例草拟 <b>${escapeHtml(cd.status || "—")}</b></span>
        <span>自动化 <b>${escapeHtml(auto.status || "—")}</b> / ${escapeHtml(auto.last_run_status || "—")}</span>
        <span>更新 <b>${escapeHtml(m.updated_at || m.created_at || "—")}</b></span>
      </div>
    </div>
    <div class="tabs" id="tabs"></div>
    <div class="tab-body" id="tab-body"></div>`;

  const tabs = [];
  if (hasArchive) tabs.push(["archive", "Archive 用例"]);
  if (hasXmind) tabs.push(["xmind", "XMind 脑图"]);
  tabs.push(["meta", "元数据"]);
  tabs.push(["files", `产物 (${detail.artifacts.length})`]);

  const tabsEl = $("#tabs");
  if (!tabs.some(([id]) => id === state.tab)) state.tab = tabs[0][0];
  for (const [id, label] of tabs) {
    const el = document.createElement("div");
    el.className = `tab${id === state.tab ? " active" : ""}`;
    el.textContent = label;
    el.onclick = () => {
      state.tab = id;
      renderDetail(detail);
    };
    tabsEl.appendChild(el);
  }
  renderTab(detail);
}

async function renderTab(detail) {
  const body = $("#tab-body");
  const base = `/api/projects/${encodeURIComponent(state.project)}/features/${encodeURIComponent(state.featureId)}`;
  body.innerHTML = '<div class="empty">加载中…</div>';
  try {
    if (state.tab === "archive") {
      const md = await apiText(`${base}/artifact/archive.md`);
      body.innerHTML = `<div class="md">${renderMarkdown(md)}</div>`;
    } else if (state.tab === "xmind") {
      const sheets = await api(`${base}/xmind`);
      body.innerHTML = `<div class="tree">${sheets.map(renderSheet).join("")}</div>`;
      wireTreeToggles(body);
    } else if (state.tab === "meta") {
      body.innerHTML = `<div class="md"><pre><code>${escapeHtml(
        JSON.stringify({ metadata: detail.metadata, manifest: detail.manifest }, null, 2),
      )}</code></pre></div>`;
    } else if (state.tab === "files") {
      body.innerHTML = detail.artifacts
        .map((a) => {
          const viewable = a.name !== "cases.xmind";
          const link = viewable
            ? `<a class="dl" href="${base}/artifact/${encodeURIComponent(a.name)}" target="_blank">查看</a>`
            : '<span class="sz">（脑图见 XMind 标签）</span>';
          return `<div class="file-row"><span>${escapeHtml(a.name)}</span><span class="sz">${fmtBytes(a.bytes)} · ${link}</span></div>`;
        })
        .join("");
    }
  } catch (e) {
    body.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
  }
}

const fmtBytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;

// ── XMind tree render ───────────────────────────────────────
function priorityMarker(node) {
  const fromMarker = node.markers.find((m) => /priority-(\d)/.test(m));
  let p = fromMarker ? fromMarker.match(/priority-(\d)/)[1] : null;
  if (!p) {
    const inTitle = node.title.match(/【\s*P([0-3])\s*】/i);
    if (inTitle) p = inTitle[1];
  }
  return p ? `<span class="marker p${p}">P${p}</span>` : "";
}

function renderNode(node, depth) {
  const hasKids = node.children.length > 0;
  const toggle = hasKids ? '<span class="toggle">▾</span>' : '<span class="toggle"></span>';
  const title = node.title.replace(/【\s*P[0-3]\s*】/i, "").trim();
  const note = node.note ? `<div class="tnote">${escapeHtml(node.note)}</div>` : "";
  const kids = hasKids
    ? `<div class="kids">${node.children.map((c) => renderNode(c, depth + 1)).join("")}</div>`
    : "";
  // collapse deep nodes by default to keep the tree scannable
  const collapsed = depth >= 3 && hasKids ? " collapsed" : "";
  return `<div class="tnode${collapsed}">
    <div class="row">${toggle}<span class="label">${priorityMarker(node)}${escapeHtml(title)}</span></div>
    ${note}${kids}</div>`;
}

function renderSheet(sheet) {
  return renderNode(sheet.root, 0);
}

function wireTreeToggles(root) {
  root.querySelectorAll(".tnode > .row > .toggle").forEach((t) => {
    if (!t.textContent) return;
    t.onclick = () => {
      const node = t.closest(".tnode");
      node.classList.toggle("collapsed");
      t.textContent = node.classList.contains("collapsed") ? "▸" : "▾";
    };
    const node = t.closest(".tnode");
    if (node.classList.contains("collapsed")) t.textContent = "▸";
  });
}

// ── Minimal markdown renderer (archive.md subset) ───────────
function renderInline(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

function stripFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: null, body: md };
  return { fm: m[1], body: md.slice(m[0].length) };
}

function renderFrontmatter(fm) {
  if (!fm) return "";
  const lines = fm.split("\n");
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim();
      // gather list items that follow ("  - x")
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^\s*-\s+/, "").replace(/^["']|["']$/g, ""));
        j++;
      }
      if (items.length) {
        rows.push(
          `<div class="fm-row"><span class="k">${escapeHtml(key)}</span><span class="chips">${items
            .map((x) => `<span class="chip">${escapeHtml(x)}</span>`)
            .join("")}</span></div>`,
        );
        i = j;
        continue;
      }
      val = val.replace(/^["']|["']$/g, "");
      if (val) {
        rows.push(
          `<div class="fm-row"><span class="k">${escapeHtml(key)}</span><span>${escapeHtml(val)}</span></div>`,
        );
      }
    }
    i++;
  }
  return `<div class="fm-card">${rows.join("")}</div>`;
}

function renderMarkdown(md) {
  const { fm, body } = stripFrontmatter(md);
  const lines = body.split("\n");
  const out = [renderFrontmatter(fm)];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    if (/^```/.test(line)) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // table
    if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1])) {
      flushPara();
      const header = splitRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && /^\|.*\|/.test(lines[i])) {
        bodyRows.push(splitRow(lines[i]));
        i++;
      }
      const thead = `<tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr>`;
      const tbody = bodyRows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // list
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${renderInline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join("")}</ul>`);
      continue;
    }

    if (line.trim() === "") {
      flushPara();
    } else {
      para.push(line.trim());
    }
    i++;
  }
  flushPara();
  return out.join("\n");
}

const splitRow = (line) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

// ── filter wiring ───────────────────────────────────────────
$("#search").addEventListener("input", renderFeatureList);
$("#f-module").addEventListener("change", renderFeatureList);
$("#f-automation").addEventListener("change", renderFeatureList);

loadProjects().catch((e) => {
  $("#project-list").innerHTML = `<li class="error">${escapeHtml(e.message)}</li>`;
});
