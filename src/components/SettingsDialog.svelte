<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, setSetting, setExperience, setThemeMode,
    storage,
    cleanupOrphanData, clearLocalCache, scheduleSave, clearOperationLogs,
    MANUAL_SECTIONS,
    setShowTopNavText, setShowMainTips, setShowZeroQty,
    setMergeMultiProductSummary, setShowRecognizeTools,
    setFontSize, setAnimationLevel,
    fontSizeLabel, animationLevelLabel, experienceLevelLabel, experienceHint,
  } from '../lib/stores/app.svelte';
  import ExportDialog from './ExportDialog.svelte';
  import ImportDialog from './ImportDialog.svelte';

  let { open = $bindable(false), onOpenDataPresets } = $props<{
    open: boolean;
    onOpenDataPresets: () => void;
  }>();

  let tab = $state('general');
  let exportOpen = $state(false);
  let importOpen = $state(false);

  const tabs = [
    { key: 'general', label: '通用' },
    { key: 'display', label: '显示' },
    { key: 'backup', label: '备份与恢复' },
    { key: 'logs', label: '操作日志' },
    { key: 'manual', label: '📖 说明书' },
    { key: 'about', label: '关于' },
  ];

  let manualActive = $state(MANUAL_SECTIONS[0].id);
  const currentManualHtml = $derived.by(
    () => MANUAL_SECTIONS.find((s) => s.id === manualActive)?.content || '',
  );

  function factoryReset() {
    if (!confirm('⚠️ 恢复出厂设置会清空所有数据，确定继续？')) return;
    if (!confirm('再次确认：此操作不可恢复。')) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(storage.ROOT_KEY) || k === storage.THEME_KEY || k === storage.WORK_TIME_KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    location.reload();
  }
</script>

<Dialog bind:open title="⚙️ 设置" subtitle="通用 · 显示 · 备份与恢复 · 操作日志 · 说明书 · 关于" wide>
  <div class="dp-tabs-wrap">
    {#each tabs as t (t.key)}
      <button class="dp-tab" class:active={tab === t.key} onclick={() => (tab = t.key)}>{t.label}</button>
    {/each}
  </div>

  <div class="dialog-list">
    {#if tab === 'general'}
      <div class="theme-toggle">
        <button class:active={app.themeMode === 'auto'} onclick={() => setThemeMode('auto')}>🌗 跟随系统</button>
        <button class:active={app.themeMode === 'light'} onclick={() => setThemeMode('light')}>☀️ 浅色</button>
        <button class:active={app.themeMode === 'dark'} onclick={() => setThemeMode('dark')}>🌙 深色</button>
      </div>
      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.compactMode}
               onchange={(e) => setSetting('compactMode', (e.target as HTMLInputElement).checked)} />
        <span>📐 界面紧凑模式</span>
      </label>
      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.confirmBeforeDelete}
               onchange={(e) => setSetting('confirmBeforeDelete', (e.target as HTMLInputElement).checked)} />
        <span>🗑 删除前二次确认</span>
      </label>
      <button class="backup-action" onclick={onOpenDataPresets}>📚 打开数据预设</button>
    {/if}

    {#if tab === 'display'}
      <div class="setting-row">
        <label>✨ 体验等级（当前：{experienceLevelLabel()}）</label>
        <div class="theme-toggle" style="margin-bottom:0">
          <button class:active={app.settings.experienceLevel === 'auto'} onclick={() => setExperience('auto')}>自动</button>
          <button class:active={app.settings.experienceLevel === 'elegant'} onclick={() => setExperience('elegant')}>优雅</button>
          <button class:active={app.settings.experienceLevel === 'standard'} onclick={() => setExperience('standard')}>标准</button>
          <button class:active={app.settings.experienceLevel === 'compat'} onclick={() => setExperience('compat')}>兼容</button>
        </div>
        <p class="backup-note" style="margin-top:6px">{experienceHint()}</p>
      </div>

      <div class="setting-row">
        <label>🔤 全局字体大小（当前：{fontSizeLabel()}）</label>
        <div class="theme-toggle" style="margin-bottom:0">
          {#each ['small', 'standard', 'large'] as k (k)}
            <button class:active={app.settings.fontSize === k} onclick={() => setFontSize(k as any)}>
              {k === 'small' ? '小' : k === 'standard' ? '标准' : '大'}
            </button>
          {/each}
        </div>
      </div>

      <div class="setting-row">
        <label>🎬 动画强度（当前：{animationLevelLabel()}）</label>
        <div class="theme-toggle" style="margin-bottom:0">
          {#each ['normal', 'reduced', 'none'] as k (k)}
            <button class:active={app.settings.animationLevel === k} onclick={() => setAnimationLevel(k as any)}>
              {k === 'normal' ? '标准' : k === 'reduced' ? '柔和' : '关闭'}
            </button>
          {/each}
        </div>
      </div>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showTopNavText !== false}
               onchange={(e) => setShowTopNavText((e.target as HTMLInputElement).checked)} />
        <span>🔤 显示导航栏文字描述</span>
        <small>{app.settings.showTopNavText !== false ? '已显示' : '仅显示图标（更紧凑）'}</small>
      </label>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showMainTips !== false}
               onchange={(e) => setShowMainTips((e.target as HTMLInputElement).checked)} />
        <span>💬 显示主界面文字描述</span>
        <small>{app.settings.showMainTips !== false ? '已显示' : '已隐藏（更紧凑）'}</small>
      </label>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showZeroQtyItems !== false}
               onchange={(e) => setShowZeroQty((e.target as HTMLInputElement).checked)} />
        <span>📊 汇总与预览中显示数量为 0 的分类</span>
        <small>{app.settings.showZeroQtyItems !== false ? '已开启' : '已隐藏'}</small>
      </label>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.mergeMultiProductSummary !== false}
               onchange={(e) => setMergeMultiProductSummary((e.target as HTMLInputElement).checked)} />
        <span>📊 多产品汇总时合并「问题描述」</span>
        <small>{app.settings.mergeMultiProductSummary !== false ? '按分组名聚合，适合关联分析' : '每个产品独立一行，适合逐料号追溯'}</small>
      </label>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showRecognizeTools !== false}
               onchange={(e) => setShowRecognizeTools((e.target as HTMLInputElement).checked)} />
        <span>🛠 显示识别工具</span>
        <small>{app.settings.showRecognizeTools !== false ? '已开启' : '已隐藏'}</small>
      </label>
      <p class="backup-note">包含语音输入与图片识别两个面板。</p>
    {/if}

    {#if tab === 'backup'}
      <p class="backup-note">导出时可选择要包含的模块；导入合并模式会跳过重复项。</p>
      <button class="backup-action" onclick={() => (exportOpen = true)}>💾 导出数据</button>
      <button class="backup-action" onclick={() => (importOpen = true)}>📥 导入数据</button>

      <div class="sub-section">
        <button class="backup-action" onclick={() => cleanupOrphanData()}>🧹 一键清理孤儿数据</button>
        <button class="backup-action" onclick={() => clearLocalCache()}>🧽 清理本地缓存</button>
        <button class="backup-action danger" onclick={factoryReset}>⚠️ 恢复出厂设置</button>
      </div>
    {/if}

    {#if tab === 'logs'}
      <div class="panel-head-row">
        <span class="panel-head-text">操作日志（最近 50 条）</span>
        <button class="mini-batch-btn" onclick={clearOperationLogs}>清空</button>
      </div>
      <div class="log-list">
        {#if !app.operationLogs.length}
          <div class="transfer-empty">暂无操作记录</div>
        {:else}
          {#each app.operationLogs as log (log.id)}
            <div class="log-item">
              <span class="log-time">{new Date(log.at).toLocaleTimeString()}</span>
              <span>{log.text}</span>
            </div>
          {/each}
        {/if}
      </div>
    {/if}

    {#if tab === 'manual'}
      <div class="manual-layout-vertical">
        <div class="manual-tabs-wrap">
          <div class="manual-tabs-scroll">
            {#each MANUAL_SECTIONS as sec (sec.id)}
              <button class="manual-tab" class:active={manualActive === sec.id}
                      onclick={() => (manualActive = sec.id)}>{sec.title}</button>
            {/each}
          </div>
        </div>
        <article class="manual-content">{@html currentManualHtml}</article>
      </div>
    {/if}

    {#if tab === 'about'}
      <p class="backup-note"><b>版本：</b>v3.5（Svelte 5 重构版）</p>
      <p class="backup-note">本版本使用 Svelte 5 编译时框架，运行时开销极低，产物体积缩小 60%+。</p>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>关闭</button>
  </div>
</Dialog>

<ExportDialog bind:open={exportOpen} />
<ImportDialog bind:open={importOpen} />
