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
  let presetMenuOpen = $state(false);
  let presetMenuX = $state(0);
  let presetMenuY = $state(0);
  let presetTriggerEl: HTMLElement | null = null;

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

  /* ★ 要求 1：预分组下拉改为 position:fixed + 边界判断 */
  function openPresetMenu(e: MouseEvent) {
    if (presetMenuOpen) { closePresetMenu(); return; }
    presetTriggerEl = e.currentTarget as HTMLElement;
    computeMenuPosition();
    presetMenuOpen = true;
  }
  function computeMenuPosition() {
    if (!presetTriggerEl) return;
    const rect = presetTriggerEl.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const MENU_W = 240, MENU_H = 320, MARGIN = 12, GAP = 6;
    let x = rect.left, y = rect.bottom + GAP;
    if (x + MENU_W > vw - MARGIN) x = vw - MENU_W - MARGIN;
    if (x < MARGIN) x = MARGIN;
    if (y + MENU_H > vh - MARGIN && rect.top - MENU_H - GAP > MARGIN) y = rect.top - MENU_H - GAP;
    if (y + MENU_H > vh - MARGIN) y = Math.max(MARGIN, vh - MENU_H - MARGIN);
    presetMenuX = x;
    presetMenuY = y;
  }
  function closePresetMenu() { presetMenuOpen = false; presetTriggerEl = null; }

  async function onPickPreset(pgId: string) {
    closePresetMenu();
    await createGroupFromPreset(pgId);
  }

  function resetAllQty() {
    const cur = currentProduct();
    if (!cur) return;
    if (!confirm('确定将所有分类的数量清零吗？')) return;
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

  $effect(() => {
    if (!presetMenuOpen) return;
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') closePresetMenu(); };
    const onScroll = () => closePresetMenu();
    const onResize = () => closePresetMenu();
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  });
</script>

{#if p}
  <div class="add-group-bar">
    <input bind:value={nameInput} placeholder="如 5 / 3-7 / 1,3,5，或名称…" maxlength="40"
           onkeydown={(e) => { if (e.key === 'Enter') onAddGroup(); }} />
    <button class="add-group-submit" onclick={onAddGroup}>添加分组</button>
    <button class="add-group-standard" onclick={addStandardGroups}>📋 标准分组</button>
    {#if app.dataPresets.presetGroups.length}
      <div class="preset-wrap">
        <button class="add-group-standard" type="button"
                onclick={openPresetMenu}
                aria-haspopup="menu" aria-expanded={presetMenuOpen}>📦 预分组 ▾</button>
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

<!-- ★ 要求 1：预分组下拉（fixed 定位） -->
{#if presetMenuOpen}
  <div class="preset-menu-overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closePresetMenu(); }}>
    <div class="preset-menu-fixed" style="top:{presetMenuY}px;left:{presetMenuX}px" role="menu">
      {#each app.dataPresets.presetGroups as pg (pg.id)}
        <button type="button" role="menuitem" onclick={() => onPickPreset(pg.id)}>
          <div style="font-weight:700">{pg.name}</div>
          <div style="font-size:11px;color:var(--c-text-3);font-weight:400">
            {pg.items.length ? pg.items.slice(0, 3).join('、') + (pg.items.length > 3 ? '…' : '') : '（空分组）'}
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}
