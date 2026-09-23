<script lang="ts">
  import {
    app, currentProduct, calcSampling, setIncomingQty, setInspectionQty,
    setProductField, toggleSample, setProductSupplier, setProductCustomer,
    canUndo, canRedo, undo, redo, sortNatural,
  } from '../lib/stores/app.svelte';

  const p = $derived(currentProduct());
  let incomingText = $state('');
  let inspectionText = $state('');

  $effect(() => {
    const cur = p?.incomingQty ?? 0;
    incomingText = cur > 0 ? String(cur) : '';
  });
  $effect(() => {
    const cur = p?.inspectionQty ?? 0;
    inspectionText = cur > 0 ? String(cur) : '';
  });

  const suppliers = $derived(sortNatural(app.dataPresets.suppliers));
  const customers = $derived(sortNatural(app.dataPresets.customers, (c) => c.name));
  const processes = $derived(app.dataPresets.processes);
  const incomingPresets = $derived(app.dataPresets.incomingQtyPresets);

  function onIncomingInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 9);
    (e.target as HTMLInputElement).value = raw;
    incomingText = raw;
    setIncomingQty(raw === '' ? 0 : parseInt(raw, 10));
  }
  function onInspectionInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 9);
    (e.target as HTMLInputElement).value = raw;
    inspectionText = raw;
    setInspectionQty(raw === '' ? 0 : parseInt(raw, 10));
  }
  function bumpInspection(delta: number) {
    if (!p) return;
    const next = Math.max(0, (p.inspectionQty || 0) + delta);
    setInspectionQty(next);
    inspectionText = String(next);
  }
</script>

{#if p}
  <div class="title-row">
    <h1>📦 抽检数量统计</h1>
    <div class="history-group">
      <button class="history-btn" disabled={!canUndo()} onclick={undo} title="撤回">↶ 撤回</button>
      <button class="history-btn" disabled={!canRedo()} onclick={redo} title="恢复">↷ 恢复</button>
    </div>
  </div>
  {#if app.settings.showMainTips !== false}
    <p class="tip">
      <b>{p.name}</b> · 产品名称即为料号；同供应商 + 同客户才能一起汇总；
      抽检数量为产品级统一值，所有分组共用；长按 ⠿ 拖动可调整分组顺序。
    </p>
  {/if}

  <section class="box product-info-box">
    <div class="box-head">
      <span class="box-title">📋 产品信息</span>
      <span class="box-badge">AQL 参考</span>
    </div>
    <div class="info-grid">
      <div class="info-field">
        <div class="field-label">料号（= 产品名称）</div>
        <input value={p.name} readonly tabindex="-1" />
      </div>
      <div class="info-field">
        <div class="field-label">供应商 <span class="req">*</span></div>
        <input value={p.supplier} list="supplierList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductSupplier(p.id, (e.target as HTMLInputElement).value)} />
        <datalist id="supplierList">
          {#each suppliers as s}<option value={s}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <div class="field-label">客户（可选）</div>
        <input value={p.customer} list="customerList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductCustomer(p.id, (e.target as HTMLInputElement).value)} />
        <datalist id="customerList">
          {#each customers as c}<option value={c.name}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <div class="field-label">来料数量</div>
        <input value={incomingText} type="text" inputmode="numeric" placeholder="0" maxlength="9"
               list="incomingList" oninput={onIncomingInput} />
        <datalist id="incomingList">
          {#each incomingPresets as v}<option value={String(v)}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <div class="field-label">发生工序</div>
        <input value={p.process} list="processList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductField('process', (e.target as HTMLInputElement).value)} />
        <datalist id="processList">
          {#each processes as x}<option value={x}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <div class="field-label">类型</div>
        <label class="sample-toggle">
          <input type="checkbox" checked={p.isSample}
                 onchange={(e) => toggleSample((e.target as HTMLInputElement).checked)} />
          <span>样品</span>
        </label>
      </div>
    </div>

    <!-- ★ v3.7：抽检数量卡片（含 F1 快捷加减） -->
    <div class="sampling-display">
      <div>
        <div>抽检数量</div>
        {#if app.settings.showMainTips !== false}
          <div class="sub">
            参考：AQL(来料 {p.incomingQty || 0}) = {calcSampling(p.incomingQty || 0)}
          </div>
        {/if}
      </div>
      <div class="sampling-control">
        <button class="sampling-step-btn" type="button" aria-label="减一" onclick={() => bumpInspection(-1)}>−</button>
        <input class="sampling-input" type="text" inputmode="numeric"
               value={inspectionText} placeholder="0" maxlength="9"
               oninput={onInspectionInput} aria-label="抽检数量" />
        <button class="sampling-step-btn" type="button" aria-label="加一" onclick={() => bumpInspection(1)}>+</button>
        <span class="sampling-unit">PCS</span>
      </div>
    </div>
  </section>
{/if}
