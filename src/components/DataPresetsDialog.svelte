<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, addDataPreset, removeCustomerById, removeSupplierByName, renameSupplier, renameCustomerById,
    normalResponsibles, specialResponsibles, pushToast, scheduleSave, uid, nameKey, sortNatural,
    expandedCustomerId, expandedCustomerProductsId, expandedSupplierProductsName,
    productPickerFilter, toggleCustomerResp, toggleCustomerRespFor, toggleCustomerProducts,
    toggleSupplierProducts, toggleCustomerProduct, toggleSupplierProduct,
    selectAllProductsForCustomer, selectAllProductsForSupplier,
    countSupplierProducts, countCustomerProducts, filteredProductsForPicker
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false), onOpenSettings } = $props<{ open: boolean; onOpenSettings: () => void }>();
  let tab = $state('customer');

  const tabs = [
    { key: 'customer', label: '客户' },
    { key: 'supplier', label: '供应商' },
    { key: 'incoming', label: '来料数量' },
    { key: 'process', label: '工序' },
    { key: 'responsible', label: '负责人' }
  ];

  let newCustomer = $state('');
  let newSupplier = $state('');
  let newIncoming = $state('');
  let newProcess = $state('');
  let newNormalResp = $state('');
  let newSpecialResp = $state('');

  function save() { scheduleSave(); }
  function bulkText() {
    const raw = prompt('批量添加（每行一个 / 逗号分隔）：');
    if (!raw) return [];
    return raw.split(/[\n,，、;；]+/).map(s => s.trim()).filter(Boolean);
  }
</script>

<Dialog bind:open title="📚 数据预设" subtitle="预设客户、供应商、来料数量、工序、负责人。" wide>
  <div class="dp-tabs-wrap">
    {#each tabs as t (t.key)}
      <button class="dp-tab" class:active={tab === t.key} onclick={() => tab = t.key}>{t.label}</button>
    {/each}
  </div>

  <div class="dialog-list">
    {#if tab === 'customer'}
      <div class="panel-head-row">
        <span class="panel-head-text">客户列表</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach(v => { if (addDataPreset('customer', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个客户`);
        }}>＋ 批量添加</button>
      </div>
      {#each app.dataPresets.customers as c (c.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={c.name} maxlength="40"
                 onblur={(e) => renameCustomerById(c.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleCustomerResp(c.id)}>负责人({c.responsibleIds.length})</button>
            <button class="scope-btn" onclick={() => toggleCustomerProducts(c.id)}>关联产品({countCustomerProducts(c.name)})</button>
            <button class="del" onclick={() => removeCustomerById(c.id)}>✕</button>
          </div>
        </div>
        {#if expandedCustomerId === c.id}
          <div class="resp-panel">
            <div class="panel-title">选择该客户的负责人</div>
            {#each normalResponsibles() as r (r.id)}
              <label><input type="checkbox" checked={c.responsibleIds.includes(r.id)} onchange={() => toggleCustomerRespFor(c, r.id)} /> <span>@{r.name}</span></label>
            {/each}
          </div>
        {/if}
        {#if expandedCustomerProductsId === c.id}
          <div class="resp-panel">
            <div class="panel-title">勾选后，这些产品的客户将变更为「{c.name}」</div>
            <div class="panel-toolbar">
              <input bind:value={productPickerFilter} placeholder="🔍 过滤产品…" />
              <button onclick={() => selectAllProductsForCustomer(c, true)}>全选</button>
              <button onclick={() => selectAllProductsForCustomer(c, false)}>清空</button>
            </div>
            {#each filteredProductsForPicker as p (p.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={(p.customer || '') === c.name} onchange={() => toggleCustomerProduct(c, p.id, !((p.customer || '') === c.name))} />
                <span>{p.name}</span>
              </label>
            {/each}
          </div>
        {/if}
      {/each}
      {#if !app.dataPresets.customers.length}<div class="transfer-empty">还没有客户预设</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newCustomer} placeholder="输入客户名称…" maxlength="40"
               onkeydown={(e) => { if (e.key === 'Enter' && addDataPreset('customer', newCustomer)) newCustomer = ''; }} />
        <button onclick={() => { if (addDataPreset('customer', newCustomer)) newCustomer = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'supplier'}
      <div class="panel-head-row">
        <span class="panel-head-text">供应商列表</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach(v => { if (addDataPreset('supplier', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个供应商`);
        }}>＋ 批量添加</button>
      </div>
      {#each app.dataPresets.suppliers as s, i (s)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={s} maxlength="40"
                 onblur={(e) => renameSupplier(i, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleSupplierProducts(s)}>关联产品({countSupplierProducts(s)})</button>
            <button class="del" onclick={() => removeSupplierByName(s)}>✕</button>
          </div>
        </div>
        {#if expandedSupplierProductsName === s}
          <div class="resp-panel">
            <div class="panel-title">勾选后，这些产品的供应商将变更为「{s}」</div>
            <div class="panel-toolbar">
              <input bind:value={productPickerFilter} placeholder="🔍 过滤产品…" />
              <button onclick={() => selectAllProductsForSupplier(s, true)}>全选</button>
              <button onclick={() => selectAllProductsForSupplier(s, false)}>清空</button>
            </div>
            {#each filteredProductsForPicker as p (p.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={(p.supplier || '') === s} onchange={() => toggleSupplierProduct(s, p.id, !((p.supplier || '') === s))} />
                <span>{p.name}</span>
              </label>
            {/each}
          </div>
        {/if}
      {/each}
      {#if !app.dataPresets.suppliers.length}<div class="transfer-empty">还没有供应商预设</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newSupplier} placeholder="输入供应商名称…" maxlength="40"
               onkeydown={(e) => { if (e.key === 'Enter' && addDataPreset('supplier', newSupplier)) newSupplier = ''; }} />
        <button onclick={() => { if (addDataPreset('supplier', newSupplier)) newSupplier = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'incoming'}
      <div class="panel-head-row"><span class="panel-head-text">来料数量列表</span></div>
      {#each app.dataPresets.incomingQtyPresets as v, i (v)}
        <div class="preset-edit-row">
          <input type="text" inputmode="numeric" value={String(v)} maxlength="9"
                 onblur={(e) => {
                   const n = parseInt((e.target as HTMLInputElement).value.replace(/\D/g, ''), 10);
                   if (Number.isFinite(n) && n > 0) { app.dataPresets.incomingQtyPresets[i] = n; scheduleSave(); }
                 }} />
          <button class="del" onclick={() => { app.dataPresets.incomingQtyPresets = app.dataPresets.incomingQtyPresets.filter(x => x !== v); scheduleSave(); }}>✕</button>
        </div>
      {/each}
      {#if !app.dataPresets.incomingQtyPresets.length}<div class="transfer-empty">还没有来料数量预设</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newIncoming} type="text" inputmode="numeric" placeholder="输入来料数量…" maxlength="9" />
        <button onclick={() => { if (addDataPreset('incoming', newIncoming)) newIncoming = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'process'}
      <div class="panel-head-row"><span class="panel-head-text">发生工序列表</span></div>
      {#each app.dataPresets.processes as p, i (p)}
        <div class="preset-edit-row">
          <input value={p} maxlength="40" onblur={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (v) { app.dataPresets.processes[i] = v; scheduleSave(); } }} />
          <button class="del" onclick={() => { app.dataPresets.processes = app.dataPresets.processes.filter(x => x !== p); scheduleSave(); }}>✕</button>
        </div>
      {/each}
      {#if !app.dataPresets.processes.length}<div class="transfer-empty">还没有发生工序预设</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newProcess} placeholder="输入发生工序…" maxlength="40" />
        <button onclick={() => { if (addDataPreset('process', newProcess)) newProcess = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'responsible'}
      <div class="panel-head-row"><span class="panel-head-text">常规负责人</span></div>
      {#each normalResponsibles() as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30" onblur={(e) => { const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, ''); if (v) { r.name = v; save(); } }} />
          <button class="del" onclick={() => { if (confirm('确定删除该负责人吗？')) { app.dataPresets.responsiblePersons = app.dataPresets.responsiblePersons.filter(x => x.id !== r.id); scheduleSave(); } }}>✕</button>
        </div>
      {/each}
      {#if !normalResponsibles().length}<div class="transfer-empty">还没有常规负责人</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newNormalResp} placeholder="输入常规负责人姓名…" maxlength="30" />
        <button onclick={() => {
          const name = newNormalResp.trim().replace(/^@+/, '');
          if (!name) return;
          if (app.dataPresets.responsiblePersons.some(r => nameKey(r.name) === nameKey(name))) { pushToast('已存在同名负责人', 'error'); return; }
          app.dataPresets.responsiblePersons.push({ id: uid(), name, kind: 'normal' });
          newNormalResp = ''; save();
        }}>添加</button>
      </div>

      <div class="panel-head-row" style="margin-top:14px"><span class="panel-head-text">特殊分组负责人</span></div>
      {#each specialResponsibles() as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30" onblur={(e) => { const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, ''); if (v) { r.name = v; save(); } }} />
          <button class="del" onclick={() => { if (confirm('确定删除该负责人吗？')) { app.dataPresets.responsiblePersons = app.dataPresets.responsiblePersons.filter(x => x.id !== r.id); scheduleSave(); } }}>✕</button>
        </div>
      {/each}
      {#if !specialResponsibles().length}<div class="transfer-empty">还没有特殊分组负责人</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newSpecialResp} placeholder="输入特殊分组负责人姓名…" maxlength="30" />
        <button onclick={() => {
          const name = newSpecialResp.trim().replace(/^@+/, '');
          if (!name) return;
          if (app.dataPresets.responsiblePersons.some(r => nameKey(r.name) === nameKey(name))) { pushToast('已存在同名负责人', 'error'); return; }
          app.dataPresets.responsiblePersons.push({ id: uid(), name, kind: 'special' });
          newSpecialResp = ''; save();
        }}>添加</button>
      </div>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => open = false}>关闭</button>
  </div>
</Dialog>
