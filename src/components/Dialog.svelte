<script lang="ts">
  import { onMount, onDestroy, type Snippet } from 'svelte';
  import { effectiveLevel } from '../lib/stores/app.svelte';

  let {
    open = $bindable(false),
    title = '',
    subtitle = '',
    wide = false,
    variant = 'center',
    children,
  } = $props<{
    open: boolean;
    title: string;
    subtitle?: string;
    wide?: boolean;
    variant?: 'center' | 'sheet';
    children?: Snippet;
  }>();

  let boxEl = $state<HTMLDivElement | null>(null);
  let lastActive: HTMLElement | null = null;

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) { e.preventDefault(); open = false; return; }
    if (e.key !== 'Tab' || !boxEl || !open) return;
    const list = Array.from(
      boxEl.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => {
      if (el.hidden) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.getClientRects().length > 0;
    });
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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

  /* ★ v3.7.7 · 任务 D · focusin → 滚动到视口中间（仅 Dialog 内生效） */
  $effect(() => {
    if (!open) return;
    const container = boxEl;
    if (!container) return;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el?.matches?.('input, textarea, select')) return;
      setTimeout(() => {
        el.scrollIntoView({
          block: 'center',
          behavior: effectiveLevel() === 'compat' ? 'auto' : 'smooth',
        });
      }, 250);
    };
    container.addEventListener('focusin', onFocusIn);
    return () => container.removeEventListener('focusin', onFocusIn);
  });

  /* ★ v3.7.7 · 任务 E · visualViewport 键盘适配（仅 sheet 变体） */
  $effect(() => {
    if (!open || variant !== 'sheet') return;
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (!boxEl) return;
      boxEl.style.maxHeight = Math.max(200, vv.height * 0.85) + 'px';
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      if (boxEl) boxEl.style.maxHeight = '';
    };
  });

  onMount(() => document.addEventListener('keydown', onKeydown, true));
  onDestroy(() => document.removeEventListener('keydown', onKeydown, true));
</script>

{#if open}
  <div class="dialog-overlay" class:sheet={variant === 'sheet'} role="presentation"
       onclick={(e) => { if (e.target === e.currentTarget) open = false; }}>
    <div class="dialog-box" class:wide bind:this={boxEl} tabindex="-1" role="dialog" aria-modal="true">
      {#if title}<h3>{title}</h3>{/if}
      {#if subtitle}<p class="sub">{subtitle}</p>{/if}
      {@render children?.()}
    </div>
  </div>
{/if}
