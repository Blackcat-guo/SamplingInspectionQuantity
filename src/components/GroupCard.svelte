<script lang="ts">
  import {
    app, currentProduct, calcSampling, scheduleSave, pushToast, logOperation,
    setQty, commitQtyDraft, addItem, removeItem, toggleItemByName, setGroupTotal,
    groupSum, groupRate, realGroupIndex, nameKey,
    bulkQtyDialog, openBulkQtyDialog, closeBulkQtyDialog, applyBulkQty,
    groupSelection, batchGroupId, toggleItemSelect, toggleAllItems, batchDeleteItems, cancelBatchItems, enterBatchItems
  } from '../lib/stores/app.svelte';
  import type { Group } from '../lib/core/schema';

  let { g, realIndex, i } = $props<{ g: Group; realIndex: number; i: number }>();

  let itemInput = $state('');
  let qtyDrafts = $state<Record<string, string>>({});
  const qtyTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const collapsed = $derived(
    Array.isArray(app.settings.collapsedGroups) && app.settings.collapsedGroups.includes(g.id)
  );

  function toggleCollapse() {
    const arr = Array.isArray(app.settings.collapsedGroups) ? app.settings.collapsedGroups.slice() : [];
    const k = arr.indexOf(g.id);
    if (k >= 0) arr.splice(k, 1); else arr.push(g.id);
    app.settings.collapsedGroups = arr;
    scheduleSave();
  }

  function onQtyInput(itemName: string, e: Event) {
    const key = g.id + '|' + nameKey(itemName);
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
    (e.target as HTMLInputElement).value = raw;
    qtyDrafts[key] = raw;
    if (qtyTimers[key]) clearTimeout(qtyTimers[key]);
    qtyTimers[key] = setTimeout(() => {
      delete qtyDrafts[key];
      commitQtyDraft(g, itemName, raw);
    }, 300);
  }
  function displayQty(itemName: string, qty: number): string {
    const key = g.id + '|' + nameKey(itemName);
    return key in qtyDrafts ? qtyDrafts[key] : String(qty);
  }

  function onAddItem() {
    if (!itemInput.trim()) return;
    if (addItem(g, itemInput)) itemInput = '';
  }

  function onTotalInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
    (e.target as HTMLInputElement).value = raw;
    setGroupTotal(g, raw === '' ? 0 : parseInt(raw, 10));
  }

  function renameGroup(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    if (g.name === v) return;
    g.name = v || '未命名分组';
    scheduleSave();
  }

  function moveItem(idx: number, delta: number) {
    const j = idx + delta;
    if (j < 0 || j >= g.items.length) return;
    const [it] = g.items.splice(idx, 1);
    g.items.splice(j, 0, it);
    scheduleSave();
  }
  function applySeq(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = parseInt(input.value, 10);
    const cur = currentProduct();
    if (!cur) return;
    const at = realIndex;
    if (!Number.isFinite(v) || v < 1 || v > cur.groups.length) { input.value = String(at + 1); return; }
    if (v - 1 === at) return;
    const [x] = cur.groups.splice(at, 1);
    cur.groups.splice(v - 1, 0, x);
    scheduleSave();
  }
</script>

<div class="group" class:collapsed={collapsed}>
  <div class="group-head">
    <button class="group-collapse" onclick={toggleCollapse}>{collapsed ? '▸' : '▾'}</button>
    <span class="drag-handle" title="长按拖动排序">⠿</span>
    <input class="seq-input" type="text" inputmode="numeric" value={realIndex + 1} onblur={applySeq} />
    <input class="group-name" value={g.name} maxlength="30" onblur={renameGroup} />
    <button class="group-reset" title="重置该组"
            onclick={() => { if (confirm(`重置分组「${g.name}」？`)) {
              g.total = 0; g.totalIsAuto = undefined; g.items.forEach(it => it.qty = 0); scheduleSave();
            } }}>↻</button>
    <button class="group-del" onclick={() => {
      const cur = currentProduct();
      if (!cur) return;
      if (!confirm(`删除分组「${g.name}」？`)) return;
      cur.groups.splice(realIndex, 1);
      scheduleSave();
    }}>✕</button>
    {#if collapsed}
      <div class="group-preview">
        {#if !g.items.length}<span style="color:var(--c-text-disabled);font-style:italic">暂无分类</span>
        {:else}{g.items.map(x => x.name).join('、')}{/if}
      </div>
    {/if}
  </div>

  <div class="group-body">
    <div class="group-total-row">
      <span>总数量</span>
      <input class="group-total" type="text" inputmode="numeric" value={String(g.total)} oninput={onTotalInput} />
      <span>PCS</span>
      {#if g.totalIsAuto === false}
        <span class="manual-tag">· 已手改</span>
      {/if}
    </div>
    
    <div class="group-toolbar">
      <button class="mini-btn" onclick={() => {
        const raw = prompt(`向「${g.name}」批量添加分类（每行一个）：`);
        if (!raw) return;
        const arr = raw.split(/[\n,，、;；]+/).map(s => s.trim()).filter(Boolean);
        let added = 0;
        arr.forEach(n => { if (addItem(g, n)) added++; });
        if (added) pushToast(`已添加 ${added} 个分类`);
      }}>＋ 批量添加</button>
      <button v-if="g.items.length && batchGroupId.value !== g.id" class="mini-btn" onclick={() => enterBatchItems(g.id)}>批量删除/改量</button>
      <div v-if="batchGroupId.value === g.id" class="batch-bar">
        <label><input type="checkbox" checked={allItemsSelected(g)} onchange={(e) => toggleAllItems(g.id, (e.target as HTMLInputElement).checked, g.items)} /> 全选</label>
        <span class="info">已选 {(groupSelection[g.id] || []).length} / {g.items.length}</span>
        <div class="actions">
          <button class="qty-btn" disabled={!(groupSelection[g.id] || []).length} onclick={() => openBulkQtyDialog(g.id)}>改量</button>
          <button class="del-btn" disabled={!(groupSelection[g.id] || []).length} onclick={() => batchDeleteItems(g)}>删除</button>
          <button class="cancel-btn" onclick={cancelBatchItems}>取消</button>
        </div>
      </div>
    </div>

    <div class="group-add-item">
      <input bind:value={itemInput} placeholder="添加分类，回车…" maxlength="30"
             onkeydown={(e) => { if (e.key === 'Enter') onAddItem(); }} />
      <button onclick={onAddItem}>添加</button>
    </div>

    <div class="items">
      {#each g.items as item, idx (item.name)}
        <div class="item">
          {#if batchGroupId.value === g.id}
            <input type="checkbox" class="item-check" checked={(groupSelection[g.id] || []).includes(item.name)} onchange={() => toggleItemSelect(g.id, item.name)} />
          {:else}
            <div class="sort-btns">
              <button onclick={() => moveItem(idx, -1)} disabled={idx === 0}>▲</button>
              <button onclick={() => moveItem(idx, 1)} disabled={idx === g.items.length - 1}>▼</button>
            </div>
          {/if}
          <span class="name" title={item.name}>{item.name}</span>
          <div class="counter">
            <button class="btn" onclick={() => setQty(g, idx, item.qty - 1)}>−</button>
            <input class="qty" type="text" inputmode="numeric" value={displayQty(item.name, item.qty)}
                   oninput={(e) => onQtyInput(item.name, e)}
                   onblur={(e) => { const raw = (e.target as HTMLInputElement).value.replace(/\D/g, ''); commitQtyDraft(g, item.name, raw); }} />
            <button class="btn" onclick={() => setQty(g, idx, item.qty + 1)}>+</button>
          </div>
          <button class="move" title="转移到其他分组" onclick={() => { /* 转移逻辑略 */ }}>↔</button>
          <button class="del" onclick={() => removeItem(g, idx)}>✕</button>
        </div>
      {/each}
    </div>
    <div class="group-summary">
      <span>分类数：<b class="count-val">{g.items.length}</b></span>
      <span>数量总和：<b>{groupSum(g)}</b></span>
      <span>不良率：<b class="rate-val">{groupRate(g)}</b></span>
    </div>
  </div>
</div>

<!-- 批量改量弹窗 -->
{#if bulkQtyDialog.show && bulkQtyDialog.gid === g.id}
  <div class="dialog-overlay sub-dialog" onclick={() => closeBulkQtyDialog()}>
    <div class="dialog-box" onclick={(e) => e.stopPropagation()}>
      <h3>🔢 批量修改数量</h3>
      <p class="sub">将对已勾选的 <b>{(groupSelection[g.id] || []).length}</b> 个分类生效。</p>
      <div class="theme-toggle">
        <button class:active={bulkQtyDialog.mode === 'multiply'} onclick={() => bulkQtyDialog.mode = 'multiply'}>× 乘以系数</button>
        <button class:active={bulkQtyDialog.mode === 'set'} onclick={() => bulkQtyDialog.mode = 'set'}>＝ 设为定值</button>
      </div>
      <div class="info-field">
        <div class="field-label">{bulkQtyDialog.mode === 'multiply' ? '系数（2 = 翻倍，0.5 = 减半）' : '目标数量（PCS）'}</div>
        <input bind:value={bulkQtyDialog.value} type="text" inputmode="decimal" placeholder="如 2" />
      </div>
      <div class="dialog-actions" style="margin-top:12px">
        <button class="cancel" onclick={() => closeBulkQtyDialog()}>取消</button>
        <button class="primary" onclick={() => applyBulkQty()}>应用</button>
      </div>
    </div>
  </div>
{/if}
