<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, setSetting, setExperience, setThemeMode, applyFontSize,
    pushToast, storage, applyPayload, effectiveLevel, autoLevel,
    cleanupOrphanData, clearLocalCache
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false), onOpenDataPresets } = $props<{
    open: boolean;
    onOpenDataPresets: () => void;
  }>();

  let tab = $state('general');

  const tabs = [
    { key: 'general', label: '通用' },
    { key: 'display', label: '显示' },
    { key: 'backup', label: '备份与恢复' },
    { key: 'about', label: '关于' },
    { key: 'manual', label: '📖 说明书' }
  ];

  const MANUAL_SECTIONS = [
    { id: 'quickstart', title: '第一章 · 快速开始', content: '<h4>快速开始</h4><p>请在左侧添加产品，然后在分组内添加分类并录入数量。</p>' },
    { id: 'product', title: '第二章 · 产品管理', content: '<h4>产品管理</h4><p>可以添加、重命名、复制和删除产品。</p>' },
    { id: 'group', title: '第三章 · 分组与分类', content: '<h4>分组与分类</h4><p>可以添加分组和分类，支持批量添加和排序。</p>' },
    { id: 'preset', title: '第四章 · 数据预设', content: '<h4>数据预设</h4><p>可以设置客户、供应商、负责人等预设数据。</p>' },
    { id: 'merge', title: '第五章 · 多产品汇总', content: '<h4>多产品汇总</h4><p>选择同供应商同客户的产品进行汇总。</p>' },
    { id: 'work', title: '第六章 · 工时计算', content: '<h4>工时计算</h4><p>可以计算工作时长和加班时长。</p>' },
    { id: 'io', title: '第七章 · 导入导出', content: '<h4>导入导出</h4><p>支持导出 JSON 和导入 JSON/JS 文件。</p>' },
    { id: 'shortcut', title: '第八章 · 快捷键', content: '<h4>快捷键</h4><p>Ctrl+Z 撤回，Ctrl+Shift+Z 恢复。</p>' },
    { id: 'faq', title: '第九章 · 常见问题', content: '<h4>常见问题</h4><p>数据保存在浏览器本地存储中。</p>' }
  ];

  let manualActive = $state(MANUAL_SECTIONS[0].id);

  const currentManualHtml = $derived.by(() => {
    const sec = MANUAL_SECTIONS.find(s => s.id === manualActive);
    return sec ? sec.content : '';
  });

  function exportData() {
    const payload = {
      app: 'category-counts',
      version: 5,
      exportedAt: new Date().toISOString(),
      products: app.products,
      globalPresets: app.globalPresets,
      mergeSelectedIds: app.mergeSelectedIds,
      currentProductId: app.currentProductId,
      dataPresets: app.dataPresets,
      settings: app.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `抽检数量统计_${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    pushToast('已导出');
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (!data || typeof data !== 'object') throw new Error('无效数据');
          if (!confirm('合并导入？现有数据保留，重复项跳过。')) return;
          applyPayload(data);
          pushToast('导入完成');
        } catch (e: any) {
          pushToast('导入失败：' + (e?.message || '未知错误'), 'error');
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  function factoryReset() {
    if (!confirm('⚠️ 恢复出厂设置会清空所有数据，确定继续？')) return;
    if (!confirm('再次确认：此操作不可恢复。')) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(storage.ROOT_KEY) || k === storage.THEME_KEY || k === storage.WORK_TIME_KEY)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    location.reload();
  }
</script>

<Dialog bind:open title="⚙️ 设置" subtitle="通用 · 显示 · 备份与恢复 · 说明书 · 关于" wide>
  <div class="dp-tabs-wrap">
    {#each tabs as t (t.key)}
      <button class="dp-tab" class:active={tab === t.key} onclick={() => tab = t.key}>{t.label}</button>
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
        <label>✨ 体验等级（当前：{effectiveLevel()}）</label>
        <div class="theme-toggle" style="margin-bottom:0">
          <button class:active={app.settings.experienceLevel === 'auto'} onclick={() => setExperience('auto')}>自动</button>
          <button class:active={app.settings.experienceLevel === 'elegant'} onclick={() => setExperience('elegant')}>优雅</button>
          <button class:active={app.settings.experienceLevel === 'standard'} onclick={() => setExperience('standard')}>标准</button>
          <button class:active={app.settings.experienceLevel === 'compat'} onclick={() => setExperience('compat')}>兼容</button>
        </div>
      </div>

      <div class="setting-row">
        <label>🔤 全局字体大小</label>
        <div class="theme-toggle" style="margin-bottom:0">
          {#each ['small', 'standard', 'large'] as k (k)}
            <button class:active={app.settings.fontSize === k}
                    onclick={() => { setSetting('fontSize', k as any); applyFontSize(); }}>
              {k === 'small' ? '小' : k === 'standard' ? '标准' : '大'}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if tab === 'backup'}
      <p class="backup-note">导出时可选择要包含的模块；导入合并模式会跳过重复项。</p>
      <button class="backup-action" onclick={exportData}>💾 导出全部数据</button>
      <button class="backup-action" onclick={importData}>📥 导入数据（合并）</button>

      <button class="backup-action" onclick={() => cleanupOrphanData()}>🧹 一键清理孤儿数据</button>
      <button class="backup-action" onclick={() => clearLocalCache()}>🧽 清理本地缓存</button>

      <div class="sub-section">
        <button class="backup-action danger" onclick={factoryReset}>⚠️ 恢复出厂设置</button>
      </div>
    {/if}

    {#if tab === 'manual'}
      <div class="manual-layout-vertical">
        <div class="manual-tabs-wrap">
          <div class="manual-tabs-scroll">
            {#each MANUAL_SECTIONS as sec (sec.id)}
              <button class="manual-tab" class:active={manualActive === sec.id} onclick={() => manualActive = sec.id}>{sec.title}</button>
            {/each}
          </div>
        </div>
        <article class="manual-content">{@html currentManualHtml}</article>
      </div>
    {/if}

    {#if tab === 'about'}
      <p class="backup-note"><b>版本：</b>v3.1（Svelte 5 重构版）</p>
      <p class="backup-note">
        本版本使用 Svelte 5 编译时框架，运行时开销远低于虚拟 DOM 方案。
      </p>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => open = false}>关闭</button>
  </div>
</Dialog>
