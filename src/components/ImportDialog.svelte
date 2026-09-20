<script lang="ts">
  import Dialog from './Dialog.svelte';
  import {
    importPartialPayload, summarizeImport, pushToast, logOperation,
    parseJsData,
  } from '../lib/stores/app.svelte';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let raw: any = $state(null);
  let fileName = $state('');
  let summary = $state('');

  let incProducts = $state(true);
  let incPresets = $state(true);
  let incSettings = $state(false);
  let mode = $state<'merge' | 'overwrite'>('merge');

  function reset() {
    raw = null;
    fileName = '';
    summary = '';
    incProducts = true;
    incPresets = true;
    incSettings = false;
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
          // 根据模块自动勾选
          const mod = raw?.modules;
          if (mod) {
            incProducts = !!mod.products;
            incPresets = !!mod.dataPresets;
            incSettings = !!mod.settings;
          } else {
            incProducts = true;
            incPresets = true;
            incSettings = false;
          }
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
    if (!incProducts && !incPresets && !incSettings) {
      pushToast('请至少勾选一个模块', 'error');
      return;
    }
    if (mode === 'overwrite') {
      if (!confirm('⚠️ 覆盖模式会替换现有数据，确定继续？')) return;
      if (!confirm('再次确认：此操作不可恢复。')) return;
    }
    try {
      const res = importPartialPayload(raw, {
        products: incProducts,
        dataPresets: incPresets,
        settings: incSettings,
        mode,
      });
      logOperation(`导入：新增 ${res.added} 项，替换 ${res.replaced} 项`);
      pushToast(`导入完成：新增 ${res.added} · 替换 ${res.replaced}`);
      open = false;
      reset();
    } catch (e: any) {
      pushToast('导入失败：' + (e?.message || '未知错误'), 'error', 3200);
    }
  }
</script>

<Dialog bind:open title="📥 导入数据" subtitle="支持 .json 与 .js（含 const data / export default / window.x）">
  <div class="dialog-list">
    <button class="backup-action" onclick={pick}>📎 选择文件</button>
    {#if fileName}
      <p class="backup-note"><b>文件：</b>{fileName}<br /><b>摘要：</b>{summary}</p>
      <div class="sub-section">
        <div class="panel-head-row"><span class="panel-head-text">选择要导入的模块</span></div>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incProducts} />
          <span>📦 产品数据</span>
        </label>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incPresets} />
          <span>📚 数据预设</span>
        </label>
        <label class="display-toggle">
          <input type="checkbox" bind:checked={incSettings} />
          <span>⚙️ 全局设置</span>
        </label>
        <div class="panel-head-row" style="margin-top:12px">
          <span class="panel-head-text">导入模式</span>
        </div>
        <div class="theme-toggle">
          <button class:active={mode === 'merge'} onclick={() => (mode = 'merge')}>合并（去重）</button>
          <button class:active={mode === 'overwrite'} onclick={() => (mode = 'overwrite')}>
            覆盖（替换）
          </button>
        </div>
      </div>
    {/if}
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" disabled={!raw} onclick={doImport}>导入</button>
  </div>
</Dialog>