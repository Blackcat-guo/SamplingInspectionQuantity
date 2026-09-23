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

  /* ============================================================
     ★ v3.7.2 需求1：自定义 combobox 状态
     ============================================================ */
  let activeCombo = $state('');
  let comboCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function closeCombo() {
    if (comboCloseTimer) { clearTimeout(comboCloseTimer); comboCloseTimer = null; }
    activeCombo = '';
  }
  function delayedCloseCombo() {
    if (comboCloseTimer) clearTimeout(comboCloseTimer);
    comboCloseTimer = setTimeout(() => { comboCloseTimer = null; activeCombo = ''; }, 150);
  }
  function pickCombo(field: 'supplier' | 'customer' | 'process' | 'incoming', value: string) {
    if (field === 'supplier') supplier = value;
    else if (field === 'customer') customer = value;
    else if (field === 'process') process = value;
    else incoming = value;
    closeCombo();
  }

  /* 卸载时清理定时器 */
  $effect(() => {
    return () => {
      if (comboCloseTimer) clearTimeout(comboCloseTimer);
    };
  });

  /* 派生过滤列表（无匹配返回空数组，UI 显示"无匹配"） */
  const filteredAddSuppliers = $derived.by(() => {
    const q = supplier.trim().toLowerCase();
    const list = app.dataPresets.suppliers;
    if (!q) return list;
    return list.filter((s) => String(s).toLowerCase().includes(q));
  });
  const filteredAddCustomers = $derived.by(() => {
    const q = customer.trim().toLowerCase();
    const list = app.dataPresets.customers.map((c) => c.name);
    if (!q) return list;
    return list.filter((s) => String(s).toLowerCase().includes(q));
  });
  const filteredAddProcesses = $derived.by(() => {
    const q = process.trim().toLowerCase();
    const list = app.dataPresets.processes;
    if (!q) return list;
    return list.filter((s) => String(s).toLowerCase().includes(q));
  });
  const filteredAddIncoming = $derived.by(() => {
    const q = incoming.trim();
    const list = app.dataPresets.incomingQtyPresets.map((v) => String(v));
    if (!q) return list;
    return list.filter((s) => s.includes(q));
  });

  /* 解析产品名 */
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

        <!-- ========== 供应商 combobox ========== -->
        <div class="info-field">
          <div class="field-label">供应商</div>
          <div class="combo-wrap">
            <input
              value={supplier}
              maxlength="40"
              placeholder="选择或输入"
              autocomplete="off"
              onfocus={() => (activeCombo = 'add-supplier')}
              oninput={(e) => { supplier = (e.currentTarget as HTMLInputElement).value; }}
              onblur={delayedCloseCombo}
            />
            {#if activeCombo === 'add-supplier'}
              <div class="combo-dropdown" role="listbox">
                <div class="combo-hint">数据预设中的供应商</div>
                {#each filteredAddSuppliers as s (s)}
                  <div
                    class="combo-item"
                    class:active={s === supplier}
                    role="option"
                    aria-selected={s === supplier}
                    onmousedown={(e) => { e.preventDefault(); pickCombo('supplier', s); }}
                    ontouchstart={(e) => { e.preventDefault(); pickCombo('supplier', s); }}
                  >
                    <span class="txt">{s}</span>
                    {#if s === supplier}<span class="tick">✓</span>{/if}
                  </div>
                {/each}
                {#if filteredAddSuppliers.length === 0}
                  <div class="combo-empty">
                    {app.dataPresets.suppliers.length === 0 ? '暂无供应商预设' : '无匹配'}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- ========== 客户 combobox ========== -->
        <div class="info-field">
          <div class="field-label">客户</div>
          <div class="combo-wrap">
            <input
              value={customer}
              maxlength="40"
              placeholder="选择或输入"
              autocomplete="off"
              onfocus={() => (activeCombo = 'add-customer')}
              oninput={(e) => { customer = (e.currentTarget as HTMLInputElement).value; }}
              onblur={delayedCloseCombo}
            />
            {#if activeCombo === 'add-customer'}
              <div class="combo-dropdown" role="listbox">
                <div class="combo-hint">数据预设中的客户</div>
                {#each filteredAddCustomers as s (s)}
                  <div
                    class="combo-item"
                    class:active={s === customer}
                    role="option"
                    aria-selected={s === customer}
                    onmousedown={(e) => { e.preventDefault(); pickCombo('customer', s); }}
                    ontouchstart={(e) => { e.preventDefault(); pickCombo('customer', s); }}
                  >
                    <span class="txt">{s}</span>
                    {#if s === customer}<span class="tick">✓</span>{/if}
                  </div>
                {/each}
                {#if filteredAddCustomers.length === 0}
                  <div class="combo-empty">
                    {app.dataPresets.customers.length === 0 ? '暂无客户预设' : '无匹配'}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- ========== 发生工序 combobox ========== -->
        <div class="info-field">
          <div class="field-label">发生工序</div>
          <div class="combo-wrap">
            <input
              value={process}
              maxlength="40"
              placeholder="选择或输入"
              autocomplete="off"
              onfocus={() => (activeCombo = 'add-process')}
              oninput={(e) => { process = (e.currentTarget as HTMLInputElement).value; }}
              onblur={delayedCloseCombo}
            />
            {#if activeCombo === 'add-process'}
              <div class="combo-dropdown" role="listbox">
                <div class="combo-hint">数据预设中的工序</div>
                {#each filteredAddProcesses as s (s)}
                  <div
                    class="combo-item"
                    class:active={s === process}
                    role="option"
                    aria-selected={s === process}
                    onmousedown={(e) => { e.preventDefault(); pickCombo('process', s); }}
                    ontouchstart={(e) => { e.preventDefault(); pickCombo('process', s); }}
                  >
                    <span class="txt">{s}</span>
                    {#if s === process}<span class="tick">✓</span>{/if}
                  </div>
                {/each}
                {#if filteredAddProcesses.length === 0}
                  <div class="combo-empty">
                    {app.dataPresets.processes.length === 0 ? '暂无工序预设' : '无匹配'}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- ========== 来料数量 combobox ========== -->
        <div class="info-field">
          <div class="field-label">来料数量</div>
          <div class="combo-wrap">
            <input
              value={incoming}
              type="text"
              inputmode="numeric"
              maxlength="9"
              placeholder="0"
              autocomplete="off"
              onfocus={() => (activeCombo = 'add-incoming')}
              oninput={(e) => {
                const raw = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 9);
                (e.currentTarget as HTMLInputElement).value = raw;
                incoming = raw;
              }}
              onblur={delayedCloseCombo}
            />
            {#if activeCombo === 'add-incoming'}
              <div class="combo-dropdown" role="listbox">
                <div class="combo-hint">数据预设中的来料数量</div>
                {#each filteredAddIncoming as s (s)}
                  <div
                    class="combo-item"
                    class:active={s === incoming}
                    role="option"
                    aria-selected={s === incoming}
                    onmousedown={(e) => { e.preventDefault(); pickCombo('incoming', s); }}
                    ontouchstart={(e) => { e.preventDefault(); pickCombo('incoming', s); }}
                  >
                    <span class="txt">{s}</span>
                    {#if s === incoming}<span class="tick">✓</span>{/if}
                  </div>
                {/each}
                {#if filteredAddIncoming.length === 0}
                  <div class="combo-empty">
                    {app.dataPresets.incomingQtyPresets.length === 0 ? '暂无来料数量预设' : '无匹配'}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
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
