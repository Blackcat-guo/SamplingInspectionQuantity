<script lang="ts">
  import {
    app, currentProduct, calcSampling, scheduleSave, pushToast, logOperation,
    setQty, commitQtyDraft, addItem, removeItem, toggleItemByName, setGroupTotal,
    groupSum, groupRate, realGroupIndex, nameKey,
  } from '../lib/stores/app.svelte';
  import type { Group } from '../lib/core/schema';

  let { g, realIndex, i } = $props<{ g: Group; realIndex: number; i: number }>();

  let itemInput = $state('');
  let qtyDrafts = $state<Record<string, string>>({});
  const qtyTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const collapsed = $derived(
    Array.isArray(app.settings.collapsedGroups) && app.settings.collapsedGroups.includes(g.id),
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

<div class="group" class:collapsed>
  <div class="group-head">
    <button class="group-collapse" onclick={toggleCollapse}>{collapsed ? '▸' : '▾'}</button>
    <span class="drag-handle" title="长按拖动排序">⠿</span>
    <input class="seq-input" type="text" inputmode="numeric" value={realIndex + 1}
           onblur={applySeq} />
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
      <input class="group-total" type="text" inputmode="numeric" value={String(g.total)}
             oninput={onTotalInput} />
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
    </div>
    <div class="group-add-item">
      <input bind:value={itemInput} placeholder="添加分类，回车…" maxlength="30"
             onkeydown={(e) => { if (e.key === 'Enter') onAddItem(); }} />
      <button onclick={onAddItem}>添加</button>
      <div class="preset-wrap">
        <button class="preset-btn" onclick={() => {
          const cur = currentProduct();
          if (!cur) return;
          const all = cur.presets.concat(
            app.globalPresets.filter(gp => gp.productIds === null || (Array.isArray(gp.productIds) && gp.productIds.includes(cur.id))).map(gp => gp.name),
          );
          const filtered = all.filter(n => !g.items.some(it => nameKey(it.name) === nameKey(n)));
          if (!filtered.length) { pushToast('暂无可选预分类', 'error'); return; }
          const pick = prompt('输入要加入的预分类名称：\n' + filtered.slice(0, 10).join(' / '));
          if (!pick) return;
          filtered.filter(n => n === pick.trim()).forEach(n => addItem(g, n));
        }}>预分类 ▾</button>
      </div>
    </div>
    <div class="items">
      {#each g.items as item, idx (item.name)}
        <div class="item">
          <div class="sort-btns">
            <button onclick={() => moveItem(idx, -1)} disabled={idx === 0}>▲</button>
            <button onclick={() => moveItem(idx, 1)} disabled={idx === g.items.length - 1}>▼</button>
          </div>
          <span class="name" title={item.name}>{item.name}</span>
          <div class="counter">
            <button class="btn" onclick={() => setQty(g, idx, item.qty - 1)}>−</button>
            <input class="qty" type="text" inputmode="numeric"
                   value={displayQty(item.name, item.qty)}
                   oninput={(e) => onQtyInput(item.name, e)}
                   onblur={(e) => {
                     const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                     commitQtyDraft(g, item.name, raw);
                   }} />
            <button class="btn" onclick={() => setQty(g, idx, item.qty + 1)}>+</button>
          </div>
          <button class="move" title="转移到其他分组"
                  onclick={() => {
                    const cur = currentProduct();
                    if (!cur) return;
                    const targets = cur.groups.filter(x => x.id !== g.id);
                    if (!targets.length) return;
                    const names = targets.map(t => t.name).join(' / ');
                    const pick = prompt('转移到哪个分组？\n' + names);
                    if (!pick) return;
                    const dst = targets.find(t => t.name === pick.trim());
                    if (!dst) return;
                    const at = g.items.indexOf(item);
                    g.items.splice(at, 1);
                    dst.items.push({ name: item.name, qty: item.qty });
                    scheduleSave();
                  }}>↔</button>
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
