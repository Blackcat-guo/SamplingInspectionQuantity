<script lang="ts">
  import {
    app, currentProduct, calcSampling, setIncomingQty, setProductField, toggleSample,
    setProductSupplier, setProductCustomer, canUndo, canRedo, undo, redo,
    sortNatural,
  } from '../lib/stores/app.svelte';

  const p = $derived(currentProduct());
  const incomingText = $state('');
  $effect(() => {
    const cur = p?.incomingQty ?? 0;
    incomingText = cur > 0 ? String(cur) : '';
  });

  const suppliers = $derived(sortNatural(app.dataPresets.suppliers));
  const customers = $derived(sortNatural(app.dataPresets.customers, c => c.name));
  const processes = $derived(app.dataPresets.processes);
  const incomingPresets = $derived(app.dataPresets.incomingQtyPresets);

  function onIncomingInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 9);
    (e.target as HTMLInputElement).value = raw;
    incomingText = raw;
    setIncomingQty(raw === '' ? 0 : parseInt(raw, 10));
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
      各分组总数量以你的实际输入为准；长按 ⠿ 拖动可调整分组顺序。
    </p>
  {/if}

  <section class="box product-info-box">
    <div class="box-head"><span class="box-title">📋 产品信息</span><span class="box-badge">AQL 参考</span></div>
    <div class="info-grid">
      <div class="info-field">
        <label>料号（= 产品名称）</label>
        <input value={p.name} readonly tabindex="-1" />
      </div>
      <div class="info-field">
        <label>供应商 <span class="req">*</span></label>
        <input value={p.supplier} list="supplierList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductSupplier(p.id, (e.target as HTMLInputElement).value)} />
        <datalist id="supplierList">
          {#each suppliers as s}<option value={s}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <label>客户（可选）</label>
        <input value={p.customer} list="customerList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductCustomer(p.id, (e.target as HTMLInputElement).value)} />
        <datalist id="customerList">
          {#each customers as c}<option value={c.name}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <label>来料数量</label>
        <input value={incomingText} type="text" inputmode="numeric" placeholder="0" maxlength="9"
               oninput={onIncomingInput} />
        <datalist id="incomingList">
          {#each incomingPresets as v}<option value={String(v)}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <label>发生工序</label>
        <input value={p.process} list="processList" maxlength="40" placeholder="选择或输入"
               oninput={(e) => setProductField('process', (e.target as HTMLInputElement).value)} />
        <datalist id="processList">
          {#each processes as x}<option value={x}></option>{/each}
        </datalist>
      </div>
      <div class="info-field">
        <label>类型</label>
        <label class="sample-toggle"
               style="display:flex;align-items:center;gap:10px;height:38px;padding:0 10px;font-size:13px;
                      border:1.5px solid var(--c-border);border-radius:9px;background:var(--c-surface)">
          <input type="checkbox" checked={p.isSample}
                 onchange={(e) => toggleSample((e.target as HTMLInputElement).checked)} />
          <span>样品</span>
        </label>
      </div>
    </div>
    <div class="sampling-display">
      <div>
        <div>AQL 参考抽检数</div>
        {#if app.settings.showMainTips !== false}
          <div class="sub">一般水平Ⅱ · AQL=1.0 · 仅作初始填入</div>
        {/if}
      </div>
      <div class="val">
        {p.incomingQty > 0 ? calcSampling(p.incomingQty) : '—'}
        <span style="font-size:13px;color:var(--c-text-3);font-weight:600">PCS</span>
      </div>
    </div>
  </section>
{/if}
