<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { app, buildPartialExport, pushToast, logOperation } from '../lib/stores/app.svelte';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let incProducts = $state(true);
  let incPresets = $state(true);
  let incSettings = $state(false);

  function pad(n: number) { return String(n).padStart(2, '0'); }
  function stamp() {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

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
    a.download = `抽检数量统计_部分数据_${stamp()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    logOperation('部分导出');
    pushToast('已导出');
    open = false;
  }
</script>

<Dialog bind:open title="💾 导出数据" subtitle="选择要包含的模块；数据格式与完整导出兼容。">
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
      <small>模板 / 主题 / 体验等级</small>
    </label>
    <p class="backup-note" style="margin-top:10px">
      产品数据会一同打包 globalPresets / mergeSelectedIds / currentProductId，保证导入后关联完整。
    </p>
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" onclick={doExport}>导出选中内容</button>
  </div>
</Dialog>
