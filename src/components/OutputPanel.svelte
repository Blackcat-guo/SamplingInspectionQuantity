<script lang="ts">
  import {
    app, currentProduct, setProductField, pushToast,
    outputText, outputCopyText,
  } from '../lib/stores/app.svelte';
  import { copyText } from '../lib/utils/copy';

  const p = $derived(currentProduct());
  const text = $derived(outputText());
  const plain = $derived(outputCopyText());

  let copyOk = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function onCopy() {
    if (!plain) { pushToast('暂无内容可复制', 'error'); return; }
    const ok = await copyText(plain, false);
    copyOk = ok;
    pushToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error', 1600);
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyOk = false; }, 1800);
  }
</script>

{#if p}
  <section class="box output-box">
    <div class="box-head">
      <span class="box-title">📄 本产品汇总</span>
      <button class="copy-btn" class:copied={copyOk} disabled={!plain} onclick={onCopy}>
        {copyOk ? '✓ 已复制' : '📋 复制'}
      </button>
    </div>
    <div class="info-grid" style="margin-bottom:8px">
      <div class="info-field">
        <div class="field-label">前段</div>
        <input value={p.prefix || ''} maxlength="60" placeholder="可选"
               oninput={(e) => setProductField('prefix', (e.target as HTMLInputElement).value)} />
      </div>
      <div class="info-field">
        <div class="field-label">后段</div>
        <input value={p.suffix || ''} maxlength="60" placeholder="可选"
               oninput={(e) => setProductField('suffix', (e.target as HTMLInputElement).value)} />
      </div>
    </div>
    <div class="output-text" class:is-empty={!text}>
      {text || '暂无数据，请先添加分组与分类'}
    </div>
  </section>
{/if}
