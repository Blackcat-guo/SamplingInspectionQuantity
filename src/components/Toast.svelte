<script lang="ts">
  import { app, dismissToast, runToastAction } from '../lib/stores/app.svelte';
</script>

<div class="toast-stack" aria-live="polite">
  {#each app.toasts as t (t.id)}
    <div class="toast" class:success={t.type === 'success'} class:error={t.type === 'error'}>
      <span style="flex:1">{t.msg}</span>
      {#if t.action}
        <button class="toast-action" onclick={() => runToastAction(t)}>{t.action.label}</button>
      {/if}
      <button class="toast-action" onclick={() => dismissToast(t.id)}>✕</button>
    </div>
  {/each}
</div>
