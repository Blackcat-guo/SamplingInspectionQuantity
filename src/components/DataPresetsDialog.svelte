<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, addDataPreset, removeCustomer, removeSupplier, renameSupplier, renameCustomer,
    normalResponsibles, specialResponsibles, pushToast, scheduleSave, uid, nameKey, sortNatural,
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

  function addResponsible(kind: 'normal' | 'special') {
    const inputRef = kind === 'special' ? newSpecialResp : newNormalResp;
    const name = inputRef.trim().replace(/^@+/, '');
    if (!name) return;
    if (app.dataPresets.responsiblePersons.some(r => nameKey(r.name) === nameKey(name))) {
      pushToast('已存在同名负责人', 'error'); return;
    }
    app.dataPresets.responsiblePersons.push({ id: uid(), name, kind: kind === 'special' ? 'special' : 'normal' });
    if (kind === 'special') newSpecialResp = ''; else newNormalResp = '';
    save();
  }

  function removeResponsible(id: string) {
    if (!confirm('确定删除该负责人吗？')) return;
    app.dataPresets.responsiblePersons = app.dataPresets.responsiblePersons.filter(r => r.id !== id);
    app.dataPresets.customers.forEach(c => {
      c.responsibleIds = c.responsibleIds.filter(x => x !== id);
    });
    app.dataPresets.specialGroups.forEach(sg => {
      sg.responsibleIds = sg.responsibleIds.filter(x => x !== id);
    });
    save();
  }
</script>

<Dialog bind:open title="📚 数据预设"
        subtitle="预设客户、供应商、来料数量、工序、负责人。">
  <div class="dp-tabs-wrap">
    {#each tabs as t (t.key)}
      <button class="dp-tab" class:active={tab === t.key} onclick={() => tab = t.key}>{t.label}</button>
    {/each}
    <button class="dp-tab" onclick={onOpenSettings}>⚙️</button>
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
                 onblur={(e) => renameCustomer(c.id, (e.target as HTMLInputElement).value)} />
          <div class="row-actions">
            <button class="del" onclick={() => removeCustomer(c.id)}>✕</button>
          </div>
        </div>
      {/each}
      {#if !app.dataPresets.customers.length}
        <div class="transfer-empty">还没有客户预设</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newCustomer} placeholder="输入客户名称…" maxlength="40"
               onkeydown={(e) => { if (e.key === 'Enter') { if (addDataPreset('customer', newCustomer)) newCustomer = ''; } }} />
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
            <button class="del" onclick={() => removeSupplier(s)}>✕</button>
          </div>
        </div>
      {/each}
      {#if !app.dataPresets.suppliers.length}
        <div class="transfer-empty">还没有供应商预设</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newSupplier} placeholder="输入供应商名称…" maxlength="40"
               onkeydown={(e) => { if (e.key === 'Enter') { if (addDataPreset('supplier', newSupplier)) newSupplier = ''; } }} />
        <button onclick={() => { if (addDataPreset('supplier', newSupplier)) newSupplier = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'incoming'}
      <div class="panel-head-row">
        <span class="panel-head-text">来料数量列表</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach(v => { if (addDataPreset('incoming', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个`);
        }}>＋ 批量添加</button>
      </div>
      {#each app.dataPresets.incomingQtyPresets as v, i (v)}
        <div class="preset-edit-row">
          <input type="text" inputmode="numeric" value={String(v)} maxlength="9"
                 onblur={(e) => {
                   const n = parseInt((e.target as HTMLInputElement).value.replace(/\D/g, ''), 10);
                   if (Number.isFinite(n) && n > 0) {
                     app.dataPresets.incomingQtyPresets[i] = n;
                     app.dataPresets.incomingQtyPresets = [...new Set(app.dataPresets.incomingQtyPresets)];
                     save();
                   }
                 }} />
          <span style="font-size:11px;color:var(--c-text-3)">PCS</span>
          <button class="del" onclick={() => {
            app.dataPresets.incomingQtyPresets = app.dataPresets.incomingQtyPresets.filter(x => x !== v);
            save();
          }}>✕</button>
        </div>
      {/each}
      {#if !app.dataPresets.incomingQtyPresets.length}
        <div class="transfer-empty">还没有来料数量预设</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newIncoming} type="text" inputmode="numeric" placeholder="输入来料数量…" maxlength="9" />
        <button onclick={() => { if (addDataPreset('incoming', newIncoming)) newIncoming = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'process'}
      <div class="panel-head-row">
        <span class="panel-head-text">发生工序列表</span>
        <button class="mini-batch-btn" onclick={() => {
          const arr = bulkText();
          if (!arr.length) return;
          let n = 0;
          arr.forEach(v => { if (addDataPreset('process', v)) n++; });
          if (n) pushToast(`已添加 ${n} 个`);
        }}>＋ 批量添加</button>
      </div>
      {#each app.dataPresets.processes as p, i (p)}
        <div class="preset-edit-row">
          <input value={p} maxlength="40"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim();
                   if (v) { app.dataPresets.processes[i] = v; save(); }
                 }} />
          <button class="del" onclick={() => {
            app.dataPresets.processes = app.dataPresets.processes.filter(x => x !== p);
            save();
          }}>✕</button>
        </div>
      {/each}
      {#if !app.dataPresets.processes.length}
        <div class="transfer-empty">还没有发生工序预设</div>
      {/if}
      <div class="preset-add-row">
        <input bind:value={newProcess} placeholder="输入发生工序…" maxlength="40" />
        <button onclick={() => { if (addDataPreset('process', newProcess)) newProcess = ''; }}>添加</button>
      </div>
    {/if}

    {#if tab === 'responsible'}
      <div class="panel-head-row"><span class="panel-head-text">常规负责人</span></div>
      {#each normalResponsibles() as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, '');
                   if (v) { r.name = v; save(); }
                 }} />
          <button class="del" onclick={() => removeResponsible(r.id)}>✕</button>
        </div>
      {/each}
      {#if !normalResponsibles().length}
        <div class="transfer-empty">还没有常规负责人</div>
      {/if}
      <div class="preset-add-row" style="margin-top:6px">
        <input bind:value={newNormalResp} placeholder="输入常规负责人姓名…" maxlength="30" />
        <button onclick={() => addResponsible('normal')}>添加</button>
      </div>

      <div class="panel-head-row" style="margin-top:14px">
        <span class="panel-head-text">特殊分组负责人</span>
      </div>
      {#each specialResponsibles() as r (r.id)}
        <div class="preset-edit-row">
          <input value={r.name} maxlength="30"
                 onblur={(e) => {
                   const v = (e.target as HTMLInputElement).value.trim().replace(/^@+/, '');
                   if (v) { r.name = v; save(); }
                 }} />
          <button class="del" onclick={() => removeResponsible(r.id)}>✕</button>
        </div>
      {/each}
      {#if !specialResponsibles().length}
        <div class="transfer-empty">还没有特殊分组负责人</div>
      {/if}
      <div class="preset-add-row" style="margin-top:6px">
        <input bind:value={newSpecialResp} placeholder="输入特殊分组负责人姓名…" maxlength="30" />
        <button onclick={() => addResponsible('special')}>添加</button>
      </div>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => open = false}>关闭</button>
  </div>
</Dialog>
