<script lang="ts">
  import Dialog from './Dialog.svelte';

  let {
    open = $bindable(false),
    title = '',
    subtitle = '',
    initialText = '',
    placeholder = '每行一个，或用逗号/顿号/分号分隔',
    onConfirm,
  } = $props<{
    open: boolean;
    title?: string;
    subtitle?: string;
    initialText?: string;
    placeholder?: string;
    onConfirm: (text: string) => void;
  }>();

  let text = $state('');

  $effect(() => { if (open) text = initialText; });

  function confirm() {
    onConfirm?.(text);
    open = false;
  }
</script>

<Dialog bind:open {title} {subtitle} wide>
  <div class="dialog-list">
    <textarea
      bind:value={text}
      placeholder={placeholder}
      style="width:100%;min-height:140px;padding:11px;font-size:13.5px;line-height:1.7;border:1.5px solid var(--c-border);border-radius:11px;background:var(--c-surface);color:var(--c-text);outline:none;resize:vertical;font-family:inherit"
    ></textarea>
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" onclick={confirm}>确认</button>
  </div>
</Dialog>