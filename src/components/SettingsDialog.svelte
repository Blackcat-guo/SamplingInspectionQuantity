<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    app, setSetting, setExperience, setThemeMode, applyFontSize,
    pushToast, storage, applyPayload, effectiveLevel, autoLevel,
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false), onOpenDataPresets } = $props<{
    open: boolean;
    onOpenDataPresets: () => void;
  }>();

  let tab = $state('general');

  const tabs = [
    { key: 'general', label: '通用' },
    { key: 'display', label: '显示' },
    { key: 'backup', label: '备份' },
    { key: 'about', label: '关于' },
  ];

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

<Dialog bind:open title="⚙️ 设置" subtitle="通用 · 显示 · 备份 · 关于" wide>
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

      <div class="setting-row">
        <label>⚠️ 批量添加确认阈值</label>
        <select value={String(app.settings.bulkAddConfirmThreshold)}
                onchange={(e) => setSetting('bulkAddConfirmThreshold', parseInt((e.target as HTMLSelectElement).value, 10))}>
          <option value="0">从不提示</option>
          <option value="3">3 条以上</option>
          <option value="5">5 条以上（推荐）</option>
          <option value="10">10 条以上</option>
        </select>
      </div>

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
        <small style="font-size:11px;color:var(--c-text-3)">
          自动模式当前判定为「{autoLevel() === 'compat' ? '低端' : '标准'}」。
        </small>
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

      <div class="setting-row">
        <label>🎬 动画强度</label>
        <div class="theme-toggle" style="margin-bottom:0">
          {#each ['normal', 'reduced', 'none'] as k (k)}
            <button class:active={app.settings.animationLevel === k}
                    onclick={() => setSetting('animationLevel', k as any)}>
              {k === 'normal' ? '标准' : k === 'reduced' ? '舒缓' : '关闭'}
            </button>
          {/each}
        </div>
      </div>

      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showTopNavText}
               onchange={(e) => setSetting('showTopNavText', (e.target as HTMLInputElement).checked)} />
        <span>🔤 显示导航栏文字</span>
      </label>
      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showMainTips}
               onchange={(e) => setSetting('showMainTips', (e.target as HTMLInputElement).checked)} />
        <span>💬 显示主界面文字描述</span>
      </label>
      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.showZeroQtyItems}
               onchange={(e) => setSetting('showZeroQtyItems', (e.target as HTMLInputElement).checked)} />
        <span>📊 汇总中显示数量为 0 的分类</span>
      </label>
      <label class="display-toggle">
        <input type="checkbox" checked={app.settings.mergeMultiProductSummary}
               onchange={(e) => setSetting('mergeMultiProductSummary', (e.target as HTMLInputElement).checked)} />
        <span>📊 多产品汇总时按分组名合并</span>
      </label>
    {/if}

    {#if tab === 'backup'}
      <p class="backup-note">导出时可选择要包含的模块；导入合并模式会跳过重复项。</p>
      <button class="backup-action" onclick={exportData}>💾 导出全部数据</button>
      <button class="backup-action" onclick={importData}>📥 导入数据（合并）</button>

      <label class="display-toggle" style="margin-top:6px">
        <input type="checkbox" checked={app.settings.autoBackup}
               onchange={(e) => setSetting('autoBackup', (e.target as HTMLInputElement).checked)} />
        <span>🔁 数据自动备份</span>
        <small>最近 3 个版本</small>
      </label>

      <div class="sub-section">
        <button class="backup-action danger" onclick={factoryReset}>⚠️ 恢复出厂设置</button>
      </div>
    {/if}

    {#if tab === 'about'}
      <p class="backup-note"><b>版本：</b>v3.1（Svelte 5 重构版）</p>
      <p class="backup-note">
        本版本使用 Svelte 5 编译时框架，运行时开销远低于虚拟 DOM 方案；
        单文件构建产物约 60~80KB（gzip 后约 25~35KB），比 Vue 版本减少 60%+。
      </p>
      <p class="backup-note">
        <b>数据存储位置：</b>浏览器 localStorage（键名以 <code>category_counts_v5</code> 开头）。
        清除浏览器数据会导致本地数据丢失，请定期导出备份。
      </p>
      <p class="backup-note">
        <b>分享能力：</b>合并结果支持系统分享（Web Share API）与微信 / 钉钉 / 飞书 / QQ / 邮件 URL Scheme；
        第三方 App 不开放传入文本接口，分享前会先复制到剪贴板。
      </p>
    {/if}
  </div>

  <div class="dialog-actions">
    <button class="cancel" onclick={() => open = false}>关闭</button>
  </div>
</Dialog>
