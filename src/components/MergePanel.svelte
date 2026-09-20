<script lang="ts">
  import {
    app, currentProduct, mergedProducts, groupedProducts, canSelectProduct,
    isMergeSelected, toggleMergeSelect, selectAllSameCombination, clearMergeSelection,
    buildMergedText, templatePreviewHtml, getProductSamplingDisplay,
    pushToast, scheduleSave,
    scheduleAutoRespSync, rejectAutoResponsible, addManualResponsible,
    normalResponsibles,
  } from '../lib/stores/app.svelte';
  import { copyText } from '../lib/utils/copy';

  let { onOpenShare } = $props<{ onOpenShare: () => void }>();

  let copyOk = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  let respPickerOpen = $state(false);
  let respFilter = $state('');

  const list = $derived(mergedProducts());
  const grouped = $derived(groupedProducts());
  const preview = $derived(templatePreviewHtml());
  const mergedText = $derived(buildMergedText(true));
  const mergedPlain = $derived(buildMergedText(false));

  // 模块 E：选择变化时防抖同步负责人
  $effect(() => {
    app.mergeSelectedIds.length;
    scheduleAutoRespSync();
  });

  const filteredResponsibles = $derived.by(() => {
    const q = respFilter.trim().toLowerCase();
    const all = normalResponsibles().map((r) => r.name);
    if (!q) return all;
    return all.filter((n) => n.toLowerCase().includes(q));
  });

  async function onCopy() {
    const ok = await copyText(mergedPlain, false);
    copyOk = ok;
    pushToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error', 1600);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyOk = false; }, 1800);
  }

  function setMergeSummary(v: boolean) {
    app.settings.mergeMultiProductSummary = v;
    scheduleSave();
  }

  function pickResp(name: string) {
    addManualResponsible(name);
    respPickerOpen = false;
    respFilter = '';
    pushToast(`已添加 @${name}`);
  }
</script>

<section class="box merge-box">
  <div class="box-head">
    <span class="box-title">📊 多产品汇总</span>
    <span class="box-badge">已选 {list.length} / {app.products.length}</span>
  </div>

  {#if app.settings.showMainTips !== false}
    <div class="merge-supplier-tip">
      只能选择 <b>同供应商 + 同客户</b> 的产品进行汇总。
    </div>
  {/if}

  <div class="merge-actions">
    <button
      onclick={selectAllSameCombination}
      disabled={!currentProduct()?.supplier}
    >选中本组合全部</button>
    <button onclick={clearMergeSelection} disabled={!app.mergeSelectedIds.length}>清空选择</button>
  </div>

  {#each grouped as grp (grp.supplier + '|' + grp.customer)}
    <div class="merge-group">
      <div class="merge-group-title">
        {grp.supplier || '（未填供应商）'}
        {#if grp.customer} · {grp.customer}{/if}
      </div>
      <div class="merge-list">
        {#each grp.list as p (p.id)}
          <label
            class="merge-item"
            class:selected={isMergeSelected(p.id)}
            class:disabled={!canSelectProduct(p)}
          >
            <input
              type="checkbox"
              checked={isMergeSelected(p.id)}
              disabled={!canSelectProduct(p)}
              onchange={() => toggleMergeSelect(p.id)}
            />
            <span class="pname">
              {p.name}{#if p.isSample}<span class="product-sample"> · 样品</span>{/if}
            </span>
            <span class="meta">来料 {p.incomingQty || 0} · 抽检 {getProductSamplingDisplay(p)}</span>
          </label>
        {/each}
      </div>
    </div>
  {/each}
  {#if !app.products.length}<div class="transfer-empty">还没有产品</div>{/if}

  {#if list.length}
    <div class="merge-soft-field">
      <span class="field-tag">临时处理方式</span>
      <input
        value={app.settings.tempHandling}
        maxlength="80"
        placeholder="如：返工、让步接收…"
        oninput={(e) => {
          app.settings.tempHandling = (e.target as HTMLInputElement).value;
          scheduleSave();
        }}
      />
    </div>
  {:else}
    <div class="merge-soft-field merge-soft-field--hint">
      <span class="field-tag">临时处理方式</span>
      <span class="hint-text">请先选择参与汇总的产品</span>
    </div>
  {/if}

  <!-- 模块 E：负责人标签区 -->
  {#if list.length}
    <div class="merge-soft-field" style="align-items:flex-start;flex-wrap:wrap">
      <span class="field-tag" style="padding-top:6px">负责人</span>
      <div style="flex:1;display:flex;flex-wrap:wrap;gap:5px;min-width:0">
        {#if app.settings.responsiblePersons.length}
          {#each app.settings.responsiblePersons as name (name)}
            <span class="resp-tag">
              @{name}
              <button
                class="resp-tag-x"
                title="移除"
                onclick={() => rejectAutoResponsible(name)}
              >✕</button>
            </span>
          {/each}
        {:else}
          <span style="font-size:12px;color:var(--c-text-3);padding:4px 0">
            暂无（选择产品后自动带出）
          </span>
        {/if}
        <button
          class="mini-batch-btn"
          style="padding:3px 9px;font-size:11.5px"
          onclick={() => (respPickerOpen = !respPickerOpen)}
        >＋ 添加</button>
      </div>
    </div>
    {#if respPickerOpen}
      <div class="resp-panel" style="margin:4px 0 8px">
        <div class="panel-title">选择负责人</div>
        <div class="panel-toolbar">
          <input
            bind:value={respFilter}
            placeholder="🔍 过滤…"
            oninput={(e) => (respFilter = (e.target as HTMLInputElement).value)}
          />
        </div>
        {#if filteredResponsibles.length}
          {#each filteredResponsibles as name (name)}
            <button
              type="button"
              class="responsible-item"
              style="width:100%;text-align:left;background:none;border:none"
              onclick={() => pickResp(name)}
            >
              <span>@{name}</span>
            </button>
          {/each}
        {:else}
          <div class="empty-tip">没有匹配的负责人，请到「设置 → 数据预设 → 负责人」中添加。</div>
        {/if}
      </div>
    {/if}
  {/if}

  <div class="template-label">汇总模板</div>
  <textarea
    class="template-textarea"
    bind:value={app.settings.summaryTemplate}
    oninput={() => scheduleSave()}
  ></textarea>
  <div class="template-preview">{@html preview}</div>
  {#if app.settings.showMainTips !== false}
    <div class="template-hint">
      <code>{'{customer}'}</code> 客户 · <code>{'{supplier}'}</code> 供应商 ·
      <code>{'{process}'}</code> 工序 · <code>{'{lotLines}'}</code> 料号+来料 ·
      <code>{'{samplingLine}'}</code> 抽检 · <code>{'{summary}'}</code> 汇总 ·
      <code>{'{tempHandling}'}</code> 处理 · <code>{'{responsible}'}</code> 负责人
    </div>
  {/if}

  <div class="output-head">
    <span class="label">合并结果预览</span>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <label class="mini-switch-label">
        <input
          type="checkbox"
          checked={app.settings.mergeMultiProductSummary !== false}
          onchange={(e) => setMergeSummary((e.target as HTMLInputElement).checked)}
        />
        <span>合并描述</span>
      </label>
      <button class="copy-btn" class:copied={copyOk} disabled={!mergedPlain} onclick={onCopy}>
        {copyOk ? '✓ 已复制' : '📋 复制'}
      </button>
      <button class="share-btn" disabled={!mergedPlain} onclick={onOpenShare}>📤 分享</button>
    </div>
  </div>
  <div class="output-text" class:is-empty={!mergedText}>
    {mergedText || '请先选择参与汇总的产品（同供应商 + 同客户）'}
  </div>
</section>
