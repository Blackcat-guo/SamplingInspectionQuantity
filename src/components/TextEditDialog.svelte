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
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  $effect(() => { if (open) text = initialText; });

  /* ★ v3.7.7 · C · textarea 自适应高度 */
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  }
  $effect(() => {
    if (open && textareaEl) {
      queueMicrotask(() => { if (textareaEl) autoResize(textareaEl); });
    }
  });

  function confirm() {
    onConfirm?.(text);
    open = false;
  }
</script>

<Dialog bind:open variant="sheet" {title} {subtitle} wide>
  <div class="dialog-list">
    <textarea
      bind:this={textareaEl}
      bind:value={text}
      {placeholder}
      oninput={(e) => autoResize(e.currentTarget as HTMLTextAreaElement)}
      style="width:100%;min-height:120px;max-height:300px;padding:11px;font-size:13.5px;line-height:1.7;
             border:1.5px solid var(--c-border);border-radius:11px;background:var(--c-surface);
             color:var(--c-text);outline:none;resize:none;overflow-y:auto;font-family:inherit;
             transition:height .15s ease"
    ></textarea>
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
    <button class="primary" onclick={confirm}>确认</button>
  </div>
</Dialog>
