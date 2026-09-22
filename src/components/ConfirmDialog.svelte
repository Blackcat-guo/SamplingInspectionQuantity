<script lang="ts">
  import { confirmState, resolveConfirm } from '../lib/stores/app.svelte';

  let dontAsk = $state(false);
  $effect(() => { if (confirmState.show) dontAsk = false; });

  function confirm() { resolveConfirm(true, dontAsk); }
  function cancel() { resolveConfirm(false); }
</script>

{#if confirmState.show}
  <div class="dialog-overlay sub-dialog" role="presentation"
       onclick={(e) => { if (e.target === e.currentTarget) cancel(); }}>
    <div class="dialog-box" role="dialog" aria-modal="true">
      <h3>{confirmState.options.title}</h3>
      <p class="sub" style="white-space:pre-wrap">{confirmState.options.message}</p>
      {#if confirmState.options.showDontAsk}
        <label class="display-toggle" style="margin-bottom:10px">
          <input type="checkbox" bind:checked={dontAsk} />
          <span>不再提示</span>
        </label>
      {/if}
      <div class="dialog-actions">
        <button class="cancel" onclick={cancel}>
          {confirmState.options.cancelText || '取消'}
        </button>
        <button class={confirmState.options.danger ? 'danger' : 'primary'} onclick={confirm}>
          {confirmState.options.confirmText || '确定'}
        </button>
      </div>
    </div>
  </div>
{/if}
