<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { app, buildPartialExport, pushToast, logOperation } from '../lib/stores/app.svelte';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let incProducts = $state(true);
  let incPresets = $state(true);
  let incSettings = $state(false);

  function doExport() {
    if (!incProducts && !incPresets && !incSettings) {
      pushToast('请至少勾选一个模块', 'error');
      return;
    }
    const text = buildPartialExport({
      products: incProducts,
      dataPresets: incPresets,
      settings: incSettings,
    });
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `抽检_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    logOperation('导出数据');
    pushToast('已导出');
    open = false;
  }
</script>

<Dialog bind:open title="💾 导出数据" subtitle="选择要包含的模块；合并导入会按名称去重。">
  <div class="dialog-list">
    <label class="display-toggle">
      <input type="checkbox" bind:checked={incProducts} />
      <span>📦 产品数据</span>
      <small>{app.products.length} 个产品</small>
    </label>
    <label class="display-toggle">
      <input type="checkbox" bind:checked={incPresets} />
      <span>📚 数据预设</span>
      <small>{app.dataPresets.customers.length} 客户 · {app.dataPresets.suppliers.length} 供应商</small>
    </label>
    <label class="display-toggle">
      <input type="checkbox" bind:checked={incSettings} />
      <span>⚙️ 全局设置</span>
      <small>含模板、主题、体验等级</small>
    </label>
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" onclick={doExport}>导出</button>
  </div>
</Dialog>