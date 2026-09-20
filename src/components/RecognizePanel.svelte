<script lang="ts">
  import {
    currentProduct, addItem, toggleItemByName, nameKey,
    pushToast, scheduleSave, logOperation, app,
  } from '../lib/stores/app.svelte';
  import type { Group } from '../lib/core/schema';

  const AUTO_GROUP_NAME = '识别新增';

  let text = $state('');
  let mode = $state<'smart' | 'punct' | 'line'>('smart');

  interface Candidate {
    id: string;
    name: string;
    checked: boolean;
    targetGroupId: string; // '' 表示自动
    existsIn: string;      // 已存在的分组 id（'' 表示新建）
  }

  let candidates = $state<Candidate[]>([]);

  const p = $derived(currentProduct());
  const groups = $derived(p?.groups ?? []);

  function splitSmart(raw: string): string[] {
    // 优先按换行；否则按逗号/顿号/分号/空格
    return raw
      .split(/[\n\r]+/)
      .flatMap((line) => line.split(/[，,、;；]+|\s{2,}/))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function splitPunct(raw: string): string[] {
    return raw.split(/[,，、;；\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  function splitLine(raw: string): string[] {
    return raw.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  }

  function buildCandidates() {
    if (!p) return;
    const raw = text.trim();
    if (!raw) { pushToast('请先粘贴或输入文本', 'error'); return; }
    const parts =
      mode === 'smart' ? splitSmart(raw) : mode === 'punct' ? splitPunct(raw) : splitLine(raw);
    const seen = new Set<string>();
    const list: Candidate[] = [];
    parts.forEach((name) => {
      const k = nameKey(name);
      if (seen.has(k)) return;
      seen.add(k);
      // 查找是否已存在于某个分组
      let existsIn = '';
      for (const g of p.groups) {
        if (g.items.some((it) => nameKey(it.name) === k)) { existsIn = g.id; break; }
      }
      list.push({
        id: k,
        name,
        checked: true,
        targetGroupId: existsIn || '',
        existsIn,
      });
    });
    candidates = list;
    pushToast(`已生成 ${list.length} 个候选`);
  }

  function toggleAll(checked: boolean) {
    candidates = candidates.map((c) => ({ ...c, checked }));
  }

  function setTarget(id: string, gid: string) {
    candidates = candidates.map((c) => (c.id === id ? { ...c, targetGroupId: gid } : c));
  }

  function findOrCreateGroup(gid: string): Group | null {
    if (!p) return null;
    if (gid) return p.groups.find((g) => g.id === gid) || null;
    let g = p.groups.find((x) => x.name === AUTO_GROUP_NAME);
    if (!g) {
      g = { id: 'g_' + Date.now().toString(36), name: AUTO_GROUP_NAME, total: 0, items: [] };
      p.groups.push(g);
    }
    return g;
  }

  function applySelected() {
    if (!p) return;
    const chosen = candidates.filter((c) => c.checked);
    if (!chosen.length) { pushToast('未选中任何候选', 'error'); return; }
    let added = 0, incremented = 0;
    chosen.forEach((c) => {
      if (c.existsIn) {
        // 已存在的分类：数量 +1
        const g = p.groups.find((x) => x.id === c.existsIn);
        const it = g?.items.find((x) => nameKey(x.name) === c.id);
        if (it) { it.qty = (it.qty || 0) + 1; incremented++; }
      } else {
        const g = findOrCreateGroup(c.targetGroupId);
        if (!g) return;
        // 检查该分组是否已有同名
        if (g.items.some((it) => nameKey(it.name) === c.id)) {
          const it = g.items.find((x) => nameKey(x.name) === c.id)!;
          it.qty = (it.qty || 0) + 1;
          incremented++;
        } else {
          g.items.push({ name: c.name, qty: 0 });
          added++;
        }
        // 同时写入预分类
        if (!p.presets.some((x) => nameKey(x) === c.id)) {
          p.presets.push(c.name);
        }
      }
    });
    scheduleSave();
    logOperation(`识别应用：新增 ${added} 个分类，更新 ${incremented} 个分类数量`);
    pushToast(`新增 ${added} 个分类，更新 ${incremented} 个分类`);
  }

  function clearAll() {
    text = '';
    candidates = [];
  }

  function fillFromExternal(t: string) {
    text = (text ? text + '\n' : '') + t;
  }

  // 暴露给父级 App.svelte 的桥接
  export function appendText(t: string) {
    fillFromExternal(t);
  }
</script>

<section class="box">
  <div class="box-head">
    <span class="box-title">📝 识别文本 → 候选列表</span>
    <span class="box-badge">{candidates.length} 候选</span>
  </div>

  <div class="info-field" style="margin-bottom:8px">
    <label>拆分方式</label>
    <select
      value={mode}
      onchange={(e) => (mode = (e.target as HTMLSelectElement).value as any)}
    >
      <option value="smart">智能拆分（换行 / 逗号 / 顿号 / 双空格）</option>
      <option value="punct">仅空格和逗号</option>
      <option value="line">按行拆分</option>
    </select>
  </div>

  <textarea
    bind:value={text}
    placeholder="粘贴 OCR / 语音 / 手工文本…"
    style="width:100%;min-height:100px;padding:10px;font-size:13.5px;line-height:1.7;border:1.5px solid var(--c-border);border-radius:10px;background:var(--c-surface);color:var(--c-text);outline:none;resize:vertical;font-family:inherit;margin-bottom:8px"
  ></textarea>

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <button class="mini-batch-btn" onclick={buildCandidates} style="flex:1;padding:10px">
      🔍 生成候选列表
    </button>
    <button class="mini-batch-btn danger" onclick={clearAll}>清空</button>
  </div>

  {#if candidates.length}
    <div
      style="display:flex;align-items:center;gap:8px;padding:6px 9px;background:var(--c-primary-soft);border-radius:8px;font-size:12px;color:var(--c-primary-dark);margin-bottom:6px"
    >
      <label style="display:inline-flex;align-items:center;gap:5px;font-weight:700;cursor:pointer">
        <input
          type="checkbox"
          checked={candidates.every((c) => c.checked)}
          onchange={(e) => toggleAll((e.target as HTMLInputElement).checked)}
        />
        全选
      </label>
      <span style="margin-left:auto">
        已选 {candidates.filter((c) => c.checked).length} / {candidates.length}
      </span>
    </div>
    <div
      style="max-height:280px;overflow-y:auto;border:1.5px solid var(--c-border);border-radius:10px;padding:4px;background:var(--c-surface)"
    >
      {#each candidates as c (c.id)}
        <div
          style="display:flex;align-items:center;gap:6px;padding:6px 6px;border-bottom:1px dashed var(--c-border)"
        >
          <input
            type="checkbox"
            checked={c.checked}
            onchange={() =>
              (candidates = candidates.map((x) =>
                x.id === c.id ? { ...x, checked: !x.checked } : x,
              ))}
            style="width:16px;height:16px;accent-color:var(--c-primary)"
          />
          <span
            style="flex:1;min-width:0;font-size:13.5px;color:var(--c-text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
            title={c.name}
          >{c.name}</span>
          {#if c.existsIn}
            <span
              style="font-size:11px;color:var(--c-success);background:var(--c-success-soft);padding:1px 6px;border-radius:8px;border:1px solid var(--c-success-border)"
            >+1 数量</span>
          {:else}
            <select
              value={c.targetGroupId}
              onchange={(e) => setTarget(c.id, (e.target as HTMLSelectElement).value)}
              style="font-size:12px;padding:3px 6px;border:1.5px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text);max-width:120px"
            >
              <option value="">（自动：{AUTO_GROUP_NAME}）</option>
              {#each groups as g (g.id)}
                <option value={g.id}>{g.name}</option>
              {/each}
            </select>
          {/if}
        </div>
      {/each}
    </div>
    <button
      class="mini-batch-btn"
      onclick={applySelected}
      style="width:100%;padding:11px;margin-top:8px;font-size:13.5px;background:linear-gradient(135deg,var(--c-primary),var(--c-primary-2));color:#fff;border:none"
    >全部应用（选中的 {candidates.filter((c) => c.checked).length} 项）</button>
  {/if}
</section>