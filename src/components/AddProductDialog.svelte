<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { app, addProduct, pushToast, nameKey, logOperation } from '../lib/stores/app.svelte';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let text = $state('');
  let supplier = $state('');
  let customer = $state('');
  let process = $state('');
  let incoming = $state('');
  let isSample = $state(false);

  const parsed = $derived.by(() => {
    const names = text.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
    const existing = new Set(app.products.map((p) => nameKey(p.name)));
    const seen = new Set<string>();
    const valid: string[] = [];
    names.forEach((n) => {
      if (n.length > 30) return;
      const k = nameKey(n);
      if (existing.has(k) || seen.has(k)) return;
      seen.add(k);
      valid.push(n);
    });
    return { valid, skipped: names.length - valid.length };
  });

  function confirm() {
    if (!parsed.valid.length) return;
    parsed.valid.forEach((n) => addProduct(n, {
      supplier, customer, process,
      incomingQty: parseInt(incoming, 10) || 0,
      isSample,
    }));
    logOperation(`添加 ${parsed.valid.length} 个产品`);
    pushToast(`已添加 ${parsed.valid.length} 个产品`);
    open = false;
    text = '';
  }
</script>

<Dialog bind:open title="➕ 添加产品" subtitle="产品名称即为料号；每行一个，也可用逗号、顿号、分号分隔。" wide>
  <div class="dialog-list">
    <textarea bind:value={text} placeholder="0011&#10;0012&#10;0013"
              style="width:100%;min-height:110px;padding:11px;font-size:13.5px;border:1.5px solid var(--c-border);border-radius:11px;background:var(--c-surface);color:var(--c-text);outline:none;resize:vertical;font-family:inherit"></textarea>

    <div class="sub-section">
      <div class="panel-head-row"><span class="panel-head-text">统一设置（可选）</span></div>
      <div class="info-grid">
        <!-- ★ v3.7.1 需求1：供应商关联数据预设 -->
        <div class="info-field">
          <div class="field-label">供应商</div>
          <input bind:value={supplier} maxlength="40" list="addSupplierList" placeholder="选择或输入" />
          <datalist id="addSupplierList">
            {#each app.dataPresets.suppliers as s}<option value={s}></option>{/each}
          </datalist>
        </div>

        <!-- ★ 客户关联数据预设 -->
        <div class="info-field">
          <div class="field-label">客户</div>
          <input bind:value={customer} maxlength="40" list="addCustomerList" placeholder="选择或输入" />
          <datalist id="addCustomerList">
            {#each app.dataPresets.customers as c}<option value={c.name}></option>{/each}
          </datalist>
        </div>

        <!-- ★ 发生工序关联数据预设 -->
        <div class="info-field">
          <div class="field-label">发生工序</div>
          <input bind:value={process} maxlength="40" list="addProcessList" placeholder="选择或输入" />
          <datalist id="addProcessList">
            {#each app.dataPresets.processes as p}<option value={p}></option>{/each}
          </datalist>
        </div>

        <!-- ★ 来料数量关联数据预设 -->
        <div class="info-field">
          <div class="field-label">来料数量</div>
          <input bind:value={incoming} type="text" inputmode="numeric" maxlength="9"
                 list="addIncomingList" placeholder="0" />
          <datalist id="addIncomingList">
            {#each app.dataPresets.incomingQtyPresets as v}<option value={String(v)}></option>{/each}
          </datalist>
        </div>

        <div class="info-field" style="grid-column:1/-1">
          <div class="field-label">类型</div>
          <label class="sample-toggle">
            <input type="checkbox" bind:checked={isSample} />
            <span>标记为样品</span>
          </label>
        </div>
      </div>
    </div>

    {#if text.trim()}
      <div class="template-hint">
        已解析：将添加 <b>{parsed.valid.length}</b> 个产品
        {#if parsed.valid.length}：{parsed.valid.slice(0, 8).join('、')}{parsed.valid.length > 8 ? ' 等' : ''}{/if}
        {#if parsed.skipped}<span style="color:var(--c-danger)">（已跳过 {parsed.skipped} 个重复/无效项）</span>{/if}
      </div>
    {/if}
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" disabled={!parsed.valid.length} onclick={confirm}>
      添加 {parsed.valid.length} 个产品
    </button>
  </div>
</Dialog>
