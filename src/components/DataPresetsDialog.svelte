<script lang="ts">
  import Dialog from './Dialog.svelte';
  import NavGridDialog from './NavGridDialog.svelte';
  import TextEditDialog from './TextEditDialog.svelte';
  import {
    app, addDataPreset, removeCustomerById, removeSupplierByName, renameSupplier, renameCustomerById,
    normalResponsibles, specialResponsibles, pushToast, scheduleSave, uid, nameKey,
    toggleCustomerResp, toggleCustomerRespFor,
    uiState, toggleCustomerProducts, toggleSupplierProducts,
    toggleCustomerProduct, toggleSupplierProduct,
    selectAllProductsForCustomer, selectAllProductsForSupplier,
    countSupplierProducts, countCustomerProducts, getFilteredProductsForPicker,
    setProductPickerFilter,
    productMatchesSpecialGroup, productEffectiveForSpecialGroup,
    addSpecialGroup, removeSpecialGroup, renameSpecialGroup,
    toggleSpecialGroupResp, toggleSpecialGroupSample,
    setSpecialGroupItems, specialUIState,
    toggleSpecialGroupProducts, toggleSpecialRespPanel,
    presetPages, pageSizeFor, setPresetPage,
    addGlobalPreset, renameGlobalPreset, removeGlobalPreset,
    toggleGpProduct, setAllGpProducts, setNoneGpProducts,
  } from '../lib/stores/app.svelte';
  import type { GlobalPreset, Product } from '../lib/core/schema';

  let { open = $bindable(false), onOpenSettings } = $props<{
    open: boolean;
    onOpenSettings: () => void;
  }>();

  let tab = $state('customer');
  let presetNavOpen = $state(false);

  const dataTabs = [
    { key: 'customer', label: '客户' },
    { key: 'supplier', label: '供应商' },
    { key: 'incoming', label: '来料数量' },
    { key: 'process', label: '工序' },
    { key: 'responsible', label: '负责人' },
    { key: 'special', label: '特殊分组' },
    { key: 'presetGroup', label: '预分组' },
    { key: 'globalPreset', label: '共享预分类' },
  ];

  let newCustomer = $state('');
  let newSupplier = $state('');
  let newIncoming = $state('');
  let newProcess = $state('');
  let newNormalResp = $state('');
  let newSpecialResp = $state('');
  let newSpecialGroup = $state('');
  let newPresetGroup = $state('');

  let newGlobalPreset = $state('');
  let expandedGpId = $state('');
  let gpFilter = $state('');

  /* ★ H2：文本编辑弹窗状态 */
  let editOpen = $state(false);
  let editTitle = $state('');
  let editSubtitle = $state('');
  let editInitialText = $state('');
  let editTarget = $state<{ kind: 'presetGroup' | 'specialGroup'; id: string } | null>(null);

  function pickPresetTab(key: string) { tab = key; }

  /* ---------- 共享预分类辅助 ---------- */
  function toggleGpPanel(id: string) {
    expandedGpId = expandedGpId === id ? '' : id;
    gpFilter = '';
  }
  function isGpChecked(gp: GlobalPreset, pid: string): boolean {
    if (gp.productIds === null) return true;
    return gp.productIds.includes(pid);
  }
  function gpProductLabel(gp: GlobalPreset): string {
    const n = gp.productIds === null ? app.products.length : gp.productIds.length;
    return `产品(${n})`;
  }
  function filteredGpProducts(): Product[] {
    const q = gpFilter.trim().toLowerCase();
    if (!q) return app.products;
    return app.products.filter((p) => p.name.toLowerCase().includes(q));
  }
  function onAddGp() {
    if (addGlobalPreset(newGlobalPreset)) newGlobalPreset = '';
  }

  /* ---------- 分页 ---------- */
  const pageSize = $derived(pageSizeFor());

  const customerPages = $derived(Math.max(1, Math.ceil(app.dataPresets.customers.length / pageSize)));
  const customerPage = $derived(Math.min(presetPages.customer || 1, customerPages));
  const customerList = $derived(app.dataPresets.customers.slice((customerPage - 1) * pageSize, customerPage * pageSize));

  const supplierPages = $derived(Math.max(1, Math.ceil(app.dataPresets.suppliers.length / pageSize)));
  const supplierPage = $derived(Math.min(presetPages.supplier || 1, supplierPages));
  const supplierList = $derived(app.dataPresets.suppliers.slice((supplierPage - 1) * pageSize, supplierPage * pageSize));

  const incomingPages = $derived(Math.max(1, Math.ceil(app.dataPresets.incomingQtyPresets.length / pageSize)));
  const incomingPage = $derived(Math.min(presetPages.incoming || 1, incomingPages));
  const incomingList = $derived(app.dataPresets.incomingQtyPresets.slice((incomingPage - 1) * pageSize, incomingPage * pageSize));

  const processPages = $derived(Math.max(1, Math.ceil(app.dataPresets.processes.length / pageSize)));
  const processPage = $derived(Math.min(presetPages.process || 1, processPages));
  const processList = $derived(app.dataPresets.processes.slice((processPage - 1) * pageSize, processPage * pageSize));

  const normalRespArr = $derived(normalResponsibles());
  const respPages = $derived(Math.max(1, Math.ceil(normalRespArr.length / pageSize)));
  const respPage = $derived(Math.min(presetPages.responsible || 1, respPages));
  const respList = $derived(normalRespArr.slice((respPage - 1) * pageSize, respPage * pageSize));

  const specialPages = $derived(Math.max(1, Math.ceil(app.dataPresets.specialGroups.length / pageSize)));
  const specialPage = $derived(Math.min(presetPages.special || 1, specialPages));
  const specialList = $derived(app.dataPresets.specialGroups.slice((specialPage - 1) * pageSize, specialPage * pageSize));

  const pgPages = $derived(Math.max(1, Math.ceil(app.dataPresets.presetGroups.length / pageSize)));
  const pgPage = $derived(Math.min(presetPages.presetGroup || 1, pgPages));
  const pgList = $derived(app.dataPresets.presetGroups.slice((pgPage - 1) * pageSize, pgPage * pageSize));

  function bulkText() {
    const raw = prompt('批量添加（每行一个 / 逗号分隔）：');
    if (!raw) return [];
    return raw.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
  }
  function prevPage(key: string) { setPresetPage(key, (presetPages[key] || 1) - 1); }
  function nextPage(key: string) { setPresetPage(key, (presetPages[key] || 1) + 1); }

  function addSpecial() {
    if (!newSpecialGroup.trim()) return;
    if (addSpecialGroup(newSpecialGroup)) { newSpecialGroup = ''; pushToast('已添加特殊分组'); }
  }
  function addPresetGroup() {
    const v = newPresetGroup.trim();
    if (!v) return;
    if (app.dataPresets.presetGroups.some((p) => nameKey(p.name) === nameKey(v))) {
      pushToast('已存在同名预分组', 'error'); return;
    }
    app.dataPresets.presetGroups.push({ id: uid(), name: v, items: [] });
    scheduleSave();
    newPresetGroup = '';
  }
  function renamePresetGroup(id: string, name: string) {
    const p = app.dataPresets.presetGroups.find((x) => x.id === id);
    if (!p) return;
    const v = name.trim();
    if (!v) return;
    p.name = v;
    scheduleSave();
  }
  function removePresetGroup(id: string) {
    app.dataPresets.presetGroups = app.dataPresets.presetGroups.filter((x) => x.id !== id);
    scheduleSave();
  }

  /* ★ H2：改为弹窗 */
  function editPresetGroupItems(id: string) {
    const p = app.dataPresets.presetGroups.find((x) => x.id === id);
    if (!p) return;
    editTitle = `编辑「${p.name}」的分类`;
    editSubtitle = '每行一个，或用逗号/顿号/分号分隔；空行自动忽略';
    editInitialText = p.items.join('\n');
    editTarget = { kind: 'presetGroup', id };
    editOpen = true;
  }
  function editSpecialGroupItems(id: string) {
    const sg = app.dataPresets.specialGroups.find((x) => x.id === id);
    if (!sg) return;
    editTitle = `编辑「${sg.name}」的分类`;
    editSubtitle = '每行一个，或用逗号/顿号/分号分隔；空行自动忽略';
    editInitialText = sg.items.join('\n');
    editTarget = { kind: 'specialGroup', id };
    editOpen = true;
  }
    function onEditConfirm(text: string) {
    if (!editTarget) return;
    if (editTarget.kind === 'presetGroup') {
-     const p = app.dataPresets.presetGroups.find((x) => x.id === editTarget!.id);
+     const p = app.dataPresets.presetGroups.find((x) => x.id === editTarget.id);
      if (p) {
        p.items = text.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
        scheduleSave();
      }
    } else {
      setSpecialGroupItems(editTarget.id, text);
    }
    editTarget = null;
  }
</script>

<Dialog bind:open title="📚 数据预设" subtitle="预设客户、供应商、来料数量、工序、负责人、特殊分组、预分组、共享预分类。" wide>
  <div class="dp-tabs-outer">
    <div class="dp-tabs-scroll">
      {#each dataTabs as t (t.key)}
        <button class="dp-tab" class:active={tab === t.key} onclick={() => (tab = t.key)}>{t.label}</button>
      {/each}
    </div>
    <div class="dp-tab-actions">
      <button class="dp-expand-btn" title="Tab 导航" onclick={() => (presetNavOpen = true)}>≡</button>
      <button class="dp-expand-btn" title="打开设置" onclick={onOpenSettings}>⚙️</button>
    </div>
  </div>

  <div class="dialog-list">
    {#if tab === 'customer'}
      <div class="panel-head-row">
        <span class="panel-head-text">客户列表（{app.dataPresets.customers.length}）</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach((v) => { if (addDataPreset('customer', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个客户`);
        }}>＋ 批量添加</button>
      </div>
      {#if customerPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('customer')} disabled={customerPage <= 1}>‹</button>
          <span>{customerPage} / {customerPages}</span>
          <button onclick={() => nextPage('customer')} disabled={customerPage >= customerPages}>›</button>
        </div>
      {/if}
      {#each customerList as c (c.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={c.name} maxlength="40"
                 onblur={(e) => renameCustomerById(c.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleCustomerResp(c.id)}>负责人({c.responsibleIds.length})</button>
            <button class="scope-btn" onclick={() => toggleCustomerProducts(c.id)}>关联产品({countCustomerProducts(c.name)})</button>
            <button class="del" onclick={() => removeCustomerById(c.id)}>✕</button>
          </div>
        </div>
        {#if uiState.expandedCustomerId === c.id}
          <div class="resp-panel">
            <div class="panel-title">选择该客户的负责人</div>
            {#each normalResponsibles() as r (r.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={c.responsibleIds.includes(r.id)}
                       onchange={() => toggleCustomerRespFor(c, r.id)} />
                <span>@{r.name}</span>
              </label>
            {/each}
          </div>
        {/if}
        {#if uiState.expandedCustomerProductsId === c.id}
          <div class="resp-panel">
            <div class="panel-title">勾选后，这些产品的客户将变更为「{c.name}」</div>
            <div class="panel-toolbar">
              <input value={uiState.productPickerFilter}
                     oninput={(e) => setProductPickerFilter((e.target as HTMLInputElement).value)}
                     placeholder="🔍 过滤产品…" />
              <button onclick={() => selectAllProductsForCustomer(c, true)}>全选</button>
              <button onclick={() => selectAllProductsForCustomer(c, false)}>清空</button>
            </div>
            {#each getFilteredProductsForPicker() as p (p.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={(p.customer || '') === c.name}
                       onchange={() => toggleCustomerProduct(c, p.id, !((p.customer || '') === c.name))} />
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
        <span class="panel-head-text">供应商列表（{app.dataPresets.suppliers.length}）</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach((v) => { if (addDataPreset('supplier', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个供应商`);
        }}>＋ 批量添加</button>
      </div>
      {#if supplierPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('supplier')} disabled={supplierPage <= 1}>‹</button>
          <span>{supplierPage} / {supplierPages}</span>
          <button onclick={() => nextPage('supplier')} disabled={supplierPage >= supplierPages}>›</button>
        </div>
      {/if}
      {#each supplierList as s, i (s)}
        {@const realIndex = (supplierPage - 1) * pageSize + i}
        <div class="preset-edit-row">
          <input class="main-name-input" value={s} maxlength="40"
                 onblur={(e) => renameSupplier(realIndex, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleSupplierProducts(s)}>关联产品({countSupplierProducts(s)})</button>
            <button class="del" onclick={() => removeSupplierByName(s)}>✕</button>
          </div>
        </div>
        {#if uiState.expandedSupplierProductsName === s}
          <div class="resp-panel">
            <div class="panel-title">勾选后，这些产品的供应商将变更为「{s}」</div>
            <div class="panel-toolbar">
              <input value={uiState.productPickerFilter}
                     oninput={(e) => setProductPickerFilter((e.target as HTMLInputElement).value)}
                     placeholder="🔍 过滤产品…" />
              <button onclick={() => selectAllProductsForSupplier(s, true)}>全选</button>
              <button onclick={() => selectAllProductsForSupplier(s, false)}>清空</button>
            </div>
            {#each getFilteredProductsForPicker() as p (p.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={(p.supplier || '') === s}
                       onchange={() => toggleSupplierProduct(s, p.id, !((p.supplier || '') === s))} />
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
      <div class="panel-head-row">
        <span class="panel-head-text">来料数量列表（{app.dataPresets.incomingQtyPresets.length}）</span>
      </div>
      {#if incomingPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('incoming')} disabled={incomingPage <= 1}>‹</button>
          <span>{incomingPage} / {incomingPages}</span>
          <button onclick={() => nextPage('incoming')} disabled={incomingPage >= incomingPages}>›</button>
        </div>
      {/if}
      {#each incomingList as v, i (v)}
        {@const realIndex = (incomingPage - 1) * pageSize + i}
        <div class="preset-edit-row">
          <input type="text" inputmode="numeric" value={String(v)} maxlength="9"
                 onblur={(e) => {
                   const n = parseInt((e.target as HTMLInputElement).value.replace(/\D/g, ''), 10);
                   if (Number.isFinite(n) && n > 0) {
                     app.dataPresets.incomingQtyPresets[realIndex] = n;
                     scheduleSave();
                   }
                 }} />
          <button class="del" onclick={() => {
            app.dataPresets.incomingQtyPresets = app.dataPresets.incomingQtyPresets.filter((x) => x !== v);
            scheduleSave();
          }}>✕</button>
        </div>
      {/each}
      {#if !app.dataPresets.incomingQtyPresets.length}<div class="transfer-empty">还没有来料数量预设</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newIncoming} type="text" inputmode="numeric" placeholder="输入来料数量…" maxlength="9" />
        <button onclick={() => { if (addDataPreset('incoming', newIncoming)) newIncoming = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'process'}
      <div class="panel-head-row">
        <span class="panel-head-text">发生工序列表（{app.dataPresets.processes.length}）</span>
      </div>
      {#if processPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('process')} disabled={processPage <= 1}>‹</button>
          <span>{processPage} / {processPages}</span>
          <button onclick={() => nextPage('process')} disabled={processPage >= processPages}>›</button>
        </div>
      {/if}
      {#each processList as p, i (p)}
        {@const realIndex = (processPage - 1) * pageSize + i}
        <div class="preset-edit-row">
          <input value={p} maxlength="40"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim();
                   if (v) { app.dataPresets.processes[realIndex] = v; scheduleSave(); }
                 }} />
          <button class="del" onclick={() => {
            app.dataPresets.processes = app.dataPresets.processes.filter((x) => x !== p);
            scheduleSave();
          }}>✕</button>
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
      {#if respPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('responsible')} disabled={respPage <= 1}>‹</button>
          <span>{respPage} / {respPages}</span>
          <button onclick={() => nextPage('responsible')} disabled={respPage >= respPages}>›</button>
        </div>
      {/if}
      {#each respList as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, '');
                   if (v) { r.name = v; scheduleSave(); }
                 }} />
          <button class="del" onclick={() => {
            if (confirm('确定删除该负责人吗？')) {
              app.dataPresets.responsiblePersons = app.dataPresets.responsiblePersons.filter((x) => x.id !== r.id);
              scheduleSave();
            }
          }}>✕</button>
        </div>
      {/each}
      {#if !normalResponsibles().length}<div class="transfer-empty">还没有常规负责人</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newNormalResp} placeholder="输入常规负责人姓名…" maxlength="30" />
        <button onclick={() => {
          const name = newNormalResp.trim().replace(/^@+/, '');
          if (!name) return;
          if (app.dataPresets.responsiblePersons.some((r) => nameKey(r.name) === nameKey(name))) {
            pushToast('已存在同名负责人', 'error'); return;
          }
          app.dataPresets.responsiblePersons.push({ id: uid(), name, kind: 'normal' });
          newNormalResp = ''; scheduleSave();
        }}>添加</button>
      </div>

      <div class="panel-head-row" style="margin-top:14px"><span class="panel-head-text">特殊分组负责人</span></div>
      {#each specialResponsibles() as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, '');
                   if (v) { r.name = v; scheduleSave(); }
                 }} />
          <button class="del" onclick={() => {
            if (confirm('确定删除该负责人吗？')) {
              app.dataPresets.responsiblePersons = app.dataPresets.responsiblePersons.filter((x) => x.id !== r.id);
              scheduleSave();
            }
          }}>✕</button>
        </div>
      {/each}
      {#if !specialResponsibles().length}<div class="transfer-empty">还没有特殊分组负责人</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newSpecialResp} placeholder="输入特殊分组负责人姓名…" maxlength="30" />
        <button onclick={() => {
          const name = newSpecialResp.trim().replace(/^@+/, '');
          if (!name) return;
          if (app.dataPresets.responsiblePersons.some((r) => nameKey(r.name) === nameKey(name))) {
            pushToast('已存在同名负责人', 'error'); return;
          }
          app.dataPresets.responsiblePersons.push({ id: uid(), name, kind: 'special' });
          newSpecialResp = ''; scheduleSave();
        }}>添加</button>
      </div>
    {/if}

    {#if tab === 'special'}
      <div class="panel-head-row">
        <span class="panel-head-text">特殊分组（{app.dataPresets.specialGroups.length}）</span>
      </div>
      {#if specialPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('special')} disabled={specialPage <= 1}>‹</button>
          <span>{specialPage} / {specialPages}</span>
          <button onclick={() => nextPage('special')} disabled={specialPage >= specialPages}>›</button>
        </div>
      {/if}
      {#each specialList as sg (sg.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={sg.name} maxlength="30"
                 onblur={(e) => renameSpecialGroup(sg.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleSpecialRespPanel(sg.id)}>负责人({sg.responsibleIds.length})</button>
            <button class="scope-btn" onclick={() => toggleSpecialGroupProducts(sg.id)}>关联产品({app.products.length})</button>
            <button class="scope-btn" onclick={() => editSpecialGroupItems(sg.id)}>编辑分类</button>
            <button class="del" onclick={() => removeSpecialGroup(sg.id)}>✕</button>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--c-text-3);padding:2px 12px 6px">
          分类：{sg.items.join('、') || '（空）'}
          <label style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;cursor:pointer">
            <input type="checkbox" checked={sg.requireSample}
                   onchange={() => toggleSpecialGroupSample(sg.id)} /> 仅样品触发
          </label>
        </div>

        {#if specialUIState.expandedRespId === sg.id}
          <div class="resp-panel">
            <div class="panel-title">选择该特殊分组的负责人</div>
            {#each specialResponsibles() as r (r.id)}
              <label class="responsible-item">
                <input type="checkbox" checked={sg.responsibleIds.includes(r.id)}
                       onchange={() => toggleSpecialGroupResp(sg.id, r.id)} />
                <span>@{r.name}</span>
              </label>
            {/each}
          </div>
        {/if}

        {#if specialUIState.expandedProductsId === sg.id}
          <div class="resp-panel">
            <div class="panel-title">关联产品（按当前分组命中情况）</div>
            <div class="panel-toolbar">
              <input value={specialUIState.filter}
                     oninput={(e) => (specialUIState.filter = (e.target as HTMLInputElement).value)}
                     placeholder="🔍 过滤产品…" />
              <button class:active={specialUIState.mode === 'all'} onclick={() => (specialUIState.mode = 'all')}>全部</button>
              <button class:active={specialUIState.mode === 'hit'} onclick={() => (specialUIState.mode = 'hit')}>仅命中</button>
              <button class:active={specialUIState.mode === 'effective'} onclick={() => (specialUIState.mode = 'effective')}>仅生效</button>
            </div>
            {#each app.products.filter((p) => {
              const q = specialUIState.filter.trim().toLowerCase();
              if (q && !p.name.toLowerCase().includes(q)) return false;
              const hit = productMatchesSpecialGroup(p, sg);
              const eff = productEffectiveForSpecialGroup(p, sg);
              if (specialUIState.mode === 'hit' && !hit) return false;
              if (specialUIState.mode === 'effective' && !eff) return false;
              return true;
            }) as p (p.id)}
              <div class="responsible-item" style="cursor:default">
                <span style="flex:1">
                  {p.name}{#if p.isSample}<span style="color:var(--c-purple-text);font-size:11px">· 样品</span>{/if}
                </span>
                <span style="font-size:11px;color:var(--c-text-3)">
                  {#if productEffectiveForSpecialGroup(p, sg)}✅ 生效
                  {:else if productMatchesSpecialGroup(p, sg)}⚠️ 命中(未生效)
                  {:else}—{/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      {/each}
      {#if !app.dataPresets.specialGroups.length}<div class="transfer-empty">还没有特殊分组</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newSpecialGroup} placeholder="输入特殊分组名称…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') addSpecial(); }} />
        <button onclick={addSpecial}>添加</button>
      </div>
    {/if}

    {#if tab === 'presetGroup'}
      <div class="panel-head-row">
        <span class="panel-head-text">预分组（{app.dataPresets.presetGroups.length}）</span>
      </div>
      {#if pgPages > 1}
        <div class="pager">
          <button onclick={() => prevPage('presetGroup')} disabled={pgPage <= 1}>‹</button>
          <span>{pgPage} / {pgPages}</span>
          <button onclick={() => nextPage('presetGroup')} disabled={pgPage >= pgPages}>›</button>
        </div>
      {/if}
      {#each pgList as p (p.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={p.name} maxlength="30"
                 onblur={(e) => renamePresetGroup(p.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => editPresetGroupItems(p.id)}>编辑分类({p.items.length})</button>
            <button class="del" onclick={() => removePresetGroup(p.id)}>✕</button>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--c-text-3);padding:2px 12px 6px">
          {p.items.length ? p.items.join('、') : '（空，点"编辑分类"添加）'}
        </div>
      {/each}
      {#if !app.dataPresets.presetGroups.length}<div class="transfer-empty">还没有预分组</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newPresetGroup} placeholder="输入预分组名称…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') addPresetGroup(); }} />
        <button onclick={addPresetGroup}>添加</button>
      </div>
    {/if}

    {#if tab === 'globalPreset'}
      <div class="panel-head-row">
        <span class="panel-head-text">共享预分类（{app.globalPresets.length}）</span>
      </div>
      {#each app.globalPresets as gp (gp.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={gp.name} maxlength="30"
                 onblur={(e) => {
                   const el = e.target as HTMLInputElement;
                   const ok = renameGlobalPreset(gp.id, el.value);
                   if (!ok) el.value = gp.name;
                 }} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleGpPanel(gp.id)}>{gpProductLabel(gp)}</button>
            <button class="del" onclick={() => removeGlobalPreset(gp.id)}>✕</button>
          </div>
        </div>
        {#if expandedGpId === gp.id}
          <div class="resp-panel">
            <div class="panel-title">「{gp.name}」生效的产品（默认全部生效）</div>
            <div class="panel-toolbar">
              <input value={gpFilter}
                     oninput={(e) => (gpFilter = (e.target as HTMLInputElement).value)}
                     placeholder="🔍 过滤产品…" />
              <button onclick={() => setAllGpProducts(gp)}>全选</button>
              <button onclick={() => setNoneGpProducts(gp)}>全不生效</button>
            </div>
            {#if app.products.length === 0}
              <div class="empty-tip">还没有产品，请先添加产品。</div>
            {:else}
              {#each filteredGpProducts() as p (p.id)}
                <label class="responsible-item">
                  <input type="checkbox" checked={isGpChecked(gp, p.id)}
                         onchange={() => toggleGpProduct(gp, p.id)} />
                  <span>{p.name}</span>
                </label>
              {/each}
              {#if filteredGpProducts().length === 0}
                <div class="empty-tip">没有匹配的产品</div>
              {/if}
            {/if}
          </div>
        {/if}
      {/each}
      {#if !app.globalPresets.length}<div class="transfer-empty">还没有共享预分类</div>{/if}
      <div class="preset-add-row">
        <input bind:value={newGlobalPreset} placeholder="输入共享预分类名称…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') onAddGp(); }} />
        <button onclick={onAddGp}>添加</button>
      </div>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>关闭</button>
  </div>
</Dialog>

<NavGridDialog
  bind:open={presetNavOpen}
  title="📚 数据预设导航"
  subtitle="点击分类直接切换，无需在页面内平铺展开。"
  items={dataTabs}
  activeKey={tab}
  onSelect={pickPresetTab}
/>

<TextEditDialog
  bind:open={editOpen}
  title={editTitle}
  subtitle={editSubtitle}
  initialText={editInitialText}
  onConfirm={onEditConfirm}
/>
