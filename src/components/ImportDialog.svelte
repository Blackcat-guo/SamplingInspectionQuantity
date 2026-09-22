<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    importPartialPayload, summarizeImport, detectImportModules,
    parseJsData, pushToast, logOperation,
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let raw: any = $state(null);
  let fileName = $state('');
  let summary = $state('');

  let incProducts = $state(false);
  let incPresets = $state(false);
  let incSettings = $state(false);
  let mode = $state<'merge' | 'overwrite'>('merge');

  function reset() {
    raw = null; fileName = ''; summary = '';
    incProducts = false; incPresets = false; incSettings = false;
    mode = 'merge';
  }
  function pick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.js,application/json,text/javascript';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result);
          const isJs = /\.js$/i.test(f.name);
          raw = isJs ? parseJsData(text) : JSON.parse(text);
          fileName = f.name;
          summary = summarizeImport(raw);
          const m = detectImportModules(raw);
          incProducts = m.products;
          incPresets = m.dataPresets;
          incSettings = m.settings;
        } catch (e: any) {
          pushToast('解析失败：' + (e?.message || '未知错误'), 'error', 3200);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }
  function doImport() {
    if (!raw) return;
    if (!incProducts && !incPresets && !incSettings) { pushToast('请至少勾选一个模块', 'error'); return; }
    if (mode === 'overwrite') {
      if (!confirm('⚠️ 覆盖模式会替换现有数据，确定继续？')) return;
      if (!confirm('再次确认：此操作不可恢复。')) return;
    }
    try {
      const res = importPartialPayload(raw, {
        products: incProducts, dataPresets: incPresets, settings: incSettings, mode,
      });
      logOperation(`导入：新增 ${res.added} · 替换 ${res.replaced}`);
      pushToast(`导入完成：新增 ${res.added} · 替换 ${res.replaced}`);
      open = false;
      reset();
    } catch (e: any) {
      pushToast('导入失败：' + (e?.message || '未知错误'), 'error', 3200);
    }
  }
</script>

<Dialog bind:open title="📥 导入数据" subtitle="支持 .json 与 .js；字段与 counts.html 完全兼容。">
  <div class="dialog-list">
    <button class="backup-action" onclick={pick}>📎 选择文件</button>

    {#if fileName}
      <p class="backup-note" style="margin-top:10px">
        <b>文件：</b>{fileName}<br />
        <b>摘要：</b>{summary}
      </p>
      <div class="sub-section">
        <div class="panel-head-row"><span class="panel-head-text">选择要导入的模块</span></div>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incProducts} disabled={!raw?.products} />
          <span>📦 产品数据</span>
          <small>{raw?.products?.length || 0} 个产品</small>
        </label>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incPresets} disabled={!raw?.dataPresets} />
          <span>📚 数据预设</span>
          <small>客户 / 供应商 / 特殊分组</small>
        </label>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incSettings} disabled={!raw?.settings} />
          <span>⚙️ 全局设置</span>
          <small>模板 / 主题 / 体验等级</small>
        </label>
        <div class="panel-head-row" style="margin-top:12px">
          <span class="panel-head-text">导入模式</span>
        </div>
        <div class="theme-toggle">
          <button class:active={mode === 'merge'} onclick={() => (mode = 'merge')}>合并（去重）</button>
          <button class:active={mode === 'overwrite'} onclick={() => (mode = 'overwrite')}>覆盖（替换）</button>
        </div>
        {#if mode === 'overwrite'}
          <p class="backup-note" style="color:var(--c-danger);margin-top:8px">
            ⚠️ 覆盖模式会用文件内容替换现有数据。负责人 ID 引用会自动清理悬空项。
          </p>
        {/if}
      </div>
    {/if}
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" disabled={!raw} onclick={doImport}>确认导入</button>
  </div>
</Dialog>
