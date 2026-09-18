<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title = '',
    subtitle = '',
    wide = false,
    children,
  } = $props<{
    open: boolean;
    title: string;
    subtitle?: string;
    wide?: boolean;
    children?: Snippet;
  }>();

  let boxEl: HTMLDivElement | null = null;
  let lastActive: HTMLElement | null = null;

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) { e.preventDefault(); open = false; }
    if (e.key === 'Tab' && boxEl) {
      const list = Array.from(boxEl.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter(el => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  $effect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      lastActive = document.activeElement as HTMLElement;
      queueMicrotask(() => {
        if (!boxEl) return;
        const target = boxEl.querySelector<HTMLElement>(
          'input:not([type=hidden]),button:not([disabled]),select,textarea',
        ) || boxEl;
        target.focus?.();
      });
    } else {
      document.body.classList.remove('modal-open');
      lastActive?.focus?.();
      lastActive = null;
    }
  });

  onMount(() => document.addEventListener('keydown', onKeydown, true));
  onDestroy(() => document.removeEventListener('keydown', onKeydown, true));
</script>

{#if open}
  <div class="dialog-overlay" role="presentation"
       onclick={(e) => { if (e.target === e.currentTarget) open = false; }}>
    <div class="dialog-box" class:wide bind:this={boxEl} tabindex="-1" role="dialog" aria-modal="true">
      {#if title}<h3>{title}</h3>{/if}
      {#if subtitle}<p class="sub">{subtitle}</p>{/if}
      {@render children?.()}
    </div>
  </div>
{/if}
