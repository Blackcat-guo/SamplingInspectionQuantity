<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, addDataPreset, removeCustomerById, removeSupplierByName, renameSupplier, renameCustomerById,
    normalResponsibles, specialResponsibles, pushToast, scheduleSave, uid, nameKey,
    toggleCustomerResp, toggleCustomerRespFor,
    uiState, toggleCustomerProducts, toggleSupplierProducts,
    toggleCustomerProduct, toggleSupplierProduct,
    selectAllProductsForCustomer, selectAllProductsForSupplier,
    countSupplierProducts, countCustomerProducts, getFilteredProductsForPicker,
    setProductPickerFilter,
    // 模块 G
    productMatchesSpecialGroup, productEffectiveForSpecialGroup,
    getSpecialGroupResponsibleNames, addSpecialGroup, removeSpecialGroup,
    renameSpecialGroup, toggleSpecialGroupResp, toggleSpecialGroupSample,
    setSpecialGroupItems, specialUIState, toggleSpecialGroupProducts, toggleSpecialGroupResp,
    // 模块 K
    presetPages, pageSizeFor, setPresetPage, resetPresetPage,
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false), onOpenSettings } = $props<{
    open: boolean;
    onOpenSettings: () => void;
  }>();

  let tab = $state('customer');

  const tabs = [
    { key: 'customer', label: '客户' },
    { key: 'supplier', label: '供应商' },
    { key: 'incoming', label: '来料数量' },
    { key: 'process', label: '工序' },
    { key: 'responsible', label: '负责人' },
    { key: 'special', label: '特殊分组' },
    { key: 'presetGroup', label: '预分组' },
  ];

  let newCustomer = $state('');
  let newSupplier = $state('');
  let newIncoming = $state('');
  let newProcess = $state('');
  let newNormalResp = $state('');
  let newSpecialResp = $state('');
  let newSpecialGroup = $state('');
  let newPresetGroup = $state('');

  const pageSize = $derived(pageSizeFor());

  function paginate<T>(arr: T[], key: string): { list: T[]; page: number; pages: number } {
    const size = pageSize;
    const pages = Math.max(1, Math.ceil(arr.length / size));
    const page = Math.min(presetPages[key] || 1, pages);
    if (page !== presetPages[key]) presetPages[key] = page;
    const start = (page - 1) * size;
    return { list: arr.slice(start, start + size), page, pages };
  }

  function pager(key: string, pages: number) {
    if (pages <= 1) return;
    const page = presetPages[key] || 1;
    return { page, pages };
  }

  function bulkText() {
    const raw = prompt('批量添加（每行一个 / 逗号分隔）：');
    if (!raw) return [];
    return raw.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
  }

  function prevPage(key: string) { setPresetPage(key, (presetPages[key] || 1) - 1); }
  function nextPage(key: string) { setPresetPage(key, (presetPages[key] || 1) + 1); }

  // 特殊分组
  function addSpecial() {
    if (!newSpecialGroup.trim()) return;
    if (addSpecialGroup(newSpecialGroup)) {
      newSpecialGroup = '';
      pushToast('已添加特殊分组');
    }
  }

  // 预分组（简化：只作为 name+items 编辑）
  function addPresetGroup() {
    const v = newPresetGroup.trim();
    if (!v) return;
    if (app.dataPresets.presetGroups.some((p) => nameKey(p.name) === nameKey(v))) {
      pushToast('已存在同名预分组', 'error');
      return;
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
  function editPresetGroupItems(id: string) {
    const p = app.dataPresets.presetGroups.find((x) => x.id === id);
    if (!p) return;
    const raw = prompt(`编辑「${p.name}」的分类（每行一个）：`, p.items.join('\n'));
    if (raw == null) return;
    p.items = raw.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
    scheduleSave();
  }
</script>

<Dialog bind:open title="📚 数据预设" subtitle="预设客户、供应商、来料数量、工序、负责人、特殊分组、预分组。" wide>
  <div class="dp-tabs-wrap">
    {#each tabs as t (t.key)}
      <button class="dp-tab" class:active={tab === t.key} onclick={() => (tab = t.key)}>{t.label}</button>
    {/each}
    <button class="dp-tab" style="margin-left:auto" title="打开设置" onclick={onOpenSettings}>⚙️</button>
  </div>

  <div class="dialog-list">
    {#if tab === 'customer'}
      {@const pg = paginate(app.dataPresets.customers, 'customer')}
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
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('customer')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('customer')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as c (c.id)}
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
      {@const pg = paginate(app.dataPresets.suppliers, 'supplier')}
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
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('supplier')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('supplier')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as s, i (s)}
        {@const realIndex = (pg.page - 1) * pageSize + i}
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
      {@const pg = paginate(app.dataPresets.incomingQtyPresets, 'incoming')}
      <div class="panel-head-row"><span class="panel-head-text">来料数量列表（{app.dataPresets.incomingQtyPresets.length}）</span></div>
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('incoming')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('incoming')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as v, i (v)}
        {@const realIndex = (pg.page - 1) * pageSize + i}
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
      {@const pg = paginate(app.dataPresets.processes, 'process')}
      <div class="panel-head-row"><span class="panel-head-text">发生工序列表（{app.dataPresets.processes.length}）</span></div>
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('process')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('process')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as p, i (p)}
        {@const realIndex = (pg.page - 1) * pageSize + i}
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
      {@const pgN = paginate(normalResponsibles(), 'responsible')}
      <div class="panel-head-row"><span class="panel-head-text">常规负责人</span></div>
      {#if pgN.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('responsible')} disabled={pgN.page <= 1}>‹</button>
          <span>{pgN.page} / {pgN.pages}</span>
          <button onclick={() => nextPage('responsible')} disabled={pgN.page >= pgN.pages}>›</button>
        </div>
      {/if}
      {#each pgN.list as r (r.id)}
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
      {@const pg = paginate(app.dataPresets.specialGroups, 'special')}
      <div class="panel-head-row">
        <span class="panel-head-text">特殊分组（{app.dataPresets.specialGroups.length}）</span>
      </div>
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('special')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('special')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as sg (sg.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={sg.name} maxlength="30"
                 onblur={(e) => renameSpecialGroup(sg.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => toggleSpecialGroupResp(sg.id)}>
              负责人({sg.responsibleIds.length})
            </button>
            <button class="scope-btn" onclick={() => toggleSpecialGroupProducts(sg.id)}>
              关联产品({app.products.length})
            </button>
            <button class="scope-btn" onclick={() => editSpecialGroupItems(sg.id)}>编辑分类</button>
            <button class="del" onclick={() => removeSpecialGroup(sg.id)}>✕</button>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--c-text-3);padding:2px 12px 6px">
          分类：{sg.items.join('、') || '（空）'}
          <label style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;cursor:pointer">
            <input type="checkbox" checked={sg.requireSample}
                   onchange={() => toggleSpecialGroupSample(sg.id)} />
            仅样品触发
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
              <input
                value={specialUIState.filter}
                oninput={(e) => (specialUIState.filter = (e.target as HTMLInputElement).value)}
                placeholder="🔍 过滤产品…"
              />
              <button
                class:active={specialUIState.mode === 'all'}
                onclick={() => (specialUIState.mode = 'all')}
              >全部</button>
              <button
                class:active={specialUIState.mode === 'hit'}
                onclick={() => (specialUIState.mode = 'hit')}
              >仅命中</button>
              <button
                class:active={specialUIState.mode === 'effective'}
                onclick={() => (specialUIState.mode = 'effective')}
              >仅生效</button>
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
                <span style="flex:1">{p.name}{#if p.isSample} <span style="color:var(--c-purple-text);font-size:11px">· 样品</span>{/if}</span>
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
      {#if !app.dataPresets.specialGroups.length}
        <div class="transfer-empty">还没有特殊分组</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newSpecialGroup} placeholder="输入特殊分组名称…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') addSpecial(); }} />
        <button onclick={addSpecial}>添加</button>
      </div>
    {/if}

    {#if tab === 'presetGroup'}
      {@const pg = paginate(app.dataPresets.presetGroups, 'presetGroup')}
      <div class="panel-head-row">
        <span class="panel-head-text">预分组（{app.dataPresets.presetGroups.length}）</span>
      </div>
      {#if pg.pages > 1}
        <div class="pager">
          <button onclick={() => prevPage('presetGroup')} disabled={pg.page <= 1}>‹</button>
          <span>{pg.page} / {pg.pages}</span>
          <button onclick={() => nextPage('presetGroup')} disabled={pg.page >= pg.pages}>›</button>
        </div>
      {/if}
      {#each pg.list as p (p.id)}
        <div class="preset-edit-row">
          <input class="main-name-input" value={p.name} maxlength="30"
                 onblur={(e) => renamePresetGroup(p.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="scope-btn" onclick={() => editPresetGroupItems(p.id)}>
              编辑分类({p.items.length})
            </button>
            <button class="del" onclick={() => removePresetGroup(p.id)}>✕</button>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--c-text-3);padding:2px 12px 6px">
          {p.items.length ? p.items.join('、') : '（空，点"编辑分类"添加）'}
        </div>
      {/each}
      {#if !app.dataPresets.presetGroups.length}
        <div class="transfer-empty">还没有预分组</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newPresetGroup} placeholder="输入预分组名称…" maxlength="30"
               onkeydown={(e) => { if (e.key === 'Enter') addPresetGroup(); }} />
        <button onclick={addPresetGroup}>添加</button>
      </div>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>关闭</button>
  </div>
</Dialog>
