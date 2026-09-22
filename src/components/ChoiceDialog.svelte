<script lang="ts">
  import Dialog from './Dialog.svelte';

  export interface ChoiceItem {
    value: string;
    label: string;
    meta?: string;
  }

  let {
    open = $bindable(false),
    title = '',
    subtitle = '',
    items = [] as ChoiceItem[],
    onSelect,
    filterable = false,
  } = $props<{
    open: boolean;
    title?: string;
    subtitle?: string;
    items: ChoiceItem[];
    onSelect: (value: string) => void;
    filterable?: boolean;
  }>();

  let filter = $state('');
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) || (it.meta || '').toLowerCase().includes(q),
    );
  });

  $effect(() => { if (open) filter = ''; });

  function pick(v: string) {
    onSelect?.(v);
    open = false;
  }
</script>

<Dialog bind:open {title} {subtitle} wide>
  <div class="dialog-list">
    {#if filterable}
      <div class="panel-toolbar" style="margin-bottom:8px">
        <input bind:value={filter} placeholder="🔍 过滤…" />
      </div>
    {/if}
    {#if filtered.length}
      {#each filtered as it (it.value)}
        <button
          type="button"
          class="transfer-option"
          style="width:100%;text-align:left"
          onclick={() => pick(it.value)}
        >
          <span class="gname">{it.label}</span>
          {#if it.meta}<span class="cnt">{it.meta}</span>{/if}
        </button>
      {/each}
    {:else if items.length === 0}
      <div class="transfer-empty">没有可选项</div>
    {:else}
      <div class="transfer-empty">没有匹配的项</div>
    {/if}
  </div>
  <div class="dialog-actions">
    <button class="cancel" onclick={() => (open = false)}>取消</button>
  </div>
</Dialog>