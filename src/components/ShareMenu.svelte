<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    mergedProducts, buildMergedText, pushToast, effectiveLevel,
  } from '../lib/stores/app.svelte';
  import { copyText } from '../lib/utils/copy';
  import {
    supportsSystemShare, shareSystem, shareToApp, APP_LABELS,
  } from '../lib/utils/share';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  const canShare = $derived(mergedProducts().length > 0);
  const shareable = $derived(supportsSystemShare());

  function getText(): string { return buildMergedText(false); }

  async function doSystem() {
    if (!shareable) { pushToast('当前浏览器不支持系统分享', 'error', 2200); return; }
    const text = getText();
    open = false;
    const r = await shareSystem(text);
    if (r === 'ok') pushToast('已分享');
    else if (r === 'abort') { /* 用户取消，静默 */ }
    else pushToast('分享失败，请改用其他方式', 'error', 2400);
  }
  async function doApp(appKey: string) {
    const text = getText();
    if (!text) { pushToast('没有可分享的文本', 'error'); return; }
    const compat = effectiveLevel() === 'compat';
    const res = await shareToApp(appKey, text, compat);
    open = false;
    pushToast(res.message, res.ok ? 'success' : 'error', res.ok ? 2600 : 3200);
  }
  async function doCopy() {
    const text = getText();
    const ok = await copyText(text, effectiveLevel() === 'compat');
    open = false;
    pushToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error', 1800);
  }
</script>

<Dialog bind:open title="📤 选择分享方式"
        subtitle="微信 / 钉钉 / 飞书等第三方 App 不开放“直接传入文本”的 URL Scheme，因此选择后会先复制到剪贴板，再尝试打开目标 App，请手动粘贴。">
  <div class="dialog-list">
    <button type="button" class="share-option" class:disabled={!shareable}
            disabled={!shareable || !canShare} onclick={() => { if (shareable) doSystem(); }}>
      <span class="so-icon">📱</span>
      <span class="so-label">
        系统分享（推荐）
        <div class="so-hint">{shareable ? '调起系统分享面板，可直接选目标 App' : '当前浏览器不支持 Web Share API'}</div>
      </span>
    </button>

    {#each ['weixin', 'dingtalk', 'feishu', 'qq', 'mail'] as key (key)}
      <button type="button" class="share-option" disabled={!canShare} onclick={() => doApp(key)}>
        <span class="so-icon">
          {key === 'weixin' ? '💬' : key === 'dingtalk' ? '💼' : key === 'feishu' ? '🚀' : key === 'qq' ? '🐧' : '📧'}
        </span>
        <span class="so-label">
          {APP_LABELS[key] || key}
          <div class="so-hint">复制并尝试打开 {APP_LABELS[key] || key}</div>
        </span>
      </button>
    {/each}

    <button type="button" class="share-option" disabled={!canShare} onclick={doCopy}>
      <span class="so-icon">🔗</span>
      <span class="so-label">
        仅复制到剪贴板
        <div class="so-hint">不跳转，只把文本复制好</div>
      </span>
    </button>
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>关闭</button>
  </div>
</Dialog>
