<script lang="ts">
  import { tick } from 'svelte';

  export interface NavItem {
    key: string;
    label: string;
  }

  let {
    open = $bindable(false),
    title = '',
    subtitle = '',
    items = [],
    activeKey = '',
    onSelect,
  } = $props<{
    open: boolean;
    title?: string;
    subtitle?: string;
    items: NavItem[];
    activeKey: string;
    onSelect: (key: string) => void;
  }>();

  let boxEl = $state<HTMLDivElement | null>(null);
  let lastActive: HTMLElement | null = null;

  function pick(key: string) {
    onSelect?.(key);
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      lastActive = document.activeElement as HTMLElement;
      queueMicrotask(async () => {
        await tick();
        if (!boxEl) return;
        const target =
          boxEl.querySelector<HTMLElement>(`[data-nav-key="${activeKey}"]`) ||
          boxEl.querySelector<HTMLElement>('button');
        target?.focus?.();
      });
    } else {
      lastActive?.focus?.();
      lastActive = null;
    }
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', onKeydown, true);
    return () => document.removeEventListener('keydown', onKeydown, true);
  });
</script>

{#if open}
  <div
    class="dialog-overlay sub-dialog"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
  >
    <div
      class="dialog-box nav-grid-dialog"
      bind:this={boxEl}
      role="dialog"
      aria-modal="true"
      aria-label={title || '导航'}
    >
      {#if title}<h3>{title}</h3>{/if}
      {#if subtitle}<p class="sub">{subtitle}</p>{/if}
      <div class="preset-nav-grid">
        {#each items as it (it.key)}
          <button
            type="button"
            class="preset-nav-item"
            class:active={it.key === activeKey}
            data-nav-key={it.key}
            onclick={() => pick(it.key)}
          >{it.label}</button>
        {/each}
      </div>
      <div class="dialog-actions" style="margin-top:16px">
        <button class="cancel" onclick={() => (open = false)}>取消</button>
      </div>
    </div>
  </div>
{/if}