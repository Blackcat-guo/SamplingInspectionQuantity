<script lang="ts">
  import {
    app, currentProduct, currentGroups, addGroup, addStandardGroups,
    expandAllGroups, collapseAllGroups, scheduleSave,
    createGroupFromPreset,
  } from '../lib/stores/app.svelte';
  import GroupCard from './GroupCard.svelte';

  const p = $derived(currentProduct());
  const groups = $derived(currentGroups());

  let nameInput = $state('');
  let filter = $state('');
  let bulkTotalOpen = $state(false);
  let bulkTotalInput = $state('');
  let presetMenuOpen = $state(false);

  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      g.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  });

  function onAddGroup() {
    if (!nameInput.trim()) return;
    addGroup(nameInput);
    nameInput = '';
  }
  async function onPickPreset(pgId: string) {
    presetMenuOpen = false;
    await createGroupFromPreset(pgId);
  }
  function applyBulkTotal() {
    const cur = currentProduct();
    if (!cur) return;
    const n = parseInt(bulkTotalInput.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) return;
    if (!confirm(`将全部 ${cur.groups.length} 个分组的总数量设为 ${n}？`)) return;
    cur.groups.forEach((g) => { g.total = n; g.totalIsAuto = false; });
    scheduleSave();
    bulkTotalInput = '';
    bulkTotalOpen = false;
  }
  function resetAllQty() {
    const cur = currentProduct();
    if (!cur) return;
    if (!confirm('确定将所有分类的数量清零吗？（分组总数量不变）')) return;
    cur.groups.forEach((g) => g.items.forEach((it) => { it.qty = 0; }));
    scheduleSave();
  }
  function clearAll() {
    const cur = currentProduct();
    if (!cur) return;
    if (!confirm('⚠️ 确定清除当前产品的所有数据吗？')) return;
    cur.groups = [];
    cur.presets = [];
    scheduleSave();
  }
</script>

{#if p}
  <div class="add-group-bar">
    <input bind:value={nameInput} placeholder="如 5 / 3-7 / 1,3,5，或名称…" maxlength="40"
           onkeydown={(e) => { if (e.key === 'Enter') onAddGroup(); }} />
    <button class="add-group-submit" onclick={onAddGroup}>添加分组</button>
    <button class="add-group-standard" onclick={addStandardGroups}>📋 标准分组</button>
    {#if app.dataPresets.presetGroups.length}
      <div class="preset-wrap">
        <button class="add-group-standard" onclick={() => (presetMenuOpen = !presetMenuOpen)}>📦 预分组 ▾</button>
        {#if presetMenuOpen}
          <div class="preset-menu" role="menu">
            {#each app.dataPresets.presetGroups as pg (pg.id)}
              <button type="button" role="menuitem" onclick={() => onPickPreset(pg.id)}>
                <div style="font-weight:700">{pg.name}</div>
                <div style="font-size:11px;color:var(--c-text-3);font-weight:400">
                  {pg.items.length ? pg.items.slice(0, 3).join('、') + (pg.items.length > 3 ? '…' : '') : '（空分组）'}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div style="margin-top:10px">
    <button type="button"
            style="width:100%;padding:9px 12px;border:1.5px dashed var(--c-border);border-radius:11px;background:var(--c-surface-2);color:var(--c-text-3);font-size:12.5px;font-weight:700;text-align:left"
            onclick={() => (bulkTotalOpen = !bulkTotalOpen)}>
      {bulkTotalOpen ? '▼' : '▶'} 批量设置总数量（点击展开）
    </button>
    {#if bulkTotalOpen}
      <div style="display:flex;gap:10px;margin-top:8px">
        <input bind:value={bulkTotalInput} type="text" inputmode="numeric"
               placeholder="批量设置所有组总数量…" maxlength="9"
               style="flex:1;padding:10px 13px;font-size:14px;border:1.5px solid var(--c-border);border-radius:11px;background:var(--c-surface-2);color:var(--c-text);outline:none" />
        <button onclick={applyBulkTotal}
                style="padding:10px 16px;border:none;border-radius:11px;background:var(--c-primary-soft);color:var(--c-primary-dark);font-size:13.5px;font-weight:600">
          应用到全部组
        </button>
      </div>
    {/if}
  </div>

  <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
    <button onclick={resetAllQty}
            style="flex:1 1 calc(50% - 5px);min-width:130px;padding:10px 12px;border:1.5px solid var(--c-border);border-radius:11px;background:var(--c-surface);color:var(--c-text-2);font-size:13px;font-weight:600">
      🧹 全部数量清零
    </button>
    <button onclick={clearAll}
            style="flex:1 1 calc(50% - 5px);min-width:130px;padding:10px 12px;border:1.5px solid var(--c-danger-border);border-radius:11px;background:var(--c-danger-bg);color:var(--c-danger);font-size:13px;font-weight:600">
      🗑 清除当前产品
    </button>
  </div>

  <div class="group-tools">
    <input bind:value={filter} placeholder="🔍 搜索分组或分类…" maxlength="40" />
  </div>
  <div class="group-collapse-row">
    <button onclick={collapseAllGroups}>折叠全部</button>
    <button onclick={expandAllGroups}>展开全部</button>
  </div>

  <div id="groups">
    {#each filtered as g, i (g.id)}
      <GroupCard {g} realIndex={groups.indexOf(g)} {i} />
    {/each}
    {#if !groups.length}
      <div class="empty">还没有分组，先添加一个吧 👆</div>
    {:else if !filtered.length}
      <div class="empty">没有匹配的分组或分类</div>
    {/if}
  </div>
{/if}
