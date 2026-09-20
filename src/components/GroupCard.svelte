<script lang="ts">
  import {
    app, currentProduct, scheduleSave, pushToast, logOperation,
    setQty, commitQtyDraft, addItem, removeItem, nameKey,
    groupSum, groupRate, setGroupTotal,
    bulkQtyDialog, openBulkQtyDialog, closeBulkQtyDialog, applyBulkQty,
    groupSelection, batchGroupId,
    toggleItemSelect, toggleAllItems, batchDeleteItems, cancelBatchItems, enterBatchItems,
    transferItemToGroup,
    dragState, moveGroupTo, effectiveLevel,
  } from '../lib/stores/app.svelte';
  import type { Group } from '../lib/core/schema';
  import { tick } from 'svelte';

  let { g, realIndex, i } = $props<{ g: Group; realIndex: number; i: number }>();

  let itemInput = $state('');
  let qtyDrafts = $state<Record<string, string>>({});
  const qtyTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const collapsed = $derived(
    Array.isArray(app.settings.collapsedGroups) && app.settings.collapsedGroups.includes(g.id),
  );

  function toggleCollapse() {
    const arr = Array.isArray(app.settings.collapsedGroups)
      ? app.settings.collapsedGroups.slice()
      : [];
    const k = arr.indexOf(g.id);
    if (k >= 0) arr.splice(k, 1);
    else arr.push(g.id);
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
    const n = raw === '' ? 0 : parseInt(raw, 10);
    setGroupTotal(g, Number.isFinite(n) ? Math.max(0, n) : 0);
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
    if (!Number.isFinite(v) || v < 1 || v > cur.groups.length) {
      input.value = String(at + 1);
      return;
    }
    if (v - 1 === at) return;
    moveGroupTo(at, v - 1);
  }
  function allItemsSelected(group: Group) {
    const sel = groupSelection[group.id] || [];
    return group.items.length > 0 && sel.length === group.items.length;
  }
  function onResetGroup() {
    if (!confirm(`重置分组「${g.name}」？`)) return;
    g.total = 0;
    g.totalIsAuto = undefined;
    g.items.forEach((it) => { it.qty = 0; });
    scheduleSave();
    logOperation(`重置分组「${g.name}」`);
  }
  function onDeleteGroup() {
    const cur = currentProduct();
    if (!cur) return;
    if (!confirm(`删除分组「${g.name}」？`)) return;
    cur.groups.splice(realIndex, 1);
    scheduleSave();
    logOperation(`删除分组「${g.name}」`);
  }
  function onBulkAddItems() {
    const raw = prompt(`向「${g.name}」批量添加分类（每行一个）：`);
    if (!raw) return;
    const arr = raw.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
    let added = 0;
    arr.forEach((n) => { if (addItem(g, n)) added++; });
    if (added) {
      pushToast(`已添加 ${added} 个分类`);
      logOperation(`向「${g.name}」添加 ${added} 个分类`);
    }
  }
  function onTransferItem(itemName: string) {
    const p = currentProduct();
    if (!p) return;
    const others = p.groups.filter((x) => x.id !== g.id);
    if (!others.length) {
      pushToast('没有其他分组可转移', 'error');
      return;
    }
    const names = others.map((g2, idx) => `${idx + 1}. ${g2.name}`).join('\n');
    const choice = prompt(`转移到哪个分组？\n${names}\n\n请输入序号：`);
    if (choice == null) return;
    const idx = parseInt(choice, 10) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= others.length) return;
    const target = others[idx];
    if (transferItemToGroup(g, itemName, target)) {
      pushToast(`已转移到「${target.name}」`);
      logOperation(`分类「${itemName}」转移到「${target.name}」`);
    }
  }

  /* ---------- 拖拽排序 ---------- */
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressing = false;
  let startY = 0;
  let startX = 0;
  let kbMode = $state(false);

  function onDragKeydown(e: KeyboardEvent) {
    if (effectiveLevel() === 'compat') return;
    if (e.key === 'Enter') {
      kbMode = !kbMode;
      e.preventDefault();
      return;
    }
    if (!kbMode) return;
    const p = currentProduct();
    if (!p) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveGroupTo(realIndex, Math.max(0, realIndex - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveGroupTo(realIndex, Math.min(p.groups.length - 1, realIndex + 1));
    } else if (e.key === 'Escape') {
      kbMode = false;
      e.preventDefault();
    }
  }

  function onHandlePointerDown(e: PointerEvent) {
    if (effectiveLevel() === 'compat') {
      pushToast('兼容模式已禁用拖拽，请使用序号框', 'error', 2400);
      return;
    }
    if (e.button !== undefined && e.button !== 0) return;
    pressing = true;
    startY = e.clientY;
    startX = e.clientX;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (!pressing) return;
      startDrag();
    }, 260);
  }

  // ✅ Bug 4 修复：拖拽期间直接返回，只由 window 监听器处理
  function onHandlePointerMove(e: PointerEvent) {
    if (dragState.dragging) return;
    if (!pressing) return;
    if (longPressTimer) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        pressing = false;
      }
    }
  }

  function onHandlePointerUp() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    pressing = false;
    if (dragState.dragging) endDrag();
  }

  function startDrag() {
    dragState.dragging = true;
    dragState.activeId = g.id;
    dragState.overIndex = realIndex;
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
  }

  function onWindowMove(e: PointerEvent) {
    if (!dragState.dragging) return;
    updateOverIndex(e.clientY);
  }
  function onWindowUp() {
    endDrag();
  }

  function updateOverIndex(clientY: number) {
    const p = currentProduct();
    if (!p) return;
    const cards = document.querySelectorAll<HTMLElement>('.group[data-group-id]');
    let targetId = '';
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetId = card.dataset.groupId || '';
      }
    });
    if (!targetId) return;
    const idx = p.groups.findIndex((x) => x.id === targetId);
    if (idx >= 0) dragState.overIndex = idx;
  }

  async function endDrag() {
  window.removeEventListener('pointermove', onWindowMove);
  window.removeEventListener('pointerup', onWindowUp);
  window.removeEventListener('pointercancel', onWindowUp);

  // ✅ RISK-3 修复：确保 Svelte DOM 已更新后再读取 rect
  await tick();

  const p = currentProduct();
  if (p && dragState.overIndex >= 0 && dragState.activeId) {
    const from = p.groups.findIndex((x) => x.id === dragState.activeId);
    const to = dragState.overIndex;
    if (from >= 0 && from !== to) {
      moveGroupTo(from, to);
      pushToast(`已移动到第 ${to + 1} 位`);
    }
  }
  dragState.dragging = false;
  dragState.activeId = '';
  dragState.overIndex = -1;
}

</script>

<div
  class="group"
  class:collapsed={collapsed}
  class:dragging={dragState.activeId === g.id}
  class:drag-over={dragState.dragging && dragState.overIndex === realIndex && dragState.activeId !== g.id}
  data-group-id={g.id}
>
  <div class="group-head">
    <button class="group-collapse" onclick={toggleCollapse} aria-label={collapsed ? '展开' : '折叠'}>
      {collapsed ? '▸' : '▾'}
    </button>
    <span
      class="drag-handle"
      class:kb-active={kbMode}
      title="长按拖动排序（Enter 键进入键盘排序）"
      tabindex="0"
      role="button"
      aria-label="拖动或键盘排序"
      onpointerdown={onHandlePointerDown}
      onpointermove={onHandlePointerMove}
      onpointerup={onHandlePointerUp}
      onkeydown={onDragKeydown}
    >⠿</span>
    <input
      class="seq-input"
      type="text"
      inputmode="numeric"
      value={realIndex + 1}
      onblur={applySeq}
      aria-label="分组序号"
    />
    <input
      class="group-name"
      value={g.name}
      maxlength="30"
      onblur={renameGroup}
      aria-label="分组名称"
    />
    <button class="group-reset" title="重置该组" onclick={onResetGroup}>↻</button>
    <button class="group-del" title="删除该组" onclick={onDeleteGroup}>✕</button>
    {#if collapsed}
      <div class="group-preview">
        {#if !g.items.length}
          <span style="color:var(--c-text-disabled);font-style:italic">暂无分类</span>
        {:else}
          {g.items.map((x) => x.name).join('、')}
        {/if}
      </div>
    {/if}
  </div>

  <div class="group-body">
    <div class="group-total-row">
      <span>总数量</span>
      <input
        class="group-total"
        type="text"
        inputmode="numeric"
        value={String(g.total)}
        oninput={onTotalInput}
        aria-label="分组总数量"
      />
      <span>PCS</span>
      {#if g.totalIsAuto === false}
        <span class="manual-tag">· 已手改</span>
      {/if}
    </div>

    <div class="group-toolbar">
      <button class="mini-btn" onclick={onBulkAddItems}>＋ 批量添加</button>

      {#if g.items.length && batchGroupId.value !== g.id}
        <button class="mini-btn" onclick={() => enterBatchItems(g.id)}>批量删除/改量</button>
      {/if}
      {#if batchGroupId.value === g.id}
        <div class="batch-bar">
          <label>
            <input
              type="checkbox"
              checked={allItemsSelected(g)}
              onchange={(e) =>
                toggleAllItems(g.id, (e.target as HTMLInputElement).checked, g.items)}
            />
            全选
          </label>
          <span class="info">已选 {(groupSelection[g.id] || []).length} / {g.items.length}</span>
          <div class="actions">
            <button
              class="qty-btn"
              disabled={!(groupSelection[g.id] || []).length}
              onclick={() => openBulkQtyDialog(g.id)}
            >改量</button>
            <button
              class="del-btn"
              disabled={!(groupSelection[g.id] || []).length}
              onclick={() => batchDeleteItems(g)}
            >删除</button>
            <button class="cancel-btn" onclick={cancelBatchItems}>取消</button>
          </div>
        </div>
      {/if}
    </div>

    <div class="group-add-item">
      <input
        bind:value={itemInput}
        placeholder="添加分类，回车…"
        maxlength="30"
        onkeydown={(e) => { if (e.key === 'Enter') onAddItem(); }}
      />
      <button onclick={onAddItem}>添加</button>
    </div>

    <div class="items">
      {#each g.items as item, idx (item.name)}
        <div class="item">
          {#if batchGroupId.value === g.id}
            <input
              type="checkbox"
              class="item-check"
              checked={(groupSelection[g.id] || []).includes(item.name)}
              onchange={() => toggleItemSelect(g.id, item.name)}
              aria-label={'选择 ' + item.name}
            />
          {:else}
            <div class="sort-btns">
              <button onclick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="上移">▲</button>
              <button
                onclick={() => moveItem(idx, 1)}
                disabled={idx === g.items.length - 1}
                aria-label="下移"
              >▼</button>
            </div>
          {/if}
          <span class="name" title={item.name}>{item.name}</span>
          <div class="counter">
            <button class="btn" onclick={() => setQty(g, idx, item.qty - 1)} aria-label="减一">−</button>
            <input
              class="qty"
              type="text"
              inputmode="numeric"
              value={displayQty(item.name, item.qty)}
              oninput={(e) => onQtyInput(item.name, e)}
              onblur={(e) => {
                const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                commitQtyDraft(g, item.name, raw);
              }}
              aria-label={'数量 ' + item.name}
            />
            <button class="btn" onclick={() => setQty(g, idx, item.qty + 1)} aria-label="加一">+</button>
          </div>
          <button class="move" title="转移到其他分组" onclick={() => onTransferItem(item.name)}>↔</button>
          <button class="del" onclick={() => removeItem(g, idx)} aria-label={'删除 ' + item.name}>✕</button>
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

{#if bulkQtyDialog.show && bulkQtyDialog.gid === g.id}
  <div
    class="dialog-overlay sub-dialog"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) closeBulkQtyDialog(); }}
  >
    <div class="dialog-box" role="presentation">
      <h3>🔢 批量修改数量</h3>
      <p class="sub">将对已勾选的 <b>{(groupSelection[g.id] || []).length}</b> 个分类生效。</p>
      <div class="theme-toggle">
        <button
          class:active={bulkQtyDialog.mode === 'multiply'}
          onclick={() => (bulkQtyDialog.mode = 'multiply')}
        >× 乘以系数</button>
        <button
          class:active={bulkQtyDialog.mode === 'set'}
          onclick={() => (bulkQtyDialog.mode = 'set')}
        >＝ 设为定值</button>
      </div>
      <div class="info-field">
        <div class="field-label">
          {bulkQtyDialog.mode === 'multiply' ? '系数（2 = 翻倍，0.5 = 减半）' : '目标数量（PCS）'}
        </div>
        <input bind:value={bulkQtyDialog.value} type="text" inputmode="decimal" placeholder="如 2" />
      </div>
      <div class="dialog-actions" style="margin-top:12px">
        <button class="cancel" onclick={closeBulkQtyDialog}>取消</button>
        <button class="primary" onclick={() => applyBulkQty()}>应用</button>
      </div>
    </div>
  </div>
{/if}
