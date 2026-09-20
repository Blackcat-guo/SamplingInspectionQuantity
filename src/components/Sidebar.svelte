<script lang="ts">
  import {
    app, duplicateProduct, removeProduct, switchProduct,
    sortNatural, ncmp, scheduleSave,
  } from '../lib/stores/app.svelte';

  let { onOpenAddProduct, onOpenSettings } = $props<{
    onOpenAddProduct: () => void;
    onOpenSettings: () => void;
  }>();

  let filter = $state('');
  let sortDir = $state<'' | 'asc' | 'desc'>('');
  let batchMode = $state(false);
  let selected = $state<string[]>([]);

  const filteredList = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    const list = !q ? app.products : app.products.filter(p => p.name.toLowerCase().includes(q));
    if (sortDir === 'asc') return list.slice().sort((a, b) => ncmp(a.name, b.name));
    if (sortDir === 'desc') return list.slice().sort((a, b) => ncmp(b.name, a.name));
    return list;
  });

  const allSelected = $derived(
    filteredList.length > 0 && filteredList.every(p => selected.includes(p.id)),
  );

  function toggleSort() {
    sortDir = sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? '' : 'asc';
  }
  function toggleBatch() {
    batchMode = !batchMode;
    selected = [];
  }
  function toggleAll(checked: boolean) {
    selected = checked ? filteredList.map(p => p.id) : [];
  }
  function toggleOne(id: string) {
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1);
    else selected.push(id);
  }
  function batchDelete() {
    if (!selected.length) return;
    if (!confirm(`确定删除选中的 ${selected.length} 个产品吗？`)) return;
    const ids = selected.slice();
    ids.forEach(id => removeProduct(id));
    batchMode = false;
    selected = [];
  }
  function onItemClick(id: string) {
    if (batchMode) toggleOne(id);
    else switchProduct(id);
  }
  function renameProduct(id: string) {
    const p = app.products.find(x => x.id === id);
    if (!p) return;
    const v = prompt('重命名产品：', p.name);
    if (v === null) return;
    const t = v.trim();
    if (!t) return;
    if (p.name === t) return;
    p.name = t;
    scheduleSave();
  }
</script>

<aside class="sidebar" class:open={app.sidebarOpen} aria-label="产品列表">
  <div class="sidebar-head">
    <span class="sidebar-title">📁 产品列表</span>
    <button class="sidebar-sort" onclick={toggleSort} aria-label="切换排序">
      {sortDir === 'desc' ? '↓' : sortDir === 'asc' ? '↑' : '↕'}
    </button>
    <button class="sidebar-close" onclick={() => app.sidebarOpen = false} aria-label="关闭侧栏">✕</button>
  </div>

  <div class="sidebar-actions">
    <button class="primary" onclick={onOpenAddProduct}>＋ 添加产品</button>
    <button class:active={batchMode} onclick={toggleBatch}>
      ☑ {batchMode ? '批量中' : '批量管理'}
    </button>
  </div>

  {#if app.products.length > 1}
    <div style="padding:8px 8px 0">
      <input bind:value={filter} placeholder="🔍 搜索产品…" maxlength="30"
             style="width:100%;padding:8px 10px;font-size:13px;border:1.5px solid var(--c-border);border-radius:9px;background:var(--c-surface-2);color:var(--c-text);outline:none" />
    </div>
  {/if}

  {#if batchMode}
    <div style="margin:8px 8px 0;padding:8px 10px;background:var(--c-primary-soft);border:1.5px solid var(--c-primary-border);border-radius:10px;font-size:12px;color:var(--c-primary-dark)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
        <label style="display:inline-flex;align-items:center;gap:5px;font-weight:700;cursor:pointer">
          <input type="checkbox" checked={allSelected}
                 onchange={(e) => toggleAll((e.target as HTMLInputElement).checked)} /> 全选
        </label>
        <span>已选 {selected.length} / {app.products.length}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:7px">
        <button onclick={batchDelete} disabled={!selected.length}
                style="flex:1;padding:7px 8px;border:none;border-radius:8px;background:var(--c-danger-soft);color:var(--c-danger);font-size:12px;font-weight:700">
          🗑 删除所选
        </button>
        <button onclick={() => { batchMode = false; selected = []; }}
                style="flex:1;padding:7px 8px;border:1.5px solid var(--c-border);border-radius:8px;background:var(--c-surface);color:var(--c-text-2);font-size:12px;font-weight:700">
          取消
        </button>
      </div>
    </div>
  {/if}

  <div class="product-list">
    {#each filteredList as p (p.id)}
      <div class="product-item"
           class:active={p.id === app.currentProductId && !batchMode}
           onclick={() => onItemClick(p.id)}
           role="button" tabindex="0"
           onkeydown={(e) => { if (e.key === 'Enter') onItemClick(p.id); }}>
        {#if batchMode}
          <input type="checkbox" class="batch-check"
                 checked={selected.includes(p.id)}
                 onclick={(e) => e.stopPropagation()}
                 onchange={() => toggleOne(p.id)}
                 aria-label={'选择产品 ' + p.name} />
        {/if}
        <span class="product-name" title={p.name}>
          <span class="product-main">
            <span class="product-name-row">
              {p.name}{#if p.isSample}<span class="product-sample"> · 样品</span>{/if}
            </span>
            <span class="product-meta">
              {#if p.supplier || p.customer}
                {#if p.supplier}{p.supplier}{/if}
                {#if p.supplier && p.customer} · {/if}
                {#if p.customer}{p.customer}{/if}
              {:else}
                未设置供应商
              {/if}
            </span>
          </span>
        </span>
        {#if !batchMode}
          <button class="product-edit" onclick={(e) => { e.stopPropagation(); renameProduct(p.id); }} title="重命名">✏️</button>
          <button class="product-copy" onclick={(e) => { e.stopPropagation(); duplicateProduct(p.id); }} title="复制该产品">⧉</button>
          <button class="product-del" onclick={(e) => { e.stopPropagation(); removeProduct(p.id); }} title="删除">✕</button>
        {/if}
      </div>
    {/each}
    {#if !filteredList.length}
      <div class="product-empty">
        {#if app.products.length}没有匹配的产品{:else}还没有产品<br />点击上方「＋ 添加产品」{/if}
      </div>
    {/if}
  </div>

  <div class="sidebar-global">
    <button onclick={onOpenSettings}><span>⚙️ 设置</span></button>
  </div>
</aside>
