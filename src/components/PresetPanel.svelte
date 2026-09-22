<script lang="ts">
  import {
    app, currentProduct, currentPresets, nameKey,
    scheduleSave, pushToast, logOperation,
    presetDerived, askConfirm,
  } from '../lib/stores/app.svelte';

  const p = $derived(currentProduct());
  const presets = $derived(currentPresets());
  let input = $state('');

  const visibleShared = $derived(presetDerived.visibleSharedPresets);
  const sharedKeys = $derived(presetDerived.globalPresetNameKeys);

  /* ★ v3.7 要求 2：批量删除模式 */
  let batchMode = $state(false);
  let selected = $state<string[]>([]);

  function enterBatch() { batchMode = true; selected = []; }
  function cancelBatch() { batchMode = false; selected = []; }
  function toggleSelect(name: string) {
    const i = selected.indexOf(name);
    if (i >= 0) selected.splice(i, 1);
    else selected.push(name);
  }
  function toggleAll(checked: boolean) {
    selected = checked ? presets.slice() : [];
  }
  async function doBatchDelete() {
    const cur = currentProduct();
    if (!cur) return;
    if (!selected.length) return;
    const ok = await askConfirm({
      title: '批量删除预分类',
      message: `确定删除选中的 ${selected.length} 个预分类吗？`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    const set = new Set(selected.map(nameKey));
    const before = cur.presets.length;
    cur.presets = cur.presets.filter((x) => !set.has(nameKey(x)));
    const removed = before - cur.presets.length;
    scheduleSave();
    logOperation(`批量删除 ${removed} 个预分类`);
    pushToast(`已删除 ${removed} 个预分类`);
    cancelBatch();
  }

  function add() {
    const cur = currentProduct();
    if (!cur) return;
    const v = input.trim();
    if (!v) return;
    const k = nameKey(v);
    if (sharedKeys.has(k)) { pushToast(`共享预分类中已存在「${v}」`, 'error'); input = ''; return; }
    if (cur.presets.some((x) => nameKey(x) === k)) return;
    cur.presets.push(v);
    scheduleSave();
    input = '';
  }
  function remove(idx: number) {
    const cur = currentProduct();
    if (!cur) return;
    cur.presets.splice(idx, 1);
    scheduleSave();
  }
  function rename(idx: number, e: Event) {
    const cur = currentProduct();
    if (!cur) return;
    const el = e.target as HTMLInputElement;
    const v = el.value.trim();
    if (!v) { el.value = cur.presets[idx]; return; }
    if (sharedKeys.has(nameKey(v))) { pushToast('已存在同名', 'error'); el.value = cur.presets[idx]; return; }
    if (cur.presets.some((x, i) => i !== idx && nameKey(x) === nameKey(v))) { el.value = cur.presets[idx]; return; }
    cur.presets[idx] = v;
    scheduleSave();
  }
  function move(idx: number, delta: number) {
    const cur = currentProduct();
    if (!cur) return;
    const j = idx + delta;
    if (j < 0 || j >= cur.presets.length) return;
    const [x] = cur.presets.splice(idx, 1);
    cur.presets.splice(j, 0, x);
    scheduleSave();
  }
  function bulkAdd() {
    const cur = currentProduct();
    if (!cur) return;
    const raw = prompt('批量添加预分类（每行一个 / 逗号分隔）：');
    if (!raw) return;
    const arr = raw.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
    let added = 0;
    const seen = new Set(cur.presets.map(nameKey));
    arr.forEach((v) => {
      const k = nameKey(v);
      if (seen.has(k) || sharedKeys.has(k)) return;
      seen.add(k); cur.presets.push(v); added++;
    });
    if (added) { scheduleSave(); pushToast(`已添加 ${added} 个预分类`); logOperation(`批量添加 ${added} 个预分类`); }
  }
</script>

{#if p}
  <section class="box">
    <div class="box-head">
      <span class="box-title">预分类管理</span>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        {#if !batchMode}
          <button class="mini-batch-btn" onclick={bulkAdd}>＋ 批量添加</button>
          {#if presets.length}
            <button class="mini-batch-btn danger" onclick={enterBatch}>🗑 批量删除</button>
          {/if}
          {#if !presets.length}<span class="box-badge">0 项</span>{/if}
        {:else}
          <span style="font-size:12px;color:var(--c-text-3)">已选 {selected.length} / {presets.length}</span>
          <button class="mini-batch-btn" onclick={() => toggleAll(selected.length !== presets.length)}>
            {selected.length === presets.length ? '取消全选' : '全选'}
          </button>
          <button class="mini-batch-btn danger" disabled={!selected.length} onclick={doBatchDelete}>删除</button>
          <button class="mini-batch-btn" onclick={cancelBatch}>取消</button>
        {/if}
      </div>
    </div>

    <!-- ★ v3.7 要求 2：chip 网格布局 -->
    <div class="presets-list">
      {#each presets as name, i (name)}
        <div class="preset-chip" class:selected={selected.includes(name)}>
          {#if batchMode}
            <input type="checkbox" class="preset-chip-check"
                   checked={selected.includes(name)}
                   onchange={() => toggleSelect(name)}
                   aria-label={'选择 ' + name} />
          {:else}
            <div class="sort-btns">
              <button onclick={() => move(i, -1)} disabled={i === 0} title="上移">▲</button>
              <button onclick={() => move(i, 1)} disabled={i === presets.length - 1} title="下移">▼</button>
            </div>
          {/if}
          {#if batchMode}
            <span class="preset-chip-name-static" title={name}>{name}</span>
          {:else}
            <input class="preset-chip-name" value={name} maxlength="30" onblur={(e) => rename(i, e)} />
            <button class="preset-chip-del" onclick={() => remove(i)}>✕</button>
          {/if}
        </div>
      {/each}
    </div>
    {#if !presets.length}
      <div style="padding:12px 4px;color:var(--c-text-3);font-size:12.5px;text-align:center">还没有预分类</div>
    {/if}

    {#if !batchMode}
      <div class="presets-add">
        <input bind:value={input} placeholder="输入预分类名称，回车添加…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') add(); }} />
        <button onclick={add}>添加</button>
      </div>
    {/if}

    <div class="shared-presets-preview">
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span style="font-size:12.5px;font-weight:700;color:var(--c-text-2)">🌐 共享预分类</span>
      </div>
      {#if visibleShared.length}
        <div class="shared-preview-list">
          {#each visibleShared as g (g.id)}<span class="shared-preview-tag">{g.name}</span>{/each}
        </div>
      {:else}
        <div style="font-size:12px;color:var(--c-text-disabled);font-style:italic">暂无共享预分类</div>
      {/if}
    </div>
  </section>
{/if}
