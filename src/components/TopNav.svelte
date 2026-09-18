<script lang="ts">
  import { app } from '../lib/stores/app.svelte';

  let { onOpenSidebar, onOpenDataPresets, onOpenSettings, onOpenWorkTime } = $props<{
    onOpenSidebar: () => void;
    onOpenDataPresets: () => void;
    onOpenSettings: () => void;
    onOpenWorkTime: () => void;
  }>();

  const showText = $derived(app.settings.showTopNavText !== false);
</script>

<div class="main-top-actions" role="toolbar" aria-label="主界面快捷操作">
  <button class="icon-btn" class:icon-only={!showText} onclick={onOpenSidebar} title="打开产品列表">
    <span class="icon-symbol">☰</span>
    {#if showText}<span class="icon-label">列表</span>{/if}
  </button>
  <button class="icon-btn" class:icon-only={!showText} onclick={onOpenDataPresets} title="数据预设">
    <span class="icon-symbol">📚</span>
    {#if showText}<span class="icon-label">预设</span>{/if}
  </button>
  <button class="icon-btn" class:icon-only={!showText} onclick={onOpenSettings} title="设置">
    <span class="icon-symbol">⚙️</span>
    {#if showText}<span class="icon-label">设置</span>{/if}
  </button>
  <button class="icon-btn" class:icon-only={!showText} onclick={onOpenWorkTime} title="计算工时">
    <span class="icon-symbol">⏱️</span>
    {#if showText}<span class="icon-label">工时</span>{/if}
  </button>
</div>
