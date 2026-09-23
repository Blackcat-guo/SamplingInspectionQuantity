<script lang="ts">
  import { onMount } from 'svelte';
  import {
    initApp, app, effectiveLevel, currentProduct,
    collapseAllGroups, expandAllGroups,
  } from './lib/stores/app.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import TopNav from './components/TopNav.svelte';
  import ProductInfo from './components/ProductInfo.svelte';
  import PresetPanel from './components/PresetPanel.svelte';
  import GroupList from './components/GroupList.svelte';
  import MergePanel from './components/MergePanel.svelte';
  import OutputPanel from './components/OutputPanel.svelte';
  import SpeechInput from './components/SpeechInput.svelte';
  import RecognizePanel from './components/RecognizePanel.svelte';
  import WorkTimeDialog from './components/WorkTimeDialog.svelte';
  import SettingsDialog from './components/SettingsDialog.svelte';
  import DataPresetsDialog from './components/DataPresetsDialog.svelte';
  import AddProductDialog from './components/AddProductDialog.svelte';
  import ShareMenu from './components/ShareMenu.svelte';
  import Toast from './components/Toast.svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';

  let cleanup: (() => void) | null = null;
  onMount(() => {
    cleanup = initApp();
    return () => { if (cleanup) cleanup(); };
  });

  /* ============================================================
     体验等级 class 切换
     ============================================================ */
  $effect(() => {
    const el = document.documentElement;
    const lv = effectiveLevel();
    el.classList.toggle('exp-elegant', lv === 'elegant');
    el.classList.toggle('exp-standard', lv === 'standard');
    el.classList.toggle('exp-compat', lv === 'compat');
    el.classList.toggle('elegant-mode', lv === 'elegant');
    el.classList.toggle('compat-mode', lv === 'compat');
    el.classList.toggle('compact-mode', app.settings.compactMode === true);
    el.classList.toggle('no-animation', app.settings.animationLevel === 'none');
    el.classList.toggle('anim-reduced', app.settings.animationLevel === 'reduced');
  });

  /* ============================================================
     ★ G2：弹窗互斥管理（settings / dataPresets 二选一）
     ============================================================ */
  let settingsOpen = $state(false);
  let dataPresetsOpen = $state(false);
  let addProductOpen = $state(false);
  let workTimeOpen = $state(false);
  let shareMenuOpen = $state(false);

  function openSettings() {
    dataPresetsOpen = false;
    settingsOpen = true;
  }
  function openDataPresets() {
    settingsOpen = false;
    dataPresetsOpen = true;
  }
  function switchDialog(target: 'settings' | 'dataPresets') {
    settingsOpen = false;
    dataPresetsOpen = false;
    queueMicrotask(() => {
      if (target === 'settings') settingsOpen = true;
      else dataPresetsOpen = true;
    });
  }

  /* ============================================================
     ★ F2：全局快捷键（Ctrl+[ 折叠全部 / Ctrl+] 展开全部）
     ============================================================ */
  $effect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (e.key === '[') {
        e.preventDefault();
        collapseAllGroups();
      } else if (e.key === ']') {
        e.preventDefault();
        expandAllGroups();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  /* ============================================================
     ★ F4：草稿保存提示（3 秒内显示）
     ============================================================ */
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(t);
  });
  const showSaveHint = $derived(
    app.lastSavedAt > 0 && now - app.lastSavedAt < 3000,
  );
</script>

<div class="layout"
     class:exp-elegant={effectiveLevel() === 'elegant'}
     class:exp-standard={effectiveLevel() === 'standard'}
     class:exp-compat={effectiveLevel() === 'compat'}
     class:compat-mode={effectiveLevel() === 'compat'}
     class:compact-mode={app.settings.compactMode}
     class:no-animation={app.settings.animationLevel === 'none'}
     class:anim-reduced={app.settings.animationLevel === 'reduced'}>

  <Sidebar
    onOpenAddProduct={() => (addProductOpen = true)}
    onOpenSettings={openSettings}
  />

  {#if app.sidebarOpen}
    <div class="overlay show" onclick={() => (app.sidebarOpen = false)} role="presentation"></div>
  {/if}

  <main class="main">
    <TopNav
      onOpenSidebar={() => (app.sidebarOpen = true)}
      onOpenDataPresets={openDataPresets}
      onOpenSettings={openSettings}
      onOpenWorkTime={() => (workTimeOpen = true)}
    />

    {#if !currentProduct()}
      <div class="app">
        <h1>📦 抽检数量统计</h1>
        <p class="tip">请先在左侧添加一个产品。</p>
      </div>
    {:else}
      <div class="app">
        <ProductInfo />
        <PresetPanel />
        <MergePanel onOpenShare={() => (shareMenuOpen = true)} />
        <OutputPanel />
        {#if app.settings.showRecognizeTools !== false}
          <SpeechInput />
          <RecognizePanel />
        {/if}
        <GroupList />
      </div>
    {/if}
  </main>

  <!-- ★ F4：草稿保存提示 -->
  {#if showSaveHint}
    <div class="save-hint" aria-live="polite">
      已自动保存 {new Date(app.lastSavedAt).toLocaleTimeString()}
    </div>
  {/if}
</div>

<WorkTimeDialog bind:open={workTimeOpen} />
<SettingsDialog
  bind:open={settingsOpen}
  onOpenDataPresets={() => switchDialog('dataPresets')}
/>
<DataPresetsDialog
  bind:open={dataPresetsOpen}
  onOpenSettings={() => switchDialog('settings')}
/>
<AddProductDialog bind:open={addProductOpen} />
<ShareMenu bind:open={shareMenuOpen} />
<Toast />
<ConfirmDialog />
